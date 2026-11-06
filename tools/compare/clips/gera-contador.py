# Clipe contador para efeitos de tempo (Slice Delay): cada quadro tem a cor de fundo que diz o número do quadro.
# R = (q % 16) * 16 + 8, G = ((q // 16) % 16) * 16 + 8, B = 128; moldura branca de 24 px e quadrado branco no canto de
# cima à esquerda (10 % da largura e da altura), para ver como o efeito encaixa a imagem em cada slice.
# 30 qps, 256 quadros (8,5 s). Uso: py tools/compare/clips/gera-contador.py
import os, subprocess, sys
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
W, H, N = 1920, 1080, 256
saida = os.path.join(AQUI, 'contador.mp4')
p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '30', '-i', '-',
                      '-c:v', 'libx264', '-preset', 'slow', '-crf', '4', '-pix_fmt', 'yuv420p', '-g', '1', saida], stdin=subprocess.PIPE)
for q in range(N):
    f = np.empty((H, W, 3), np.uint8)
    f[:, :] = ((q % 16) * 16 + 8, ((q // 16) % 16) * 16 + 8, 128)
    f[:24, :] = 255; f[-24:, :] = 255; f[:, :24] = 255; f[:, -24:] = 255
    f[:H // 10, :W // 10] = 255
    p.stdin.write(f.tobytes())
p.stdin.close(); sys.exit(p.wait())
