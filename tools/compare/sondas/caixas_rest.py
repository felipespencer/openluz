# Muda controles do último efeito da camada 1 do Resolume pela API e mede as caixas claras da saída (Spout).
# Uso: py tools/compare/sondas/caixas_rest.py "Controle=valor" ... [--salva arquivo.png]
# Imprime as faixas claras em x e em y (projeção), em px de 1920×1080. Serve para medir geometria (Grid Cloner etc.).
import json, os, sys, time, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import numpy as np
from capture import capturar

API = 'http://127.0.0.1:8080/api/v1'


def req(method, url, body=None):
    data = None if body is None else json.dumps(body).encode()
    r = urllib.request.Request(API + url, data=data, method=method, headers={'Content-Type': 'application/json'} if data else {})
    with urllib.request.urlopen(r) as f:
        t = f.read()
        return json.loads(t) if t else None


def efeito():
    return req('GET', '/composition/layers/1')['video']['effects'][-1]


def valor(nome, v):
    p = efeito()['params'][nome]
    t = p['valuetype']
    val = float(v) if t == 'ParamRange' else (v in ('1', 'true')) if t == 'ParamBoolean' else v
    req('PUT', f"/parameter/by-id/{p['id']}", {'value': val})


def faixas(m):
    out, i, n = [], 0, len(m)
    while i < n:
        if m[i]:
            j = i
            while j < n and m[j]:
                j += 1
            out.append((i, j - 1))
            i = j
        else:
            i += 1
    return out


if __name__ == '__main__':
    salva = None
    a = sys.argv[1:]
    if '--salva' in a:
        k = a.index('--salva'); salva = a[k + 1]; del a[k:k + 2]
    for kv in a:
        k, v = kv.split('=', 1)
        valor(k, v)
    time.sleep(0.4)
    img = capturar(8).astype(np.float32)
    g = img.mean(axis=2)
    lim = 40
    print('x:', faixas((g > lim).any(axis=0)))
    print('y:', faixas((g > lim).any(axis=1)))
    if os.environ.get('COMP'):
        from scipy import ndimage
        lab, n = ndimage.label(g > lim)
        cs = []
        for sl in ndimage.find_objects(lab):
            cs.append(((sl[1].start + sl[1].stop - 1) / 2, (sl[0].start + sl[0].stop - 1) / 2, sl[1].stop - sl[1].start, sl[0].stop - sl[0].start))
        cs.sort(key=lambda c: (round(c[1] / 20), c[0]))
        print('pedaços (cx, cy, w, h):', ' '.join(f'({c[0]:.0f},{c[1]:.0f},{c[2]}x{c[3]})' for c in cs))
    if salva:
        from PIL import Image
        Image.fromarray(img.astype(np.uint8)).save(salva)
