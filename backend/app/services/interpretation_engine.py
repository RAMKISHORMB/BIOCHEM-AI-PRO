from typing import Dict, Any, List, Optional
import math
from app.models.patient import Patient
from app.models.lab_result import LabResult
from app.models.lab_test import TestAnalyte

DISCLAIMER_TEXT = (
    "CLINICAL DECISION SUPPORT NOTICE: This automated biochemical interpretation is provided for "
    "educational and decision support assistance only. It does not formulate a definitive medical diagnosis, "
    "prescribe pharmacological therapies, or substitute for the clinical judgment of an attending physician "
    "or board-certified clinical pathologist."
)

def evaluate_analyte_flag(
    value: float,
    sex: str,
    age_years: int,
    reference_ranges: list
) -> tuple[str, str]:
    """
    Evaluate value against population-specific reference range.
    Returns (flag, reference_range_applied_str).
    Flags: NORMAL, LOW, HIGH, CRITICAL_LOW, CRITICAL_HIGH
    """
    applicable_range = None
    # 1. Match specific sex and age
    for r in reference_ranges:
        if r.biological_sex == sex and r.min_age_years <= age_years <= r.max_age_years:
            applicable_range = r
            break

    # 2. Match ALL sexes and age
    if not applicable_range:
        for r in reference_ranges:
            if r.biological_sex == "ALL" and r.min_age_years <= age_years <= r.max_age_years:
                applicable_range = r
                break

    # 3. Fallback to any defined range
    if not applicable_range and reference_ranges:
        applicable_range = reference_ranges[0]

    if not applicable_range:
        return "NORMAL", "No range configured"

    range_str = f"{applicable_range.lower_limit} - {applicable_range.upper_limit} {applicable_range.unit} ({applicable_range.source_authority})"

    # Critical Panic thresholds
    if applicable_range.critical_low is not None and value <= applicable_range.critical_low:
        return "CRITICAL_LOW", range_str
    if applicable_range.critical_high is not None and value >= applicable_range.critical_high:
        return "CRITICAL_HIGH", range_str

    # Standard out-of-range thresholds
    if value < applicable_range.lower_limit:
        return "LOW", range_str
    if value > applicable_range.upper_limit:
        return "HIGH", range_str

    return "NORMAL", range_str


def calculate_ckd_epi_2021(creatinine: float, age_years: int, sex: str) -> tuple[float, str]:
    """
    2021 CKD-EPI Race-Free Creatinine Equation.
    Returns (eGFR in mL/min/1.73m^2, KDIGO Stage description).
    """
    if creatinine <= 0 or age_years <= 0:
        return 0.0, "Invalid inputs"

    is_female = sex.upper() == "FEMALE"
    kappa = 0.7 if is_female else 0.9
    alpha = -0.241 if is_female else -0.302
    gender_mult = 1.012 if is_female else 1.0

    scr_over_kappa = creatinine / kappa
    min_term = min(scr_over_kappa, 1.0) ** alpha
    max_term = max(scr_over_kappa, 1.0) ** (-1.200)
    age_term = 0.9938 ** age_years

    egfr = 142.0 * min_term * max_term * age_term * gender_mult
    egfr_rounded = round(egfr, 1)

    # KDIGO Staging
    if egfr_rounded >= 90:
        stage = "G1 (Normal or High GFR)"
    elif egfr_rounded >= 60:
        stage = "G2 (Mildly Decreased)"
    elif egfr_rounded >= 45:
        stage = "G3a (Mildly to Moderately Decreased)"
    elif egfr_rounded >= 30:
        stage = "G3b (Moderately to Severely Decreased)"
    elif egfr_rounded >= 15:
        stage = "G4 (Severely Decreased)"
    else:
        stage = "G5 (Kidney Failure / End-Stage Renal Disease)"

    return egfr_rounded, stage


