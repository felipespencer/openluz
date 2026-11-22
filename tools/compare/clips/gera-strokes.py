# Imagens de prova das sondas do Strokes (tools/compare/sondas/strokes_*.py), 1920×1080. Uso: py tools/compare/clips/gera-strokes.py
import os
import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
W, H = 1920, 1080
y, x = np.mgrid[0:H, 0:W].astype(float)


def grava(nome, im):
    if im.ndim == 2: im = np.dstack([im, im, im])
    Image.fromarray(np.clip(im * 255 + 0.5, 0, 255).astype(np.uint8)).save(os.path.join(AQUI, nome + '.png'))


r = np.hypot(x - W / 2, y - H / 2)
grava('stk-radial', 0.4 + 0.6 * r / r.max())            # cone: o gradiente aponta para fora em todo lugar (direção da pincelada)
grava('stk-rampax', 0.35 + 0.65 * x / (W - 1))          # gradiente para a direita
grava('stk-rampay', 0.35 + 0.65 * y / (H - 1))          # gradiente para baixo
grava('stk-rampa0', x / (W - 1))                        # brilho de 0 a 1 em x (Size Mode Brightness)
b = np.full((H, W), 0.3); b[:, 640:1280] = 0.6; b[:, 1280:] = 0.9; b[340:740, 200:440] = 1.0
grava('stk-degraus', b)                                 # degraus e um quadrado (Edges Only; alcance do Swirl)
tri = lambda t, p: 0.25 + 0.7 * np.abs(((t / p) % 1) * 2 - 1)
grava('stk-tri', np.where(y < 540, tri(x, 480), tri(y, 270)))   # ondas triangulares: em cima 0,00292/px em x, embaixo 0,00519/px em y (Flow)
b = np.zeros((H, W))
for i, s in enumerate([0.00002, 0.00005, 0.0001, 0.0002, 0.0004, 0.0008]): b[i * 180:(i + 1) * 180] = 0.5 + s * (x[i * 180:(i + 1) * 180] - 960)
grava('stk-incl', b)                                    # seis rampas de inclinação diferente (limiar do Edges Only)
im = np.zeros((H, W, 3)); im[:, :640, 0] = 1; im[:, 640:1280, 1] = 1; im[:, 1280:, 2] = 1
im[540:, :640] = (1, 1, 0); im[540:, 640:1280] = (0, 1, 1); im[540:, 1280:] = (1, 0, 1)
grava('stk-rgb', im)                                    # cores puras (que brilho o Size Mode Brightness usa: o maior canal)
im = np.zeros((H, W, 3)); im[..., 0] = 1; im[..., 1] = x / (W - 1); im[540:] = 0.7
grava('stk-rg', im)                                     # vermelho fixo e verde em rampa: o maior canal não muda, o brilho Rec. 601 sim (direção)
grava('stk-cinza7', np.full((H, W), 178 / 255)); grava('stk-cinza3', np.full((H, W), 77 / 255))   # cinzas lisos (a mistura com o fundo)
