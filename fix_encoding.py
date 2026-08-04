import os

# Read source file (Step5_AIGenerator.jsx) which has valid UTF-8
with open('src/components/Step5_AIGenerator.jsx', 'rb') as f:
    content = f.read()

text = content.decode('utf-8')

# Replace store import for quick flow
text = text.replace(
    "import { useExamStore } from '../store/useExamStore';",
    "import { useQuickStore as useExamStore } from '../../store/useQuickStore';"
)

# Replace ClientGraph import path (one level deeper in /quick/ folder)
text = text.replace(
    "import ClientGraph from './ClientGraph';",
    "import ClientGraph from '../ClientGraph';"
)

# Write as valid UTF-8 (no BOM)
with open('src/components/quick/QuickStep5_AIGenerator.jsx', 'wb') as f:
    f.write(text.encode('utf-8'))

lines = text.splitlines()
print(f'Done! Total lines: {len(lines)}')
print('Line 1:', repr(lines[0]))
print('Line 2:', repr(lines[1]))
print('Line 3:', repr(lines[2]))
