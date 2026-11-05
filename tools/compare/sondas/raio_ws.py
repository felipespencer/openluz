# WarpSpeed: brilho ao longo do raio do centro até o ponto (1500,300) de pontos.png, em fração r da distância (r = 1 é o ponto).
# Uso: py tools/compare/sondas/raio_ws.py "Controle=valor" ...   (repete a captura se a marca d'água aparecer)
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
for tent in range(6):
    a = capturar(8).astype(np.float64).mean(axis=2)
    if a[620, 920] < 200 and a[800, 400] < 200 and a[1000, 960] < 100:
        break
    time.sleep(0.5)
cx, cy, px, py = 960, 540, 1499.5, 299.5
out = []
for k in range(0, 1061, 5):
    r = k / 1000
    x, y = cx + (px - cx) * r, cy + (py - cy) * r
    out.append((r, a[int(round(y)) - 1:int(round(y)) + 2, int(round(x)) - 1:int(round(x)) + 2].mean()))
print(' '.join(f'{r:.3f}:{v:.0f}' for r, v in out if v > 0.5))
