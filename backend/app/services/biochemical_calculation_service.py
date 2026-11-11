"""
BIOCHEM AI PRO — Comprehensive Validated Biochemical Calculation & Interpretation Engine
Academic Medical Biochemistry Decision-Support Prototype.
Deterministic, unit-validated, clinically referenced mathematical engine.
"""

from typing import Dict, Any, List, Optional, Tuple
import math
from datetime import datetime
import hashlib
import json

CLINICAL_DECISION_SUPPORT_NOTICE = (
    "CLINICAL DECISION SUPPORT NOTICE: This automated biochemical calculation and analysis "
    "is provided for educational and clinical decision-support purposes only. It does not formulate "
    "an autonomous medical diagnosis or therapeutic prescription. Clinical correlation by a "
    "board-certified pathologist or attending physician is mandatory."
)


def _compute_provenance_hash(formula_name: str, inputs: Dict[str, Any]) -> str:
    """Compute deterministic cryptographic SHA-256 provenance hash of calculation."""
    payload = f"{formula_name}:{json.dumps(inputs, sort_keys=True)}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


class BiochemicalCalculationResult:
    """Standardized calculation result container preserving provenance and limitations."""
    def __init__(
        self,
        calculation_type: str,
        formula_name: str,
        formula_latex: str,
        formula_version: str,
        inputs: Dict[str, Any],
        output_value: Optional[float],
        output_unit: str,
        is_valid: bool,
        status: str,
        interpretation: Optional[str] = None,
        reference_range: Optional[str] = None,
        assumptions: Optional[List[str]] = None,
        limitations: Optional[List[str]] = None,
        warnings: Optional[List[str]] = None,
        extra_metrics: Optional[Dict[str, Any]] = None,
    ):
        self.calculation_type = calculation_type
        self.formula_name = formula_name
        self.formula_latex = formula_latex
        self.formula_version = formula_version
        self.inputs = inputs
        self.output_value = output_value
        self.output_unit = output_unit
        self.is_valid = is_valid
        self.status = status
        self.interpretation = interpretation
        self.reference_range = reference_range
        self.assumptions = assumptions or []
        self.limitations = limitations or []
        self.warnings = warnings or []
        self.extra_metrics = extra_metrics or {}
        self.provenance_hash = _compute_provenance_hash(formula_name, inputs)
        self.calculated_at = datetime.utcnow().isoformat() + "Z"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "calculation_type": self.calculation_type,
            "formula_name": self.formula_name,
            "formula_latex": self.formula_latex,
            "formula_version": self.formula_version,
            "inputs": self.inputs,
            "output_value": self.output_value,
            "output_unit": self.output_unit,
            "is_valid": self.is_valid,
            "status": self.status,
            "interpretation": self.interpretation,
            "reference_range": self.reference_range,
            "assumptions": self.assumptions,
            "limitations": self.limitations,
            "warnings": self.warnings,
            "extra_metrics": self.extra_metrics,
            "provenance_hash": self.provenance_hash,
            "calculated_at": self.calculated_at,
            "disclaimer": CLINICAL_DECISION_SUPPORT_NOTICE,
        }


# ==============================================================================
# MODULE 1: INDIVIDUAL BIOCHEMICAL CALCULATION FUNCTIONS
# ==============================================================================

def calculate_de_ritis_ratio(
    ast: Optional[float],
    alt: Optional[float],
    ast_unit: str = "U/L",
    alt_unit: str = "U/L",
) -> BiochemicalCalculationResult:
    """
    De Ritis Ratio = AST / ALT
    Requires AST and ALT in U/L.
    """
    inputs = {
        "ast": {"value": ast, "unit": ast_unit},
        "alt": {"value": alt, "unit": alt_unit},
    }

    # Input presence validation
    if ast is None or alt is None:
        missing = [k for k, v in inputs.items() if v["value"] is None]
        return BiochemicalCalculationResult(
            calculation_type="DE_RITIS",
            formula_name="De Ritis Ratio (AST/ALT)",
            formula_latex=r"\text{De Ritis Ratio} = \frac{\text{AST}}{\text{ALT}}",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit="ratio",
            is_valid=False,
            status="MISSING_INPUTS",
            warnings=[f"Missing required input(s): {', '.join(missing)}."],
        )

    # Unit validation
    if ast_unit.strip().upper() != "U/L" or alt_unit.strip().upper() != "U/L":
        return BiochemicalCalculationResult(
            calculation_type="DE_RITIS",
            formula_name="De Ritis Ratio (AST/ALT)",
            formula_latex=r"\text{De Ritis Ratio} = \frac{\text{AST}}{\text{ALT}}",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit="ratio",
            is_valid=False,
            status="INCOMPATIBLE_UNITS",
            warnings=[f"Incompatible units: AST is '{ast_unit}' and ALT is '{alt_unit}'. Expected 'U/L'."],
        )

    # Non-negative check
    if ast < 0 or alt < 0:
        return BiochemicalCalculationResult(
            calculation_type="DE_RITIS",
            formula_name="De Ritis Ratio (AST/ALT)",
            formula_latex=r"\text{De Ritis Ratio} = \frac{\text{AST}}{\text{ALT}}",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit="ratio",
            is_valid=False,
            status="INVALID_VALUE",
            warnings=["Enzyme activities cannot be negative."],
        )

    # Zero denominator
    if alt == 0:
        return BiochemicalCalculationResult(
            calculation_type="DE_RITIS",
            formula_name="De Ritis Ratio (AST/ALT)",
            formula_latex=r"\text{De Ritis Ratio} = \frac{\text{AST}}{\text{ALT}}",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit="ratio",
            is_valid=False,
            status="ZERO_DENOMINATOR",
            warnings=["ALT activity is 0 U/L. Division by zero is undefined."],
        )

    ratio = round(ast / alt, 2)

    if ratio > 2.0:
        interp = (
            "Elevated AST/ALT ratio. Ratios above 2 have been reported in certain clinical contexts, "
            "including alcohol-associated liver disease, but this finding is nonspecific and cannot establish etiology. "
            "Interpret alongside absolute aminotransferase activities, clinical history, medication exposure, "
            "hemolysis status and other relevant investigations."
        )
    elif ratio >= 1.0:
        interp = (
            "AST/ALT ratio between 1.0 and 2.0. Ratios in this range are observed across various hepatic and extra-hepatic "
            "conditions as well as normal variation. This finding is nonspecific and cannot establish etiology. "
            "Interpret alongside absolute aminotransferase activities, clinical history, medication exposure, "
            "hemolysis status and other relevant investigations."
        )
    else:
        interp = (
            "AST/ALT ratio below 1.0 (ALT greater than AST). While ALT predominance can occur in diverse acute or chronic "
            "liver conditions, a ratio below 1 does not establish a specific diagnosis such as viral hepatitis or NAFLD. "
            "Interpret alongside absolute aminotransferase activities, clinical history, medication exposure, "
            "hemolysis status and other relevant investigations."
        )

    return BiochemicalCalculationResult(
        calculation_type="DE_RITIS",
        formula_name="De Ritis Ratio (AST/ALT)",
        formula_latex=r"\text{De Ritis Ratio} = \frac{\text{AST}}{\text{ALT}}",
        formula_version="2024.1",
        inputs=inputs,
        output_value=ratio,
        output_unit="ratio",
        is_valid=True,
        status="NORMAL" if 0.7 <= ratio <= 1.3 else "ELEVATED" if ratio > 1.3 else "LOW",
        interpretation=interp,
        reference_range="0.70 - 1.30",
        assumptions=[
            "Assumes both AST and ALT were measured on the same serum/plasma specimen using standardized IFCC 37°C methods with pyridoxal-5'-phosphate.",
            "Assumes no severe in-vitro hemolysis (erythrocyte AST release falsely elevates AST).",
        ],
        limitations=[
            "Must never be used in isolation for diagnosis. Extra-hepatic sources (rhabdomyolysis, myocardial injury, strenuous exercise) can elevate AST independently.",
            "De Ritis ratio does not establish etiology or replace clinical evaluation, hepatic imaging, elastography, or histological biopsy.",
        ],
    )


