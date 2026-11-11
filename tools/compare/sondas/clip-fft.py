# Sonda pela API: com a Opacity da camada 1 em "Composition FFT" (posta à mão pela engrenagem), amostra o valor e a posição do clipe.
# Uso: python clip-fft.py saida.json [segundos]
import json, sys, time, urllib.request
API = 'http://127.0.0.1:8080/api/v1'
def get(p): return json.load(urllib.request.urlopen(API + p))
L = get('/composition/layers/1'); pid = L['video']['opacity']['id']; cid = L['clips'][0]['transport']['position']['id']
out = []; t0 = time.perf_counter(); T = float(sys.argv[2]) if len(sys.argv) > 2 else 12
while time.perf_counter() - t0 < T:
    v = get('/parameter/by-id/%d' % pid)['value']; p = get('/parameter/by-id/%d' % cid)['value']
    out.append([round(time.perf_counter() - t0, 3), round(p / 1000, 3), round(v, 4)])
json.dump(out, open(sys.argv[1], 'w'))
vs = [o[2] for o in out]; vs2 = sorted(vs)
print('amostras', len(out), '| taxa', round(len(out) / T, 1), '/s | mín', min(vs), 'máx', max(vs), 'média', round(sum(vs) / len(vs), 3), '| p10', vs2[len(vs) // 10], 'p50', vs2[len(vs) // 2], 'p90', vs2[len(vs) * 9 // 10])
