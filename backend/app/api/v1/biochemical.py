from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from datetime import datetime
import json

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.patient import Patient
from app.models.encounter import Encounter
from app.models.lab_result import LabResult
from app.models.lab_test import TestAnalyte
from app.models.biochemical_calc import BiochemicalCalculationLog

from app.schemas.biochemical import (
    DeRitisRequest,
    CorrectedCalciumRequest,
    AnionGapRequest,
    CorrectedAnionGapRequest,
    SerumOsmolalityRequest,
    OsmolalGapRequest,
    BunCreatinineRatioRequest,
    EgfrRequest,
    FenaRequest,
    AcidBaseRequest,
    CalculationResponse,
    ProfileResponse,
    ProfileAnalyteItem,
)
from app.services.biochemical_calculation_service import (
    calculate_de_ritis_ratio,
    calculate_albumin_corrected_calcium,
    calculate_anion_gap,
    calculate_albumin_corrected_anion_gap,
    calculate_serum_osmolality,
    calculate_osmolal_gap,
    calculate_bun_creatinine_ratio,
    calculate_egfr_ckd_epi_2021,
    calculate_fractional_excretion_of_sodium,
    calculate_transferrin_saturation,
    calculate_lipid_indices,
    calculate_ag_protein_ratio,
    analyze_acid_base,
    CLINICAL_DECISION_SUPPORT_NOTICE,
    BiochemicalCalculationResult,
)
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/biochem", tags=["Biochemical Intelligence & Calculations"])


def _persist_calculation_log(
    db: Session,
    user_id: Optional[str],
    calc_res: BiochemicalCalculationResult,
    patient_id: Optional[str] = None,
    encounter_id: Optional[str] = None,
):
    """Persist calculation provenance to database for medical auditability."""
    try:
        log_entry = BiochemicalCalculationLog(
            patient_id=patient_id,
            encounter_id=encounter_id,
            user_id=user_id,
            calculation_type=calc_res.calculation_type,
            formula_name=calc_res.formula_name,
            formula_version=calc_res.formula_version,
            inputs_json=json.dumps(calc_res.inputs),
            outputs_json=json.dumps({
                "output_value": calc_res.output_value,
                "output_unit": calc_res.output_unit,
                "status": calc_res.status,
                "interpretation": calc_res.interpretation,
                "is_valid": calc_res.is_valid,
                "extra_metrics": calc_res.extra_metrics,
            }),
            assumptions_json=json.dumps(calc_res.assumptions),
            warnings_json=json.dumps(calc_res.warnings),
            provenance_hash=calc_res.provenance_hash,
            created_at=datetime.utcnow(),
        )
        db.add(log_entry)
        db.commit()
    except Exception:
        db.rollback()


# ==============================================================================
# CALCULATION ENDPOINTS
# ==============================================================================

