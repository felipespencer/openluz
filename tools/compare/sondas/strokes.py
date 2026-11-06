# Sonda do Strokes (só Resolume): põe o efeito com os valores pedidos, captura pelo Spout e mede as pinceladas.
# Uso: py tools/compare/sondas/strokes.py <rotulo> [Controle=valor ...]   (clipe já aberto na camada 1, casa 2)
# Mede: cobertura (fração de pixels pintados), número de manchas separadas, área/comprimento/largura/ângulo médios
# (momentos de cada mancha), e guarda saida/stk-<rotulo>.png.
import json, os, sys, time, urllib.request

import numpy as np
from PIL import Image
from scipy import ndimage

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(AQUI))
from capture import capturar  # noqa: E402

API = 'http://127.0.0.1:8080/api/v1'


def req(m, url, body=None):
    data = None if body is None else (body if isinstance(body, bytes) else json.dumps(body).encode())
    r = urllib.request.Request(API + url, data=data, method=m, headers={'Content-Type': 'application/json'} if body is not None else {})
    t = urllib.request.urlopen(r).read()
    return json.loads(t) if t else None


def efeito():
    fx = req('GET', '/composition/layers/1')['video']['effects']
    e = [x for x in fx if x['name'] == 'Strokes']
    if not e:
        for i in range(len(fx), 0, -1):
            if fx[i - 1].get('is_user_removable', True) is not False: req('DELETE', f'/composition/layers/1/effects/video/{i - 1}')
        urllib.request.urlopen(urllib.request.Request(API + '/composition/layers/1/effects/video/add', data=b'effect:///video/Strokes', method='POST', headers={'Content-Type': 'text/plain'}))
        time.sleep(1); return efeito()
    return e[0]


PADRAO = {'Amount': 1024, 'Edges Only': False, 'Frequency Mode': 'Hz', 'Frequency': 0, 'Size Mode': 'Random', 'Size': 0.2,
          'Variation': 0.1, 'Swirl': 0.3, 'Flow': 0.25, 'Feedback': 0, 'Rotation': 0}


def por(valores):
    e = efeito()
    for k, v in valores.items():
        p = e['params'][k]
        if p['valuetype'] == 'ParamRange': v = float(v)
        elif p['valuetype'] == 'ParamBoolean': v = v in (True, 'true', '1', 1)
        else: v = str(v)
        req('PUT', f"/parameter/by-id/{p['id']}", {'value': v})
    if os.environ.get('SEM_RESET') is None:
        rid = e['params']['Reset']['id']
        req('PUT', f'/parameter/by-id/{rid}', {'value': True}); time.sleep(0.1); req('PUT', f'/parameter/by-id/{rid}', {'value': False})


def medir(img, limiar=40):
    a = img.astype(float); m = a.max(axis=2) > limiar
    lab, n = ndimage.label(m)
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        ys, xs = np.nonzero(lab[sl] == i)
        if len(xs) < 30: continue
        xs = xs + sl[1].start; ys = ys + sl[0].start
        cx, cy = xs.mean(), ys.mean(); dx, dy = xs - cx, ys - cy
        cov = np.cov(np.vstack([dx, dy])); w, v = np.linalg.eigh(cov)
        L, W = 4 * np.sqrt(max(w[1], 1e-6)), 4 * np.sqrt(max(w[0], 1e-6))
        ang = np.degrees(np.arctan2(v[1, 1], v[0, 1])) % 180
        out.append((len(xs), L, W, ang, cx, cy))
    return m.mean(), out


def main():
    rot = sys.argv[1]
    vals = dict(PADRAO)
    for kv in sys.argv[2:]:
        k, v = kv.split('=', 1); vals[k] = v
    por(vals); time.sleep(1.5)
    img = capturar(8)
    Image.fromarray(img).save(os.path.join(os.path.dirname(AQUI), 'saida', f'stk-{rot}.png'))
    cob, ms = medir(img)
    ms = np.array(ms) if ms else np.zeros((0, 6))
    # manchas isoladas: as menores que 3x a mediana da área (as grandes são várias juntas)
    if len(ms):
        med = np.median(ms[:, 0]); iso = ms[ms[:, 0] < 3 * med]
    else:
        iso = ms
    res = {'rot': rot, 'cob': round(float(cob), 4), 'manchas': int(len(ms)), 'isoladas': int(len(iso))}
    if len(iso):
        res.update(area=round(float(np.median(iso[:, 0])), 1), comp=round(float(np.median(iso[:, 1])), 1), larg=round(float(np.median(iso[:, 2])), 1),
                   ang=round(float(np.median(iso[:, 3])), 1), ang_dp=round(float(np.std(((iso[:, 3] + 90) % 180) - 90)), 1),
                   comp_dp=round(float(np.std(iso[:, 1])), 1))
    print(json.dumps(res, ensure_ascii=False))


main()
