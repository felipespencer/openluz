# Lê a cor das amostras da carta de prova (9 cinzas e 8 cores puras) numa foto do gabarito: serve para deduzir
# a conta dos efeitos de cor (entrada conhecida -> saída medida).
# Uso: py tools/compare/pontos.py "<efeito>" [filtro do nome do caso]     (RGBA como veio do Spout: premultiplicado)
#      py tools/compare/pontos.py "<efeito>" [filtro] --xy 480,270 ...     lê também esses pontos (em 960x540)
import os, re, sys

import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[1:]
xy = []
if '--xy' in args:
    i = args.index('--xy')
    xy = [tuple(int(v) for v in a.split(',')) for a in args[i + 1:]]
    args = args[:i]
pasta = os.path.join(AQUI, 'saida', 'ref', re.sub(r'[^\w.\- ]+', '_', args[0]))
filtro = args[1] if len(args) > 1 else ''
CINZAS = [((40 + k * 80 + 40) // 2, 895 // 2) for k in range(9)]
CORES = [((40 + k * 90 + 40) // 2, 990 // 2) for k in range(8)]
NOMES = ['R', 'G', 'B', 'C', 'M', 'Y', 'W', 'K']


def le(img, x, y):
    return tuple(int(round(v)) for v in img[y - 4:y + 5, x - 4:x + 5].reshape(-1, img.shape[2]).mean(0))


for f in sorted(os.listdir(pasta)):
    if not f.endswith('.png') or f.startswith('_') or f.endswith('.b.png') or filtro not in f:
        continue
    img = np.asarray(Image.open(os.path.join(pasta, f)).convert('RGBA'), np.float32)
    print(f[:-4])
    print('  cinzas (entrada 0,32,64,...,255):', ' '.join('%d,%d,%d,%d' % le(img, x, y) for x, y in CINZAS))
    print('  cores:', ' '.join(n + '=%d,%d,%d,%d' % le(img, x, y) for n, (x, y) in zip(NOMES, CORES)))
    if xy:
        print('  pontos:', ' '.join('(%d,%d)=%d,%d,%d,%d' % ((x, y) + le(img, x, y)) for x, y in xy))
