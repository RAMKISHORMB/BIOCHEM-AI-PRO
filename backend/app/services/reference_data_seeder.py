from sqlalchemy.orm import Session
from app.models.lab_test import TestAnalyte, ReferenceRange
import logging

logger = logging.getLogger("biochem_ai.seeder")

# Curated, traceable clinical reference ranges from Tietz 7th Ed, IFCC, and AACC
STANDARD_ANALYTES = [
    {
        "code": "GLU",
        "name": "Glucose, Fasting Serum/Plasma",
        "category": "METABOLIC",
        "default_unit": "mg/dL",
        "loinc_code": "1558-6",
        "description": "Primary metabolic fuel; regulated by insulin and glucagon. Diagnostic for diabetes mellitus and hypoglycemia.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 0,
                "max_age_years": 120,
                "lower_limit": 70.0,
                "upper_limit": 99.0,
                "critical_low": 54.0,
                "critical_high": 400.0,
                "unit": "mg/dL",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed / ADA 2024",
                "population_notes": "Fasting (>=8 hrs) venous plasma"
            }
        ]
    },
    {
        "code": "CREAT",
        "name": "Creatinine, Serum",
        "category": "RENAL",
        "default_unit": "mg/dL",
        "loinc_code": "2160-0",
        "description": "End-product of creatine phosphate breakdown in muscle; filtered freely by glomerulus. Key marker of glomerular filtration rate (GFR).",
        "ranges": [
            {
                "biological_sex": "MALE",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 0.74,
                "upper_limit": 1.35,
                "critical_low": 0.4,
                "critical_high": 5.0,
                "unit": "mg/dL",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed / NKF",
                "population_notes": "Adult Males (IDMS-traceable enzymatic assay)"
            },
            {
                "biological_sex": "FEMALE",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 0.59,
                "upper_limit": 1.04,
                "critical_low": 0.4,
                "critical_high": 5.0,
                "unit": "mg/dL",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed / NKF",
                "population_notes": "Adult Females (IDMS-traceable enzymatic assay)"
            }
        ]
    },
    {
        "code": "BUN",
        "name": "Blood Urea Nitrogen, Serum",
        "category": "RENAL",
        "default_unit": "mg/dL",
        "loinc_code": "3094-0",
        "description": "Major nitrogenous end product of protein catabolism synthesized by urea cycle in liver.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 7.0,
                "upper_limit": 20.0,
                "critical_low": 3.0,
                "critical_high": 100.0,
                "unit": "mg/dL",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed",
                "population_notes": "Adults >= 18 yrs"
            }
        ]
    },
    {
        "code": "NA",
        "name": "Sodium, Serum",
        "category": "ELECTROLYTES",
        "default_unit": "mmol/L",
        "loinc_code": "2951-2",
        "description": "Major extracellular cation; critical determinant of extracellular fluid volume and plasma osmolality.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 0,
                "max_age_years": 120,
                "lower_limit": 136.0,
                "upper_limit": 145.0,
                "critical_low": 120.0,
                "critical_high": 160.0,
                "unit": "mmol/L",
                "source_authority": "IFCC Reference Range Recommendation / Tietz",
                "population_notes": "All populations (ISE direct/indirect)"
            }
        ]
    },
    {
        "code": "K",
        "name": "Potassium, Serum",
        "category": "ELECTROLYTES",
        "default_unit": "mmol/L",
        "loinc_code": "2823-3",
        "description": "Major intracellular cation; maintains resting membrane potential in cardiac and skeletal myocytes.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 0,
                "max_age_years": 120,
                "lower_limit": 3.5,
                "upper_limit": 5.1,
                "critical_low": 2.8,
                "critical_high": 6.2,
                "unit": "mmol/L",
                "source_authority": "IFCC Reference Range Recommendation / Tietz",
                "population_notes": "Unhemolyzed serum"
            }
        ]
    },
    {
        "code": "CL",
        "name": "Chloride, Serum",
        "category": "ELECTROLYTES",
        "default_unit": "mmol/L",
        "loinc_code": "2075-0",
        "description": "Major extracellular anion; involved in acid-base balance and maintaining electrical neutrality.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 0,
                "max_age_years": 120,
                "lower_limit": 98.0,
                "upper_limit": 107.0,
                "critical_low": 80.0,
                "critical_high": 120.0,
                "unit": "mmol/L",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed",
                "population_notes": "All populations"
            }
        ]
    },
    {
        "code": "HCO3",
        "name": "Bicarbonate / Total CO2, Serum",
        "category": "ELECTROLYTES",
        "default_unit": "mmol/L",
        "loinc_code": "2028-9",
        "description": "Principal buffer of extracellular fluid. Critical component of anion gap and acid-base evaluation.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 0,
                "max_age_years": 120,
                "lower_limit": 22.0,
                "upper_limit": 29.0,
                "critical_low": 10.0,
                "critical_high": 40.0,
                "unit": "mmol/L",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed",
                "population_notes": "Venous serum/plasma"
            }
        ]
    },
    {
        "code": "CA",
        "name": "Calcium, Total Serum",
        "category": "METABOLIC",
        "default_unit": "mg/dL",
        "loinc_code": "17861-6",
        "description": "Essential mineral for neuromuscular excitability, blood coagulation, bone mineral matrix, and second-messenger cascades.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 8.6,
                "upper_limit": 10.2,
                "critical_low": 6.5,
                "critical_high": 13.0,
                "unit": "mg/dL",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed",
                "population_notes": "Adult serum"
            }
        ]
    },
    {
        "code": "ALT",
        "name": "Alanine Aminotransferase (ALT/SGPT)",
        "category": "HEPATIC",
        "default_unit": "U/L",
        "loinc_code": "1742-6",
        "description": "Cytosolic enzyme highly concentrated in hepatocytes. Key biomarker of hepatocellular injury.",
        "ranges": [
            {
                "biological_sex": "MALE",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 10.0,
                "upper_limit": 50.0,
                "critical_low": None,
                "critical_high": 1000.0,
                "unit": "U/L",
                "source_authority": "ACG Clinical Guideline / IFCC 37°C with PLP",
                "population_notes": "Adult Males"
            },
            {
                "biological_sex": "FEMALE",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 10.0,
                "upper_limit": 35.0,
                "critical_low": None,
                "critical_high": 1000.0,
                "unit": "U/L",
                "source_authority": "ACG Clinical Guideline / IFCC 37°C with PLP",
                "population_notes": "Adult Females"
            }
        ]
    },
    {
        "code": "AST",
        "name": "Aspartate Aminotransferase (AST/SGOT)",
        "category": "HEPATIC",
        "default_unit": "U/L",
        "loinc_code": "1920-8",
        "description": "Enzyme present in both cytosolic and mitochondrial compartments of liver, heart, skeletal muscle, kidney, and brain.",
        "ranges": [
            {
                "biological_sex": "MALE",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 10.0,
                "upper_limit": 40.0,
                "critical_low": None,
                "critical_high": 1000.0,
                "unit": "U/L",
                "source_authority": "IFCC 37°C with Pyridoxal Phosphate",
                "population_notes": "Adult Males"
            },
            {
                "biological_sex": "FEMALE",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 10.0,
                "upper_limit": 35.0,
                "critical_low": None,
                "critical_high": 1000.0,
                "unit": "U/L",
                "source_authority": "IFCC 37°C with Pyridoxal Phosphate",
                "population_notes": "Adult Females"
            }
        ]
    },
    {
        "code": "ALP",
        "name": "Alkaline Phosphatase, Serum",
        "category": "HEPATIC",
        "default_unit": "U/L",
        "loinc_code": "6768-6",
        "description": "Zinc metalloenzyme localized to biliary canalicular membrane and osteoblasts. Elevated in biliary obstruction and bone turnover.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 44.0,
                "upper_limit": 147.0,
                "critical_low": None,
                "critical_high": 500.0,
                "unit": "U/L",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed",
                "population_notes": "Adults >= 18 yrs"
            }
        ]
    },
    {
        "code": "TBIL",
        "name": "Bilirubin, Total Serum",
        "category": "HEPATIC",
        "default_unit": "mg/dL",
        "loinc_code": "1975-2",
        "description": "Catabolic product of heme metabolism. Evaluates hemolytic disorders, hepatic clearance, and biliary excretion.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 1,
                "max_age_years": 120,
                "lower_limit": 0.2,
                "upper_limit": 1.2,
                "critical_low": None,
                "critical_high": 15.0,
                "unit": "mg/dL",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed",
                "population_notes": "Adults & Children > 1 yr"
            }
        ]
    },
    {
        "code": "DBIL",
        "name": "Bilirubin, Direct (Conjugated)",
        "category": "HEPATIC",
        "default_unit": "mg/dL",
        "loinc_code": "1968-7",
        "description": "Water-soluble glucuronide-conjugated bilirubin excreted into bile canaliculi.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 0,
                "max_age_years": 120,
                "lower_limit": 0.0,
                "upper_limit": 0.3,
                "critical_low": None,
                "critical_high": 5.0,
                "unit": "mg/dL",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed",
                "population_notes": "All populations"
            }
        ]
    },
    {
        "code": "TP",
        "name": "Total Protein, Serum",
        "category": "HEPATIC",
        "default_unit": "g/dL",
        "loinc_code": "2885-2",
        "description": "Total sum of circulating plasma proteins (principally albumin and globulins).",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 6.0,
                "upper_limit": 8.3,
                "critical_low": 4.5,
                "critical_high": 10.0,
                "unit": "g/dL",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed / Biuret Method",
                "population_notes": "Adult ambulatory patients"
            }
        ]
    },
    {
        "code": "ALB",
        "name": "Albumin, Serum",
        "category": "HEPATIC",
        "default_unit": "g/dL",
        "loinc_code": "1751-7",
        "description": "Primary protein synthesized by hepatocytes; maintains intravascular oncotic pressure and transports hormones/drugs.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 3.5,
                "upper_limit": 5.0,
                "critical_low": 2.0,
                "critical_high": 6.0,
                "unit": "g/dL",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed / Bromocresol Purple",
                "population_notes": "Adult serum"
            }
        ]
    },
    {
        "code": "CHOL",
        "name": "Cholesterol, Total Serum",
        "category": "LIPID",
        "default_unit": "mg/dL",
        "loinc_code": "2093-3",
        "description": "Essential structural component of cell membranes and precursor of steroid hormones and bile acids.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 125.0,
                "upper_limit": 200.0,
                "critical_low": None,
                "critical_high": 350.0,
                "unit": "mg/dL",
                "source_authority": "NCEP ATP III / AHA Guidelines",
                "population_notes": "Desirable level <200 mg/dL"
            }
        ]
    },
    {
        "code": "TRIG",
        "name": "Triglycerides, Serum",
        "category": "LIPID",
        "default_unit": "mg/dL",
        "loinc_code": "2571-8",
        "description": "Primary dietary lipid stored in adipose tissue and transported in chylomicrons and VLDL.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 40.0,
                "upper_limit": 150.0,
                "critical_low": None,
                "critical_high": 500.0,
                "unit": "mg/dL",
                "source_authority": "NCEP ATP III / AHA Guidelines",
                "population_notes": "Fasting (12 hr) serum; >500 confers acute pancreatitis risk"
            }
        ]
    },
    {
        "code": "HDL",
        "name": "High-Density Lipoprotein Cholesterol (HDL-C)",
        "category": "LIPID",
        "default_unit": "mg/dL",
        "loinc_code": "2085-9",
        "description": "Anti-atherogenic lipoprotein responsible for reverse cholesterol transport from peripheral tissues to liver.",
        "ranges": [
            {
                "biological_sex": "MALE",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 40.0,
                "upper_limit": 80.0,
                "critical_low": 20.0,
                "critical_high": None,
                "unit": "mg/dL",
                "source_authority": "NCEP ATP III Guidelines",
                "population_notes": "Adult Males"
            },
            {
                "biological_sex": "FEMALE",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 50.0,
                "upper_limit": 90.0,
                "critical_low": 20.0,
                "critical_high": None,
                "unit": "mg/dL",
                "source_authority": "NCEP ATP III Guidelines",
                "population_notes": "Adult Females"
            }
        ]
    },
    {
        "code": "LDL",
        "name": "Low-Density Lipoprotein Cholesterol (LDL-C)",
        "category": "LIPID",
        "default_unit": "mg/dL",
        "loinc_code": "13457-7",
        "description": "Principal atherogenic circulating lipoprotein delivering cholesterol to peripheral tissues.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 50.0,
                "upper_limit": 100.0,
                "critical_low": None,
                "critical_high": 190.0,
                "unit": "mg/dL",
                "source_authority": "AHA/ACC 2018 Cholesterol Guidelines",
                "population_notes": "Optimal < 100 mg/dL"
            }
        ]
    },
    {
        "code": "HBA1C",
        "name": "Hemoglobin A1c (Glycated Hemoglobin)",
        "category": "METABOLIC",
        "default_unit": "%",
        "loinc_code": "4548-4",
        "description": "Reflects mean glycemic exposure over erythrocyte lifespan (~90-120 days). Gold standard for long-term diabetes control.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 0,
                "max_age_years": 120,
                "lower_limit": 4.0,
                "upper_limit": 5.6,
                "critical_low": None,
                "critical_high": 12.0,
                "unit": "%",
                "source_authority": "ADA Standards of Care 2024 / NGSP Certified",
                "population_notes": "<5.7% Normal, 5.7-6.4% Prediabetes, >=6.5% Diabetes"
            }
        ]
    },
    {
        "code": "URIC",
        "name": "Uric Acid, Serum",
        "category": "METABOLIC",
        "default_unit": "mg/dL",
        "loinc_code": "3084-1",
        "description": "Final oxidation product of purine catabolism in humans. High levels predispose to gout and nephrolithiasis.",
        "ranges": [
            {
                "biological_sex": "MALE",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 3.4,
                "upper_limit": 7.0,
                "critical_low": None,
                "critical_high": 12.0,
                "unit": "mg/dL",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed",
                "population_notes": "Adult Males"
            },
            {
                "biological_sex": "FEMALE",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 2.4,
                "upper_limit": 6.0,
                "critical_low": None,
                "critical_high": 12.0,
                "unit": "mg/dL",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed",
                "population_notes": "Adult Females"
            }
        ]
    },
    {
        "code": "AMYL",
        "name": "Amylase, Serum",
        "category": "PANCREATIC",
        "default_unit": "U/L",
        "loinc_code": "1798-8",
        "description": "Hydrolase that cleaves starch into simpler carbohydrates; highly sensitive marker for acute pancreatitis.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 28.0,
                "upper_limit": 100.0,
                "critical_low": None,
                "critical_high": 400.0,
                "unit": "U/L",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed",
                "population_notes": "Adult enzymatic rate assay"
            }
        ]
    },
    {
        "code": "LIP",
        "name": "Lipase, Serum",
        "category": "PANCREATIC",
        "default_unit": "U/L",
        "loinc_code": "3040-3",
        "description": "Hydrolyzes glycerol esters of long-chain fatty acids. More specific than amylase with longer serum half-life in pancreatitis.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 10.0,
                "upper_limit": 60.0,
                "critical_low": None,
                "critical_high": 250.0,
                "unit": "U/L",
                "source_authority": "ACG Guidelines / Tietz 7th Ed",
                "population_notes": "Adults"
            }
        ]
    },
    {
        "code": "GGT",
        "name": "Gamma-Glutamyl Transferase (GGT), Serum",
        "category": "HEPATIC",
        "default_unit": "U/L",
        "loinc_code": "2324-2",
        "description": "Microsomal enzyme sensitive to biliary epithelial injury, enzyme-inducing drugs, and alcohol ingestion.",
        "ranges": [
            {
                "biological_sex": "MALE",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 10.0,
                "upper_limit": 71.0,
                "critical_low": None,
                "critical_high": 500.0,
                "unit": "U/L",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed",
                "population_notes": "Adult Males"
            },
            {
                "biological_sex": "FEMALE",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 6.0,
                "upper_limit": 42.0,
                "critical_low": None,
                "critical_high": 500.0,
                "unit": "U/L",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed",
                "population_notes": "Adult Females"
            }
        ]
    },
    {
        "code": "MG",
        "name": "Magnesium, Serum",
        "category": "ELECTROLYTES",
        "default_unit": "mg/dL",
        "loinc_code": "2601-3",
        "description": "Essential intracellular divalent cation; cofactor for >300 enzymatic reactions including ATP synthesis and neuromuscular transmission.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 1.7,
                "upper_limit": 2.2,
                "critical_low": 1.0,
                "critical_high": 4.5,
                "unit": "mg/dL",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed",
                "population_notes": "Adult Serum"
            }
        ]
    },
    {
        "code": "PHOS",
        "name": "Phosphate (Inorganic Phosphorus), Serum",
        "category": "ELECTROLYTES",
        "default_unit": "mg/dL",
        "loinc_code": "2777-1",
        "description": "Primary intracellular anion; vital for cellular energy metabolism (ATP, 2,3-DPG), membrane phospholipids, and bone mineralization.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 2.5,
                "upper_limit": 4.5,
                "critical_low": 1.0,
                "critical_high": 8.0,
                "unit": "mg/dL",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed",
                "population_notes": "Adult Serum"
            }
        ]
    },
    {
        "code": "PH",
        "name": "pH, Arterial Blood Gas",
        "category": "ACID_BASE",
        "default_unit": "pH units",
        "loinc_code": "2744-1",
        "description": "Negative logarithm of hydrogen ion activity in arterial blood. Central parameter for acid-base status.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 0,
                "max_age_years": 120,
                "lower_limit": 7.35,
                "upper_limit": 7.45,
                "critical_low": 7.20,
                "critical_high": 7.60,
                "unit": "pH units",
                "source_authority": "CLSI C46-A2 / Tietz 7th Ed",
                "population_notes": "Arterial whole blood at 37°C"
            }
        ]
    },
    {
        "code": "PACO2",
        "name": "pCO2, Arterial Blood Gas",
        "category": "ACID_BASE",
        "default_unit": "mmHg",
        "loinc_code": "2019-8",
        "description": "Partial pressure of carbon dioxide in arterial blood. Reflects alveolar ventilation and respiratory acid-base component.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 0,
                "max_age_years": 120,
                "lower_limit": 35.0,
                "upper_limit": 45.0,
                "critical_low": 20.0,
                "critical_high": 60.0,
                "unit": "mmHg",
                "source_authority": "CLSI C46-A2 / Tietz 7th Ed",
                "population_notes": "Arterial whole blood"
            }
        ]
    },
    {
        "code": "PAO2",
        "name": "pO2, Arterial Blood Gas",
        "category": "ACID_BASE",
        "default_unit": "mmHg",
        "loinc_code": "2703-7",
        "description": "Partial pressure of dissolved oxygen in arterial blood. Evaluates gas exchange and hypoxemia.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 0,
                "max_age_years": 120,
                "lower_limit": 80.0,
                "upper_limit": 100.0,
                "critical_low": 55.0,
                "critical_high": None,
                "unit": "mmHg",
                "source_authority": "CLSI C46-A2 / Tietz 7th Ed",
                "population_notes": "Room air (FiO2 0.21)"
            }
        ]
    },
    {
        "code": "OSM_MEAS",
        "name": "Osmolality, Measured Serum",
        "category": "ELECTROLYTES",
        "default_unit": "mOsm/kg",
        "loinc_code": "2692-2",
        "description": "Direct freezing point depression measurement of total solute concentration in serum.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 0,
                "max_age_years": 120,
                "lower_limit": 275.0,
                "upper_limit": 295.0,
                "critical_low": 250.0,
                "critical_high": 320.0,
                "unit": "mOsm/kg",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed",
                "population_notes": "Freezing point osmometry"
            }
        ]
    },
    {
        "code": "U_NA",
        "name": "Sodium, Spot Urine",
        "category": "RENAL",
        "default_unit": "mmol/L",
        "loinc_code": "2955-3",
        "description": "Spot urine sodium concentration. Used in calculating Fractional Excretion of Sodium (FENa).",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 0,
                "max_age_years": 120,
                "lower_limit": 20.0,
                "upper_limit": 220.0,
                "critical_low": None,
                "critical_high": None,
                "unit": "mmol/L",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed",
                "population_notes": "Spot random urine"
            }
        ]
    },
    {
        "code": "U_CREAT",
        "name": "Creatinine, Spot Urine",
        "category": "RENAL",
        "default_unit": "mg/dL",
        "loinc_code": "2161-8",
        "description": "Spot urine creatinine concentration. Used for FENa calculation and urine analyte normalization.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 0,
                "max_age_years": 120,
                "lower_limit": 20.0,
                "upper_limit": 320.0,
                "critical_low": None,
                "critical_high": None,
                "unit": "mg/dL",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed",
                "population_notes": "Spot random urine"
            }
        ]
    },
    {
        "code": "IRON",
        "name": "Iron, Total Serum",
        "category": "METABOLIC",
        "default_unit": "ug/dL",
        "loinc_code": "2498-4",
        "description": "Circulating ferric iron bound almost entirely to transferrin.",
        "ranges": [
            {
                "biological_sex": "MALE",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 65.0,
                "upper_limit": 175.0,
                "critical_low": 20.0,
                "critical_high": 350.0,
                "unit": "ug/dL",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed",
                "population_notes": "Morning fasting serum"
            },
            {
                "biological_sex": "FEMALE",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 50.0,
                "upper_limit": 170.0,
                "critical_low": 20.0,
                "critical_high": 350.0,
                "unit": "ug/dL",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed",
                "population_notes": "Morning fasting serum"
            }
        ]
    },
    {
        "code": "TIBC",
        "name": "Total Iron-Binding Capacity (TIBC), Serum",
        "category": "METABOLIC",
        "default_unit": "ug/dL",
        "loinc_code": "2500-7",
        "description": "Indirect stoichiometric measure of serum transferrin concentration.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 250.0,
                "upper_limit": 450.0,
                "critical_low": None,
                "critical_high": None,
                "unit": "ug/dL",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed",
                "population_notes": "Adult serum"
            }
        ]
    },
    {
        "code": "INSULIN",
        "name": "Insulin, Fasting Serum",
        "category": "METABOLIC",
        "default_unit": "uIU/mL",
        "loinc_code": "2044-8",
        "description": "Pancreatic beta-cell peptide hormone; regulates glucose homeostasis. Used for HOMA-IR.",
        "ranges": [
            {
                "biological_sex": "ALL",
                "min_age_years": 18,
                "max_age_years": 120,
                "lower_limit": 2.6,
                "upper_limit": 24.9,
                "critical_low": None,
                "critical_high": 100.0,
                "unit": "uIU/mL",
                "source_authority": "Tietz Textbook of Clinical Chemistry 7th Ed",
                "population_notes": "Fasting (>=8 hr) serum"
            }
        ]
    }
]