def calculate_albumin_corrected_calcium(
    total_calcium: Optional[float],
    albumin: Optional[float],
    calcium_unit: str = "mg/dL",
    albumin_unit: str = "g/dL",
    reference_albumin: float = 4.0,
) -> BiochemicalCalculationResult:
    """
    Albumin-Corrected Calcium = Measured Ca + 0.8 * (Reference Albumin - Measured Albumin)
    Or SI: Measured Ca + 0.02 * (40 - Albumin g/L)
    """
    inputs = {
        "total_calcium": {"value": total_calcium, "unit": calcium_unit},
        "albumin": {"value": albumin, "unit": albumin_unit},
        "reference_albumin": {"value": reference_albumin, "unit": albumin_unit},
    }

    if total_calcium is None or albumin is None:
        missing = [k for k, v in inputs.items() if v["value"] is None and k != "reference_albumin"]
        return BiochemicalCalculationResult(
            calculation_type="CORRECTED_CALCIUM",
            formula_name="Albumin-Corrected Calcium (Payne Formula)",
            formula_latex=r"\text{Corrected Ca (mg/dL)} = \text{Total Ca} + 0.8 \times (4.0 - \text{Albumin})",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit=calcium_unit,
            is_valid=False,
            status="MISSING_INPUTS",
            warnings=[f"Missing required input(s): {', '.join(missing)}."],
        )

    # Unit validation
    c_unit = calcium_unit.strip().lower()
    a_unit = albumin_unit.strip().lower()

    if total_calcium <= 0 or albumin <= 0:
        return BiochemicalCalculationResult(
            calculation_type="CORRECTED_CALCIUM",
            formula_name="Albumin-Corrected Calcium (Payne Formula)",
            formula_latex=r"\text{Corrected Ca} = \text{Total Ca} + 0.8 \times (\text{Ref Alb} - \text{Alb})",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit=calcium_unit,
            is_valid=False,
            status="INVALID_VALUE",
            warnings=["Calcium and albumin concentrations must be positive physiological numbers."],
        )

    if c_unit == "mg/dl" and a_unit == "g/dl":
        corrected_ca = round(total_calcium + 0.8 * (reference_albumin - albumin), 2)
        ref_range = "8.6 - 10.2 mg/dL"
        low_thresh = 8.6
        high_thresh = 10.2
        latex_str = rf"\text{{Corrected Ca (mg/dL)}} = {total_calcium} + 0.8 \times ({reference_albumin} - {albumin}) = {corrected_ca}"
    elif c_unit == "mmol/l" and a_unit in ["g/l", "g/dl"]:
        alb_gl = albumin * 10.0 if a_unit == "g/dl" else albumin
        ref_alb_gl = reference_albumin * 10.0 if reference_albumin < 10.0 else reference_albumin
        corrected_ca = round(total_calcium + 0.02 * (ref_alb_gl - alb_gl), 2)
        ref_range = "2.15 - 2.55 mmol/L"
        low_thresh = 2.15
        high_thresh = 2.55
        latex_str = rf"\text{{Corrected Ca (mmol/L)}} = {total_calcium} + 0.02 \times ({ref_alb_gl} - {alb_gl}) = {corrected_ca}"
    else:
        return BiochemicalCalculationResult(
            calculation_type="CORRECTED_CALCIUM",
            formula_name="Albumin-Corrected Calcium (Payne Formula)",
            formula_latex=r"\text{Corrected Ca} = \text{Total Ca} + 0.8 \times (\text{Ref Alb} - \text{Alb})",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit=calcium_unit,
            is_valid=False,
            status="INCOMPATIBLE_UNITS",
            warnings=[f"Incompatible unit pair: Calcium '{calcium_unit}' and Albumin '{albumin_unit}'. Expected mg/dL & g/dL, or mmol/L & g/L."],
        )

    if corrected_ca < low_thresh:
        interp = "Hypocalcemia (adjusted for albumin binding)"
        status = "LOW"
    elif corrected_ca > high_thresh:
        interp = "Hypercalcemia (adjusted for albumin binding)"
        status = "HIGH"
    else:
        interp = "Eucalcemia (within reference interval)"
        status = "NORMAL"

    return BiochemicalCalculationResult(
        calculation_type="CORRECTED_CALCIUM",
        formula_name="Albumin-Corrected Calcium (Payne Formula)",
        formula_latex=latex_str,
        formula_version="2024.1",
        inputs=inputs,
        output_value=corrected_ca,
        output_unit=calcium_unit,
        is_valid=True,
        status=status,
        interpretation=interp,
        reference_range=ref_range,
        assumptions=[
            f"Assumes 1 g/dL decline in serum albumin reduces bound calcium by 0.8 mg/dL (or 0.02 mmol/L per g/L albumin).",
            f"Reference baseline serum albumin is configured at {reference_albumin} {albumin_unit}.",
        ],
        limitations=[
            "Inaccurate in end-stage renal disease (ESRD), hyperphosphatemia, and critical illness.",
            "Significant systemic acid-base alterations change calcium-albumin affinity (acidosis decreases binding, alkalosis increases binding).",
            "Direct measurement of free ionized calcium (iCa²⁺) via blood gas/ISE analyzer remains the clinical gold standard.",
        ],
    )


def calculate_anion_gap(
    na: Optional[float],
    cl: Optional[float],
    hco3: Optional[float],
    unit: str = "mmol/L",
) -> BiochemicalCalculationResult:
    """
    Serum Anion Gap = Na - (Cl + HCO3)
    Units in mmol/L or mEq/L.
    """
    inputs = {
        "na": {"value": na, "unit": unit},
        "cl": {"value": cl, "unit": unit},
        "hco3": {"value": hco3, "unit": unit},
    }

    if na is None or cl is None or hco3 is None:
        missing = [k for k, v in inputs.items() if v["value"] is None]
        return BiochemicalCalculationResult(
            calculation_type="ANION_GAP",
            formula_name="Serum Anion Gap",
            formula_latex=r"\text{Anion Gap} = \text{Na}^+ - (\text{Cl}^- + \text{HCO}_3^-)",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit=unit,
            is_valid=False,
            status="MISSING_INPUTS",
            warnings=[f"Missing required electrolyte(s): {', '.join(missing)}."],
        )

    u_norm = unit.strip().lower()
    if u_norm not in ["mmol/l", "meq/l"]:
        return BiochemicalCalculationResult(
            calculation_type="ANION_GAP",
            formula_name="Serum Anion Gap",
            formula_latex=r"\text{Anion Gap} = \text{Na}^+ - (\text{Cl}^- + \text{HCO}_3^-)",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit=unit,
            is_valid=False,
            status="INCOMPATIBLE_UNITS",
            warnings=[f"Invalid electrolyte unit '{unit}'. Expected 'mmol/L' or 'mEq/L'."],
        )

    if na <= 0 or cl <= 0 or hco3 <= 0:
        return BiochemicalCalculationResult(
            calculation_type="ANION_GAP",
            formula_name="Serum Anion Gap",
            formula_latex=r"\text{Anion Gap} = \text{Na}^+ - (\text{Cl}^- + \text{HCO}_3^-)",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit=unit,
            is_valid=False,
            status="INVALID_VALUE",
            warnings=["Electrolyte concentrations must be positive numbers."],
        )

    ag = round(na - (cl + hco3), 1)

    if ag > 16.0:
        interp = "High Anion Gap Metabolic Acidosis (HAGMA) highly likely (MUDPILES / GOLD MARK etiologies)"
        status = "CRITICAL_HIGH" if ag > 22.0 else "HIGH"
    elif ag > 12.0:
        interp = "Mildly elevated anion gap (borderline HAGMA)"
        status = "HIGH"
    elif ag < 4.0:
        interp = "Low Anion Gap (consider severe hypoalbuminemia, paraproteinemia/multiple myeloma, bromide/lithium toxicity)"
        status = "LOW"
    else:
        interp = "Normal Anion Gap"
        status = "NORMAL"

    return BiochemicalCalculationResult(
        calculation_type="ANION_GAP",
        formula_name="Serum Anion Gap",
        formula_latex=rf"\text{{Anion Gap}} = {na} - ({cl} + {hco3}) = {ag}\ \text{{{unit}}}",
        formula_version="2024.1",
        inputs=inputs,
        output_value=ag,
        output_unit=unit,
        is_valid=True,
        status=status,
        interpretation=interp,
        reference_range="8.0 - 12.0 mmol/L (modern ISE)",
        assumptions=[
            "Assumes serum sodium, chloride, and bicarbonate are measured concurrently on the same specimen.",
            "Normal baseline anion gap is predominantly constituted by unmeasured polyanionic serum albumin (~10-12 mEq/L).",
        ],
        limitations=[
            "Serum albumin level heavily influences anion gap; severe hypoalbuminemia masks elevated anion gap unless albumin correction is performed.",
            "Laboratory analyzer specific ISE variations may slightly shift baseline reference intervals.",
        ],
    )


