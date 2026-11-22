# Lê uma rajada do strokes_tempo.py feita com Feedback 1 e Frequency baixa (pinceladas paradas, a imagem anterior anda):
# para cada pincelada mede para onde e quanto o rastro andou por quadro. O rastro é a união das cópias deslocadas da
# pincelada, então o centro dele fica a meio caminho: deslocamento = 2 × (centro do rastro − centro da pincelada).
# Uso: py tools/compare/sondas/strokes_trilha.py <rotulo> [quadro final]   (imprime direção com y para cima e px por quadro, em 1080 linhas)
import os, sys
import numpy as np
from scipy import ndimage

AQUI = os.path.dirname(os.path.abspath(__file__))


def trilhas(rot, kf=None, k0=1):
    d = np.load(os.path.join(os.path.dirname(AQUI), 'saida', f'stk-tempo-{rot}.npz')); q = d['q']
    esc = 1080 / q.shape[1]
    kf = min(kf or 40, len(q) - 1)
    a, b = q[k0] > 40, q[kf] > 40
    la, na = ndimage.label(a); lb, nb = ndimage.label(b)
    out = []
    for i in range(1, na + 1):
        ys, xs = np.nonzero(la == i)
        if len(xs) < 12: continue
        j = np.bincount(lb[ys, xs]).argmax()
        if j == 0: continue
        if len(np.unique(la[lb == j])) > 2: continue      # o rastro encostou em outra pincelada
        y2, x2 = np.nonzero(lb == j)
        dx, dy = 2 * (x2.mean() - xs.mean()) * esc, -2 * (y2.mean() - ys.mean()) * esc
        out.append((xs.mean() * esc, ys.mean() * esc, dx / (kf - k0), dy / (kf - k0)))
    return np.array(out), kf - k0


if __name__ == '__main__':
    for rot in sys.argv[1:]:
        t, n = trilhas(rot)
        if not len(t): print(rot, 'sem rastros'); continue
        v = np.hypot(t[:, 2], t[:, 3]); ang = np.degrees(np.arctan2(t[:, 3], t[:, 2])) % 360
        print(f'{rot}: {len(t)} rastros em {n} quadros; px/quadro mediana {np.median(v):.2f} (dp {v.std():.2f}); direção mediana {np.degrees(np.arctan2(np.median(t[:,3]), np.median(t[:,2])))%360:.1f}° (dp {ang.std():.1f})')
