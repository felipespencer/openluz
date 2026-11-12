# Carta de prova para a varredura dos efeitos: nada simétrico, cada região reconhecível depois de espelhar,
# girar, repetir ou deformar. Fundo em degradê de cor, grade com casas numeradas, amostras de cor pura,
# cinzas, um círculo, uma diagonal e um recorte de foto (textura de verdade).
# Uso: py tools/compare/clips/gera-carta.py   -> tools/compare/clips/carta.png (1920x1080)
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
W, H = 1920, 1080
x = np.linspace(0, 1, W)[None, :].repeat(H, 0)
y = np.linspace(0, 1, H)[:, None].repeat(W, 1)
fundo = np.stack([0.15 + 0.7 * x, 0.15 + 0.7 * y, 0.85 - 0.6 * x * y], -1)
img = Image.fromarray((fundo * 255).astype(np.uint8))
d = ImageDraw.Draw(img, 'RGBA')
try:
    fonte = ImageFont.truetype('arialbd.ttf', 64)
    miuda = ImageFont.truetype('arial.ttf', 22)
except OSError:
    fonte = miuda = ImageFont.load_default()
CW, CH = 240, 216
for i in range(8):
    for j in range(5):
        d.text((i * CW + 20, j * CH + 16), 'ABCDEFGH'[i] + str(j + 1), font=fonte, fill=(255, 255, 255, 235), stroke_width=3, stroke_fill=(0, 0, 0, 255))
for i in range(1, 8):
    d.line([(i * CW, 0), (i * CW, H)], fill=(255, 255, 255, 110), width=2)
for j in range(1, 5):
    d.line([(0, j * CH), (W, j * CH)], fill=(255, 255, 255, 110), width=2)
# amostras de cor pura e cinzas (fileira de baixo, à esquerda)
cores = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (0, 255, 255), (255, 0, 255), (255, 255, 0), (255, 255, 255), (0, 0, 0)]
for k, c in enumerate(cores):
    d.rectangle([40 + k * 90, 950, 40 + k * 90 + 80, 1030], fill=c + (255,))
for k in range(9):
    g = int(k * 255 / 8)
    d.rectangle([40 + k * 80, 860, 40 + k * 80 + 80, 930], fill=(g, g, g, 255))
# círculo e diagonal
d.ellipse([W // 2 - 260, H // 2 - 260, W // 2 + 260, H // 2 + 260], outline=(255, 255, 255, 255), width=6)
d.line([(W // 2, H // 2), (W // 2 + 184, H // 2 - 184)], fill=(0, 0, 0, 255), width=6)
d.ellipse([W // 2 - 14, H // 2 - 14, W // 2 + 14, H // 2 + 14], fill=(255, 255, 255, 255))
# foto
try:
    foto = Image.open(os.path.join(AQUI, 'rostos.jpg')).convert('RGB')
    fw = 560; fh = int(fw * foto.height / foto.width)
    img.paste(foto.resize((fw, fh), Image.LANCZOS), (W - fw - 60, H - fh - 60))
    d.rectangle([W - fw - 60, H - fh - 60, W - 60, H - 60], outline=(255, 255, 255, 255), width=4)
except OSError:
    pass
img.save(os.path.join(AQUI, 'carta.png'))
print('carta.png', img.size)
