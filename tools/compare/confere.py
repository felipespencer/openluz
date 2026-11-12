# Parte de imagem do confere.mjs: para cada par (foto do Resolume, canvas do OpenLuz) mede a diferença por pixel
# a 960x540 e grava Resolume | OpenLuz | diferença x4. Uso: py tools/compare/confere.py pares.json
import json, sys

import numpy as np
from PIL import Image

W, H = 960, 540
saida = []
for p in json.load(open(sys.argv[1], encoding='utf-8')):
    bruta = np.asarray(Image.open(p['ref']).convert('RGBA').resize((W, H), Image.BOX), np.float32)
    r = bruta[..., :3]
    o = np.asarray(Image.open(p['nosso']).convert('RGB').resize((W, H), Image.BOX), np.float32)
    d = np.abs(r - o)
    # o Resolume às vezes apaga só o alfa e deixa a cor (Raster): vale também a foto multiplicada pelo alfa dela,
    # que é o que aparece quando a camada vai sobre preto. Fica a menor das duas diferenças.
    r2 = r * bruta[..., 3:4] / 255.0
    d2 = np.abs(r2 - o)
    if d2.mean() < d.mean():
        r, d = r2, d2
    Image.fromarray(np.concatenate([r, o, np.clip(d * 4, 0, 255)], 1).astype(np.uint8)).save(p['lado'])
    saida.append({'caso': p['caso'], 'media': round(float(d.mean()), 2), 'max': int(d.max()),
                  'acima16': round(float((d.max(2) > 16).mean() * 100), 1), 'anima': p['anima'],
                  'igual_ao_padrao': p['igual_ao_padrao'], 'fora': p['fora']})
print(json.dumps(saida))