def seed_standard_biochemistry_library(db: Session):
    """Seed standard clinical biochemistry library with traceable reference intervals."""
    existing_codes = {a.code for a in db.query(TestAnalyte.code).all()}

    logger.info("Verifying standard traceable clinical biochemistry analyte library...")
    added_count = 0
    for item in STANDARD_ANALYTES:
        if item["code"] in existing_codes:
            continue

        analyte = TestAnalyte(
            code=item["code"],
            name=item["name"],
            category=item["category"],
            default_unit=item["default_unit"],
            loinc_code=item["loinc_code"],
            description=item["description"],
            is_active=True
        )
        db.add(analyte)
        db.flush()

        for r in item["ranges"]:
            ref_range = ReferenceRange(
                analyte_id=analyte.id,
                biological_sex=r["biological_sex"],
                min_age_years=r["min_age_years"],
                max_age_years=r["max_age_years"],
                lower_limit=r["lower_limit"],
                upper_limit=r["upper_limit"],
                critical_low=r["critical_low"],
                critical_high=r["critical_high"],
                unit=r["unit"],
                source_authority=r["source_authority"],
                population_notes=r["population_notes"]
            )
            db.add(ref_range)
        added_count += 1

    if added_count > 0:
        db.commit()
        logger.info("Added %d new standard clinical biochemistry analytes successfully.", added_count)
