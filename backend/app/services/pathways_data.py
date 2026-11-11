from typing import List, Dict, Any

METABOLIC_PATHWAYS_DATABASE: List[Dict[str, Any]] = [
    {
        "id": "glycolysis-gluconeogenesis",
        "name": "Glycolysis & Gluconeogenesis",
        "category": "Carbohydrate Metabolism",
        "subcellular_location": "Cytosol",
        "primary_organ": "Liver, Skeletal Muscle, Brain, Erythrocytes",
        "summary": "Central carbohydrate pathway for ATP generation under aerobic/anaerobic conditions and endogenous glucose synthesis during fasting.",
        "linked_analytes": ["GLU", "HCO3", "LDH"],
        "nodes": [
            {
                "id": "glucose",
                "name": "D-Glucose",
                "type": "substrate",
                "analyte_code": "GLU",
                "formula": "C6H12O6"
            },
            {
                "id": "hexokinase",
                "name": "Hexokinase / Glucokinase",
                "type": "enzyme",
                "ec_number": "EC 2.7.1.1",
                "regulation": "Glucokinase induced by insulin; Hexokinase inhibited by G6P",
                "cofactors": "Mg2+, ATP"
            },
            {
                "id": "g6p",
                "name": "Glucose-6-Phosphate (G6P)",
                "type": "intermediate"
            },
            {
                "id": "pfk1",
                "name": "Phosphofructokinase-1 (PFK-1)",
                "type": "enzyme",
                "ec_number": "EC 2.7.1.11",
                "regulation": "Rate-limiting step of glycolysis. Activated by AMP and Fructose-2,6-BP; inhibited by ATP and Citrate.",
                "cofactors": "Mg2+, ATP"
            },
            {
                "id": "f16bp",
                "name": "Fructose-1,6-Bisphosphate",
                "type": "intermediate"
            },
            {
                "id": "pyruvate_kinase",
                "name": "Pyruvate Kinase (PK)",
                "type": "enzyme",
                "ec_number": "EC 2.7.1.40",
                "regulation": "Activated by F-1,6-BP (feedforward); inhibited by ATP and Alanine.",
                "cofactors": "K+, Mg2+"
            },
            {
                "id": "pyruvate",
                "name": "Pyruvate",
                "type": "intermediate"
            },
            {
                "id": "g6pase",
                "name": "Glucose-6-Phosphatase",
                "type": "enzyme",
                "ec_number": "EC 3.1.3.9",
                "regulation": "Final bypass of gluconeogenesis in ER of hepatocytes. Deficient in von Gierke disease (GSD Ia).",
                "cofactors": "Mg2+"
            }
        ]
    },
    {
        "id": "tca-cycle",
        "name": "Tricarboxylic Acid (TCA / Krebs) Cycle",
        "category": "Aerobic Energy Generation",
        "subcellular_location": "Mitochondrial Matrix",
        "primary_organ": "All aerobic tissues (Liver, Heart, Kidney, Brain)",
        "summary": "Final common pathway for the oxidation of carbohydrates, lipids, and amino acids, generating NADH, FADH2, and GTP.",
        "linked_analytes": ["GLU", "HCO3"],
        "nodes": [
            {
                "id": "pdc",
                "name": "Pyruvate Dehydrogenase Complex (PDC)",
                "type": "enzyme",
                "ec_number": "EC 1.2.4.1",
                "regulation": "Inactivated by phosphorylation (PDK); activated by Ca2+, ADP, NAD+.",
                "cofactors": "Thiamine pyrophosphate (B1), Lipoic acid, CoA, FAD, NAD+"
            },
            {
                "id": "acetyl_coa",
                "name": "Acetyl-CoA",
                "type": "intermediate"
            },
            {
                "id": "citrate_synthase",
                "name": "Citrate Synthase",
                "type": "enzyme",
                "ec_number": "EC 2.3.3.1",
                "regulation": "Inhibited by ATP, NADH, Citrate, Succinyl-CoA."
            },
            {
                "id": "isocitrate_dh",
                "name": "Isocitrate Dehydrogenase",
                "type": "enzyme",
                "ec_number": "EC 1.1.1.42",
                "regulation": "Rate-limiting step of TCA cycle. Activated by ADP; inhibited by ATP and NADH.",
                "cofactors": "NAD+, Mg2+ / Mn2+"
            },
            {
                "id": "akg_dh",
                "name": "alpha-Ketoglutarate Dehydrogenase Complex",
                "type": "enzyme",
                "ec_number": "EC 1.2.4.2",
                "regulation": "Inhibited by Succinyl-CoA, NADH; activated by Ca2+.",
                "cofactors": "B1, Lipoate, CoA, FAD, NAD+"
            },
            {
                "id": "malate_dh",
                "name": "Malate Dehydrogenase (MDH)",
                "type": "enzyme",
                "ec_number": "EC 1.1.1.37",
                "cofactors": "NAD+"
            }
        ]
    },
    {
        "id": "urea-cycle",
        "name": "Urea Cycle & Ammonia Clearance",
        "category": "Nitrogen Catabolism",
        "subcellular_location": "Mitochondria & Cytosol (Dual compartment)",
        "primary_organ": "Liver (Hepatocytes)",
        "summary": "Detoxifies neurotoxic free ammonia generated by amino acid catabolism into excretable water-soluble urea.",
        "linked_analytes": ["BUN", "CREAT"],
        "nodes": [
            {
                "id": "ammonia",
                "name": "Free Ammonium (NH4+)",
                "type": "substrate"
            },
            {
                "id": "cps1",
                "name": "Carbamoyl Phosphate Synthetase I (CPS1)",
                "type": "enzyme",
                "ec_number": "EC 6.3.4.16",
                "regulation": "Mitochondrial, rate-limiting step. Absolutely requires N-acetylglutamate (NAG) as obligate allosteric activator.",
                "cofactors": "2 ATP, Mg2+"
            },
            {
                "id": "otc",
                "name": "Ornithine Transcarbamylase (OTC)",
                "type": "enzyme",
                "ec_number": "EC 2.1.3.3",
                "regulation": "Mitochondrial. Most common inborn error of urea cycle (X-linked). Causes severe hyperammonemia and orotic aciduria."
            },
            {
                "id": "ass1",
                "name": "Argininosuccinate Synthetase",
                "type": "enzyme",
                "ec_number": "EC 6.3.4.5",
                "regulation": "Cytosolic. Condenses citrulline with aspartate. Deficient in Citrullinemia Type I."
            },
            {
                "id": "asl",
                "name": "Argininosuccinate Lyase",
                "type": "enzyme",
                "ec_number": "EC 4.3.2.1",
                "regulation": "Cytosolic. Cleaves argininosuccinate into arginine and fumarate (TCA cycle link)."
            },
            {
                "id": "arg1",
                "name": "Arginase-1",
                "type": "enzyme",
                "ec_number": "EC 3.5.3.1",
                "regulation": "Cytosolic. Hydrolyzes arginine to release Urea and regenerate Ornithine.",
                "cofactors": "Mn2+"
            },
            {
                "id": "urea",
                "name": "Urea",
                "type": "product",
                "analyte_code": "BUN"
            }
        ]
    },
    {
        "id": "lipid-metabolism",
        "name": "Lipid Metabolism & Ketogenesis",
        "category": "Lipid Homeostasis",
        "subcellular_location": "Mitochondria & Cytosol",
        "primary_organ": "Liver, Adipose Tissue",
        "summary": "Fatty acid beta-oxidation yields acetyl-CoA for the TCA cycle and liver ketogenesis during prolonged starvation.",
        "linked_analytes": ["TRIG", "CHOL", "HDL", "LDL"],
        "nodes": [
            {
                "id": "cpt1",
                "name": "Carnitine Palmitoyltransferase I (CPT-1)",
                "type": "enzyme",
                "ec_number": "EC 2.3.1.21",
                "regulation": "Outer mitochondrial membrane rate-limiting gate for fatty acyl-CoA entry. Inhibited by Malonyl-CoA."
            },
            {
                "id": "mcad",
                "name": "Medium-Chain Acyl-CoA Dehydrogenase (MCAD)",
                "type": "enzyme",
                "ec_number": "EC 1.3.8.7",
                "regulation": "Mitochondrial matrix. Deficiency causes life-threatening hypoketotic hypoglycemia.",
                "cofactors": "FAD"
            },
            {
                "id": "hmg_coa_reductase",
                "name": "HMG-CoA Reductase",
                "type": "enzyme",
                "ec_number": "EC 1.1.1.34",
                "regulation": "Rate-limiting step of de novo cholesterol biosynthesis. Competitively inhibited by statin pharmacotherapy.",
                "cofactors": "2 NADPH"
            },
            {
                "id": "lipoprotein_lipase",
                "name": "Lipoprotein Lipase (LPL)",
                "type": "enzyme",
                "ec_number": "EC 3.1.1.34",
                "regulation": "Endothelial capillary surface. Hydrolyzes triglycerides in chylomicrons and VLDL. Activated by Apo C-II.",
                "analyte_code": "TRIG"
            }
        ]
    },
    {
        "id": "purine-metabolism",
        "name": "Purine Nucleotide Degradation & Uric Acid",
        "category": "Nucleotide Metabolism",
        "subcellular_location": "Cytosol",
        "primary_organ": "Liver, Kidney, Intestine",
        "summary": "Degradation of adenine and guanine nucleotides culminating in uric acid generation, key to the pathophysiology of gout.",
        "linked_analytes": ["URIC"],
        "nodes": [
            {
                "id": "hgprt",
                "name": "Hypoxanthine-Guanine Phosphoribosyltransferase",
                "type": "enzyme",
                "ec_number": "EC 2.4.2.8",
                "regulation": "Purine salvage pathway. Complete deficiency causes Lesch-Nyhan syndrome.",
                "cofactors": "PRPP, Mg2+"
            },
            {
                "id": "xanthine_oxidase",
                "name": "Xanthine Oxidase",
                "type": "enzyme",
                "ec_number": "EC 1.17.3.2",
                "regulation": "Sequential oxidation of hypoxanthine to xanthine, and xanthine to uric acid. Target of Allopurinol and Febuxostat.",
                "cofactors": "Molybdenum, FAD, Iron-sulfur clusters"
            },
            {
                "id": "uric_acid",
                "name": "Uric Acid",
                "type": "product",
                "analyte_code": "URIC"
            }
        ]
    }
]

def get_pathways_with_patient_overlay(patient_abnormal_codes: List[str]) -> List[Dict[str, Any]]:
    """Annotates metabolic pathway nodes based on patient abnormal lab results."""
    annotated = []
    for pathway in METABOLIC_PATHWAYS_DATABASE:
        pw_copy = dict(pathway)
        is_pathway_impacted = any(code in patient_abnormal_codes for code in pathway["linked_analytes"])
        pw_copy["is_impacted_by_patient_labs"] = is_pathway_impacted
        
        annotated_nodes = []
        for node in pathway["nodes"]:
            node_copy = dict(node)
            node_code = node.get("analyte_code")
            if node_code and node_code in patient_abnormal_codes:
                node_copy["patient_status"] = "ABNORMAL"
            else:
                node_copy["patient_status"] = "NOMINAL"
            annotated_nodes.append(node_copy)
            
        pw_copy["nodes"] = annotated_nodes
        annotated.append(pw_copy)
    return annotated
