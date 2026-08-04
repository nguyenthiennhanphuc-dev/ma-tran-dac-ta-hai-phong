import zipfile
import xml.etree.ElementTree as ET
import os
import glob

# Find the docx file
docs_path = os.path.expanduser("~/Documents")
docx_files = glob.glob(os.path.join(docs_path, "Ma_Tran*.docx"))
print("Found files:", docx_files)

if not docx_files:
    print("No docx file found!")
    exit()

docx_path = docx_files[0]
print(f"\nReading: {docx_path}\n")
print("="*80)

# Read docx (it's a zip file)
with zipfile.ZipFile(docx_path, 'r') as z:
    with z.open('word/document.xml') as f:
        content = f.read().decode('utf-8')

# Parse XML to extract text
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
root = ET.fromstring(content)

# Extract all text from paragraphs and tables
def get_para_text(para):
    texts = []
    for r in para.findall('.//w:r', ns):
        for t in r.findall('w:t', ns):
            texts.append(t.text or '')
    return ''.join(texts)

def get_table_rows(table):
    rows = []
    for tr in table.findall('.//w:tr', ns):
        cells = []
        for tc in tr.findall('.//w:tc', ns):
            cell_text = []
            for para in tc.findall('.//w:p', ns):
                cell_text.append(get_para_text(para))
            cells.append(' | '.join(cell_text))
        rows.append(cells)
    return rows

body = root.find('.//w:body', ns)
row_num = 0
with open('docx_output.txt', 'w', encoding='utf-8') as f_out:
    for elem in body:
        tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
        if tag == 'p':
            text = get_para_text(elem)
            if text.strip():
                f_out.write(f"[P] {text}\n")
        elif tag == 'tbl':
            rows = get_table_rows(elem)
            f_out.write(f"\n[TABLE] ({len(rows)} rows)\n")
            for i, row in enumerate(rows):
                f_out.write(f"  Row {i}: {' || '.join(row)}\n")
            f_out.write("\n")
