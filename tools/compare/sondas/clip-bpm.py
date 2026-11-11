# Sonda só pela API: como o clipe anda em BPM Sync no Resolume (Velocidade, Beat Looper). Não usa o mouse.
# Uso: python tools/compare/sondas/clip-bpm.py
import json, time, urllib.request
API = 'http://127.0.0.1:8080/api/v1'; CLIP = '/composition/layers/1/clips/1'
def get(p=CLIP): return json.load(urllib.request.urlopen(API + p))
def put(body, p=CLIP):
    r = urllib.request.Request(API + p, data=json.dumps(body).encode(), method='PUT', headers={'Content-Type': 'application/json'}); urllib.request.urlopen(r).read()
def post(p):
    urllib.request.urlopen(urllib.request.Request(API + p, data=b'', method='POST')).read()
def ctl(k, v): put({'transport': {'controls': {k: {'value': v}}}}); time.sleep(0.25)
def pos(): return get()['transport']['position']['value']
def amostra(n=16, dt=0.25):
    out = []
    for _ in range(n): out.append((time.perf_counter(), pos())); time.sleep(dt)
    return out
def taxa(a):   # ms de clipe por segundo, ignorando as voltas
    v = [(b[1] - a0[1]) / (b[0] - a0[0]) for a0, b in zip(a, a[1:]) if b[1] > a0[1]]
    v.sort(); return round(v[len(v) // 2], 1) if v else None

comp = get('/composition'); bpm = comp['tempocontroller']['tempo']['value']; print('BPM da composição:', bpm)
post(CLIP + '/connect'); time.sleep(0.5)
put({'transporttype': {'value': 'BPM Sync'}}); time.sleep(0.4)
c = get()['transport']['controls']; beats = c['duration']['value']; print('batidas:', beats, '| speed', c['speed']['value'], '| syncmode', c['syncmode']['value'])
ctl('playdirection', '>')
esperado = 30000 / (beats * 60 / bpm)
for sp in (1, 2, 0.5):
    ctl('speed', sp); time.sleep(0.4); print('Velocidade', sp, '-> anda', taxa(amostra()), 'ms/s (com batidas cheias seriam', round(esperado, 1), ')')
ctl('speed', 1)
ctl('syncmode', 'BPM'); time.sleep(0.4); c = get()['transport']['controls']; print('Sync Mode BPM: duration =', c['duration']['value'], 'faixa', c['duration'].get('min'), c['duration'].get('max'), '| anda', taxa(amostra(8)))
ctl('syncmode', 'Beats')
# Beat Looper
time.sleep(1.0); p0 = pos(); ctl('beatloop', '1 Beats'); a = amostra(20, 0.1); ps = [x[1] for x in a]
print('Beat Looper 1: agulha estava em', round(p0), '| fica entre', round(min(ps)), 'e', round(max(ps)), '| largura', round(max(ps) - min(ps)), 'ms | uma batida =', round(30000 / beats), 'ms')
t0 = time.perf_counter(); ctl('beatloop', 'Off'); p1 = pos(); dt = time.perf_counter() - a[0][0]
print('Off depois de', round(dt, 2), 's: agulha em', round(p1), '| se tivesse seguido reto estaria em', round((p0 + dt * esperado) % 30000), '| fim do laço era', round(max(ps)))
ctl('playdirection', '||'); put({'transporttype': {'value': 'Timeline'}})
print('devolvido: Timeline, pausado')
