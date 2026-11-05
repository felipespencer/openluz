# WarpSpeed: o rastro é do tempo (quadros anteriores) ou só do espaço? Abre pontos.png, espera, troca para preto.png e mede,
# quadro a quadro, o brilho somado na faixa do raio do ponto (1500,300). Rastro que some aos poucos = memória de quadros.
import array, json, os, sys, time, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import numpy as np
import SpoutGL
from caixas_rest import valor, req

AQUI = os.path.dirname(os.path.abspath(__file__))
CLIPS = os.path.join(AQUI, '..', 'clips')


def abrir(nome):
    p = os.path.abspath(os.path.join(CLIPS, nome)).replace('\\', '/')
    url = 'file:///' + urllib.request.quote(p, safe='/:')
    r = urllib.request.Request('http://127.0.0.1:8080/api/v1/composition/layers/1/clips/2/open', data=url.encode(), method='POST', headers={'Content-Type': 'text/plain'})
    urllib.request.urlopen(r).read()
    urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8080/api/v1/composition/layers/1/clips/2/connect', method='POST')).read()


for kv in sys.argv[1:]:
    k, v = kv.split('=', 1)
    valor(k, v)
abrir('pontos.png'); time.sleep(1.5)
vals = []
with SpoutGL.SpoutReceiver() as r:
    r.createOpenGL(); r.setReceiverName('Arena - Screen 1'); buf = None; t0 = time.time(); trocou = False
    while time.time() - t0 < 3:
        ok = r.receiveImage(buf, 0x1908, False, 0)
        if r.isUpdated():
            buf = array.array('B', bytes(r.getSenderWidth() * r.getSenderHeight() * 4)); continue
        if buf is not None and ok and r.isFrameNew():
            g = np.frombuffer(buf, np.uint8).reshape(r.getSenderHeight(), r.getSenderWidth(), 4)
            s = float(g[280:560, 960:1520, 0].astype(np.float64).sum())
            if not vals or s != vals[-1][1]:
                vals.append((round(time.time() - t0, 3), s))
            if not trocou and time.time() - t0 > 0.5:
                abrir('preto.png'); trocou = True; vals.append(('troca', 0))
        r.waitFrameSync('Arena - Screen 1', 100)
print(' '.join(f'{t}:{v:.0f}' for t, v in vals))