def calculate_albumin_corrected_anion_gap(
    na: Optional[float],
    cl: Optional[float],
    hco3: Optional[float],
    albumin: Optional[float],
    electrolyte_unit: str = "mmol/L",
    albumin_unit: str = "g/dL",
    reference_albumin: float = 4.0,
) -> BiochemicalCalculationResult:
    """
    Albumin-Corrected Anion Gap (Figge-Jabor-Kazda-Fencl / Payne)
    Corrected AG = AG + 2.5 * (Reference Albumin - Measured Albumin)
    """
    inputs = {
        "na": {"value": na, "unit": electrolyte_unit},
        "cl": {"value": cl, "unit": electrolyte_unit},
        "hco3": {"value": hco3, "unit": electrolyte_unit},
        "albumin": {"value": albumin, "unit": albumin_unit},
        "reference_albumin": {"value": reference_albumin, "unit": albumin_unit},
    }

    if na is None or cl is None or hco3 is None or albumin is None:
        missing = [k for k, v in inputs.items() if v["value"] is None and k != "reference_albumin"]
        return BiochemicalCalculationResult(
            calculation_type="CORRECTED_ANION_GAP",
            formula_name="Albumin-Corrected Anion Gap (Figge-Jabor-Kazda Formula)",
            formula_latex=r"\text{Corrected AG} = \text{AG} + 2.5 \times (\text{Ref Alb} - \text{Albumin})",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit=electrolyte_unit,
            is_valid=False,
            status="MISSING_INPUTS",
            warnings=[f"Missing required input(s): {', '.join(missing)}."],
        )

    # Unit checks
    if albumin_unit.strip().lower() not in ["g/dl", "g/l"]:
        return BiochemicalCalculationResult(
            calculation_type="CORRECTED_ANION_GAP",
            formula_name="Albumin-Corrected Anion Gap (Figge-Jabor-Kazda Formula)",
            formula_latex=r"\text{Corrected AG} = \text{AG} + 2.5 \times (\text{Ref Alb} - \text{Albumin})",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit=electrolyte_unit,
            is_valid=False,
            status="INCOMPATIBLE_UNITS",
            warnings=[f"Invalid albumin unit '{albumin_unit}'. Expected 'g/dL' or 'g/L'."],
        )

    if na <= 0 or cl <= 0 or hco3 <= 0 or albumin <= 0:
        return BiochemicalCalculationResult(
            calculation_type="CORRECTED_ANION_GAP",
            formula_name="Albumin-Corrected Anion Gap",
            formula_latex=r"\text{Corrected AG} = \text{AG} + 2.5 \times (\text{Ref Alb} - \text{Albumin})",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit=electrolyte_unit,
            is_valid=False,
            status="INVALID_VALUE",
            warnings=["Electrolyte and albumin concentrations must be positive numbers."],
        )

    alb_g_dl = albumin / 10.0 if albumin_unit.strip().lower() == "g/l" else albumin
    ref_g_dl = reference_albumin / 10.0 if reference_albumin > 10.0 else reference_albumin

    raw_ag = na - (cl + hco3)
    correction = 2.5 * (ref_g_dl - alb_g_dl)
    corrected_ag = round(raw_ag + correction, 1)

    if corrected_ag > 16.0:
        interp = "Unmasked High Anion Gap Metabolic Acidosis (HAGMA) due to hypoalbuminemia correction"
        status = "HIGH"
    elif corrected_ag > 12.0:
        interp = "Borderline elevated corrected anion gap"
        status = "HIGH"
    elif corrected_ag < 4.0:
        interp = "Low corrected anion gap (consider paraproteinemia, unmeasured cations)"
        status = "LOW"
    else:
        interp = "Normal corrected anion gap"
        status = "NORMAL"

    return BiochemicalCalculationResult(
        calculation_type="CORRECTED_ANION_GAP",
        formula_name="Albumin-Corrected Anion Gap (Figge-Jabor-Kazda Formula)",
        formula_latex=rf"\text{{Corrected AG}} = {raw_ag:.1f} + 2.5 \times ({ref_g_dl:.1f} - {alb_g_dl:.1f}) = {corrected_ag:.1f}\ \text{{{electrolyte_unit}}}",
        formula_version="2024.1",
        inputs=inputs,
        output_value=corrected_ag,
        output_unit=electrolyte_unit,
        is_valid=True,
        status=status,
        interpretation=interp,
        reference_range="8.0 - 12.0 mmol/L",
        assumptions=[
            f"Assumes each 1.0 g/dL drop in serum albumin below normal ({ref_g_dl} g/dL) reduces unmeasured anions by 2.5 mEq/L.",
            "Based on the Figge-Jabor-Kazda-Fencl physical chemistry model of human plasma protein charges at pH 7.40.",
        ],
        limitations=[
            "Severe blood pH deviations alter net albumin net negative charge density.",
            "Does not replace evaluation of serum lactate, beta-hydroxybutyrate, and renal retention metabolites.",
        ],
        extra_metrics={
            "raw_anion_gap": round(raw_ag, 1),
            "albumin_offset": round(correction, 1),
        },
    )


def calculate_serum_osmolality(
    na: Optional[float],
    glucose: Optional[float],
    bun: Optional[float],
    na_unit: str = "mmol/L",
    glucose_unit: str = "mg/dL",
    bun_unit: str = "mg/dL",
) -> BiochemicalCalculationResult:
    """
    Calculated Serum Osmolality = 2*Na + Glucose/18 + BUN/2.8 (mg/dL)
    Or SI: 2*Na + Glucose + Urea (mmol/L)
    """
    inputs = {
        "na": {"value": na, "unit": na_unit},
        "glucose": {"value": glucose, "unit": glucose_unit},
        "bun": {"value": bun, "unit": bun_unit},
    }

    if na is None or glucose is None or bun is None:
        missing = [k for k, v in inputs.items() if v["value"] is None]
        return BiochemicalCalculationResult(
            calculation_type="CALCULATED_OSMOLALITY",
            formula_name="Calculated Serum Osmolality (Smith-Line Formula)",
            formula_latex=r"\text{Osmolality} = 2[\text{Na}^+] + \frac{[\text{Glucose}]}{18} + \frac{[\text{BUN}]}{2.8}",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit="mOsm/kg",
            is_valid=False,
            status="MISSING_INPUTS",
            warnings=[f"Missing required solute(s): {', '.join(missing)}."],
        )

    g_unit = glucose_unit.strip().lower()
    b_unit = bun_unit.strip().lower()

    if na <= 0 or glucose <= 0 or bun <= 0:
        return BiochemicalCalculationResult(
            calculation_type="CALCULATED_OSMOLALITY",
            formula_name="Calculated Serum Osmolality",
            formula_latex=r"\text{Osmolality} = 2[\text{Na}^+] + \frac{[\text{Glucose}]}{18} + \frac{[\text{BUN}]}{2.8}",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit="mOsm/kg",
            is_valid=False,
            status="INVALID_VALUE",
            warnings=["Solute concentrations must be positive numbers."],
        )

    if g_unit == "mg/dl" and b_unit == "mg/dl":
        calc_osm = round((2.0 * na) + (glucose / 18.0) + (bun / 2.8), 1)
        latex_str = rf"\text{{Osmolality}} = 2({na}) + \frac{{{glucose}}}{{18}} + \frac{{{bun}}}{{2.8}} = {calc_osm}\ \text{{mOsm/kg}}"
    elif g_unit == "mmol/l" and b_unit in ["mmol/l", "mg/dl"]:
        bun_mmol = bun if b_unit == "mmol/l" else bun / 2.8
        calc_osm = round((2.0 * na) + glucose + bun_mmol, 1)
        latex_str = rf"\text{{Osmolality}} = 2({na}) + {glucose} + {bun_mmol:.1f} = {calc_osm}\ \text{{mOsm/kg}}"
    else:
        return BiochemicalCalculationResult(
            calculation_type="CALCULATED_OSMOLALITY",
            formula_name="Calculated Serum Osmolality",
            formula_latex=r"\text{Osmolality} = 2[\text{Na}^+] + \frac{[\text{Glucose}]}{18} + \frac{[\text{BUN}]}{2.8}",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit="mOsm/kg",
            is_valid=False,
            status="INCOMPATIBLE_UNITS",
            warnings=[f"Incompatible unit configuration: Glucose '{glucose_unit}', BUN '{bun_unit}'."],
        )

    if calc_osm < 275.0:
        interp = "Hypoosmolar serum (hypotonicity; risk of cellular overhydration/cerebral edema)"
        status = "LOW"
    elif calc_osm > 295.0:
        interp = "Hyperosmolar serum (hypertonicity; evaluate hyperglycemia, hypernatremia, severe uremia)"
        status = "HIGH"
    else:
        interp = "Normal serum osmolality"
        status = "NORMAL"

    return BiochemicalCalculationResult(
        calculation_type="CALCULATED_OSMOLALITY",
        formula_name="Calculated Serum Osmolality (Smith-Line Formula)",
        formula_latex=latex_str,
        formula_version="2024.1",
        inputs=inputs,
        output_value=calc_osm,
        output_unit="mOsm/kg",
        is_valid=True,
        status=status,
        interpretation=interp,
        reference_range="275.0 - 295.0 mOsm/kg",
        assumptions=[
            "Assumes primary physiological extracellular osmoles are sodium (with counter-anions), glucose, and urea.",
            "Assumes 1 mmol/L glucose = 18.0 mg/dL and 1 mmol/L urea nitrogen = 2.8 mg/dL.",
        ],
        limitations=[
            "Calculated osmolality does not detect exogenous or unmeasured osmolytes (toxic alcohols, mannitol, glycine).",
            "Direct freezing-point osmometry is required to compute the osmolal gap.",
        ],
    )


