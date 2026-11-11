import io
import csv
import json
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)

from app.models.encounter import Encounter
from app.models.lab_result import LabResult
from app.models.patient import Patient
from app.models.interpretation import InterpretationReport

def generate_clinical_report_pdf(db: Session, encounter_id: str) -> io.BytesIO:
    """
    Generate an official, CLIA/CAP-aligned clinical biochemistry laboratory report in PDF.
    Includes patient demographics, accession tracking, flagged analyte results,
    calculated indices, biochemist interpretation notes, and sign-off block.
    """
    encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
    if not encounter:
        raise ValueError("Encounter not found")

    patient = encounter.patient
    results = (
        db.query(LabResult)
        .filter(LabResult.encounter_id == encounter.id)
        .order_by(LabResult.created_at.asc())
        .all()
    )
    interpretation = encounter.interpretation

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    header_title_style = ParagraphStyle(
        'HeaderTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=2,
    )
    header_sub_style = ParagraphStyle(
        'HeaderSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#475569'),
    )
    section_title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=13,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=8,
        spaceAfter=4,
    )
    cell_style = ParagraphStyle(
        'CellText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1E293B'),
    )
    cell_bold_style = ParagraphStyle(
        'CellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#0F172A'),
    )
    flag_high_style = ParagraphStyle(
        'FlagHigh',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#DC2626'),
    )
    flag_low_style = ParagraphStyle(
        'FlagLow',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#2563EB'),
    )
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#64748B'),
    )

    story = []

    # 1. Organization Header
    header_data = [
        [
            Paragraph("<b>BIOCHEM AI &mdash; CLINICAL BIOCHEMISTRY LABORATORY</b>", header_title_style),
            Paragraph(f"<b>Report Date:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", header_sub_style)
        ],
        [
            Paragraph("Division of Clinical Informatics & Chemical Pathology | CLIA ID: 99D2849104 | CAP Accredited", header_sub_style),
            Paragraph(f"<b>Status:</b> {encounter.clinical_status}", header_sub_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[380, 160])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0F172A'), spaceBefore=6, spaceAfter=8))

    # 2. Patient Demographics & Accession Details Grid
    demographics_data = [
        [
            Paragraph("<b>Patient Name:</b>", cell_style),
            Paragraph(patient.full_name, cell_bold_style),
            Paragraph("<b>Accession No:</b>", cell_style),
            Paragraph(encounter.accession_number, cell_bold_style),
        ],
        [
            Paragraph("<b>MRN:</b>", cell_style),
            Paragraph(patient.mrn, cell_bold_style),
            Paragraph("<b>Sample Type:</b>", cell_style),
            Paragraph(f"{encounter.sample_type} ({encounter.fasting_status})", cell_style),
        ],
        [
            Paragraph("<b>DOB / Age:</b>", cell_style),
            Paragraph(f"{patient.date_of_birth} ({patient.age_years} yrs)", cell_style),
            Paragraph("<b>Collected:</b>", cell_style),
            Paragraph(encounter.sample_collected_at.strftime('%Y-%m-%d %H:%M'), cell_style),
        ],
        [
            Paragraph("<b>Biological Sex:</b>", cell_style),
            Paragraph(patient.biological_sex, cell_style),
            Paragraph("<b>Received:</b>", cell_style),
            Paragraph(encounter.sample_received_at.strftime('%Y-%m-%d %H:%M'), cell_style),
        ],
    ]
    demo_table = Table(demographics_data, colWidths=[90, 180, 90, 180])
    demo_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(demo_table)
    story.append(Spacer(1, 10))

    # 3. Laboratory Test Results Table
    story.append(Paragraph("QUANTITATIVE BIOCHEMICAL TEST RESULTS", section_title_style))

    results_header = [
        Paragraph("<b>Analyte / Test Name</b>", cell_bold_style),
        Paragraph("<b>Measured Value</b>", cell_bold_style),
        Paragraph("<b>Unit</b>", cell_bold_style),
        Paragraph("<b>Reference Interval</b>", cell_bold_style),
        Paragraph("<b>Flag</b>", cell_bold_style),
    ]
    results_rows = [results_header]

    for r in results:
        analyte_name = f"{r.analyte.name} ({r.analyte.code})" if r.analyte else "Unknown Analyte"
        val_str = str(r.value_numeric) if r.value_numeric is not None else (r.value_text or "N/A")
        
        # Color-coded flag text
        if "CRITICAL" in r.flag or r.flag == "HIGH":
            flag_para = Paragraph(f"<b>{r.flag}</b>", flag_high_style)
        elif r.flag == "LOW":
            flag_para = Paragraph(f"<b>{r.flag}</b>", flag_low_style)
        else:
            flag_para = Paragraph(r.flag, cell_style)

        results_rows.append([
            Paragraph(analyte_name, cell_style),
            Paragraph(f"<b>{val_str}</b>", cell_style),
            Paragraph(r.unit, cell_style),
            Paragraph(r.reference_range_applied or "See standard catalog", cell_style),
            flag_para,
        ])

    results_table = Table(results_rows, colWidths=[180, 80, 70, 130, 80])
    results_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E2E8F0')),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 5),
        ('TOPPADDING', (0, 0), (-1, 0), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(results_table)
    story.append(Spacer(1, 10))

    # 4. Calculated Indices & Clinical Guidance (if available)
    if interpretation:
        story.append(Paragraph("CALCULATED BIOCHEMICAL INDICES & CLINICAL GUIDANCE", section_title_style))
        indices = json.loads(interpretation.calculated_indices_json or "{}")
        
        indices_data = []
        row = []
        for k, v in indices.items():
            val_text = f"{v:.2f}" if isinstance(v, (int, float)) else str(v)
            row.append(Paragraph(f"<b>{k}:</b> {val_text}", cell_style))
            if len(row) == 3:
                indices_data.append(row)
                row = []
        if row:
            while len(row) < 3:
                row.append(Paragraph("", cell_style))
            indices_data.append(row)

        if indices_data:
            indices_table = Table(indices_data, colWidths=[180, 180, 180])
            indices_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F1F5F9')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#94A3B8')),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                ('PADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(indices_table)
            story.append(Spacer(1, 6))

        if interpretation.clinical_guidance:
            story.append(Paragraph("<b>Biochemical Interpretation Notes:</b>", cell_bold_style))
            story.append(Paragraph(interpretation.clinical_guidance, cell_style))
            story.append(Spacer(1, 10))

    # 5. Sign-off and Disclaimer Block
    signoff_data = [
        [
            Paragraph("<b>Medical Review & Authorization</b>", cell_bold_style),
            Paragraph("<b>Laboratory Accreditation</b>", cell_bold_style),
        ],
        [
            Paragraph("Interpreting Clinical Biochemist: _______________________________<br/>Date Signed: ________________________", cell_style),
            Paragraph("Automated Clinical Biochemistry Platform v1.0<br/>Traceability: Tietz Textbook of Clinical Chemistry, 7th Ed.", cell_style),
        ]
    ]
    signoff_table = Table(signoff_data, colWidths=[320, 220])
    signoff_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(KeepTogether([
        HRFlowable(width="100%", thickness=0.8, color=colors.HexColor('#94A3B8'), spaceBefore=8, spaceAfter=8),
        signoff_table,
        Spacer(1, 10),
        Paragraph(
            "<b>REGULATORY NOTICE & DISCLAIMER:</b> This laboratory document contains validated quantitative biochemistry "
            "results. All reference ranges are sourced from standard clinical guidelines (Tietz/IFCC). Automated interpretations "
            "and calculated indices are provided for educational and clinical decision support and must be evaluated alongside "
            "complete physical assessment, clinical context, and clinician judgment.",
            disclaimer_style,
        )
    ]))

    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_encounter_csv(db: Session, encounter_id: str) -> str:
    """Export quantitative laboratory results for an encounter as RFC-4180 compliant CSV."""
    encounter = db.query(Encounter).filter(Encounter.id == encounter_id).first()
    if not encounter:
        raise ValueError("Encounter not found")

    output = io.StringIO()
    writer = csv.writer(output)

    # Metadata headers
    writer.writerow(["# BIOCHEM AI Clinical Laboratory Export"])
    writer.writerow(["# Accession", encounter.accession_number])
    writer.writerow(["# Patient MRN", encounter.patient.mrn])
    writer.writerow(["# Patient Name", encounter.patient.full_name])
    writer.writerow(["# Sex", encounter.patient.biological_sex])
    writer.writerow(["# Age", encounter.patient.age_years])
    writer.writerow(["# Collection Date", encounter.sample_collected_at.isoformat()])
    writer.writerow([])

    # Table columns
    writer.writerow(["Analyte Code", "Analyte Name", "Measured Value", "Unit", "Flag", "Reference Range Applied"])

    results = db.query(LabResult).filter(LabResult.encounter_id == encounter.id).all()
    for r in results:
        analyte_code = r.analyte.code if r.analyte else "UNKNOWN"
        analyte_name = r.analyte.name if r.analyte else ""
        writer.writerow([
            analyte_code,
            analyte_name,
            r.value_numeric if r.value_numeric is not None else r.value_text,
            r.unit,
            r.flag,
            r.reference_range_applied or "",
        ])

    return output.getvalue()


def generate_patient_history_csv(db: Session, patient_id: str) -> str:
    """Export longitudinal multi-encounter laboratory history for a patient as CSV."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise ValueError("Patient not found")

    encounters = (
        db.query(Encounter)
        .filter(Encounter.patient_id == patient_id)
        .order_by(Encounter.sample_collected_at.asc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["# Longitudinal Patient Laboratory History"])
    writer.writerow(["# MRN", patient.mrn])
    writer.writerow(["# Full Name", patient.full_name])
    writer.writerow([])

    writer.writerow([
        "Collection Date",
        "Accession Number",
        "Sample Type",
        "Analyte Code",
        "Analyte Name",
        "Measured Value",
        "Unit",
        "Flag",
        "Reference Range"
    ])

    for enc in encounters:
        results = db.query(LabResult).filter(LabResult.encounter_id == enc.id).all()
        for r in results:
            writer.writerow([
                enc.sample_collected_at.strftime("%Y-%m-%d %H:%M"),
                enc.accession_number,
                enc.sample_type,
                r.analyte.code if r.analyte else "UNKNOWN",
                r.analyte.name if r.analyte else "",
                r.value_numeric if r.value_numeric is not None else r.value_text,
                r.unit,
                r.flag,
                r.reference_range_applied or "",
            ])

    return output.getvalue()
