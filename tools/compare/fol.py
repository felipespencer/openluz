# Folha de vários casos do confere (Resolume | OpenLuz | diferença), um por linha, para olhar de uma vez.
# Uso: py tools/compare/fol.py "<efeito>" caso1 caso2 ...   -> saida/zoom.png
import os, sys
from PIL import Image
A = os.path.dirname(os.path.abspath(__file__)); e, cs = sys.argv[1], sys.argv[2:]
h = min(270, 1900 // len(cs)); w = h * 2880 // 540
o = Image.new('RGB', (w, h * len(cs)))
for i, c in enumerate(cs):
    o.paste(Image.open(f'{A}/saida/conf/{e}/{c}.png').resize((w, h)), (0, h * i))
o.save(f'{A}/saida/zoom.png')