def calculate_osmolal_gap(
    measured_osmolality: Optional[float],
    calculated_osmolality: Optional[float],
    unit: str = "mOsm/kg",
) -> BiochemicalCalculationResult:
    """
    Osmolal Gap = Measured Osmolality - Calculated Osmolality
    """
    inputs = {
        "measured_osmolality": {"value": measured_osmolality, "unit": unit},
        "calculated_osmolality": {"value": calculated_osmolality, "unit": unit},
    }

    if measured_osmolality is None or calculated_osmolality is None:
        missing = [k for k, v in inputs.items() if v["value"] is None]
        return BiochemicalCalculationResult(
            calculation_type="OSMOLAL_GAP",
            formula_name="Serum Osmolal Gap",
            formula_latex=r"\text{Osmolal Gap} = \text{Measured Osmolality} - \text{Calculated Osmolality}",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit=unit,
            is_valid=False,
            status="MISSING_INPUTS",
            warnings=[f"Missing required input: {', '.join(missing)}. Direct laboratory osmometry is needed."],
        )

    if measured_osmolality <= 0 or calculated_osmolality <= 0:
        return BiochemicalCalculationResult(
            calculation_type="OSMOLAL_GAP",
            formula_name="Serum Osmolal Gap",
            formula_latex=r"\text{Osmolal Gap} = \text{Measured Osmolality} - \text{Calculated Osmolality}",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit=unit,
            is_valid=False,
            status="INVALID_VALUE",
            warnings=["Osmolalities must be positive numbers."],
        )

    gap = round(measured_osmolality - calculated_osmolality, 1)

    if gap > 10.0:
        interp = (
            "Elevated Osmolal Gap (>10 mOsm/kg): Strong suspicion for unmeasured exogenous osmoles "
            "(toxic alcohols: methanol, ethylene glycol, isopropanol; ethanol; propylene glycol; or mannitol)."
        )
        status = "HIGH"
    elif gap < -10.0:
        interp = "Significantly negative osmolal gap (laboratory artifact, specimen mishandling, or extreme hyponatremia)."
        status = "LOW"
    else:
        interp = "Normal Osmolal Gap (<10 mOsm/kg)"
        status = "NORMAL"

    return BiochemicalCalculationResult(
        calculation_type="OSMOLAL_GAP",
        formula_name="Serum Osmolal Gap",
        formula_latex=rf"\text{{Osmolal Gap}} = {measured_osmolality} - {calculated_osmolality} = {gap}\ \text{{{unit}}}",
        formula_version="2024.1",
        inputs=inputs,
        output_value=gap,
        output_unit=unit,
        is_valid=True,
        status=status,
        interpretation=interp,
        reference_range="< 10.0 mOsm/kg (-2.0 to +10.0)",
        assumptions=[
            "Assumes measured osmolality was determined via freezing point depression osmometry (vapor pressure osmometry misses volatile alcohols like ethanol/methanol).",
        ],
        limitations=[
            "A normal osmolal gap does NOT rule out late-stage toxic alcohol ingestion when the parent alcohol has already metabolized into toxic organic acids (which cause high anion gap acidosis instead).",
            "Severe hyperlipidemia or hyperproteinemia can cause indirect ISE artifact.",
        ],
    )


def calculate_bun_creatinine_ratio(
    bun: Optional[float],
    creatinine: Optional[float],
    bun_unit: str = "mg/dL",
    creatinine_unit: str = "mg/dL",
) -> BiochemicalCalculationResult:
    """
    BUN / Creatinine Ratio (mg/dL to mg/dL)
    Requires valid units and positive numbers.
    """
    inputs = {
        "bun": {"value": bun, "unit": bun_unit},
        "creatinine": {"value": creatinine, "unit": creatinine_unit},
    }

    if bun is None or creatinine is None:
        missing = [k for k, v in inputs.items() if v["value"] is None]
        return BiochemicalCalculationResult(
            calculation_type="BUN_CR_RATIO",
            formula_name="BUN / Creatinine Ratio",
            formula_latex=r"\text{BUN/Cr Ratio} = \frac{\text{BUN (mg/dL)}}{\text{Serum Creatinine (mg/dL)}}",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit="ratio",
            is_valid=False,
            status="MISSING_INPUTS",
            warnings=[f"Missing required input(s): {', '.join(missing)}."],
        )

    # Unit validation and conversion
    b_u = bun_unit.strip().lower()
    c_u = creatinine_unit.strip().lower()

    if b_u not in ["mg/dl", "mmol/l"] or c_u not in ["mg/dl", "umol/l", "µmol/l"]:
        return BiochemicalCalculationResult(
            calculation_type="BUN_CR_RATIO",
            formula_name="BUN / Creatinine Ratio",
            formula_latex=r"\text{BUN/Cr Ratio} = \frac{\text{BUN}}{\text{Creatinine}}",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit="ratio",
            is_valid=False,
            status="INCOMPATIBLE_UNITS",
            warnings=[f"Incompatible units: BUN '{bun_unit}', Creatinine '{creatinine_unit}'. Expected mg/dL."],
        )

    # Convert to mg/dL for standardized ratio
    bun_mg_dl = bun * 2.8 if b_u == "mmol/l" else bun
    cr_mg_dl = creatinine / 88.4 if c_u in ["umol/l", "µmol/l"] else creatinine

    if bun_mg_dl < 0 or cr_mg_dl < 0:
        return BiochemicalCalculationResult(
            calculation_type="BUN_CR_RATIO",
            formula_name="BUN / Creatinine Ratio",
            formula_latex=r"\text{BUN/Cr Ratio} = \frac{\text{BUN}}{\text{Creatinine}}",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit="ratio",
            is_valid=False,
            status="INVALID_VALUE",
            warnings=["BUN and creatinine values cannot be negative."],
        )

    if cr_mg_dl == 0:
        return BiochemicalCalculationResult(
            calculation_type="BUN_CR_RATIO",
            formula_name="BUN / Creatinine Ratio",
            formula_latex=r"\text{BUN/Cr Ratio} = \frac{\text{BUN}}{\text{Creatinine}}",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit="ratio",
            is_valid=False,
            status="ZERO_DENOMINATOR",
            warnings=["Serum creatinine is 0 mg/dL. Division by zero is undefined."],
        )

    ratio = round(bun_mg_dl / cr_mg_dl, 1)

    if ratio > 20.0:
        interp = "Suggestive of Prerenal Azotemia, intravascular volume depletion, upper GI bleed, hypercatabolic state, or corticosteroid therapy (>20:1)"
        status = "HIGH"
    elif ratio < 10.0:
        interp = "Suggestive of Intrinsic Renal Parenchymal Disease / Acute Tubular Necrosis (ATN), severe hepatic insufficiency, malnutrition, or rhabdomyolysis (<10:1)"
        status = "LOW"
    else:
        interp = "Normal BUN/Creatinine Ratio (10:1 to 20:1; consistent with normal or postrenal etiology)"
        status = "NORMAL"

    return BiochemicalCalculationResult(
        calculation_type="BUN_CR_RATIO",
        formula_name="BUN / Creatinine Ratio",
        formula_latex=rf"\text{{BUN/Cr Ratio}} = \frac{{{bun_mg_dl:.1f}\ \text{{mg/dL}}}}{{{cr_mg_dl:.2f}\ \text{{mg/dL}}}} = {ratio}",
        formula_version="2024.1",
        inputs=inputs,
        output_value=ratio,
        output_unit="ratio",
        is_valid=True,
        status=status,
        interpretation=interp,
        reference_range="10.0 - 20.0",
        assumptions=[
            "Assumes both BUN and creatinine reflect steady-state clearance on the same clinical collection date.",
            "Standard clinical interpretation assumes mg/dL units for both nitrogenous compounds.",
        ],
        limitations=[
            "Does not differentiate isolated volume contraction from upper gastrointestinal hemorrhage without clinical correlation.",
            "Dialysis patients have uninterpretable ratios due to differential urea clearance.",
        ],
    )