@router.post("/calculations/de-ritis", response_model=CalculationResponse)
def compute_de_ritis(
    payload: DeRitisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = calculate_de_ritis_ratio(payload.ast, payload.alt, payload.ast_unit, payload.alt_unit)
    _persist_calculation_log(db, current_user.id, res, payload.patient_id, payload.encounter_id)
    return res.to_dict()


@router.post("/calculations/corrected-calcium", response_model=CalculationResponse)
def compute_corrected_calcium(
    payload: CorrectedCalciumRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = calculate_albumin_corrected_calcium(
        payload.total_calcium,
        payload.albumin,
        payload.calcium_unit,
        payload.albumin_unit,
        payload.reference_albumin,
    )
    _persist_calculation_log(db, current_user.id, res, payload.patient_id, payload.encounter_id)
    return res.to_dict()


@router.post("/calculations/anion-gap", response_model=CalculationResponse)
def compute_anion_gap(
    payload: AnionGapRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = calculate_anion_gap(payload.na, payload.cl, payload.hco3, payload.unit)
    _persist_calculation_log(db, current_user.id, res, payload.patient_id, payload.encounter_id)
    return res.to_dict()


@router.post("/calculations/corrected-anion-gap", response_model=CalculationResponse)
def compute_corrected_anion_gap(
    payload: CorrectedAnionGapRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = calculate_albumin_corrected_anion_gap(
        payload.na,
        payload.cl,
        payload.hco3,
        payload.albumin,
        payload.electrolyte_unit,
        payload.albumin_unit,
        payload.reference_albumin,
    )
    _persist_calculation_log(db, current_user.id, res, payload.patient_id, payload.encounter_id)
    return res.to_dict()


@router.post("/calculations/osmolality", response_model=CalculationResponse)
def compute_serum_osmolality(
    payload: SerumOsmolalityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = calculate_serum_osmolality(
        payload.na,
        payload.glucose,
        payload.bun,
        payload.na_unit,
        payload.glucose_unit,
        payload.bun_unit,
    )
    _persist_calculation_log(db, current_user.id, res, payload.patient_id, payload.encounter_id)
    return res.to_dict()


@router.post("/calculations/osmolal-gap", response_model=CalculationResponse)
def compute_osmolal_gap(
    payload: OsmolalGapRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = calculate_osmolal_gap(payload.measured_osmolality, payload.calculated_osmolality, payload.unit)
    _persist_calculation_log(db, current_user.id, res, payload.patient_id, payload.encounter_id)
    return res.to_dict()


@router.post("/calculations/bun-cr-ratio", response_model=CalculationResponse)
def compute_bun_cr_ratio(
    payload: BunCreatinineRatioRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = calculate_bun_creatinine_ratio(payload.bun, payload.creatinine, payload.bun_unit, payload.creatinine_unit)
    _persist_calculation_log(db, current_user.id, res, payload.patient_id, payload.encounter_id)
    return res.to_dict()


@router.post("/calculations/egfr", response_model=CalculationResponse)
def compute_egfr(
    payload: EgfrRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # If patient_id passed without age/sex, fill from patient record
    age = payload.age_years
    sex = payload.sex
    if payload.patient_id and (age is None or not sex):
        p = db.query(Patient).filter(Patient.id == payload.patient_id).first()
        if p:
            age = age or p.age_years
            sex = sex or p.biological_sex

    res = calculate_egfr_ckd_epi_2021(payload.creatinine, age, sex, payload.creatinine_unit)
    _persist_calculation_log(db, current_user.id, res, payload.patient_id, payload.encounter_id)
    return res.to_dict()


@router.post("/calculations/fena", response_model=CalculationResponse)
def compute_fena(
    payload: FenaRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    res = calculate_fractional_excretion_of_sodium(
        payload.serum_na,
        payload.serum_creat,
        payload.urine_na,
        payload.urine_creat,
    )
    _persist_calculation_log(db, current_user.id, res, payload.patient_id, payload.encounter_id)
    return res.to_dict()


@router.post("/calculations/acid-base")
def compute_acid_base(
    payload: AcidBaseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = analyze_acid_base(
        ph=payload.ph,
        paco2=payload.paco2,
        hco3=payload.hco3,
        na=payload.na,
        cl=payload.cl,
        albumin=payload.albumin,
        bicarbonate_source=payload.bicarbonate_source,
    )
    # Persist audit record
    try:
        log_entry = BiochemicalCalculationLog(
            patient_id=payload.patient_id,
            encounter_id=payload.encounter_id,
            user_id=current_user.id,
            calculation_type="ACID_BASE_ANALYSIS",
            formula_name="Structured Acid-Base Analysis (Winter's / Henderson-Hasselbalch)",
            formula_version="2024.1",
            inputs_json=json.dumps(payload.dict()),
            outputs_json=json.dumps(result),
            assumptions_json=json.dumps([
                "Henderson-Hasselbalch arterial equilibrium.",
                "Winter's respiratory compensation for metabolic acidosis.",
            ]),
            warnings_json=json.dumps(result.get("clinical_warnings", [])),
            created_at=datetime.utcnow(),
        )
        db.add(log_entry)
        db.commit()
    except Exception:
        db.rollback()

    return result


@router.get("/calculations/history")
def get_calculation_history(
    patient_id: Optional[str] = None,
    calculation_type: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve calculation provenance audit logs."""
    q = db.query(BiochemicalCalculationLog)
    if patient_id:
        q = q.filter(BiochemicalCalculationLog.patient_id == patient_id)
    if calculation_type:
        q = q.filter(BiochemicalCalculationLog.calculation_type == calculation_type)

    logs = q.order_by(BiochemicalCalculationLog.created_at.desc()).limit(limit).all()

    items = []
    for log in logs:
        try:
            inputs = json.loads(log.inputs_json)
        except Exception:
            inputs = {}
        try:
            outputs = json.loads(log.outputs_json)
        except Exception:
            outputs = {}
        try:
            assumptions = json.loads(log.assumptions_json)
        except Exception:
            assumptions = []
        try:
            warnings = json.loads(log.warnings_json)
        except Exception:
            warnings = []

        items.append({
            "id": log.id,
            "patient_id": log.patient_id,
            "encounter_id": log.encounter_id,
            "calculation_type": log.calculation_type,
            "formula_name": log.formula_name,
            "formula_version": log.formula_version,
            "inputs": inputs,
            "outputs": outputs,
            "assumptions": assumptions,
            "warnings": warnings,
            "provenance_hash": log.provenance_hash,
            "created_at": log.created_at.isoformat() + "Z" if log.created_at else None,
        })

    return {"count": len(items), "logs": items}


# ==============================================================================
# CLINICAL BIOCHEMISTRY PROFILES
# ==============================================================================

# Knowledge metadata for clinical interpretations (Module 4)
ANALYTE_INTERPRETATION_KNOWLEDGE: Dict[str, Dict[str, str]] = {
    "ALT": {
        "significance": "Cytosolic alanine transaminase; primarily localized to hepatocytes. Hallmark enzyme of acute hepatocellular membrane disruption.",
        "mechanisms": "Loss of hepatocyte plasma membrane integrity, ischemic necrosis, toxic injury (acetaminophen), acute viral hepatitis, lipotoxicity in NAFLD.",
        "limitations": "Does not assess synthetic capacity or fibrosis extent; may be normal in end-stage cirrhosis with depleted functional hepatocyte mass.",
        "references": "ACG Clinical Guideline: Evaluation of Abnormal Liver Chemistries, Am J Gastroenterol 2017; Tietz 7th Ed.",
    },
    "AST": {
        "significance": "Aspartate transaminase; present in cytosolic (20%) and mitochondrial (80%) isoenzyme forms across liver, cardiac muscle, skeletal muscle, and kidneys.",
        "mechanisms": "Hepatocellular necrosis, alcohol-induced mitochondrial toxicity, rhabdomyolysis, strenuous exercise, myocardial infarction, in-vitro hemolysis.",
        "limitations": "Not liver-specific. Significant non-hepatic release occurs with muscle injury; check CK if isolated AST elevation.",
        "references": "IFCC Primary Reference Procedures for Transaminases; Tietz 7th Ed.",
    },
    "ALP": {
        "significance": "Zinc metalloenzyme located on biliary canalicular membrane and osteoblast surfaces. Elevated in biliary obstruction and high bone turnover.",
        "mechanisms": "Increased de-novo synthesis triggered by bile acid accumulation in cholestasis, bone osteoblastic activity (Paget's, healing fractures, osteosarcoma), pregnancy (placental ALP).",
        "limitations": "Can originate from bone, liver, placenta, or intestine. GGT or 5'-nucleotidase co-testing clarifies hepatic vs osseous etiology.",
        "references": "EASL Clinical Practice Guidelines on Cholestatic Liver Diseases, J Hepatol 2009; Tietz 7th Ed.",
    },
    "GGT": {
        "significance": "Microsomal gamma-glutamyltransferase in biliary epithelium and endoplasmic reticulum. Extremely sensitive marker of biliary and alcohol induction.",
        "mechanisms": "Biliary epithelial irritation, enzyme induction by ethanol, phenytoin, carbamazepine, or barbiturates.",
        "limitations": "Highly sensitive but poor diagnostic specificity. Elevated in diabetes, obesity, and cardiac disease without primary hepatobiliary disease.",
        "references": "Tietz Textbook of Clinical Chemistry and Molecular Diagnostics, 7th Ed.",
    },
    "TBIL": {
        "significance": "Total breakdown product of hemoglobin and heme-containing proteins; cleared via hepatic uptake, glucuronide conjugation, and biliary secretion.",
        "mechanisms": "Increased production (hemolysis, ineffective erythropoiesis), impaired conjugation (Gilbert syndrome, Crigler-Najjar), or biliary obstruction.",
        "limitations": "Must be fractionated into conjugated (direct) vs unconjugated fractions to localize pre-hepatic, intra-hepatic, or post-hepatic cause.",
        "references": "Harrison's Principles of Internal Medicine, 21st Ed; Tietz 7th Ed.",
    },
    "DBIL": {
        "significance": "Direct (conjugated) water-soluble bilirubin mono- and diglucuronides destined for excretion into bile.",
        "mechanisms": "Hepatocellular excretion defect or biliary tract obstruction (gallstones, stricture, cholangiocarcinoma, pancreatic head mass).",
        "limitations": "Overestimation can occur in presence of delta-bilirubin (covalently bound to albumin), which has a prolonged half-life of ~14-21 days.",
        "references": "Tietz 7th Ed; ACG Guidelines 2017.",
    },
    "ALB": {
        "significance": "Primary oncotic protein synthesized exclusively by hepatocytes. Half-life ~20 days. Transports fatty acids, bilirubin, calcium, and drugs.",
        "mechanisms": "Decreased synthesis (chronic liver disease, malnutrition), increased loss (nephrotic syndrome, protein-losing enteropathy, severe burns), hemodilution, or systemic inflammation (negative acute-phase reactant).",
        "limitations": "Insensitive to acute hepatic failure due to long half-life (INR/Prothrombin Time is preferred for acute liver synthetic failure).",
        "references": "Tietz 7th Ed; IFCC Standardized Methods.",
    },
    "TP": {
        "significance": "Total concentration of circulating plasma proteins (predominantly albumin and polyclonal/monoclonal immunoglobulins).",
        "mechanisms": "Hyperproteinemia in dehydration or paraproteinemias (multiple myeloma); hypoproteinemia in nephrotic loss, cirrhosis, or malnutrition.",
        "limitations": "Biuret method does not distinguish individual globulin fractions; serum protein electrophoresis (SPEP) required.",
        "references": "Tietz 7th Ed.",
    },
    "CREAT": {
        "significance": "Non-protein nitrogenous metabolite of creatine phosphate in skeletal muscle. Filtered freely by glomerulus without significant tubular reabsorption.",
        "mechanisms": "Reduced glomerular filtration rate (prerenal, intrinsic renal, or postrenal), rhabdomyolysis, high dietary cooked meat intake.",
        "limitations": "Serum creatinine is an inverse non-linear marker; significant renal function loss (>50%) can occur before creatinine clearly exits normal interval. Dependent on muscle mass.",
        "references": "KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease.",
    },
    "BUN": {
        "significance": "Nitrogenous end-product of hepatic urea cycle from protein amino acid deamination. Cleared by glomeruli and passively reabsorbed along renal tubules.",
        "mechanisms": "Volume depletion (enhanced proximal tubular reabsorption), upper gastrointestinal hemorrhage, hypercatabolism, corticosteroid therapy, renal impairment.",
        "limitations": "Heavily influenced by volume status, protein intake, and hepatic urea synthesis independent of true GFR.",
        "references": "Tietz 7th Ed; NKF KDOQI Guidelines.",
    },
    "NA": {
        "significance": "Major extracellular cation governing extracellular fluid osmolality, plasma volume, and neuromuscular excitability.",
        "mechanisms": "Disorders of water balance: excess free water (SIADH, heart failure, cirrhosis) leads to hyponatremia; water deficit or hypertonic fluid leads to hypernatremia.",
        "limitations": "Indirect ion-selective electrodes are susceptible to pseudohyponatremia in extreme hypertriglyceridemia or hyperproteinemia.",
        "references": "European Society of Endocrinology Guidelines on Hyponatraemia; Tietz 7th Ed.",
    },
    "K": {
        "significance": "Primary intracellular cation (~98% intracellular); critical determinant of cardiac resting membrane potential and neuromuscular conduction.",
        "mechanisms": "Renal retention (AKI, CKD, hypoaldosteronism, ACEi/ARBs), transcellular shifts (acidosis, insulin deficiency), in-vitro hemolysis (pseudohyperkalemia).",
        "limitations": "Spurious elevation (in-vitro hemolysis, pneumatic tube trauma, prolonged tourniquet time, thrombocytosis) must be excluded before aggressive interventions.",
        "references": "AHA/ESC Resuscitation Guidelines; Tietz 7th Ed.",
    },
    "CL": {
        "significance": "Major extracellular anion; maintains electrical neutrality, plasma volume, and acid-base homeostasis.",
        "mechanisms": "Loss in vomiting (hypochloremic metabolic alkalosis), retention in normal saline infusion (hyperchloremic metabolic acidosis), renal tubular acidosis.",
        "limitations": "Must be evaluated strictly in conjunction with sodium and bicarbonate for anion gap and acid-base analysis.",
        "references": "Tietz 7th Ed.",
    },
    "HCO3": {
        "significance": "Principal extracellular buffer ion; essential component of the carbonic acid - bicarbonate physiological buffer system.",
        "mechanisms": "Consumption by metabolic organic acids (ketoacids, lactate), renal wasting (Type 2 RTA), or excess generation/retention in metabolic alkalosis.",
        "limitations": "Venous total CO2 approximates bicarbonate but includes dissolved CO2 and carbonic acid (~1-2 mmol/L higher than arterial HCO3).",
        "references": "CLSI C46-A2 Blood Gas Standards; Tietz 7th Ed.",
    },
    "CA": {
        "significance": "Essential mineral regulating neuromuscular transmission, cardiac excitation-contraction coupling, enzyme catalysis, and bone mineralization.",
        "mechanisms": "Hyperparathyroidism, malignancy (PTHrP), granulomatous disease, vitamin D intoxication; hypoparathyroidism, critical illness, severe vitamin D deficiency.",
        "limitations": "Approximately 40-45% is bound to albumin. Hypoalbuminemia falsely lowers total calcium; albumin correction or ionized calcium measurement is essential.",
        "references": "The Endocrine Society Hypercalcemia Guidelines; Tietz 7th Ed.",
    },
    "MG": {
        "significance": "Essential intracellular divalent cation; obligate cofactor for all ATP-dependent kinase enzymes, Na+/K+-ATPase, and DNA replication.",
        "mechanisms": "Renal wasting (diuretics, aminoglycosides, proton pump inhibitors), GI losses (chronic diarrhea, malabsorption), refeeding syndrome.",
        "limitations": "Serum magnesium represents <1% of total body magnesium stores; normal serum levels can coexist with severe intracellular depletion.",
        "references": "Tietz 7th Ed.",
    },
    "PHOS": {
        "significance": "Primary intracellular polyatomic anion involved in high-energy phosphodiester bonds (ATP, CP), nucleic acid backbone, and oxygen transport (2,3-DPG).",
        "mechanisms": "Impaired renal clearance (CKD), hypoparathyroidism, tumor lysis syndrome; or shift into cells in refeeding syndrome, DKA recovery, respiratory alkalosis.",
        "limitations": "Demonstrates significant circadian rhythm (nadir in morning) and postprandial shifts.",
        "references": "KDIGO CKD-MBD Guidelines; Tietz 7th Ed.",
    },
    "GLU": {
        "significance": "Primary metabolic fuel for central nervous system and erythrocytes; strictly regulated by insulin, glucagon, epinephrine, and cortisol.",
        "mechanisms": "Insulin resistance and relative beta-cell failure (Type 2 DM), autoimmune beta-cell destruction (Type 1 DM), acute stress response, or insulin excess.",
        "limitations": "Glycolysis in unseparated unpreserved collection tubes lowers glucose by ~5-7 mg/dL per hour; sodium fluoride tubes prevent in-vitro loss.",
        "references": "ADA Standards of Care in Diabetes 2024.",
    },
    "HBA1C": {
        "significance": "Non-enzymatic glycation of erythrocyte hemoglobin beta chain; indexes weighted mean glycemia over preceding 90-120 days.",
        "mechanisms": "Persistent ambient hyperglycemia over erythrocyte lifespan.",
        "limitations": "Inaccurate in conditions altering erythrocyte turnover (hemolytic anemia, hemoglobinopathies, recent transfusions, advanced CKD on erythropoietin).",
        "references": "ADA 2024; NGSP Standardized Reference.",
    },
    "CHOL": {
        "significance": "Major structural sterol in cellular lipid bilayers and precursor for bile acids and steroid hormones.",
        "mechanisms": "Atherogenic lipoprotein accumulation, familial hypercholesterolemia, dietary intake, hypothyroidism, nephrotic syndrome.",
        "limitations": "Total cholesterol alone lacks specificity for atherogenicity without partitioning into HDL and atherogenic apoB/LDL particles.",
        "references": "AHA/ACC 2018 Cholesterol Clinical Guidelines.",
    },
    "HDL": {
        "significance": "High-density lipoprotein; mediates reverse cholesterol transport from peripheral vascular macrophages to liver for biliary excretion.",
        "mechanisms": "Reduced by metabolic syndrome, smoking, systemic inflammation, insulin resistance, sedentary lifestyle.",
        "limitations": "Very high HDL (>90 mg/dL) does not confer progressive cardioprotection and may occasionally represent dysfunctional pro-inflammatory HDL particles.",
        "references": "NCEP ATP III / AHA 2018 Guidelines.",
    },
    "TRIG": {
        "significance": "Glycerol esterified with three fatty acids; transported in dietary chylomicrons and liver-derived VLDL.",
        "mechanisms": "Insulin resistance, obesity, excessive alcohol, familial hypertriglyceridemia, poorly controlled diabetes.",
        "limitations": "Severe hypertriglyceridemia (>=500 mg/dL) confers acute pancreatitis risk and invalidates Friedewald calculated LDL.",
        "references": "Endocrine Society Hypertriglyceridemia Guidelines.",
    },
}


def _assemble_profile_response(
    db: Session,
    profile_type: str,
    title: str,
    description: str,
    relevant_analyte_codes: List[str],
    patient_id: Optional[str] = None,
    encounter_id: Optional[str] = None,
) -> ProfileResponse:
    """Build a clinical biochemistry profile response respecting patient and accession boundaries."""
    patient: Optional[Patient] = None
    encounter: Optional[Encounter] = None
    results_map: Dict[str, LabResult] = {}

    if patient_id:
        patient = db.query(Patient).filter(Patient.id == patient_id).first()

    if encounter_id:
        encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
        if encounter and not patient:
            patient = encounter.patient
    elif patient:
        # Pick the most recent completed encounter for this patient
        encounter = (
            db.query(Encounter)
            .filter(Encounter.patient_id == patient.id)
            .order_by(Encounter.sample_collected_at.desc())
            .first()
        )

    if encounter:
        lab_results = (
            db.query(LabResult)
            .filter(LabResult.encounter_id == encounter.id)
            .all()
        )
        for r in lab_results:
            if r.analyte:
                results_map[r.analyte.code] = r

    # Fetch reference meta for all requested codes
    analytes_db = db.query(TestAnalyte).filter(TestAnalyte.code.in_(relevant_analyte_codes)).all()
    analytes_meta = {a.code: a for a in analytes_db}

    analyte_items: List[ProfileAnalyteItem] = []
    clinical_alerts: List[Dict[str, Any]] = []

    for code in relevant_analyte_codes:
        meta = analytes_meta.get(code)
        r = results_map.get(code)
        val = r.value_numeric if r else None
        flag = r.flag if r else "NOT_TESTED"
        unit = r.unit if r else (meta.default_unit if meta else "")
        ref_applied = r.reference_range_applied if r else "Normal range configured in library"
        name = meta.name if meta else code

        kn = ANALYTE_INTERPRETATION_KNOWLEDGE.get(code, {
            "significance": "Essential biochemical parameter.",
            "mechanisms": "Physiological and pathological alterations in cellular synthesis, membrane permeability, or organ clearance.",
            "limitations": "Must be correlated with clinical history and concurrent lab findings.",
            "references": "Tietz Textbook of Clinical Chemistry, 7th Ed.",
        })

        if flag in ["CRITICAL_LOW", "CRITICAL_HIGH"]:
            clinical_alerts.append({
                "severity": "CRITICAL",
                "analyte": code,
                "value": val,
                "unit": unit,
                "flag": flag,
                "message": f"Critical panic value for {name}: {val} {unit}. Immediate clinical attention required.",
            })
        elif flag in ["LOW", "HIGH"]:
            clinical_alerts.append({
                "severity": "HIGH",
                "analyte": code,
                "value": val,
                "unit": unit,
                "flag": flag,
                "message": f"Abnormal {name}: {val} {unit} ({flag}).",
            })

        analyte_items.append(ProfileAnalyteItem(
            analyte_code=code,
            analyte_name=name,
            value=val,
            unit=unit,
            flag=flag,
            reference_range=ref_applied,
            biochemical_significance=kn["significance"],
            relevant_mechanisms=kn["mechanisms"],
            limitations=kn["limitations"],
            references=kn["references"],
        ))

    # Compute derived indices based on profile type
    derived_indices: List[CalculationResponse] = []

    # Map current raw numeric values for convenience
    val_map = {k: r.value_numeric for k, r in results_map.items() if r.value_numeric is not None}

    if profile_type == "LIVER":
        # De Ritis Ratio
        ast = val_map.get("AST")
        alt = val_map.get("ALT")
        de_ritis = calculate_de_ritis_ratio(ast, alt)
        derived_indices.append(CalculationResponse(**de_ritis.to_dict()))

        # A/G Ratio if TP and Alb present
        tp = val_map.get("TP")
        alb = val_map.get("ALB")
        if tp is not None and alb is not None:
            ag_res = calculate_ag_protein_ratio(tp, alb)
            derived_indices.append(CalculationResponse(**ag_res.to_dict()))

    elif profile_type == "RENAL":
        creat = val_map.get("CREAT")
        bun = val_map.get("BUN")
        # eGFR
        age = patient.age_years if patient else 50
        sex = patient.biological_sex if patient else "MALE"
        egfr_res = calculate_egfr_ckd_epi_2021(creat, age, sex)
        derived_indices.append(CalculationResponse(**egfr_res.to_dict()))

        # BUN/Cr Ratio
        bun_cr_res = calculate_bun_creatinine_ratio(bun, creat)
        derived_indices.append(CalculationResponse(**bun_cr_res.to_dict()))

        # FENa if spot urine available
        s_na = val_map.get("NA")
        u_na = val_map.get("U_NA")
        u_cr = val_map.get("U_CREAT")
        if s_na is not None and creat is not None and u_na is not None and u_cr is not None:
            fena_res = calculate_fractional_excretion_of_sodium(s_na, creat, u_na, u_cr)
            derived_indices.append(CalculationResponse(**fena_res.to_dict()))

    elif profile_type == "ELECTROLYTE":
        na = val_map.get("NA")
        cl = val_map.get("CL")
        hco3 = val_map.get("HCO3")
        alb = val_map.get("ALB")
        ca = val_map.get("CA")
        glu = val_map.get("GLU")
        bun = val_map.get("BUN")
        osm_meas = val_map.get("OSM_MEAS")

        # Anion Gap
        ag_res = calculate_anion_gap(na, cl, hco3)
        derived_indices.append(CalculationResponse(**ag_res.to_dict()))

        # Albumin-Corrected Anion Gap
        if alb is not None:
            corr_ag_res = calculate_albumin_corrected_anion_gap(na, cl, hco3, alb)
            derived_indices.append(CalculationResponse(**corr_ag_res.to_dict()))

        # Albumin-Corrected Calcium
        if ca is not None and alb is not None:
            corr_ca_res = calculate_albumin_corrected_calcium(ca, alb)
            derived_indices.append(CalculationResponse(**corr_ca_res.to_dict()))

        # Serum Osmolality & Osmolal Gap
        if na is not None and glu is not None and bun is not None:
            osm_res = calculate_serum_osmolality(na, glu, bun)
            derived_indices.append(CalculationResponse(**osm_res.to_dict()))
            if osm_meas is not None and osm_res.output_value is not None:
                gap_res = calculate_osmolal_gap(osm_meas, osm_res.output_value)
                derived_indices.append(CalculationResponse(**gap_res.to_dict()))

    elif profile_type == "METABOLIC":
        glu = val_map.get("GLU")
        ins = val_map.get("INSULIN")
        if glu is not None and ins is not None:
            # HOMA-IR
            homa = round((glu * ins) / 405.0, 2)
            derived_indices.append(CalculationResponse(
                calculation_type="HOMA_IR",
                formula_name="HOMA-IR (Homeostatic Model Assessment of Insulin Resistance)",
                formula_latex=rf"\text{{HOMA-IR}} = \frac{{{glu} \times {ins}}}{{405}} = {homa}",
                formula_version="2024.1",
                inputs={"glucose": {"value": glu, "unit": "mg/dL"}, "insulin": {"value": ins, "unit": "uIU/mL"}},
                output_value=homa,
                output_unit="index",
                is_valid=True,
                status="HIGH" if homa > 2.5 else "NORMAL",
                interpretation="Insulin Resistance (>2.5)" if homa > 2.5 else "Insulin Sensitive (<1.9)",
                reference_range="< 1.90 (Insulin Sensitive)",
                assumptions=["Assumes overnight fasting sample."],
                limitations=["Not applicable in patients treated with exogenous insulin."],
                warnings=[],
                extra_metrics={},
                provenance_hash=_compute_provenance_hash("HOMA_IR", {"glu": glu, "ins": ins}),
                calculated_at=datetime.utcnow().isoformat() + "Z",
                disclaimer=CLINICAL_DECISION_SUPPORT_NOTICE,
            ))

    elif profile_type == "LIPID":
        chol = val_map.get("CHOL")
        hdl = val_map.get("HDL")
        trig = val_map.get("TRIG")
        ldl = val_map.get("LDL")
        lipid_dict = calculate_lipid_indices(chol, hdl, trig, ldl)
        for _, v in lipid_dict.items():
            derived_indices.append(CalculationResponse(**v.to_dict()))

    elif profile_type == "PROTEIN":
        tp = val_map.get("TP")
        alb = val_map.get("ALB")
        ag_res = calculate_ag_protein_ratio(tp, alb)
        derived_indices.append(CalculationResponse(**ag_res.to_dict()))

    return ProfileResponse(
        profile_type=profile_type,
        title=title,
        description=description,
        patient_id=patient.id if patient else None,
        patient_name=patient.full_name if patient else "Demonstration Specimen / Reference Case",
        patient_mrn=patient.mrn if patient else "DEMO-0000",
        encounter_id=encounter.id if encounter else None,
        accession_number=encounter.accession_number if encounter else "ACC-SAMPLE-001",
        sample_collected_at=encounter.sample_collected_at.isoformat() + "Z" if encounter else None,
        specimen_type=encounter.sample_type if encounter else "SERUM",
        analytes=analyte_items,
        derived_indices=derived_indices,
        clinical_alerts=clinical_alerts,
        disclaimer=CLINICAL_DECISION_SUPPORT_NOTICE,
    )


@router.get("/profiles/liver", response_model=ProfileResponse)
def get_liver_profile(
    patient_id: Optional[str] = None,
    encounter_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    codes = ["AST", "ALT", "ALP", "GGT", "TBIL", "DBIL", "ALB", "TP"]
    return _assemble_profile_response(
        db=db,
        profile_type="LIVER",
        title="Liver Function & Hepatic Injury Profile",
        description="Assesses hepatocellular integrity, biliary excretory function, cholestasis, and hepatic protein synthetic capacity.",
        relevant_analyte_codes=codes,
        patient_id=patient_id,
        encounter_id=encounter_id,
    )


@router.get("/profiles/renal", response_model=ProfileResponse)
def get_renal_profile(
    patient_id: Optional[str] = None,
    encounter_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    codes = ["CREAT", "BUN", "NA", "K", "CL", "U_NA", "U_CREAT"]
    return _assemble_profile_response(
        db=db,
        profile_type="RENAL",
        title="Renal Function & Nephrology Profile",
        description="Assesses glomerular filtration rate (2021 CKD-EPI), nitrogenous waste clearance, and tubular sodium handling (FENa).",
        relevant_analyte_codes=codes,
        patient_id=patient_id,
        encounter_id=encounter_id,
    )


@router.get("/profiles/electrolyte", response_model=ProfileResponse)
def get_electrolyte_profile(
    patient_id: Optional[str] = None,
    encounter_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    codes = ["NA", "K", "CL", "HCO3", "CA", "MG", "PHOS", "ALB", "GLU", "BUN", "OSM_MEAS"]
    return _assemble_profile_response(
        db=db,
        profile_type="ELECTROLYTE",
        title="Electrolyte, Mineral & Osmolality Profile",
        description="Evaluates fluid-electrolyte homeostasis, unmeasured charge gaps, calcium binding, and serum tonicity.",
        relevant_analyte_codes=codes,
        patient_id=patient_id,
        encounter_id=encounter_id,
    )


@router.get("/profiles/metabolic", response_model=ProfileResponse)
def get_metabolic_profile(
    patient_id: Optional[str] = None,
    encounter_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    codes = ["GLU", "HBA1C", "INSULIN", "URIC", "BUN", "CREAT"]
    return _assemble_profile_response(
        db=db,
        profile_type="METABOLIC",
        title="Glucose, Glycemia & Metabolic Profile",
        description="Evaluates short-term glycemia, long-term glycation, homeostatic insulin resistance, and purine catabolism.",
        relevant_analyte_codes=codes,
        patient_id=patient_id,
        encounter_id=encounter_id,
    )


@router.get("/profiles/lipid", response_model=ProfileResponse)
def get_lipid_profile(
    patient_id: Optional[str] = None,
    encounter_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    codes = ["CHOL", "HDL", "LDL", "TRIG"]
    return _assemble_profile_response(
        db=db,
        profile_type="LIPID",
        title="Lipid & Atherogenic Cardiovascular Profile",
        description="Quantifies circulating atherogenic lipoproteins, reverse cholesterol transport, and triglyceride burden.",
        relevant_analyte_codes=codes,
        patient_id=patient_id,
        encounter_id=encounter_id,
    )


@router.get("/profiles/protein", response_model=ProfileResponse)
def get_protein_profile(
    patient_id: Optional[str] = None,
    encounter_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    codes = ["TP", "ALB"]
    return _assemble_profile_response(
        db=db,
        profile_type="PROTEIN",
        title="Serum Protein & Albumin/Globulin Profile",
        description="Evaluates total intravascular protein concentration, albumin oncotic fraction, calculated globulins, and A/G ratio.",
        relevant_analyte_codes=codes,
        patient_id=patient_id,
        encounter_id=encounter_id,
    )


# ==============================================================================
# MODULE 5: PATIENT-LEVEL ANALYTICS
# ==============================================================================

@router.get("/analytics/patient/{patient_id}")
def get_patient_analytics(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Patient-level longitudinal analytical dashboard:
    Multi-analyte correlations, reference interval overlays, delta checks, calculation logs, and accessions.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    encounters = (
        db.query(Encounter)
        .filter(Encounter.patient_id == patient_id)
        .order_by(Encounter.sample_collected_at.asc())
        .all()
    )

    accessions = []
    analyte_history: Dict[str, List[Dict[str, Any]]] = {}

    for enc in encounters:
        accessions.append({
            "encounter_id": enc.id,
            "accession_number": enc.accession_number,
            "collected_at": enc.sample_collected_at.isoformat() + "Z",
            "specimen_type": enc.sample_type,
            "fasting_status": enc.fasting_status,
            "result_count": len(enc.results),
        })

        for r in enc.results:
            if not r.analyte:
                continue
            code = r.analyte.code
            if code not in analyte_history:
                analyte_history[code] = []

            analyte_history[code].append({
                "accession_number": enc.accession_number,
                "collected_at": enc.sample_collected_at.isoformat() + "Z",
                "value": r.value_numeric,
                "unit": r.unit,
                "flag": r.flag,
                "reference_range": r.reference_range_applied,
            })

    # Fetch calculation audit history for this patient
    calc_logs = (
        db.query(BiochemicalCalculationLog)
        .filter(BiochemicalCalculationLog.patient_id == patient_id)
        .order_by(BiochemicalCalculationLog.created_at.desc())
        .limit(25)
        .all()
    )
    calculation_history = []
    for cl in calc_logs:
        try:
            out_data = json.loads(cl.outputs_json)
        except Exception:
            out_data = {}
        calculation_history.append({
            "calculation_type": cl.calculation_type,
            "formula_name": cl.formula_name,
            "output_value": out_data.get("output_value"),
            "output_unit": out_data.get("output_unit"),
            "status": out_data.get("status"),
            "created_at": cl.created_at.isoformat() + "Z" if cl.created_at else None,
            "provenance_hash": cl.provenance_hash,
        })

    return {
        "patient": {
            "id": patient.id,
            "mrn": patient.mrn,
            "full_name": patient.full_name,
            "age_years": patient.age_years,
            "sex": patient.biological_sex,
        },
        "total_encounters": len(encounters),
        "accessions": accessions,
        "analyte_history": analyte_history,
        "calculation_history": calculation_history,
        "disclaimer": CLINICAL_DECISION_SUPPORT_NOTICE,
    }
