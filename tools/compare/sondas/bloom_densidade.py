# Sonda do Bloom: como cada volta responde a fontes ralas ou juntas. Três regiões de quadradinhos brancos de 16 px:
# à esquerda a cada 128 px (1/64 da área), no meio a cada 64 px (1/16), à direita a cada 32 px (1/4). Threshold e Knee em 0, Amount baixo.
# Entre os quadradinhos a imagem é preta, então saída = (5 × Amount × soma das voltas)²; a diferença entre N e N − 1 voltas é a volta N.
# Se a volta fosse média da raiz daria a própria fração (0,016 / 0,062 / 0,25); raiz da média daria 0,125 / 0,25 / 0,5.
# Uso: py tools/compare/sondas/bloom_densidade.py   (Resolume aberto)
import os, sys, time
import numpy as np
from PIL import Image
AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, AQUI)
import gabarito as G
OUT = os.path.join(AQUI, 'saida', 'sonda_bloom'); os.makedirs(OUT, exist_ok=True)
a = np.zeros((1080, 1920, 4), np.uint8); a[..., 3] = 255
for x0, passo in ((0, 128), (640, 64), (1280, 32)):
    for y in range(passo // 2 - 8, 1080 - 16, passo):
        for x in range(x0 + passo // 2 - 8, x0 + 640 - 16, passo): a[y:y + 16, x:x + 16, :3] = 255
Image.fromarray(a).save(os.path.join(OUT, 'densidade.png'))
sp = G.Spout(); G.abrir(os.path.join(OUT, 'densidade.png')); time.sleep(1.0)
ps = G.por('Bloom')['params']; time.sleep(0.8)
poe = lambda k, v: G.req('PUT', f"/parameter/by-id/{ps[k]['id']}", {'value': float(v)})
A = 0.04
for k, v in (('Threshold', 0), ('Knee', 0), ('Amount', A), ('Size', float(sys.argv[1]) if len(sys.argv) > 1 else 0.25)): poe(k, v)
ant = np.zeros(3)
for it in range(1, 6):
    poe('Iterations', it); time.sleep(1.2)
    img = np.asarray(G.sem_marca(sp).convert('RGB')).astype(float)[..., 0] / 255          # 960×540
    src = np.asarray(Image.fromarray(a[..., 0]).resize((960, 540), Image.BILINEAR)).astype(float)
    somas = []
    for i in range(3):   # miolo de cada região (longe das divisas), só pontos pretos da imagem e sem estouro
        reg = img[150:390, i * 320 + 110:i * 320 + 210]; s = src[150:390, i * 320 + 110:i * 320 + 210]
        m = (s < 1) & (reg < 0.97); somas.append(np.sqrt(reg[m]).mean() / (5 * A) if m.sum() > 50 else np.nan)
    somas = np.array(somas); print(f'voltas {it}: soma {np.round(somas, 4)}  esta volta sozinha {np.round(somas - ant, 4)}'); ant = somas