def calculate_egfr_ckd_epi_2021(
    creatinine: Optional[float],
    age_years: Optional[int],
    sex: Optional[str],
    creatinine_unit: str = "mg/dL",
) -> BiochemicalCalculationResult:
    """
    2021 CKD-EPI Race-Free Creatinine Equation.
    Requires age >= 18 and biological sex.
    """
    inputs = {
        "creatinine": {"value": creatinine, "unit": creatinine_unit},
        "age_years": {"value": age_years, "unit": "years"},
        "sex": {"value": sex, "unit": "category"},
    }

    if creatinine is None or age_years is None or not sex:
        missing = [k for k, v in inputs.items() if v["value"] is None]
        return BiochemicalCalculationResult(
            calculation_type="EGFR_CKD_EPI_2021",
            formula_name="2021 CKD-EPI Creatinine Equation (Race-Free)",
            formula_latex=r"\text{eGFR} = 142 \times \min(S_{\text{cr}}/\kappa, 1)^\alpha \times \max(S_{\text{cr}}/\kappa, 1)^{-1.200} \times 0.9938^{\text{Age}} \times [1.012\text{ if female}]",
            formula_version="2021.1",
            inputs=inputs,
            output_value=None,
            output_unit="mL/min/1.73m²",
            is_valid=False,
            status="MISSING_INPUTS",
            warnings=[f"Missing required demographic input(s): {', '.join(missing)}."],
        )

    # Unit validation
    c_u = creatinine_unit.strip().lower()
    if c_u not in ["mg/dl", "umol/l", "µmol/l"]:
        return BiochemicalCalculationResult(
            calculation_type="EGFR_CKD_EPI_2021",
            formula_name="2021 CKD-EPI Creatinine Equation (Race-Free)",
            formula_latex=r"\text{eGFR} = 142 \times \dots",
            formula_version="2021.1",
            inputs=inputs,
            output_value=None,
            output_unit="mL/min/1.73m²",
            is_valid=False,
            status="INCOMPATIBLE_UNITS",
            warnings=[f"Invalid creatinine unit '{creatinine_unit}'. Expected 'mg/dL' or 'µmol/L'."],
        )

    scr_mg_dl = creatinine / 88.4 if c_u in ["umol/l", "µmol/l"] else creatinine

    if scr_mg_dl <= 0 or age_years <= 0:
        return BiochemicalCalculationResult(
            calculation_type="EGFR_CKD_EPI_2021",
            formula_name="2021 CKD-EPI Creatinine Equation (Race-Free)",
            formula_latex=r"\text{eGFR} = 142 \times \dots",
            formula_version="2021.1",
            inputs=inputs,
            output_value=None,
            output_unit="mL/min/1.73m²",
            is_valid=False,
            status="INVALID_VALUE",
            warnings=["Creatinine and age must be positive non-zero numbers."],
        )

    if age_years < 18:
        return BiochemicalCalculationResult(
            calculation_type="EGFR_CKD_EPI_2021",
            formula_name="2021 CKD-EPI Creatinine Equation (Race-Free)",
            formula_latex=r"\text{eGFR} = 142 \times \dots",
            formula_version="2021.1",
            inputs=inputs,
            output_value=None,
            output_unit="mL/min/1.73m²",
            is_valid=False,
            status="OUT_OF_POPULATION_BOUNDS",
            warnings=["2021 CKD-EPI is validated only for adults (age >= 18). For pediatric patients, bedside Schwartz equation is required."],
        )

    is_female = sex.strip().upper() == "FEMALE"
    kappa = 0.7 if is_female else 0.9
    alpha = -0.241 if is_female else -0.302
    gender_mult = 1.012 if is_female else 1.0

    scr_over_kappa = scr_mg_dl / kappa
    min_term = min(scr_over_kappa, 1.0) ** alpha
    max_term = max(scr_over_kappa, 1.0) ** (-1.200)
    age_term = 0.9938 ** age_years

    egfr = 142.0 * min_term * max_term * age_term * gender_mult
    egfr_rounded = round(egfr, 1)

    # KDIGO Staging
    if egfr_rounded >= 90.0:
        kdigo = "G1 (Normal or High GFR)"
        status = "NORMAL"
    elif egfr_rounded >= 60.0:
        kdigo = "G2 (Mildly Decreased GFR)"
        status = "NORMAL"
    elif egfr_rounded >= 45.0:
        kdigo = "G3a (Mildly to Moderately Decreased GFR)"
        status = "LOW"
    elif egfr_rounded >= 30.0:
        kdigo = "G3b (Moderately to Severely Decreased GFR)"
        status = "LOW"
    elif egfr_rounded >= 15.0:
        kdigo = "G4 (Severely Decreased GFR)"
        status = "CRITICAL_LOW"
    else:
        kdigo = "G5 (Kidney Failure / End-Stage Kidney Disease)"
        status = "CRITICAL_LOW"

    return BiochemicalCalculationResult(
        calculation_type="EGFR_CKD_EPI_2021",
        formula_name="2021 CKD-EPI Creatinine Equation (Race-Free)",
        formula_latex=(
            rf"\text{{eGFR}} = 142 \times \min\left(\frac{{{scr_mg_dl:.2f}}}{{{kappa}}}, 1\right)^{{{alpha}}} "
            rf"\times \max\left(\frac{{{scr_mg_dl:.2f}}}{{{kappa}}}, 1\right)^{{-1.200}} \times 0.9938^{{{age_years}}} "
            rf"\times {gender_mult} = {egfr_rounded}\ \text{{mL/min/1.73m²}}"
        ),
        formula_version="2021.1",
        inputs=inputs,
        output_value=egfr_rounded,
        output_unit="mL/min/1.73m²",
        is_valid=True,
        status=status,
        interpretation=f"KDIGO CKD Classification: {kdigo}",
        reference_range=">= 60.0 mL/min/1.73m² (Normal/Preserved)",
        assumptions=[
            "Standardized IDMS-traceable enzymatic serum creatinine assay.",
            "Normalized to standard body surface area of 1.73 m².",
            "Patient is in stable hemodynamic and steady renal metabolic state.",
        ],
        limitations=[
            "Invalid in Acute Kidney Injury (AKI) where serum creatinine is not in steady state.",
            "Inaccurate in extremes of muscle mass (bodybuilders, amputees, severe sarcopenia/cachexia, neuromuscular disease) - cystatin C or 24-hr urine clearance recommended.",
            "Not validated during pregnancy.",
        ],
        extra_metrics={
            "kdigo_stage": kdigo,
            "normalized_scr_mg_dl": round(scr_mg_dl, 2),
        },
    )


