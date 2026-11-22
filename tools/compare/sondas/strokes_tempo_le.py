# Lê uma rajada do strokes_tempo.py (imagem branca) e resume: quadros por segundo, fator de escurecimento por quadro,
# fração nova (pixels que viraram brancos) por quadro e cobertura. Uso: py tools/compare/sondas/strokes_tempo_le.py <rotulo> [...]
import os, sys
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))


def distintos(q):
    k = [1]
    for i in range(2, len(q)):
        if not np.array_equal(q[i], q[k[-1]]): k.append(i)
    return k


def resumo(rot):
    d = np.load(os.path.join(os.path.dirname(AQUI), 'saida', f'stk-tempo-{rot}.npz')); q, ts = d['q'], d['ts']
    k = distintos(q); n = len(k)
    out = {'rot': rot, 'distintos': n}
    if n < 3: out['media'] = round(float(q[-1].mean()), 1); return out
    out['qps'] = round((n - 1) / ((ts[k[-1]] - ts[k[0]]) / 1000), 1)
    raz, novo, bran, cob, mov = [], [], [], [], []
    for i in range(1, n):
        a, b = q[k[i - 1]].astype(float), q[k[i]].astype(float)
        m = (b < 250) & (a > 40)
        if m.sum() > 500: raz.append(float(np.median(b[m] / a[m])))
        novo.append(float(((b >= 250) & (a < 250)).mean())); bran.append(float((b >= 250).mean())); cob.append(float((b > 8).mean()))
        mov.append(float((np.abs(a - b) > 8).mean()))
    f = lambda v: round(float(np.median(v)), 4) if v else None
    out.update(fator=f(raz), novo=f(novo), brancos=f(bran), cobertura=f(cob), mudou=f(mov), media=round(float(q[k[-1]].mean()), 1))
    return out


for r in sys.argv[1:]: print(resumo(r))
