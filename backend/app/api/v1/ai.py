from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
import httpx
import json

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.encounter import Encounter
from app.services.knowledge_base_data import search_knowledge_base
from app.services.interpretation_engine import DISCLAIMER_TEXT

router = APIRouter(prefix="/ai", tags=["Local AI Assistant (Ollama)"])

class ChatRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    message: str
    model: Optional[str] = None
    encounter_id: Optional[str] = None
    include_rag: bool = True

class Citation(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    title: str
    source: str
    category: str
    content_snippet: str

class ChatResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    response: str
    model_used: str
    citations: List[Citation]
    grounded_on_patient: bool
    statutory_disclaimer: str

@router.get("/status")
async def check_ollama_status(current_user: User = Depends(get_current_user)):
    """Check connectivity to the local Ollama instance and list installed models."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if res.status_code == 200:
                data = res.json()
                models = [m.get("name") for m in data.get("models", [])]
                return {
                    "online": True,
                    "url": settings.OLLAMA_BASE_URL,
                    "default_model": settings.OLLAMA_DEFAULT_MODEL,
                    "installed_models": models,
                    "message": "Local Ollama daemon is active and responsive."
                }
    except Exception as e:
        pass

    return {
        "online": False,
        "url": settings.OLLAMA_BASE_URL,
        "default_model": settings.OLLAMA_DEFAULT_MODEL,
        "installed_models": [],
        "message": (
            f"Local Ollama service is unreachable at {settings.OLLAMA_BASE_URL}. "
            "Never silently fabricating placeholder AI output. Please start Ollama locally (`ollama serve`)."
        ),
        "setup_guide": [
            "Download Ollama from https://ollama.com",
            f"Run: ollama run {settings.OLLAMA_DEFAULT_MODEL}",
            "Verify Ollama is running on port 11434"
        ]
    }

@router.post("/chat", response_model=ChatResponse)
async def query_local_ai(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Process clinical inquiry through local Ollama LLM with prompt defense and traceable RAG grounding.
    Strict local rule: Never silently fabricate a response when Ollama is offline.
    """
    target_model = payload.model or settings.OLLAMA_DEFAULT_MODEL

    # 1. Check if Ollama is accessible
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            ping = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if ping.status_code != 200:
                raise Exception("Ollama ping returned non-200")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"Local AI Assistant is currently unavailable. Connection to local Ollama at "
                f"'{settings.OLLAMA_BASE_URL}' failed. In accordance with system safety standards, "
                "synthetic placeholder responses are never fabricated. Please launch Ollama locally."
            )
        )

    # 2. Gather patient context if encounter_id is specified
    patient_context_str = ""
    grounded_patient = False
    if payload.encounter_id:
        encounter = db.query(Encounter).filter(Encounter.id == payload.encounter_id).first()
        if encounter:
            grounded_patient = True
            pat = encounter.patient
            results_text = []
            for r in encounter.results:
                results_text.append(f"- {r.analyte.name} ({r.analyte.code}): {r.value_numeric} {r.unit} [{r.flag}]")
            
            interp_summary = ""
            if encounter.interpretation:
                interp = encounter.interpretation
                indices = json.loads(interp.calculated_indices_json or "{}")
                flags = json.loads(interp.clinical_flags_json or "[]")
                interp_summary = f"\nCalculated Indices: {json.dumps(indices)}\nClinical Flags: {json.dumps(flags)}"

            patient_context_str = (
                f"\n--- VERIFIED PATIENT CLINICAL DATA ---\n"
                f"Patient: {pat.full_name}, Age: {pat.age_years} yrs, Sex: {pat.biological_sex}\n"
                f"Encounter Accession: {encounter.accession_number}, Specimen: {encounter.sample_type}\n"
                f"Measured Analytes:\n" + "\n".join(results_text) + interp_summary + "\n"
            )

    # 3. Retrieve traceable citations from Knowledge Base
    citations: List[Citation] = []
    rag_context_str = ""
    if payload.include_rag:
        retrieved_docs = search_knowledge_base(payload.message, limit=2)
        for doc in retrieved_docs:
            citations.append(
                Citation(
                    title=doc["title"],
                    source=doc["source"],
                    category=doc["category"],
                    content_snippet=doc["content"][:200] + "..."
                )
            )
            rag_context_str += f"\n[SOURCE: {doc['title']} ({doc['source']})]\n{doc['content']}\n"

    # 4. Construct grounded clinical prompt with safety guardrails
    system_prompt = (
        "You are the BIOCHEM AI Assistant, a specialized clinical biochemistry informatics agent. "
        "Strict rules:\n"
        "1. Ground your answers strictly in peer-reviewed biochemistry and the supplied reference text.\n"
        "2. Do NOT fabricate medical diagnoses, prescribe treatments, or invent laboratory reference intervals.\n"
        "3. Provide educational, mechanism-based clinical decision support.\n"
        "4. Highlight relevant metabolic pathways, regulatory enzymes, and acid-base indices when appropriate.\n"
    )

    full_prompt = (
        f"{system_prompt}\n"
        f"{patient_context_str}"
        f"\n--- TRACEABLE REFERENCE GUIDELINES ---\n{rag_context_str}\n"
        f"Clinician Inquiry: {payload.message}\n"
        "Provide a precise, scientifically rigorous clinical biochemistry analysis:"
    )

    # 5. Execute request to Ollama
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            ollama_req = {
                "model": target_model,
                "prompt": full_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.2,
                    "top_p": 0.9
                }
            }
            ollama_res = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json=ollama_req
            )
            if ollama_res.status_code != 200:
                raise Exception(f"Ollama error: {ollama_res.text}")
            
            res_data = ollama_res.json()
            generated_text = res_data.get("response", "").strip()

            return ChatResponse(
                response=generated_text,
                model_used=target_model,
                citations=citations,
                grounded_on_patient=grounded_patient,
                statutory_disclaimer=DISCLAIMER_TEXT
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing inference on local Ollama model '{target_model}': {str(e)}"
        )