def calculate_fractional_excretion_of_sodium(
    serum_na: Optional[float],
    serum_creat: Optional[float],
    urine_na: Optional[float],
    urine_creat: Optional[float],
) -> BiochemicalCalculationResult:
    """
    FENa (%) = (Urine Na * Serum Cr) / (Serum Na * Urine Cr) * 100
    """
    inputs = {
        "serum_na": {"value": serum_na, "unit": "mmol/L"},
        "serum_creat": {"value": serum_creat, "unit": "mg/dL"},
        "urine_na": {"value": urine_na, "unit": "mmol/L"},
        "urine_creat": {"value": urine_creat, "unit": "mg/dL"},
    }

    if any(v["value"] is None for v in inputs.values()):
        missing = [k for k, v in inputs.items() if v["value"] is None]
        return BiochemicalCalculationResult(
            calculation_type="FENA",
            formula_name="Fractional Excretion of Sodium (FENa)",
            formula_latex=r"\text{FENa (\%)} = \frac{U_{\text{Na}} \times P_{\text{Cr}}}{P_{\text{Na}} \times U_{\text{Cr}}} \times 100",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit="%",
            is_valid=False,
            status="MISSING_INPUTS",
            warnings=[f"Missing required parameter(s): {', '.join(missing)}. Both serum and spot urine samples required."],
        )

    if any(v["value"] <= 0 for v in inputs.values()):
        return BiochemicalCalculationResult(
            calculation_type="FENA",
            formula_name="Fractional Excretion of Sodium (FENa)",
            formula_latex=r"\text{FENa (\%)} = \frac{U_{\text{Na}} \times P_{\text{Cr}}}{P_{\text{Na}} \times U_{\text{Cr}}} \times 100",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit="%",
            is_valid=False,
            status="INVALID_VALUE",
            warnings=["All serum and urine electrolyte/creatinine values must be positive non-zero numbers."],
        )

    denom = serum_na * urine_creat
    fena = round(((urine_na * serum_creat) / denom) * 100.0, 2)

    if fena < 1.0:
        interp = "FENa < 1.0%: Consistent with Prerenal Azotemia (preserved tubular sodium avid reabsorption)"
        status = "LOW"
    elif fena > 2.0:
        interp = "FENa > 2.0%: Consistent with Intrinsic Renal Parenchymal Failure / Acute Tubular Necrosis (ATN) (impaired tubular sodium reabsorption)"
        status = "HIGH"
    else:
        interp = "FENa 1.0% - 2.0%: Indeterminate intermediate range (early injury, acute glomerulonephritis, or contrast nephropathy)"
        status = "NORMAL"

    return BiochemicalCalculationResult(
        calculation_type="FENA",
        formula_name="Fractional Excretion of Sodium (FENa)",
        formula_latex=rf"\text{{FENa}} = \frac{{{urine_na} \times {serum_creat}}}{{{serum_na} \times {urine_creat}}} \times 100 = {fena}\%",
        formula_version="2024.1",
        inputs=inputs,
        output_value=fena,
        output_unit="%",
        is_valid=True,
        status=status,
        interpretation=interp,
        reference_range="< 1.0% Prerenal | > 2.0% Intrinsic ATN",
        assumptions=[
            "Assumes contemporaneous collection of paired serum and spot urine samples.",
            "Valid specifically in oliguric acute kidney injury.",
        ],
        limitations=[
            "Invalid if patient has received loop or thiazide diuretics in the preceding 24 hours (use Fractional Excretion of Urea, FEUrea < 35% instead).",
            "FENa may be < 1% in intrinsic conditions like contrast nephropathy, rhabdomyolysis, or acute glomerulonephritis.",
        ],
    )


def calculate_transferrin_saturation(
    serum_iron: Optional[float],
    tibc: Optional[float],
    unit: str = "ug/dL",
) -> BiochemicalCalculationResult:
    """
    TSAT (%) = (Serum Iron / TIBC) * 100
    """
    inputs = {
        "serum_iron": {"value": serum_iron, "unit": unit},
        "tibc": {"value": tibc, "unit": unit},
    }

    if serum_iron is None or tibc is None:
        missing = [k for k, v in inputs.items() if v["value"] is None]
        return BiochemicalCalculationResult(
            calculation_type="TSAT",
            formula_name="Transferrin Saturation (TSAT)",
            formula_latex=r"\text{TSAT (\%)} = \frac{\text{Serum Iron}}{\text{TIBC}} \times 100",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit="%",
            is_valid=False,
            status="MISSING_INPUTS",
            warnings=[f"Missing required parameter(s): {', '.join(missing)}."],
        )

    if serum_iron < 0 or tibc <= 0:
        return BiochemicalCalculationResult(
            calculation_type="TSAT",
            formula_name="Transferrin Saturation (TSAT)",
            formula_latex=r"\text{TSAT (\%)} = \frac{\text{Serum Iron}}{\text{TIBC}} \times 100",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit="%",
            is_valid=False,
            status="INVALID_VALUE",
            warnings=["Serum iron must be non-negative and TIBC must be strictly positive."],
        )

    tsat = round((serum_iron / tibc) * 100.0, 1)

    if tsat < 20.0:
        interp = "TSAT < 20%: Iron deficiency (absolute iron deficiency or functional iron deficiency in inflammation)"
        status = "LOW"
    elif tsat > 50.0:
        interp = "TSAT > 50%: Iron overload (evaluate hereditary hemochromatosis, repeated transfusions, or acute iron toxicity)"
        status = "HIGH"
    else:
        interp = "Normal transferrin saturation"
        status = "NORMAL"

    return BiochemicalCalculationResult(
        calculation_type="TSAT",
        formula_name="Transferrin Saturation (TSAT)",
        formula_latex=rf"\text{{TSAT}} = \frac{{{serum_iron}}}{{{tibc}}} \times 100 = {tsat}\%",
        formula_version="2024.1",
        inputs=inputs,
        output_value=tsat,
        output_unit="%",
        is_valid=True,
        status=status,
        interpretation=interp,
        reference_range="20.0% - 50.0%",
        assumptions=[
            "Assumes morning fasting sample (serum iron demonstrates marked diurnal variation, peaking in the morning).",
        ],
        limitations=[
            "TIBC is a negative acute-phase reactant and drops in systemic inflammation, potentially overestimating saturation.",
        ],
    )


