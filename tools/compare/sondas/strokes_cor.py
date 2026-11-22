# Cor das pinceladas recém-pintadas contra a cor da imagem no lugar onde caem (rajadas do strokes_tempo.py feitas com COR=1
# sobre a carta, Frequency baixa). Com Feedback > 0 só valem os quadros do fim de cada rodada, quando as rodadas velhas já
# escureceram: usa o último quadro antes de cada troca de rodada.
# Uso: py tools/compare/sondas/strokes_cor.py <rotulo> [...]
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

AQUI = os.path.dirname(os.path.abspath(__file__))
C0 = np.asarray(Image.open(os.path.join(AQUI, '..', 'clips', 'carta.png')).convert('RGB')).astype(float)


def pares(rot):
    d = np.load(os.path.join(AQUI, '..', 'saida', f'stk-tempo-{rot}.npz')); q = d['q']
    passo = round(1080 / q.shape[1]); C = C0[::passo, ::passo]
    dif = np.array([np.abs(q[i].astype(int) - q[i - 1].astype(int)).mean() for i in range(2, len(q))])
    trocas = [i + 2 for i in np.nonzero(dif > max(4.0, 4 * np.median(dif)))[0]]          # quadro em que entrou rodada nova
    fins = sorted(set([t - 1 for t in trocas if t - 1 > 1] + [len(q) - 1]))
    P = []
    for k in fins:
        im = q[k].astype(float); v = im.max(axis=2)
        lab, n = ndimage.label(v > 0.55 * np.percentile(v, 99))
        for i, sl in enumerate(ndimage.find_objects(lab), 1):
            m = lab[sl] == i
            if m.sum() < 60 or m.sum() > 2500: continue
            ys, xs = np.nonzero(m); cy, cx = int(round(ys.mean())) + sl[0].start, int(round(xs.mean())) + sl[1].start
            P.append(np.concatenate([C[cy, cx], np.percentile(im[sl][m], 75, axis=0)]))
    return np.array(P), len(fins)


if __name__ == '__main__':
    for rot in sys.argv[1:]:
        P, n = pares(rot)
        print(f'{rot}: {len(P)} pinceladas em {n} quadros')
        x = P[:, :3].ravel(); y = P[:, 3:].ravel()
        print('   entrada → saída (todas as cores juntas):', [(int(np.median(x[(x >= a) & (x < a + 24)])), int(np.median(y[(x >= a) & (x < a + 24)]))) for a in range(0, 256, 24) if ((x >= a) & (x < a + 24)).sum() > 8])
