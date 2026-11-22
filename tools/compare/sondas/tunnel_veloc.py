# Sonda do Tunnel: quanto a imagem anda para o fundo por segundo em cada Speed. Usa a imagem de posição (verde = altura da
# imagem) e lê um ponto fixo da tela várias vezes com o relógio: a inclinação de v contra o tempo é a velocidade (alturas de imagem por segundo).
# Uso: py tools/compare/sondas/tunnel_veloc.py   (Resolume aberto)
import os, sys, time
import numpy as np
AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, AQUI)
import gabarito as G
ARQ = os.path.join(AQUI, 'saida', 'sonda_tunnel', 'posicao.png')
sp = G.Spout(); G.abrir(ARQ); time.sleep(1.0)
for speed in ([float(x) for x in sys.argv[1:]] or (0.5, 0.0, 0.25, 0.4, 0.45, 0.55, 0.6, 0.75, 1.0)):
    ps = G.por('Tunnel')['params']; time.sleep(0.6)
    G.req('PUT', f"/parameter/by-id/{ps['Speed']['id']}", {'value': speed}); time.sleep(0.5)
    ts, vs = [], []
    t0 = time.time()
    while time.time() - t0 < 2.5:
        img = np.asarray(sp.quadro(1).convert('RGB')).astype(float)       # 960×540
        vs.append(img[270 - 2:270 + 2, 480 + 150 - 2:480 + 150 + 2, 1].mean() / 255); ts.append(time.time() - t0)
    v = (np.array(vs) - 0.059) / 0.941; u = np.unwrap(v * 2 * np.pi) / (2 * np.pi); p = np.polyfit(ts, u, 1)
    print(f'Speed {speed}: {len(ts)} leituras, v anda {p[0]:+.4f} alturas por segundo (30 × (0,5 − Speed)³ = {30 * (0.5 - speed) ** 3:+.4f})')