def calculate_lipid_indices(
    chol: Optional[float],
    hdl: Optional[float],
    trig: Optional[float],
    ldl_measured: Optional[float] = None,
    unit: str = "mg/dL",
) -> Dict[str, BiochemicalCalculationResult]:
    """
    Computes Friedewald LDL, Non-HDL Cholesterol, and Total/HDL Ratio.
    Friedewald formula is valid ONLY when Triglycerides < 400 mg/dL.
    """
    results: Dict[str, BiochemicalCalculationResult] = {}

    # Non-HDL Cholesterol
    inputs_non_hdl = {
        "chol": {"value": chol, "unit": unit},
        "hdl": {"value": hdl, "unit": unit},
    }
    if chol is not None and hdl is not None and chol > 0 and hdl > 0:
        non_hdl = round(chol - hdl, 1)
        results["non_hdl"] = BiochemicalCalculationResult(
            calculation_type="NON_HDL_CHOLESTEROL",
            formula_name="Non-HDL Cholesterol",
            formula_latex=rf"\text{{Non-HDL}} = \text{{Total Chol}} - \text{{HDL}} = {chol} - {hdl} = {non_hdl}\ \text{{{unit}}}",
            formula_version="2024.1",
            inputs=inputs_non_hdl,
            output_value=non_hdl,
            output_unit=unit,
            is_valid=True,
            status="HIGH" if non_hdl >= 130.0 else "NORMAL",
            interpretation="Measures all atherogenic apolipoprotein B-containing particles (LDL, VLDL, IDL, Lp(a))",
            reference_range="< 130.0 mg/dL (Desirable)",
            assumptions=["Reflects total atherogenic particle burden independent of fasting status."],
            limitations=["Does not replace direct ApoB quantitation."],
        )

    # Friedewald LDL
    inputs_friedewald = {
        "chol": {"value": chol, "unit": unit},
        "hdl": {"value": hdl, "unit": unit},
        "trig": {"value": trig, "unit": unit},
    }
    if chol is not None and hdl is not None and trig is not None:
        if trig >= 400.0:
            results["friedewald_ldl"] = BiochemicalCalculationResult(
                calculation_type="FRIEDEWALD_LDL",
                formula_name="Friedewald Calculated LDL-C",
                formula_latex=r"\text{LDL} = \text{Total Chol} - \text{HDL} - \frac{\text{Triglycerides}}{5}",
                formula_version="2024.1",
                inputs=inputs_friedewald,
                output_value=None,
                output_unit=unit,
                is_valid=False,
                status="INVALID_ASSUMPTION",
                interpretation="INVALID: Triglycerides >= 400 mg/dL. Chylomicrons invalidate the fixed 5:1 VLDL-C:Triglyceride ratio.",
                warnings=["Direct enzymatic LDL-C assay or ultracentrifugation is mandatory when Triglycerides >= 400 mg/dL."],
            )
        else:
            calc_ldl = round(chol - hdl - (trig / 5.0), 1)
            results["friedewald_ldl"] = BiochemicalCalculationResult(
                calculation_type="FRIEDEWALD_LDL",
                formula_name="Friedewald Calculated LDL-C",
                formula_latex=rf"\text{{LDL}} = {chol} - {hdl} - \frac{{{trig}}}{{5}} = {calc_ldl}\ \text{{{unit}}}",
                formula_version="2024.1",
                inputs=inputs_friedewald,
                output_value=calc_ldl,
                output_unit=unit,
                is_valid=True,
                status="HIGH" if calc_ldl >= 100.0 else "NORMAL",
                interpretation="Atherogenic low-density lipoprotein estimate",
                reference_range="< 100.0 mg/dL (Optimal)",
                assumptions=[
                    "Assumes a 12-hour fasting sample.",
                    "Assumes standard 5:1 ratio of triglycerides to VLDL-cholesterol.",
                ],
                limitations=[
                    "Invalid when triglycerides >= 400 mg/dL.",
                    "Significantly underestimates LDL in patients with low LDL (<70 mg/dL) and high triglycerides.",
                ],
            )

    return results


def calculate_ag_protein_ratio(
    total_protein: Optional[float],
    albumin: Optional[float],
    unit: str = "g/dL",
) -> BiochemicalCalculationResult:
    """
    Globulin = Total Protein - Albumin
    A/G Ratio = Albumin / Globulin
    """
    inputs = {
        "total_protein": {"value": total_protein, "unit": unit},
        "albumin": {"value": albumin, "unit": unit},
    }

    if total_protein is None or albumin is None:
        missing = [k for k, v in inputs.items() if v["value"] is None]
        return BiochemicalCalculationResult(
            calculation_type="A_G_RATIO",
            formula_name="Albumin-to-Globulin (A/G) Ratio",
            formula_latex=r"\text{A/G Ratio} = \frac{\text{Albumin}}{\text{Total Protein} - \text{Albumin}}",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit="ratio",
            is_valid=False,
            status="MISSING_INPUTS",
            warnings=[f"Missing required protein measurement: {', '.join(missing)}."],
        )

    if total_protein <= 0 or albumin <= 0:
        return BiochemicalCalculationResult(
            calculation_type="A_G_RATIO",
            formula_name="Albumin-to-Globulin (A/G) Ratio",
            formula_latex=r"\text{A/G Ratio} = \frac{\text{Albumin}}{\text{Total Protein} - \text{Albumin}}",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit="ratio",
            is_valid=False,
            status="INVALID_VALUE",
            warnings=["Total protein and albumin must be positive numbers."],
        )

    if albumin >= total_protein:
        return BiochemicalCalculationResult(
            calculation_type="A_G_RATIO",
            formula_name="Albumin-to-Globulin (A/G) Ratio",
            formula_latex=r"\text{A/G Ratio} = \frac{\text{Albumin}}{\text{Total Protein} - \text{Albumin}}",
            formula_version="2024.1",
            inputs=inputs,
            output_value=None,
            output_unit="ratio",
            is_valid=False,
            status="INVALID_VALUE",
            warnings=["Serum albumin cannot equal or exceed total serum protein."],
        )

    globulin = round(total_protein - albumin, 2)
    ag_ratio = round(albumin / globulin, 2)

    if ag_ratio < 1.0:
        interp = "Inverted A/G Ratio (<1.0): Suggestive of Monoclonal Gammopathy (Multiple Myeloma), Polyclonal Hypergammaglobulinemia, Severe Hepatic Cirrhosis, or Nephrotic Syndrome."
        status = "LOW"
    elif ag_ratio > 2.2:
        interp = "High A/G Ratio (>2.2): Consider hypogammaglobulinemia, genetic absence of globulins, or severe malnutrition."
        status = "HIGH"
    else:
        interp = "Normal Albumin-to-Globulin Ratio"
        status = "NORMAL"

    return BiochemicalCalculationResult(
        calculation_type="A_G_RATIO",
        formula_name="Albumin-to-Globulin (A/G) Ratio",
        formula_latex=rf"\text{{A/G Ratio}} = \frac{{{albumin}}}{{{total_protein} - {albumin}}} = \frac{{{albumin}}}{{{globulin}}} = {ag_ratio}",
        formula_version="2024.1",
        inputs=inputs,
        output_value=ag_ratio,
        output_unit="ratio",
        is_valid=True,
        status=status,
        interpretation=interp,
        reference_range="1.20 - 2.20",
        assumptions=[
            "Assumes non-albumin serum protein fraction constitutes the total globulin pool (alpha-1, alpha-2, beta, gamma globulins).",
        ],
        limitations=[
            "Does not differentiate specific globulin fractions. Serum protein electrophoresis (SPEP) and immunofixation are required if monoclonal spike is suspected.",
        ],
        extra_metrics={"calculated_globulin": globulin},
    )


# ==============================================================================
# MODULE 2: STRUCTURED ACID–BASE ASSESSMENT
# ==============================================================================

