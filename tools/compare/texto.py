# Mede o Text Block / Text Animator do Resolume: muda controles pela API, captura pelo Spout e mede a caixa do desenho.
# Uso: py tools/compare/texto.py <rotulo> [Controle=valor ...]   (~ no lugar de espaço; \n quebra linha)   (clipe da camada 3, coluna 3; volta aos padrões antes)
#   RESOLUME_CLIP=camada/coluna muda o clipe. Valor de lista = texto da opção; cor = #rrggbbaa.
# Sai em tools/compare/saida/texto/<rotulo>.png e imprime a caixa (x0 x1 y0 y1), o centro e o brilho.
import json, os, subprocess, sys, time, urllib.request
import numpy as np
from PIL import Image

API = 'http://127.0.0.1:8080/api/v1'
HERE = os.path.dirname(os.path.abspath(__file__))
L, C = (os.environ.get('RESOLUME_CLIP') or '3/3').split('/')
def req(m, url, body=None):
    r = urllib.request.Request(API + url, method=m, data=None if body is None else json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    t = urllib.request.urlopen(r).read(); return json.loads(t) if t else None
def params():
    return req('GET', f'/composition/layers/{L}/clips/{C}')['video']['sourceparams']
DEF = json.load(open(os.path.join(HERE, 'saida', 'menu-ao', 'text-block.json' if os.environ.get('ANIM') is None else 'text-animator.json'), encoding='utf-8'))['video']['sourceparams']
def put(p, v):
    vt = p['valuetype']
    val = float(v) if vt == 'ParamRange' else (str(v).lower() in ('1', 'true')) if vt == 'ParamBoolean' else str(v)
    req('PUT', f'/parameter/by-id/{p["id"]}', {'value': val})
def main():
    rot, pares = sys.argv[1], [a.replace('~', ' ').split('=', 1) for a in sys.argv[2:]]   # ~ vale espaço
    ps = params()
    if os.environ.get('SEM_PADRAO') is None:
        for k, d in DEF.items():
            if k in ps and ps[k].get('value') != d.get('value') and k not in dict(pares): put(ps[k], d['value'])
    for k, v in pares:
        if k not in ps: sys.exit(f'sem o controle {k}: {list(ps)}')
        put(ps[k], v.replace('\\n', '\n'))
    time.sleep(1.5)
    out = os.path.join(HERE, 'saida', 'texto', rot + '.png')
    prev = None
    for _ in range(12):   # a marca d'água do demo aparece de tempos em tempos: só vale quando dois quadros seguidos batem
        if subprocess.run(['py', os.path.join(HERE, 'capture.py'), out, '3'], env={**os.environ, 'ESCURO_OK': '1'}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode: time.sleep(0.5); continue
        a = np.asarray(Image.open(out).convert('RGB')).astype(float)
        if a[920, 620].max() > 200 and a[400, 800].max() > 200 and not os.environ.get('SEM_MARCA'): prev = None; time.sleep(0.8); continue   # marca d'água do demo (logo A + quadrado do resolume)
        if prev is not None and abs(a - prev).mean() < 0.3: break
        prev = a; time.sleep(0.3)
    else: print(rot, 'instável'); return
    m = a.max(2) > 40
    if not m.any(): print(rot, 'vazio'); return
    ys, xs = np.where(m)
    now = params(); ver = {k: now[k]['value'] for k, _ in pares}
    print(json.dumps({'rot': rot, 'ver': ver, 'x0': int(xs.min()), 'x1': int(xs.max()), 'y0': int(ys.min()), 'y1': int(ys.max()), 'w': int(xs.max() - xs.min() + 1), 'h': int(ys.max() - ys.min() + 1), 'soma': round(float(a.max(2).sum() / 255), 1)}))
main()
