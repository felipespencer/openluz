# Sonda do Bloom em área grande: cinza liso de tela inteira (8/255), Threshold e Knee em 0 (tudo passa, o efeito fica linear).
# O brilho somado no meio da tela dá o peso de cada volta (Iterations); o perfil até a beirada mostra como a volta larga perde na borda.
# Uso: py tools/compare/sondas/bloom_liso.py    (Resolume aberto)   -> imprime e grava saida/sonda_bloom/liso.json
import json, os, sys, time
import numpy as np
from PIL import Image
AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, AQUI)
import gabarito as G
OUT = os.path.join(AQUI, 'saida', 'sonda_bloom'); os.makedirs(OUT, exist_ok=True)
V = 8
a = np.zeros((1080, 1920, 4), np.uint8); a[..., 3] = 255; a[..., :3] = V
Image.fromarray(a).save(os.path.join(OUT, 'liso8.png'))
sp = G.Spout(); G.abrir(os.path.join(OUT, 'liso8.png')); time.sleep(1.0)
ps = G.por('Bloom')['params']; time.sleep(0.8)
poe = lambda k, v: G.req('PUT', f"/parameter/by-id/{ps[k]['id']}", {'value': v})
for k in ('Threshold', 'Knee'): poe(k, 0)
res = []
for size in (0.25, 1.0):
    for amount in (0.1, 0.2):
        for it in (1, 2, 3, 4, 5):
            poe('Size', size); poe('Amount', amount); poe('Iterations', it); time.sleep(1.2)
            img = np.asarray(G.sem_marca(sp).convert('RGB')).astype(float)[..., 0]      # 960×540
            h, w = img.shape; meio = float(img[h // 2 - 20:h // 2 + 20, w // 2 - 20:w // 2 + 20].mean())
            perfil = [round(float(img[h // 2 - 10:h // 2 + 10, x:x + 8].mean()), 1) for x in (0, 16, 40, 80, 160, 240, 320, 476)]
            cima = [round(float(img[y:y + 6, w // 2 - 10:w // 2 + 10].mean()), 1) for y in (0, 16, 40, 80, 160, 267)]
            ganho = meio / V; soma = np.sqrt(max(ganho - 1, 0)) / (5 * amount)       # saída = v + (5 × Amount × soma × raiz(v))²
            res.append(dict(Size=size, Amount=amount, Iterations=it, meio=round(meio, 2), soma=round(float(soma), 3), perfil_x=perfil, perfil_y=cima))
            print(res[-1])
json.dump(res, open(os.path.join(OUT, 'liso.json'), 'w'), indent=1)