def analyze_acid_base(
    ph: Optional[float],
    paco2: Optional[float],
    hco3: Optional[float],
    na: Optional[float] = None,
    cl: Optional[float] = None,
    albumin: Optional[float] = None,
    bicarbonate_source: str = "CALCULATED_ABG",  # or "MEASURED_CHEMISTRY"
) -> Dict[str, Any]:
    """
    Structured, evidence-linked clinical acid-base interpretation engine.
    Implements Winter's formula, compensation formulas, anion gap, and delta ratio.
    """
    inputs = {
        "ph": ph,
        "paco2": paco2,
        "hco3": hco3,
        "na": na,
        "cl": cl,
        "albumin": albumin,
        "bicarbonate_source": bicarbonate_source,
    }

    if ph is None or paco2 is None or hco3 is None:
        missing = [k for k, v in [("pH", ph), ("PaCO2", paco2), ("HCO3", hco3)] if v is None]
        return {
            "is_valid": False,
            "status": "INCOMPLETE_BLOOD_GAS",
            "message": f"Incomplete blood gas data. Missing: {', '.join(missing)}.",
            "inputs": inputs,
            "disclaimer": CLINICAL_DECISION_SUPPORT_NOTICE,
        }

    # Range validity
    if not (6.80 <= ph <= 7.80) or not (10.0 <= paco2 <= 150.0) or not (2.0 <= hco3 <= 60.0):
        return {
            "is_valid": False,
            "status": "NON_PHYSIOLOGIC_VALUES",
            "message": "Values outside survivable human physiological limits (pH 6.80-7.80, PaCO2 10-150, HCO3 2-60).",
            "inputs": inputs,
            "disclaimer": CLINICAL_DECISION_SUPPORT_NOTICE,
        }

    # Step 1: Acidemia vs Alkalemia vs Normal
    if ph < 7.35:
        ph_status = "ACIDEMIA"
    elif ph > 7.45:
        ph_status = "ALKALEMIA"
    else:
        ph_status = "NORMAL_PH"

    # Step 2: Primary Disturbance Detection
    primary_processes: List[str] = []
    compensation_details: Dict[str, Any] = {}
    diagnostic_notes: List[str] = []
    clinical_warnings: List[str] = []

    if ph_status == "ACIDEMIA":
        is_resp = paco2 > 45.0
        is_met = hco3 < 22.0
        if is_resp and is_met:
            primary_processes.append("Combined Mixed Respiratory Acidosis and Metabolic Acidosis")
        elif is_met:
            primary_processes.append("Primary Metabolic Acidosis")
        elif is_resp:
            primary_processes.append("Primary Respiratory Acidosis")
        else:
            primary_processes.append("Unclassified Acidemia")
    elif ph_status == "ALKALEMIA":
        is_resp = paco2 < 35.0
        is_met = hco3 > 26.0
        if is_resp and is_met:
            primary_processes.append("Combined Mixed Respiratory Alkalosis and Metabolic Alkalosis")
        elif is_met:
            primary_processes.append("Primary Metabolic Alkalosis")
        elif is_resp:
            primary_processes.append("Primary Respiratory Alkalosis")
        else:
            primary_processes.append("Unclassified Alkalemia")
    else:
        # Normal pH with abnormal components
        if (paco2 > 45.0 and hco3 > 26.0) or (paco2 < 35.0 and hco3 < 22.0):
            primary_processes.append("Mixed Acid-Base Disorder with Normal pH (Opposing Respiratory and Metabolic Processes)")
        else:
            primary_processes.append("Normal Acid-Base Homeostasis")

    # Step 3: Expected Compensation Assessment
    # A. Metabolic Acidosis -> Winter's Formula: Expected PaCO2 = 1.5 * HCO3 + 8 +/- 2
    if "Primary Metabolic Acidosis" in primary_processes or (ph_status == "ACIDEMIA" and hco3 < 22.0):
        expected_paco2 = round(1.5 * hco3 + 8.0, 1)
        lower_bound = round(expected_paco2 - 2.0, 1)
        upper_bound = round(expected_paco2 + 2.0, 1)

        compensation_details["winter_formula"] = {
            "formula": "Expected PaCO2 = 1.5 * [HCO3] + 8 +/- 2",
            "expected_paco2": expected_paco2,
            "range": f"{lower_bound} - {upper_bound} mmHg",
            "actual_paco2": paco2,
        }

        if paco2 > upper_bound:
            comp_status = "Concurrent Respiratory Acidosis (Failure to achieve expected hyperventilation compensation)"
            clinical_warnings.append(f"Actual PaCO2 ({paco2} mmHg) exceeds Winter's compensation upper bound ({upper_bound} mmHg), indicating concomitant respiratory failure/hypoventilation.")
        elif paco2 < lower_bound:
            comp_status = "Concurrent Respiratory Alkalosis (Hyperventilation in excess of expected compensation)"
            clinical_warnings.append(f"Actual PaCO2 ({paco2} mmHg) is below Winter's compensation lower bound ({lower_bound} mmHg), indicating concomitant respiratory alkalosis (e.g. pain, sepsis, salicylate toxicity).")
        else:
            comp_status = "Adequate Respiratory Compensation (Appropriate hyperventilation)"

        compensation_details["metabolic_acidosis_compensation"] = comp_status

    # B. Metabolic Alkalosis -> Expected PaCO2 = 40 + 0.7 * (HCO3 - 24) +/- 2
    elif "Primary Metabolic Alkalosis" in primary_processes or (ph_status == "ALKALEMIA" and hco3 > 26.0):
        expected_paco2 = round(40.0 + 0.7 * (hco3 - 24.0), 1)
        lower_bound = round(expected_paco2 - 2.0, 1)
        upper_bound = round(expected_paco2 + 2.0, 1)

        compensation_details["metabolic_alkalosis_formula"] = {
            "formula": "Expected PaCO2 = 40 + 0.7 * ([HCO3] - 24) +/- 2",
            "expected_paco2": expected_paco2,
            "range": f"{lower_bound} - {upper_bound} mmHg",
            "actual_paco2": paco2,
        }

        if paco2 > upper_bound:
            comp_status = "Concurrent Respiratory Acidosis"
        elif paco2 < lower_bound:
            comp_status = "Concurrent Respiratory Alkalosis"
        else:
            comp_status = "Adequate Hypoventilatory Respiratory Compensation"

        compensation_details["metabolic_alkalosis_compensation"] = comp_status

    # C. Respiratory Acidosis -> Acute vs Chronic
    elif "Primary Respiratory Acidosis" in primary_processes:
        delta_paco2 = paco2 - 40.0
        exp_acute_hco3 = round(24.0 + 1.0 * (delta_paco2 / 10.0), 1)
        exp_chronic_hco3 = round(24.0 + 3.5 * (delta_paco2 / 10.0), 1)

        compensation_details["respiratory_acidosis"] = {
            "acute_expected_hco3": exp_acute_hco3,
            "chronic_expected_hco3": exp_chronic_hco3,
            "interpretation": (
                "Acute: +1 mEq/L HCO3 per 10 mmHg PaCO2 elevation | "
                "Chronic: +3.5 to 4 mEq/L HCO3 per 10 mmHg PaCO2 elevation (renal tubular adaptation)"
            ),
        }

    # Step 4: Anion Gap & Albumin Correction (if Na and Cl present)
    anion_gap_analysis: Optional[Dict[str, Any]] = None
    delta_ratio_analysis: Optional[Dict[str, Any]] = None

    if na is not None and cl is not None:
        raw_ag = round(na - (cl + hco3), 1)
        ref_alb = 4.0
        if albumin is not None and albumin > 0:
            corr_ag = round(raw_ag + 2.5 * (ref_alb - albumin), 1)
            used_ag = corr_ag
            ag_type_str = f"Albumin-Corrected AG: {corr_ag} mmol/L (Raw AG: {raw_ag})"
        else:
            corr_ag = None
            used_ag = raw_ag
            ag_type_str = f"Raw Uncorrected AG: {raw_ag} mmol/L"

        is_hagma = used_ag > 12.0

        anion_gap_analysis = {
            "raw_anion_gap": raw_ag,
            "corrected_anion_gap": corr_ag,
            "is_hagma": is_hagma,
            "summary": ag_type_str,
            "category": "High Anion Gap" if is_hagma else "Normal Anion Gap (Hyperchloremic)",
        }

        # Step 5: Delta Ratio in HAGMA (Delta Gap / Delta HCO3)
        if is_hagma and hco3 < 24.0:
            delta_ag = used_ag - 12.0
            delta_hco3 = 24.0 - hco3
            if delta_hco3 > 0:
                delta_ratio = round(delta_ag / delta_hco3, 2)
                if delta_ratio < 0.4:
                    dr_interp = "Combined High AG and Normal AG Acidosis (marked hyperchloremia)"
                elif delta_ratio < 0.8:
                    dr_interp = "Combined High AG Acidosis with underlying Normal AG (Hyperchloremic) Acidosis"
                elif 0.8 <= delta_ratio <= 1.2:
                    dr_interp = "Pure High Anion Gap Metabolic Acidosis (1:1 stoichiometric anion accumulation, e.g. DKA)"
                elif 1.2 < delta_ratio <= 2.0:
                    dr_interp = "Typical High Anion Gap Metabolic Acidosis (Lactic Acidosis pattern)"
                else:
                    dr_interp = "High AG Acidosis with concurrent Metabolic Alkalosis OR pre-existing Chronic Respiratory Acidosis"

                delta_ratio_analysis = {
                    "delta_ratio": delta_ratio,
                    "delta_anion_gap": round(delta_ag, 1),
                    "delta_bicarbonate": round(delta_hco3, 1),
                    "interpretation": dr_interp,
                    "formula": "Delta Ratio = (AG_corrected - 12) / (24 - HCO3)",
                }

    # Bicarbonate provenance callout
    bicarb_note = (
        "Calculated Arterial Bicarbonate (from Henderson-Hasselbalch equation via blood gas analyzer)"
        if bicarbonate_source == "CALCULATED_ABG"
        else "Measured Total CO2 / Bicarbonate (from venous clinical chemistry panel)"
    )

    return {
        "is_valid": True,
        "ph_status": ph_status,
        "primary_processes": primary_processes,
        "compensation": compensation_details,
        "anion_gap_analysis": anion_gap_analysis,
        "delta_ratio_analysis": delta_ratio_analysis,
        "bicarbonate_provenance": bicarb_note,
        "clinical_warnings": clinical_warnings,
        "disclaimer": CLINICAL_DECISION_SUPPORT_NOTICE,
        "inputs": inputs,
        "evaluated_at": datetime.utcnow().isoformat() + "Z",
    }
