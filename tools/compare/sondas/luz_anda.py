# SearchLight: trajeto do centro da luz por N quadros seguidos (clipe branco). Uso: py tools/compare/sondas/luz_anda.py N "Controle=valor"...
import array, os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import numpy as np
import SpoutGL
from caixas_rest import valor

N = int(sys.argv[1])
for kv in sys.argv[2:]:
    k, v = kv.split('=', 1)
    valor(k, v)
time.sleep(0.3)
pts = []
with SpoutGL.SpoutReceiver() as r:
    r.createOpenGL(); r.setReceiverName('Arena - Screen 1'); buf = None; t0 = time.time()
    while len(pts) < N and time.time() - t0 < N / 10 + 10:
        ok = r.receiveImage(buf, 0x1908, False, 0)
        if r.isUpdated():
            buf = array.array('B', bytes(r.getSenderWidth() * r.getSenderHeight() * 4)); continue
        if buf is not None and ok and r.isFrameNew():
            g = np.frombuffer(buf, np.uint8).reshape(r.getSenderHeight(), r.getSenderWidth(), 4)[::4, ::4, 0].astype(np.float64)
            s = g.sum()
            if s > 0:
                ys, xs = np.mgrid[0:g.shape[0], 0:g.shape[1]]
                pts.append((time.time() - t0, (g * xs).sum() / s * 4, (g * ys).sum() / s * 4))
        r.waitFrameSync('Arena - Screen 1', 100)
a = np.array(pts)
print(f'{len(a)} quadros em {a[-1,0]-a[0,0]:.2f} s; x {a[:,1].min():.0f}..{a[:,1].max():.0f}  y {a[:,2].min():.0f}..{a[:,2].max():.0f}')
if os.environ.get('SALVA'): np.save(os.environ['SALVA'], a)
for t, x, y in a[::max(1, len(a) // 40)]:
    print(f'{t:.2f} {x:.0f} {y:.0f}')
