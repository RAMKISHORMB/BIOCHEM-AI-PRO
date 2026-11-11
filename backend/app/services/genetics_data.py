from typing import List, Dict, Any

INBORN_ERRORS_DATABASE: List[Dict[str, Any]] = [
    {
        "disorder_name": "Phenylketonuria (Classical PKU)",
        "omim_id": "OMIM #261600",
        "gene_symbol": "PAH",
        "enzyme_name": "Phenylalanine Hydroxylase",
        "ec_number": "EC 1.14.16.1",
        "chromosome_location": "12q23.2",
        "inheritance_pattern": "Autosomal Recessive",
        "metabolic_pathway": "Aromatic Amino Acid Metabolism",
        "biochemical_hallmarks": "Markedly elevated plasma phenylalanine (>1200 µmol/L), decreased tyrosine, phenylketones (phenylpyruvate) in urine.",
        "clinical_presentation": "Severe irreversible cognitive disability, microcephaly, seizures, hypopigmentation (fair hair/skin), musty/mousy odor.",
        "management": "Dietary restriction of phenylalanine with synthetic amino acid medical formulas; sapropterin (BH4) in responsive alleles."
    },
    {
        "disorder_name": "Classical Galactosemia",
        "omim_id": "OMIM #230400",
        "gene_symbol": "GALT",
        "enzyme_name": "Galactose-1-Phosphate Uridylyltransferase",
        "ec_number": "EC 2.7.7.12",
        "chromosome_location": "9p13.3",
        "inheritance_pattern": "Autosomal Recessive",
        "metabolic_pathway": "Leloir Pathway of Galactose Metabolism",
        "biochemical_hallmarks": "Accumulation of toxic Galactose-1-phosphate, galactitol, and free galactose. Positive urinary reducing substances (Clinitest).",
        "clinical_presentation": "Neonatal onset following lactose/milk ingestion: severe jaundice, hepatomegaly, failure to thrive, bilateral oil-drop cataracts, E. coli sepsis.",
        "management": "Strict lifelong dietary elimination of lactose and galactose (soy-based formulas)."
    },
    {
        "disorder_name": "Maple Syrup Urine Disease (MSUD)",
        "omim_id": "OMIM #248600",
        "gene_symbol": "BCKDHA / BCKDHB / DBT",
        "enzyme_name": "Branched-Chain Alpha-Keto Acid Dehydrogenase Complex",
        "ec_number": "EC 1.2.4.4",
        "chromosome_location": "19q13.2 / 6p14.1",
        "inheritance_pattern": "Autosomal Recessive",
        "metabolic_pathway": "Branched-Chain Amino Acid (BCAA) Catabolism",
        "biochemical_hallmarks": "Elevated branched-chain amino acids (Leucine, Isoleucine, Valine) and pathognomonic allo-isoleucine in plasma.",
        "clinical_presentation": "Neonatal encephalopathy, sweet maple syrup odor of cerumen and urine, ketoacidosis, alternating hypertonia/flaccidity, cerebral edema.",
        "management": "Specialized BCAA-restricted diet; aggressive management of acute metabolic decompensation."
    },
    {
        "disorder_name": "Ornithine Transcarbamylase (OTC) Deficiency",
        "omim_id": "OMIM #311250",
        "gene_symbol": "OTC",
        "enzyme_name": "Ornithine Transcarbamylase",
        "ec_number": "EC 2.1.3.3",
        "chromosome_location": "Xp11.4",
        "inheritance_pattern": "X-Linked Recessive",
        "metabolic_pathway": "Urea Cycle",
        "biochemical_hallmarks": "Severe hyperammonemia (>500 µmol/L), elevated urinary orotic acid, low or absent plasma citrulline, elevated glutamine.",
        "clinical_presentation": "Neonatal coma, hyperventilation (respiratory alkalosis), cerebral edema; variable late-onset in heterozygous females.",
        "management": "Nitrogen scavenger therapy (Sodium phenylbutyrate, Sodium benzoate), dietary protein restriction, hemodialysis for acute hyperammonemia."
    },
    {
        "disorder_name": "Glycogen Storage Disease Type Ia (von Gierke)",
        "omim_id": "OMIM #232200",
        "gene_symbol": "G6PC",
        "enzyme_name": "Glucose-6-Phosphatase Catalytic Subunit",
        "ec_number": "EC 3.1.3.9",
        "chromosome_location": "17q21.31",
        "inheritance_pattern": "Autosomal Recessive",
        "metabolic_pathway": "Glycogenolysis & Gluconeogenesis",
        "biochemical_hallmarks": "Severe fasting hypoglycemia, profound lactic acidosis, hyperuricemia, hypertriglyceridemia.",
        "clinical_presentation": "Hepatomegaly (doll-like facies), failure to thrive, bleeding diathesis, hepatic adenomas in young adulthood.",
        "management": "Uncooked cornstarch feedings to maintain normoglycemia; allopurinol for hyperuricemia."
    },
    {
        "disorder_name": "Wilson Disease (Hepatolenticular Degeneration)",
        "omim_id": "OMIM #277900",
        "gene_symbol": "ATP7B",
        "enzyme_name": "Copper-transporting P-type ATPase",
        "ec_number": "EC 7.2.2.8",
        "chromosome_location": "13q14.3",
        "inheritance_pattern": "Autosomal Recessive",
        "metabolic_pathway": "Hepatic Copper Homeostasis & Biliary Excretion",
        "biochemical_hallmarks": "Decreased serum ceruloplasmin (<20 mg/dL), markedly elevated 24-hr urinary copper excretion (>100 µg/day), elevated hepatic copper content.",
        "clinical_presentation": "Hepatic dysfunction (acute hepatitis, cirrhosis), neurological symptoms (tremor, dysarthria, dystonia), psychiatric changes, Kayser-Fleischer corneal rings.",
        "management": "Copper chelating agents (D-penicillamine, Trientine), oral zinc acetate to block intestinal copper absorption."
    },
    {
        "disorder_name": "Hereditary Hemochromatosis",
        "omim_id": "OMIM #235200",
        "gene_symbol": "HFE (p.C282Y / p.H63D)",
        "enzyme_name": "Homeostatic Iron Regulator (HFE)",
        "ec_number": "N/A (Membrane Regulator)",
        "chromosome_location": "6p22.2",
        "inheritance_pattern": "Autosomal Recessive",
        "metabolic_pathway": "Systemic Iron Homeostasis & Hepcidin Regulation",
        "biochemical_hallmarks": "Elevated transferrin saturation (>45%), markedly elevated serum ferritin (>300 ng/mL in men, >200 ng/mL in women).",
        "clinical_presentation": "Hyperpigmentation ('bronze diabetes'), hepatic cirrhosis, cardiomyopathy, pseudogout/arthropathy, erectile dysfunction.",
        "management": "Therapeutic phlebotomy to maintain target ferritin 50-100 ng/mL."
    },
    {
        "disorder_name": "Tay-Sachs Disease",
        "omim_id": "OMIM #272800",
        "gene_symbol": "HEXA",
        "enzyme_name": "Beta-Hexosaminidase A (alpha-subunit)",
        "ec_number": "EC 3.2.1.52",
        "chromosome_location": "15q23",
        "inheritance_pattern": "Autosomal Recessive",
        "metabolic_pathway": "Lysosomal Sphingolipid Catabolism",
        "biochemical_hallmarks": "Severely deficient or absent hexosaminidase A enzymatic activity in leukocytes or cultured skin fibroblasts; GM2 ganglioside accumulation.",
        "clinical_presentation": "Neurodevelopmental regression starting at 3-6 months, exaggerated startle response, cherry-red macular spot, blindness, seizures.",
        "management": "Palliative and supportive care."
    },
    {
        "disorder_name": "Medium-Chain Acyl-CoA Dehydrogenase (MCAD) Deficiency",
        "omim_id": "OMIM #201450",
        "gene_symbol": "ACADM",
        "enzyme_name": "Medium-Chain Acyl-CoA Dehydrogenase",
        "ec_number": "EC 1.3.8.7",
        "chromosome_location": "1p31.1",
        "inheritance_pattern": "Autosomal Recessive",
        "metabolic_pathway": "Mitochondrial Fatty Acid Beta-Oxidation",
        "biochemical_hallmarks": "Hypoketotic hypoglycemia during fasting, elevated plasma octanoylcarnitine (C8), dicarboxylic aciduria.",
        "clinical_presentation": "Lethargy, vomiting, seizures, sudden unexplained infant death following prolonged fasting or viral intercurrent illness.",
        "management": "Avoidance of fasting (>10-12 hrs), frequent complex carbohydrate snacks; oral carnitine supplementation."
    }
]

def search_inborn_errors(query: str = "") -> List[Dict[str, Any]]:
    """Search inborn errors catalog by gene, disorder name, enzyme or EC number."""
    if not query:
        return INBORN_ERRORS_DATABASE
    q = query.lower().strip()
    return [
        d for d in INBORN_ERRORS_DATABASE
        if q in d["disorder_name"].lower()
        or q in d["gene_symbol"].lower()
        or q in d["enzyme_name"].lower()
        or q in d["ec_number"].lower()
        or q in d["metabolic_pathway"].lower()
    ]