def run_biochemical_interpretation(
    patient: Patient,
    analyte_values: Dict[str, float]
) -> tuple[Dict[str, Any], List[Dict[str, Any]], str, str]:
    """
    Deterministic rule-based clinical biochemistry engine.
    Calculates indices, identifies critical physiological patterns, and generates structured interpretations.
    """
    indices: Dict[str, Any] = {}
    clinical_flags: List[Dict[str, Any]] = []
    diagnostic_notes: List[str] = []
    metabolic_alerts: List[str] = []

    # Map analytes by code
    na = analyte_values.get("NA")
    k = analyte_values.get("K")
    cl = analyte_values.get("CL")
    hco3 = analyte_values.get("HCO3")
    glu = analyte_values.get("GLU")
    bun = analyte_values.get("BUN")
    creat = analyte_values.get("CREAT")
    ca = analyte_values.get("CA")
    alb = analyte_values.get("ALB")
    tp = analyte_values.get("TP")
    alt = analyte_values.get("ALT")
    ast = analyte_values.get("AST")
    alp = analyte_values.get("ALP")
    tbil = analyte_values.get("TBIL")
    chol = analyte_values.get("CHOL")
    trig = analyte_values.get("TRIG")
    hdl = analyte_values.get("HDL")
    lip = analyte_values.get("LIP")
    amyl = analyte_values.get("AMYL")
    uric = analyte_values.get("URIC")
    insulin = analyte_values.get("INSULIN")

    # 1. Anion Gap = Na - (Cl + HCO3)
    if na is not None and cl is not None and hco3 is not None:
        ag = na - (cl + hco3)
        indices["anion_gap"] = {
            "value": round(ag, 1),
            "unit": "mmol/L",
            "normal_range": "8.0 - 16.0 mmol/L",
            "status": "ELEVATED" if ag > 16.0 else "NORMAL" if ag >= 8.0 else "LOW"
        }

        # Delta Gap & Delta Ratio
        if ag > 12.0 and hco3 < 24.0:
            delta_gap = ag - 12.0
            delta_hco3 = 24.0 - hco3
            delta_ratio = round(delta_gap / delta_hco3, 2) if delta_hco3 > 0 else None
            
            interpretation = "Mixed High AG + Normal AG Acidosis" if delta_ratio and delta_ratio < 0.8 else \
                             "Pure High Anion Gap Metabolic Acidosis" if delta_ratio and 0.8 <= delta_ratio <= 2.0 else \
                             "High AG Acidosis with concurrent Metabolic Alkalosis" if delta_ratio and delta_ratio > 2.0 else "Indeterminate"
            
            indices["delta_ratio"] = {
                "value": delta_ratio,
                "delta_gap": round(delta_gap, 1),
                "interpretation": interpretation
            }

            if ag > 16.0:
                clinical_flags.append({
                    "severity": "CRITICAL" if ag > 22.0 else "HIGH",
                    "title": "Elevated Anion Gap Metabolic Acidosis (HAGMA)",
                    "detail": f"Anion gap of {round(ag, 1)} mmol/L. Consider etiologies: Ketoacidosis (Diabetic, Alcoholic, Starvation), Lactic Acidosis, Renal Failure, Toxic Ingestions (Methanol, Ethylene Glycol, Salicylate)."
                })

    # 2. Calculated Serum Osmolality & Osmolar Gap
    if na is not None and glu is not None and bun is not None:
        calc_osm = (2.0 * na) + (glu / 18.0) + (bun / 2.8)
        indices["calculated_osmolality"] = {
            "value": round(calc_osm, 1),
            "unit": "mOsm/kg",
            "normal_range": "275.0 - 295.0 mOsm/kg"
        }

    # 3. BUN / Creatinine Ratio
    if bun is not None and creat is not None and creat > 0:
        bun_cr_ratio = round(bun / creat, 1)
        interpretation = "Prerenal Azotemia / Dehydration / Upper GI Bleed" if bun_cr_ratio > 20.0 else \
                         "Intrinsic Renal Parenchymal Disease / ATN" if bun_cr_ratio < 10.0 else \
                         "Normal or Postrenal Obstruction"
        indices["bun_creatinine_ratio"] = {
            "value": bun_cr_ratio,
            "interpretation": interpretation,
            "normal_range": "10.0 - 20.0"
        }

    # 4. 2021 CKD-EPI eGFR
    if creat is not None:
        egfr, ckd_stage = calculate_ckd_epi_2021(creat, patient.age_years, patient.biological_sex)
        indices["egfr_ckd_epi_2021"] = {
            "value": egfr,
            "unit": "mL/min/1.73m²",
            "stage": ckd_stage,
            "equation": "2021 CKD-EPI Creatinine (Race-Free)"
        }
        if egfr < 60.0:
            clinical_flags.append({
                "severity": "CRITICAL" if egfr < 15.0 else "HIGH",
                "title": f"Impaired Renal Function ({ckd_stage})",
                "detail": f"Estimated GFR {egfr} mL/min/1.73m². Requires nephrology review, drug dose adjustment, and monitoring."
            })

    # 5. Albumin-Corrected Calcium
    if ca is not None and alb is not None:
        if alb < 4.0:
            corrected_ca = round(ca + 0.8 * (4.0 - alb), 2)
            indices["corrected_calcium"] = {
                "value": corrected_ca,
                "unit": "mg/dL",
                "formula": "Total Ca + 0.8 * (4.0 - Albumin)",
                "note": f"Adjusted for hypoalbuminemia (Albumin: {alb} g/dL, Raw Total Ca: {ca} mg/dL)"
            }
            if corrected_ca > 10.2:
                clinical_flags.append({
                    "severity": "HIGH",
                    "title": "Hypercalcemia (Corrected)",
                    "detail": f"Corrected serum calcium is {corrected_ca} mg/dL (unmasked by hypoalbuminemia correction)."
                })
            elif corrected_ca < 8.6:
                clinical_flags.append({
                    "severity": "HIGH",
                    "title": "Hypocalcemia (Corrected)",
                    "detail": f"Corrected serum calcium is {corrected_ca} mg/dL."
                })

    # 6. De Ritis Ratio (AST / ALT) & Hepatic Injury Pattern
    if ast is not None and alt is not None and alt > 0:
        de_ritis = round(ast / alt, 2)
        de_ritis_interp = (
            "Elevated AST/ALT ratio (>2.0). Nonspecific finding; cannot establish etiology. "
            "Interpret alongside clinical history, absolute activities, medication exposure, and imaging."
            if de_ritis > 2.0 else
            "AST/ALT ratio between 1.0 and 2.0. Nonspecific intermediate ratio; cannot establish etiology."
            if de_ritis >= 1.0 else
            "AST/ALT ratio below 1.0 (ALT greater than AST). Nonspecific finding; does not establish viral hepatitis or NAFLD."
        )
        indices["de_ritis_ratio"] = {
            "value": de_ritis,
            "interpretation": de_ritis_interp
        }

        # R-Factor for Hepatocellular vs Cholestatic Liver Injury (if ALP available)
        # R = (ALT / ULN_ALT) / (ALP / ULN_ALP)  [Using standard ULN: ALT 35 U/L, ALP 120 U/L]
        if alp is not None and alp > 0:
            alt_ratio = alt / 35.0
            alp_ratio = alp / 120.0
            r_factor = round(alt_ratio / alp_ratio, 2)
            pattern = "Hepatocellular Injury (R > 5.0)" if r_factor > 5.0 else \
                      "Cholestatic Pattern (R < 2.0)" if r_factor < 2.0 else \
                      "Mixed Hepatocellular/Cholestatic Pattern (2.0 <= R <= 5.0)"
            indices["liver_injury_r_factor"] = {
                "value": r_factor,
                "pattern": pattern
            }

    # 7. Albumin-to-Globulin Ratio
    if tp is not None and alb is not None and tp > alb:
        globulin = round(tp - alb, 2)
        ag_protein_ratio = round(alb / globulin, 2) if globulin > 0 else None
        indices["albumin_globulin_ratio"] = {
            "calculated_globulin": globulin,
            "ag_ratio": ag_protein_ratio,
            "unit": "g/dL",
            "normal_range": "1.2 - 2.2"
        }
        if ag_protein_ratio is not None and ag_protein_ratio < 1.0:
            clinical_flags.append({
                "severity": "HIGH",
                "title": "Inverted A/G Ratio (< 1.0)",
                "detail": f"Albumin-to-Globulin ratio is {ag_protein_ratio}. Consider monoclonal gammopathy (Multiple Myeloma), polyclonal hypergammaglobulinemia, or severe hepatic cirrhosis."
            })

    # 8. Friedewald Calculated LDL & Non-HDL Cholesterol
    if chol is not None and hdl is not None:
        non_hdl = round(chol - hdl, 1)
        indices["non_hdl_cholesterol"] = {
            "value": non_hdl,
            "unit": "mg/dL",
            "target": "< 130 mg/dL"
        }
        if trig is not None:
            if trig < 400.0:
                ldl_calc = round(chol - hdl - (trig / 5.0), 1)
                indices["friedewald_ldl"] = {
                    "value": ldl_calc,
                    "unit": "mg/dL",
                    "valid": True
                }
            else:
                indices["friedewald_ldl"] = {
                    "valid": False,
                    "reason": "Invalid when Triglycerides >= 400 mg/dL (Chylomicron interference requires direct LDL assay)"
                }

    # 9. HOMA-IR (Homeostatic Model Assessment for Insulin Resistance)
    if glu is not None and insulin is not None:
        homa_ir = round((glu * insulin) / 405.0, 2)
        indices["homa_ir"] = {
            "value": homa_ir,
            "interpretation": "Significant Insulin Resistance" if homa_ir > 2.5 else "Borderline" if homa_ir >= 1.9 else "Insulin Sensitive (< 1.9)"
        }

    # --- Urgent Critical Panic Pattern Detection ---
    if k is not None:
        if k >= 6.2:
            clinical_flags.append({
                "severity": "CRITICAL",
                "title": "CRITICAL HYPERKALEMIA PANIC ALERT",
                "detail": f"Serum potassium {k} mmol/L poses immediate risk of lethal cardiac arrhythmias (peaked T waves, sine-wave progression, asystole). Obtain immediate 12-lead ECG and initiate membrane stabilization (calcium gluconate)."
            })
        elif k <= 2.8:
            clinical_flags.append({
                "severity": "CRITICAL",
                "title": "CRITICAL HYPOKALEMIA PANIC ALERT",
                "detail": f"Serum potassium {k} mmol/L. Risk of ventricular tachycardia, Torsades de Pointes, and respiratory paralysis."
            })

    if na is not None:
        if na <= 120.0:
            clinical_flags.append({
                "severity": "CRITICAL",
                "title": "CRITICAL HYPONATREMIA PANIC ALERT",
                "detail": f"Serum sodium {na} mmol/L. High risk of cerebral edema, seizures, and herniation. Correct cautiously to avoid osmotic demyelination syndrome."
            })
        elif na >= 160.0:
            clinical_flags.append({
                "severity": "CRITICAL",
                "title": "CRITICAL HYPERNATREMIA PANIC ALERT",
                "detail": f"Serum sodium {na} mmol/L indicates severe hyperosmolar dehydration."
            })

    if glu is not None:
        if glu <= 54.0:
            clinical_flags.append({
                "severity": "CRITICAL",
                "title": "NEUROGLYCOPENIC HYPOGLYCEMIA ALERT",
                "detail": f"Fasting glucose {glu} mg/dL requires immediate dextrose administration to prevent permanent cognitive injury."
            })
        elif glu >= 400.0:
            clinical_flags.append({
                "severity": "CRITICAL",
                "title": "SEVERE HYPERGLYCEMIA ALERT",
                "detail": f"Serum glucose {glu} mg/dL. Assess immediately for Diabetic Ketoacidosis (DKA) or Hyperosmolar Hyperglycemic State (HHS)."
            })

    if (lip is not None and lip >= 180.0) or (amyl is not None and amyl >= 300.0):
        clinical_flags.append({
            "severity": "CRITICAL",
            "title": "ACUTE PANCREATITIS BIOCHEMICAL TRIAD",
            "detail": f"Pancreatic enzymes elevated > 3x upper reference limit (Lipase: {lip} U/L, Amylase: {amyl} U/L). Strongly diagnostic for acute pancreatitis in concordant clinical context."
        })

    # Diagnostic summary synthesis
    if clinical_flags:
        diagnostic_notes.append(f"Identified {len(clinical_flags)} prioritized clinical biochemical findings.")
        for f in clinical_flags:
            diagnostic_notes.append(f"• [{f['severity']}] {f['title']}: {f['detail']}")
    else:
        diagnostic_notes.append("No critical panic biochemical alerts identified in current panel profile.")

    # Metabolic alerts synthesis
    if indices.get("anion_gap", {}).get("status") == "ELEVATED":
        metabolic_alerts.append("Elevated Anion Gap: Review organic acid accumulation (lactate, beta-hydroxybutyrate, acetoacetate).")
    if indices.get("bun_creatinine_ratio", {}).get("value", 0) > 20.0:
        metabolic_alerts.append("BUN/Cr ratio > 20:1 suggests prerenal perfusion deficit; assess intravascular volume and fluid balance.")
    if indices.get("egfr_ckd_epi_2021", {}).get("value", 100) < 60.0:
        metabolic_alerts.append(f"Renal Impairment: CKD-EPI eGFR indicates {indices['egfr_ckd_epi_2021']['stage']}.")

    return (
        indices,
        clinical_flags,
        "\n".join(diagnostic_notes),
        "\n".join(metabolic_alerts) if metabolic_alerts else "All standard metabolic pathways in nominal physiological equilibrium."
    )
