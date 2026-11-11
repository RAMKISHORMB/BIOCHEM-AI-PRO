import os
import json
import math
from typing import List, Dict, Any, Optional
from datetime import datetime

# Curated, peer-reviewed reference knowledge documents
CURATED_KNOWLEDGE_DOCS = [
    {
        "id": "kb-acid-base-01",
        "title": "Clinical Evaluation of High Anion Gap Metabolic Acidosis (HAGMA)",
        "source": "Tietz Textbook of Clinical Chemistry and Molecular Diagnostics, 7th Edition",
        "category": "Acid-Base Disorders",
        "content": (
            "The serum anion gap is calculated as [Na+] - ([Cl-] + [HCO3-]). The reference interval with modern "
            "ion-selective electrodes (ISE) is 8 to 16 mmol/L. An elevated anion gap (>16 mmol/L) indicates the presence "
            "of unmeasured organic or inorganic anions in extracellular fluid. Common etiologies are categorized under "
            "the mnemonic GOLD MARK: Glycols (ethylene/propylene glycol), Oxoproline (chronic paracetamol), L-Lactate (hypoperfusion, "
            "sepsis), D-Lactate (short bowel syndrome), Methanol, Aspirin (salicylates), Renal failure (sulfate, phosphate retention), "
            "and Ketoacidosis (diabetic, alcoholic, starvation). The Delta Gap (AG - 12) to Delta Bicarbonate (24 - [HCO3-]) ratio "
            "(Delta-Delta ratio) differentiates pure HAGMA (0.8 - 2.0) from mixed disorders (<0.8 indicates concurrent normal anion gap acidosis; "
            ">2.0 indicates concurrent metabolic alkalosis or pre-existing respiratory acidosis)."
        ),
        "tags": ["anion_gap", "acid_base", "hagma", "delta_ratio", "dka", "lactic_acidosis"]
    },
    {
        "id": "kb-renal-egfr-02",
        "title": "KDIGO 2024 Guidelines: eGFR by 2021 CKD-EPI Race-Free Equation",
        "source": "Kidney Disease: Improving Global Outcomes (KDIGO) Clinical Practice Guideline",
        "category": "Renal Function",
        "content": (
            "The 2021 CKD-EPI creatinine equation estimates Glomerular Filtration Rate (eGFR) without race as a biological variable. "
            "Serum creatinine must be determined using an IDMS-traceable enzymatic method. GFR < 60 mL/min/1.73 m2 persisting for >3 months "
            "confers a diagnosis of Chronic Kidney Disease. KDIGO staging categorizes GFR as: G1 (>=90 mL/min/1.73m2, normal/high), "
            "G2 (60-89 mL/min/1.73m2, mildly decreased), G3a (45-59 mL/min/1.73m2, mildly to moderately decreased), "
            "G3b (30-44 mL/min/1.73m2, moderately to severely decreased), G4 (15-29 mL/min/1.73m2, severely decreased), "
            "and G5 (<15 mL/min/1.73m2, kidney failure). Serum BUN-to-Creatinine ratio assists in distinguishing prerenal azotemia (>20:1 "
            "due to passive urea reabsorption in proximal tubule) from intrinsic acute kidney injury (<10:1 due to tubular back-leak)."
        ),
        "tags": ["renal", "egfr", "ckd_epi", "creatinine", "bun", "kdigo"]
    },
    {
        "id": "kb-hepatic-lft-03",
        "title": "ACG Clinical Guideline: Evaluation of Abnormal Liver Chemistries",
        "source": "American College of Gastroenterology (ACG) Guidelines, Am J Gastroenterol",
        "category": "Hepatic Function",
        "content": (
            "Serum transaminases (ALT and AST) are primary intracellular enzymes released upon hepatocyte necrosis. ALT is cytosolic "
            "and relatively liver-specific, whereas AST is present in both cytosol and mitochondria of hepatocytes, myocytes, and erythrocytes. "
            "The De Ritis ratio (AST/ALT) > 2.0 strongly indicates alcoholic liver disease or advanced cirrhotic bridging, where mitochondrial "
            "injury and pyridoxal-5-phosphate deficiency impair ALT more than AST. An AST/ALT ratio < 1.0 is characteristic of nonalcoholic "
            "fatty liver disease (NAFLD) and viral hepatitis. In cholestatic liver injury, Alkaline Phosphatase (ALP) is induced on biliary canalicular "
            "membranes. The R-factor ((ALT/ULN) / (ALP/ULN)) classifies pattern of injury: R > 5.0 indicates hepatocellular, R < 2.0 indicates "
            "cholestatic, and R between 2.0 and 5.0 represents mixed hepatic injury."
        ),
        "tags": ["hepatic", "alt", "ast", "alp", "de_ritis", "bilirubin", "cirrhosis"]
    },
    {
        "id": "kb-calcium-04",
        "title": "Calcium Homeostasis and Correction for Hypoalbuminemia",
        "source": "Tietz Textbook of Clinical Chemistry and Molecular Diagnostics, 7th Edition",
        "category": "Mineral Metabolism",
        "content": (
            "Total serum calcium comprises approximately 50% free ionized calcium (physiologically active), 40% bound to plasma proteins "
            "(predominantly albumin, 0.8 mg/dL Ca per 1.0 g/dL albumin), and 10% complexed with anions (phosphate, citrate, bicarbonate). "
            "In patients with hypoalbuminemia, total measured calcium underestimates ionized calcium status. The standard Payne formula "
            "adjusts total calcium: Corrected Calcium (mg/dL) = Total Calcium (mg/dL) + 0.8 * (4.0 - Serum Albumin [g/dL]). "
            "Hypercalcemia with suppressed PTH indicates malignancy, vitamin D toxicity, or granulomatous disease; elevated or inappropriately "
            "normal PTH indicates primary hyperparathyroidism."
        ),
        "tags": ["calcium", "albumin", "corrected_calcium", "electrolytes", "hypocalcemia", "hypercalcemia"]
    },
    {
        "id": "kb-lipids-05",
        "title": "AHA/ACC 2018 Multi-Society Guideline on Blood Cholesterol Management",
        "source": "Journal of the American College of Cardiology (JACC) Guidelines",
        "category": "Lipid Metabolism",
        "content": (
            "Circulating atherogenic apolipoprotein B-containing lipoproteins include LDL, VLDL, and intermediate-density lipoproteins. "
            "The Friedewald equation calculates LDL-C: LDL-C = Total Cholesterol - HDL-C - (Triglycerides / 5). The equation assumes a fixed "
            "triglyceride-to-cholesterol ratio in VLDL of 5:1. It becomes inaccurate and invalid when fasting serum Triglycerides exceed "
            "400 mg/dL, or in the presence of chylomicronemia, requiring direct homogeneous LDL-C measurement. Extreme hypertriglyceridemia "
            "(Triglycerides >= 500 mg/dL) necessitates urgent fibrate or omega-3 fatty acid intervention to mitigate acute pancreatitis risk."
        ),
        "tags": ["lipids", "cholesterol", "ldl", "triglycerides", "friedewald", "hdl"]
    }
]

def search_knowledge_base(query: str, limit: int = 3) -> List[Dict[str, Any]]:
    """
    Search curated knowledge base with word-overlap / semantic similarity ranking.
    Returns matched chunks with traceable source citations.
    """
    q_tokens = set(query.lower().replace(",", " ").replace(".", " ").split())
    scored_docs = []

    for doc in CURATED_KNOWLEDGE_DOCS:
        text = (doc["title"] + " " + doc["content"] + " " + " ".join(doc["tags"])).lower()
        score = sum(1 for t in q_tokens if t in text and len(t) > 2)
        if score > 0:
            scored_docs.append({
                "score": score,
                "doc": doc
            })

    scored_docs.sort(key=lambda x: x["score"], reverse=True)
    results = [s["doc"] for s in scored_docs[:limit]]
    # Fallback to top docs if query is generic
    if not results:
        results = CURATED_KNOWLEDGE_DOCS[:limit]
    return results
