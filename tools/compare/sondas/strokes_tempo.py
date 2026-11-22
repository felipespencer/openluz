# Sonda do Strokes NO TEMPO (só Resolume): põe os valores pedidos, aperta Reset (se RESET=1) e guarda uma rajada de
# quadros da saída pelo Spout, para ver como as pinceladas nascem, andam e somem quadro a quadro.
# Uso: py tools/compare/sondas/strokes_tempo.py <rotulo> <segundos> [Controle=valor ...]
#   RESET=1   aperta Reset depois de pôr os valores (a rajada começa logo em seguida)
#   PASSO=2   guarda um pixel a cada PASSO (padrão 2: 960×540); COR=1 guarda RGB (padrão: só o canal R)
#   MUDA="Controle=valor"  muda esse controle no meio da rajada (depois de MUDA_EM segundos, padrão 1)
# Sai em tools/compare/saida/stk-tempo-<rotulo>.npz: quadros [N,h,w(,3)] uint8 e ts (ms desde o primeiro quadro).
# Clipe já aberto na camada 1, casa 2 (node tools/compare/resolume.mjs abrir <arquivo>).
import array, json, os, sys, time, urllib.request

import numpy as np
import SpoutGL

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from strokes_lib import PADRAO, efeito, por, reset  # noqa: E402

GL_RGBA = 0x1908
NOME = 'Arena - Screen 1'

def rajada(segundos, passo, cor, no_meio=None, em=1.0):
    with SpoutGL.SpoutReceiver() as r:
        r.createOpenGL()
        if NOME not in (r.getSenderList() or []): sys.exit(f'remetente Spout "{NOME}" não existe. Há: {r.getSenderList()}')
        r.setReceiverName(NOME)
        buf, quadros, ts, t0, fim, feito = None, [], [], None, time.time() + segundos + 8, False
        while time.time() < fim:
            ok = r.receiveImage(buf, GL_RGBA, False, 0)
            if r.isUpdated():
                buf = array.array('B', bytes(r.getSenderWidth() * r.getSenderHeight() * 4)); continue
            if buf is not None and ok and r.isFrameNew():
                if t0 is None: t0 = time.time()
                if time.time() - t0 > segundos: break
                img = np.frombuffer(buf, np.uint8).reshape(r.getSenderHeight(), r.getSenderWidth(), 4)
                f = np.array(img[::passo, ::passo, :3] if cor else img[::passo, ::passo, 0])
                # o Spout avisa "quadro novo" várias vezes por quadro desenhado: só guarda quando a imagem muda
                if not quadros or not np.array_equal(f, quadros[-1]): quadros.append(f); ts.append(round((time.time() - t0) * 1000, 1))
                if no_meio and not feito and time.time() - t0 > em: no_meio(); feito = True
            r.waitFrameSync(NOME, 100)
        return np.array(quadros), np.array(ts)


def main():
    rot, seg = sys.argv[1], float(sys.argv[2])
    vals = dict(PADRAO)
    for kv in sys.argv[3:]:
        k, v = kv.split('=', 1); vals[k] = v
    e = efeito(); por(e, vals)
    time.sleep(float(os.environ.get('ASSENTA', '0.5')))
    if os.environ.get('RESET'): reset(e)
    no_meio = None
    if os.environ.get('MUDA'):
        k, v = os.environ['MUDA'].split('=', 1)
        no_meio = (lambda: reset(e)) if k == 'Reset' else (lambda: por(e, {k: v}))
    q, ts = rajada(seg, int(os.environ.get('PASSO', '2')), bool(os.environ.get('COR')), no_meio, float(os.environ.get('MUDA_EM', '1')))
    arq = os.path.join(os.path.dirname(AQUI), 'saida', f'stk-tempo-{rot}.npz')
    np.savez(arq, q=q, ts=ts)
    d = np.diff(ts)
    print(json.dumps({'rot': rot, 'quadros': int(len(q)), 'forma': list(q.shape[1:]), 'ms_por_quadro': round(float(np.median(d)), 1) if len(d) else None,
                      'media_ini': round(float(q[0].mean()), 1), 'media_fim': round(float(q[-1].mean()), 1)}, ensure_ascii=False))


main()
