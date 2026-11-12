# Amplia um pedaço de uma foto do confere (Resolume em cima, OpenLuz embaixo) para olhar de perto.
# Uso: py tools/compare/zoom.py "<efeito>" <caso> x y l a [fator=3]   (coordenadas em 960x540) -> saida/zoom.png
import sys
from PIL import Image
e, c, x, y, w, h = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:7]); f = int(sys.argv[7]) if len(sys.argv) > 7 else 3
im = Image.open(f'{__file__}/../saida/conf/{e}/{c}.png')
a = im.crop((x, y, x + w, y + h)).resize((w * f, h * f), Image.NEAREST); b = im.crop((960 + x, y, 960 + x + w, y + h)).resize((w * f, h * f), Image.NEAREST)
o = Image.new('RGB', (w * f, h * f * 2 + 8), (255, 0, 255)); o.paste(a, (0, 0)); o.paste(b, (0, h * f + 8)); o.save(f'{__file__}/../saida/zoom.png')
