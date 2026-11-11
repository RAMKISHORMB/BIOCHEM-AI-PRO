from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional

from app.core.deps import get_current_user, require_role
from app.models.user import User, UserRole
from app.services.knowledge_base_data import CURATED_KNOWLEDGE_DOCS, search_knowledge_base

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base & RAG Management"])

class DocumentCreate(BaseModel):
    title: str
    source: str
    category: str
    content: str
    tags: List[str] = []

@router.get("/documents")
def list_knowledge_documents(current_user: User = Depends(get_current_user)):
    """List all indexed clinical reference documents in the RAG knowledge repository."""
    return {
        "total": len(CURATED_KNOWLEDGE_DOCS),
        "documents": CURATED_KNOWLEDGE_DOCS
    }

@router.get("/search")
def search_knowledge(
    q: str = Query(..., min_length=2, description="Search query string"),
    limit: int = Query(3, ge=1, le=10),
    current_user: User = Depends(get_current_user)
):
    """Semantic citation search across indexed clinical biochemistry textbooks and consensus guidelines."""
    results = search_knowledge_base(query=q, limit=limit)
    return {
        "query": q,
        "results_count": len(results),
        "citations": results
    }

@router.post("/documents", status_code=status.HTTP_201_CREATED)
def add_knowledge_document(
    payload: DocumentCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.BIOCHEMIST]))
):
    """Ingest a new peer-reviewed guideline or laboratory SOP into the RAG repository."""
    doc_id = f"kb-custom-{len(CURATED_KNOWLEDGE_DOCS) + 1}"
    new_doc = {
        "id": doc_id,
        "title": payload.title.strip(),
        "source": payload.source.strip(),
        "category": payload.category.strip(),
        "content": payload.content.strip(),
        "tags": payload.tags
    }
    CURATED_KNOWLEDGE_DOCS.append(new_doc)
    return {
        "message": "Document ingested successfully into knowledge store",
        "document": new_doc
    }
