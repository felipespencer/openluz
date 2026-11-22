# Partes comuns das sondas do Strokes: API REST do Resolume (efeito na camada 1), captura pelo Spout e medida das pinceladas.
import json, os, sys, time, urllib.parse, urllib.request

import numpy as np
from scipy import ndimage

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(os.path.dirname(AQUI), 'saida', 'stk')
os.makedirs(SAIDA, exist_ok=True)
sys.path.insert(0, os.path.dirname(AQUI))
API = 'http://127.0.0.1:8080/api/v1'
PADRAO = {'Amount': 1024, 'Edges Only': False, 'Frequency Mode': 'Hz', 'Frequency': 60, 'Size Mode': 'Random', 'Size': 0.2,
          'Variation': 0.1, 'Swirl': 0.3, 'Flow': 0.25, 'Feedback': 0.5, 'Rotation': 0}
PARADO = dict(PADRAO, Frequency=0, Feedback=0)   # pinceladas paradas sobre preto: dá para medir uma a uma


def req(m, url, body=None, texto=False):
    data = None if body is None else (body if isinstance(body, bytes) else json.dumps(body).encode())
    r = urllib.request.Request(API + url, data=data, method=m, headers={'Content-Type': 'text/plain' if texto else 'application/json'} if body is not None else {})
    t = urllib.request.urlopen(r).read()
    return json.loads(t) if t else None


def efeito():
    fx = req('GET', '/composition/layers/1')['video']['effects']
    e = [x for x in fx if x['name'] == 'Strokes']
    if not e: sys.exit('o Strokes não está na camada 1 (node tools/compare/resolume.mjs efeito Strokes)')
    return e[0]


def por(e, valores):
    for k, v in valores.items():
        p = e['params'][k]
        if p['valuetype'] == 'ParamRange': v = float(v)
        elif p['valuetype'] == 'ParamBoolean': v = v in (True, 'true', 'True', '1', 1)
        else: v = str(v)
        req('PUT', f"/parameter/by-id/{p['id']}", {'value': v})


def reset(e):
    rid = e['params']['Reset']['id']
    req('PUT', f'/parameter/by-id/{rid}', {'value': True}); time.sleep(0.05); req('PUT', f'/parameter/by-id/{rid}', {'value': False})


def abrir(arq):
    """Abre a imagem na camada 1, casa 2, e dispara (a casa 1 é do Felipe)."""
    cam = os.path.abspath(arq).replace(os.sep, '/'); u = 'file:///' + cam[:2] + '/'.join(urllib.parse.quote(x) for x in cam[2:].split('/'))
    req('POST', '/composition/layers/1/clips/2/open', u.encode(), texto=True)
    time.sleep(0.8); req('POST', '/composition/layers/1/clips/2/connect'); time.sleep(0.6)


def manchas(img, limiar=40, minimo=30):
    """Cada mancha separada: (área, comprimento, largura, ângulo 0–180 medido com y para CIMA, cx, cy, brilho máximo)."""
    a = img.astype(float); v = a.max(axis=2) if a.ndim == 3 else a
    lab, n = ndimage.label(v > limiar)
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        ys, xs = np.nonzero(lab[sl] == i)
        if len(xs) < minimo: continue
        xs = xs + sl[1].start; ys = ys + sl[0].start
        cx, cy = xs.mean(), ys.mean(); dx, dy = xs - cx, -(ys - cy)
        w, vec = np.linalg.eigh(np.cov(np.vstack([dx, dy])))
        L, W = 4 * np.sqrt(max(w[1], 1e-6)), 4 * np.sqrt(max(w[0], 1e-6))
        out.append((len(xs), L, W, np.degrees(np.arctan2(vec[1, 1], vec[0, 1])) % 180, cx, cy, v[ys, xs].max()))
    return np.array(out) if out else np.zeros((0, 7))


def isoladas(ms):
    """As manchas que são uma pincelada só: área até 1,6 × a mediana (as maiores são várias encostadas)."""
    if not len(ms): return ms
    return ms[ms[:, 0] < 1.6 * np.median(ms[:, 0])]


def resumo(img, limiar=40):
    ms = manchas(img, limiar); iso = isoladas(ms)
    v = img.max(axis=2) if img.ndim == 3 else img
    r = {'cob': round(float((v > limiar).mean()), 4), 'manchas': int(len(ms)), 'isoladas': int(len(iso))}
    if len(iso):
        d = ((iso[:, 3] + 90) % 180) - 90
        r.update(area=round(float(np.median(iso[:, 0])), 1), comp=round(float(np.median(iso[:, 1])), 1), larg=round(float(np.median(iso[:, 2])), 1),
                 ang=round(float(np.median(d)), 1), ang_dp=round(float(np.std(d)), 1), comp_dp=round(float(np.std(iso[:, 1])), 1))
    return r
