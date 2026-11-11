import zipfile
import io
import pandas as pd
from app.services.ml_engine import parse_xlsx_to_dataframe

def test_pure_python_xlsx_parsing():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        ss_xml = '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Glucose</t></si><si><t>Creatinine</t></si></sst>'
        z.writestr("xl/sharedStrings.xml", ss_xml)

        sheet_xml = (
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetData>'
            '<row r="1">'
            '<c r="A1" t="s"><v>0</v></c>'
            '<c r="B1" t="s"><v>1</v></c>'
            '</row>'
            '<row r="2">'
            '<c r="A2"><v>105.5</v></c>'
            '<c r="B2"><v>1.2</v></c>'
            '</row>'
            '<row r="3">'
            '<c r="A3"><v>180.0</v></c>'
            '<c r="B3"><v>2.4</v></c>'
            '</row>'
            '</sheetData>'
            '</worksheet>'
        )
        z.writestr("xl/worksheets/sheet1.xml", sheet_xml)

    df = parse_xlsx_to_dataframe(buf.getvalue())
    assert list(df.columns) == ["Glucose", "Creatinine"]
    assert len(df) == 2
    assert float(df["Glucose"].iloc[0]) == 105.5
    assert float(df["Creatinine"].iloc[1]) == 2.4
