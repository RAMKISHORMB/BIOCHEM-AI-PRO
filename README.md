# BIOCHEM AI — Clinical Biochemistry Intelligence Platform

> **Local-First, High-Integrity Clinical Laboratory Informatics & Diagnostic Decision Support**

[![Backend](https://img.shields.io/badge/FastAPI-0.110.0-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB.svg?style=flat&logo=python)](https://python.org)
[![Frontend](https://img.shields.io/badge/React-18.2-61DAFB.svg?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/PostgreSQL%20%7C%20SQLite-Relational-336791.svg?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Testing](https://img.shields.io/badge/Pytest-30%20Passed-brightgreen.svg?style=flat&logo=pytest)](https://docs.pytest.org/)

---

## 1. System Overview & Medical Informatics Principles

**BIOCHEM AI** is an air-gapped, local-first clinical biochemistry intelligence platform designed for medical biochemists, chemical pathologists, clinical laboratory technicians, and healthcare providers. It provides rigorous data validation, mathematical physiological index calculation, metabolic pathway mapping, inborn errors of metabolism cataloging, local offline AI assistance, and explainable machine learning risk modeling.

### Non-Negotiable Medical Informatics Principles
1. **Manual Data Entry Only**: All patient records and quantitative laboratory measurements are entered manually by authorized personnel. Zero fake patients, zero randomized lab values.
2. **Persistent Relational Storage**: Full relational integrity backed by SQLAlchemy models with primary keys, foreign keys, timestamps, and indexes. No record is ever lost on service restart.
3. **Traceable Reference Intervals**: Every analyte reference interval is explicitly attributed to standard authoritative sources (*Tietz Textbook of Clinical Chemistry and Molecular Diagnostics, 7th Edition* / *IFCC*), with specified biological sex, age brackets, and units.
4. **Educational & Decision Support Disclaimer**: Automated interpretations and AI outputs are strictly clinical decision support tools. They do not replace qualified medical diagnosis or physician interpretation.
5. **Air-Gapped & Honest AI**: Integrates locally with Ollama. When local AI is offline or models are unpulled, the system returns clear, transparent offline states with recovery guidance—never silently fabricating answers.
6. **Reproducible Machine Learning**: Mathematical held-out validation (Accuracy, Precision, Recall, F1, ROC-AUC, Confusion Matrix) and feature-level attributions. If a model is not trained, the interface explicitly reports "Model not trained".

---

## 2. Technology Stack

### Backend
- **Python 3.12** & **FastAPI**: High-performance asynchronous API framework with automatic OpenAPI documentation.
- **SQLAlchemy 2.0**: Relational ORM supporting PostgreSQL 18 and persistent SQLite.
- **Pydantic v2**: Strict schema validation and data sanitization.
- **Passlib & Bcrypt**: Salted cryptographic password hashing.
- **PyJWT / python-jose**: Role-based access control (RBAC) token generation.
- **ReportLab 4.1**: CLIA/CAP-compliant clinical PDF report synthesis with clinician sign-off blocks.
- **NumPy, SciPy, Joblib**: Deterministic clinical ML algorithms (Random Forest, Logistic Regression, Mahalanobis Distance anomaly detection) engineered to bypass platform WDAC execution blocks.

### Frontend
- **React 18** with **TypeScript**: Strict type-safe clinical user interface.
- **Vite 5**: Fast build tooling and modular lazy-loaded code splitting.
- **Tailwind CSS**: Custom dark navy medical informatics design system (`#0B1120`, `#0F172A`, cyan `#06B6D4` accents).
- **Recharts**: Clinical time-series charts, reference range limit lines, confusion matrix grids, and SHAP-equivalent feature attribution charts.
- **Lucide React**: Clean medical and laboratory iconography.

---

## 3. The 16 Complete Platform Modules

| # | Module Name | Architectural Description |
|---|-------------|---------------------------|
| **1** | **Authentication & Role Management** | RBAC supporting `ADMIN`, `BIOCHEMIST`, `TECHNICIAN`, `CLINICIAN` roles with JWT tokens and bcrypt hashing. |
| **2** | **Professional Dashboard** | Real-time database aggregates: total patients, accessions, panic critical lab results, and 7-day intake volume trends. |
| **3** | **Patient Registration & Management** | Patient demographics, unique MRN generation, biological sex, dynamic age calculation, and clinical history. |
| **4** | **Manual Laboratory Data Entry** | Laboratory accessioning with panel presets (Metabolic, Renal, Hepatic, Electrolytes, Lipid), and real-time out-of-range flag evaluation. |
| **5** | **Reference Range Catalog** | Traceable catalog citing *Tietz 7th Ed* / *IFCC* with lower/upper limits, panic thresholds, specimen type, and LOINC codes. |
| **6** | **Biochemical Interpretation Engine** | Automated indices: Serum Anion Gap, Delta-Delta Ratio, Osmolality Gap, CKD-EPI (2021) eGFR, De Ritis Ratio, Corrected Calcium, and R-factor. |
| **7** | **Metabolic Pathway Explorer** | Interactive metabolic maps (Glycolysis, TCA Cycle, Urea Cycle, Lipid/Ketogenesis, Purine Metabolism) with real patient result overlays. |
| **8** | **Gene & Enzyme Relationship Explorer** | Catalog of inborn errors of metabolism (PKU, Galactosemia, MSUD, G6PD, OTC deficiency) with OMIM, EC numbers, and biomarker triggers. |
| **9** | **Local AI Assistant** | Grounded retrieval-augmented generation (RAG) powered by locally hosted Ollama models (`llama3`, `meditron`) with offline 503 fallback. |
| **10** | **Knowledge Base Management** | Traceable biochemistry literature repository with semantic search across textbook citations and clinical guidelines. |
| **11** | **ML Dataset Management** | Clinical cohort registry, schema validation, and statistical distribution profiling (Mean, Std, 25%, Median, 75%, Max). |
| **12** | **ML Model Training & Evaluation** | Reproducible training with held-out validation, discrimination metrics (Accuracy, ROC-AUC, F1, Sensitivity), and joblib serialization. |
| **13** | **Explainability & Anomaly Analysis** | Directional feature risk attributions and multivariate Mahalanobis/Isolation anomaly detection across lab panels. |
| **14** | **Patient History & Delta Checks** | Longitudinal analyte time-series charts and CLSI/Tietz delta check alert evaluation (e.g. Potassium surge >20%, Creatinine rise >50%). |
| **15** | **PDF and CSV Report Generation** | Official clinical laboratory PDF reports generated with ReportLab (demographics, accession, flagged results, signature block) and CSV exports. |
| **16** | **Security Audit Logs & Settings** | HIPAA-compliant data mutation audit trail viewer, Ollama endpoint configuration, and system health status. |

---

## 4. Installation & Local Setup

### Prerequisites
- **Python 3.11 or 3.12**
- **Node.js 18+ and npm**
- **Ollama** (Optional, for local AI assistant): [Download Ollama](https://ollama.com)
- **PostgreSQL 14+** (Optional, defaults to local persistent SQLite `biochem_ai.db` out of the box)

### Step 1: Clone or Open Workspace
```bash
cd BIOCHEM-AI-PRO
```

### Step 2: Backend Setup
Create and activate the Python virtual environment:
```powershell
# Windows
python -m venv backend\venv
.\backend\venv\Scripts\Activate.ps1
```

Install backend dependencies:
```bash
pip install -r backend/requirements.txt
```

### Step 3: Frontend Setup
```bash
cd frontend
npm install
cd ..
```

### Step 4: Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

---

## 5. Running the Application

### 1. Start the Backend API Server
In your terminal with the virtual environment activated:
```powershell
.\backend\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --app-dir backend
```
- API Base: `http://localhost:8000`
- Interactive Swagger Documentation: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/health`

### 2. Start the Frontend Application
In a second terminal:
```bash
cd frontend
npm run dev
```
- Application Web UI: `http://localhost:5173`

### 3. Initial Administrator Provisioning
For security in clinical informatics environments, BIOCHEM AI does not use hardcoded default administrator credentials. You can provision the initial administrator in either of two secure ways:

- **Option A (Environment Variables)**: Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your environment (or `.env` file) prior to launching the backend. On first startup, the system will initialize the Chief Medical Biochemist account using these credentials.
- **Option B (First-User Self-Registration)**: If no administrator environment variables are configured on a clean database, the very first user who registers through the `/auth/register` API endpoint or the web UI's **Register Account** tab is automatically granted `ADMIN` privileges.

*(Subsequent users can be provisioned with clinician, biochemist, technician, or administrator roles via the User Management module).*

---

## 6. Running the Automated Test Suite

### Full Backend Pytest Suite (30 Tests)
Run the complete backend integration and unit test suite:
```powershell
.\backend\venv\Scripts\python.exe -m pytest -o pythonpath=backend backend\tests\ -v
```
**Test Coverage Breakdown:**
- `test_auth.py`: JWT issuance, bcrypt hashing, first-user admin bootstrapping, RBAC guards (6 passed).
- `test_patient_dashboard.py`: MRN uniqueness, age computation, reference range seeding, dashboard metrics (4 passed).
- `test_labs_interpretation.py`: Manual accessioning, critical panic alerts, high anion gap computation, biochemist sign-off (3 passed).
- `test_pathways_genetics.py`: Metabolic pathway graph retrieval, inborn errors of metabolism catalog search (2 passed).
- `test_ai_knowledge.py`: Knowledge base semantic search, Ollama status check, offline 503 guardrails (3 passed).
- `test_ml_pipelines.py`: Clinical dataset seeding, reproducible training, held-out evaluation, anomaly detection (4 passed).
- `test_history.py`: Longitudinal visit timeline, acute potassium delta surge alerts, trend series (2 passed).
- `test_reports.py`: ReportLab PDF generation with `%PDF-` validation, accession CSV, patient history CSV (3 passed).
- `test_audit_settings.py`: HIPAA audit trail RBAC query, system diagnostics, configuration updates (3 passed).

### Frontend TypeScript Verification & Production Build
```bash
cd frontend
npm run build
```
Compiles and bundles all 16 module views cleanly with 0 TypeScript errors.

---

## 7. Clinical Decision Support & Regulatory Disclaimer

> [!IMPORTANT]
> **BIOCHEM AI** is an analytical informatics platform engineered to support qualified medical biochemists, pathologists, and clinicians. Automated interpretations, calculated biochemical indices, and machine learning risk outputs are intended solely for clinical decision support. They must always be reviewed and signed off by authorized laboratory personnel in conjunction with the patient's complete clinical presentation.
