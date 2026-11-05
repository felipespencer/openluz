# SearchLight: centro (média ponderada do brilho) e perfil radial da luz, com o clipe branco.
# Uso: py tools/compare/sondas/perfil_luz.py "Controle=valor" ...
import os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import numpy as np
from caixas_rest import valor
from capture import capturar

for kv in sys.argv[1:]:
    k, v = kv.split('=', 1)
    valor(k, v)
time.sleep(0.4)
g = capturar(8).astype(np.float64).mean(axis=2) / 255.0
H, W = g.shape
ys, xs = np.mgrid[0:H, 0:W]
inv = g.mean() > 0.5
m = 1 - g if inv else g
s = m.sum()
cx, cy = (m * xs).sum() / s, (m * ys).sum() / s
r = np.hypot(xs - cx, ys - cy)
prof = []
for rr in range(0, 1200, 4):
    k = (r >= rr) & (r < rr + 4)
    if k.any():
        prof.append((rr, m[k].mean()))
def raio(nivel):
    for rr, v in prof:
        if v < nivel:
            return rr
    return None
print(f'centro ({cx:.1f}, {cy:.1f})  invertido={inv}  máximo {m.max():.3f}  área {s:.0f}')
print('raio em 0.95/0.75/0.5/0.25/0.05:', [raio(n) for n in (0.95, 0.75, 0.5, 0.25, 0.05)])
print('perfil:', ' '.join(f'{rr}:{v:.2f}' for rr, v in prof[::5] if v > 0.005))
