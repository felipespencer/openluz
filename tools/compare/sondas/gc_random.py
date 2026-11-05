# Grid Cloner: deslocamento de cada cópia com Random Shift = 1, para uma grade C×R (branco.png na camada 1, Input Scale 5).
# Uso: py tools/compare/sondas/gc_random.py C R
import os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import numpy as np
from scipy import ndimage
from caixas_rest import valor
from capture import capturar


def centros():
    time.sleep(0.4)
    g = capturar(8).astype(np.float32).mean(axis=2)
    lab, n = ndimage.label(g > 40)
    return [((s[1].start + s[1].stop - 1) / 2, (s[0].start + s[0].stop - 1) / 2) for s in ndimage.find_objects(lab)]


C, R = int(sys.argv[1]), int(sys.argv[2])
rs = sys.argv[3] if len(sys.argv) > 3 else '1'
for k, v in [('Columns', C), ('Rows', R), ('Input Scale', 3), ('Width', 1.6), ('Height', 0.9), ('Scale', 100), ('Rotation', 0), ('Input Rotation', 0),
             ('Vertical Shift', 0), ('Horiztonal Shift', 0), ('Order', 'Top Right'), ('Delay', '0'), ('Random Shift', 0)]:
    valor(k, str(v))
base = centros()
valor('Random Shift', rs)
mov = centros()
H = 1080
out = []
for i, (x, y) in enumerate(sorted(base, key=lambda p: (round(p[1]), p[0]))):
    # a mais perto depois do deslocamento não dá para casar; usa a ordem: grade original conhecida
    out.append((x, y))
r = round(float(rs), 3)
print('base', len(base), 'mov', len(mov))
# casa cada cópia da base com a de mov pela posição relativa da grade
gx = sorted(set(round(p[0]) for p in base)); gy = sorted(set(round(p[1]) for p in base))
for p in sorted(mov, key=lambda p: (round(p[1]), p[0])):
    print(f'({p[0]:.0f},{p[1]:.0f})', end=' ')
print()
print('grade x', gx, 'y', gy)
