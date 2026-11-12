# Folha de contato do gabarito de um efeito: todos os casos numa imagem só, com o nome de cada um.
# Uso: py tools/compare/folha.py "<efeito>" [conf] [filtro]
#   sem "conf": as fotos do Resolume (saida/ref/<efeito>) -> saida/ref/<efeito>/_folha.png (ou _folha-N.png em partes)
#   com "conf": os lado a lado do confere.mjs (Resolume | OpenLuz | diferença) -> saida/conf/<efeito>/_folha.png
#   filtro: só os casos cujo nome contém o texto
import os, re, sys

from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
nome = re.sub(r'[^\w.\- ]+', '_', sys.argv[1])
conf = len(sys.argv) > 2 and sys.argv[2] == 'conf'
filtro = sys.argv[3] if len(sys.argv) > 3 else (sys.argv[2] if len(sys.argv) > 2 and not conf else '')
pasta = os.path.join(AQUI, 'saida', 'conf' if conf else 'ref', nome)
arqs = sorted(f for f in os.listdir(pasta) if f.endswith('.png') and not f.startswith('_') and not f.endswith('.b.png') and not f.endswith('.openluz.png') and filtro in f)
arqs.sort(key=lambda f: (not f.startswith('padrao'), f))
try:
    fonte = ImageFont.truetype('arial.ttf', 15)
except OSError:
    fonte = ImageFont.load_default()
TW, TH = (960, 180) if conf else (384, 216)
COLS, POR = (2, 16) if conf else (5, 30)
for parte in range(0, len(arqs), POR):
    lote = arqs[parte:parte + POR]
    lin = (len(lote) + COLS - 1) // COLS
    folha = Image.new('RGB', (COLS * TW, lin * (TH + 20)), (24, 24, 24))
    d = ImageDraw.Draw(folha)
    for i, f in enumerate(lote):
        x, y = (i % COLS) * TW, (i // COLS) * (TH + 20)
        folha.paste(Image.open(os.path.join(pasta, f)).convert('RGB').resize((TW, TH), Image.BILINEAR), (x, y + 20))
        d.text((x + 4, y + 2), f[:-4], font=fonte, fill=(255, 255, 255))
    sai = os.path.join(pasta, '_folha.png' if len(arqs) <= POR else f'_folha-{parte // POR + 1}.png')
    folha.save(sai)
    print(sai)
