# Compara a curva da "Composition FFT" do Resolume (clip-fft.py) com contas possíveis sobre o espectro gravado no OpenLuz, no mesmo vídeo.
# Uso: python fft-ajuste.py fft-resolume.json esp-nosso.json
import json, sys, numpy as np
R = np.array(json.load(open(sys.argv[1]))); N = json.load(open(sys.argv[2], encoding='utf-8-sig')); rows = np.array(N['rows'], dtype=float); sr = N['sr']
DT = 0.04; T = np.arange(0.5, 29.5, DT)
def grade(t, v):   # mediana por janela de tempo do clipe
    out = np.full(len(T), np.nan); idx = np.floor((t - T[0]) / DT).astype(int)
    for i in range(len(T)):
        m = v[idx == i]
        if len(m): out[i] = np.median(m)
    return out
r = grade(R[:, 1], R[:, 2])
t, rms, pk, db = rows[:, 0], rows[:, 1], rows[:, 2], rows[:, 3:]
lin = 10 ** (db / 20); hz = sr / 1024
def faixa(a, b): return slice(max(0, int(a / hz)), min(db.shape[1], int(np.ceil(b / hz)) + 1))
cands = {'rms': rms, 'pico': pk}
for nome, (a, b) in {'tudo 20-12k': (20, 12000), 'graves 20-250': (20, 250), 'sub 20-120': (20, 120), 'medios 250-3k': (250, 3000), 'agudos 3k-12k': (3000, 12000)}.items():
    s = faixa(a, b); cands['media linear ' + nome] = lin[:, s].mean(1); cands['max linear ' + nome] = lin[:, s].max(1); cands['energia ' + nome] = np.sqrt((lin[:, s] ** 2).sum(1))
    cands['dB (como hoje) ' + nome] = np.clip((db[:, s].mean(1) + 100) / 70, 0, 1)
ok = ~np.isnan(r); res = []
for nome, v in cands.items():
    g = grade(t, v); best = (-2, 0)
    for lag in range(-8, 9):   # até ±0,32 s de atraso
        a = r[max(0, lag):len(r) + min(0, lag)]; b = g[max(0, -lag):len(g) + min(0, -lag)]; m = ~np.isnan(a) & ~np.isnan(b)
        if m.sum() > 100: c = np.corrcoef(a[m], b[m])[0, 1]; best = max(best, (c, lag))
    m = ok & ~np.isnan(g); k = (r[m] * g[m]).sum() / (g[m] ** 2).sum()   # ganho que melhor encaixa (reta pela origem)
    res.append((best[0], nome, best[1] * DT, k, np.nanpercentile(g * k, [10, 50, 90])))
print('Resolume: p10 %.3f p50 %.3f p90 %.3f  mín %.3f máx %.3f' % (*np.nanpercentile(r, [10, 50, 90]), np.nanmin(r), np.nanmax(r)))
for c, nome, lag, k, p in sorted(res, reverse=True)[:12]: print('corr %.3f  atraso %+.2f s  ganho %8.3f  p10/50/90 %.3f %.3f %.3f  %s' % (c, lag, k, *p, nome))
