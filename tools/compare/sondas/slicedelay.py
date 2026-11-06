# Sonda do Slice Delay: captura quadros do Resolume pelo Spout e lê o número do clipe contador no meio de cada slice.
# Uso: py tools/compare/sondas/slicedelay.py <layout> <rotulo> [quadros]
#   grava saida/sd-<rotulo>.png (um quadro inteiro) e imprime, por quadro, o número lido em cada slice e o atraso
#   de cada slice em relação à mais nova.
import array, json, os, sys, time

import numpy as np
import SpoutGL
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(AQUI))
import importlib.util
spec = importlib.util.spec_from_file_location('sl', os.path.join(os.path.dirname(AQUI), 'slices-resolume.py'))
GL_RGBA = 0x1908


def layouts():
    src = open(os.path.join(os.path.dirname(AQUI), 'slices-resolume.py'), encoding='utf-8').read()
    ini = src.index('LAYOUTS = {'); fim = src.index('\n}\n', ini) + 3
    ns = {}; exec(src[ini:fim], ns); return ns['LAYOUTS']


def numero(px):
    r, g = int(px[0]), int(px[1])
    return (r // 16) + 16 * (g // 16)


def quadros(n, nome='Arena - Screen 1'):
    out = []
    with SpoutGL.SpoutReceiver() as r:
        r.createOpenGL(); r.setReceiverName(nome)
        buf, fim = None, time.time() + 20
        while time.time() < fim and len(out) < n:
            ok = r.receiveImage(buf, GL_RGBA, False, 0)
            if r.isUpdated():
                buf = array.array('B', bytes(r.getSenderWidth() * r.getSenderHeight() * 4)); continue
            if buf is not None and ok and r.isFrameNew():
                out.append(np.frombuffer(buf, np.uint8).reshape(r.getSenderHeight(), r.getSenderWidth(), 4)[:, :, :3].copy())
            r.waitFrameSync(nome, 100)
    return out


def main():
    lay, rot = sys.argv[1], sys.argv[2]
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 20
    sl = layouts()[lay]
    qs = quadros(n)
    Image.fromarray(qs[-1]).save(os.path.join(os.path.dirname(AQUI), 'saida', f'sd-{rot}.png'))
    res = []
    for q in qs:
        # amostra num ponto do fundo (longe da moldura e do quadrado): 60 % x 60 % de cada slice
        nums = [numero(q[int(y + h * 0.6), int(x + w * 0.6)]) for _, x, y, w, h in sl]
        res.append(nums)
    for nums in res[-8:]:
        m = max(nums); print(nums, '-> atraso', [(m - v) % 256 for v in nums])
    print(json.dumps({'rot': rot, 'ultimo': res[-1]}))


main()
