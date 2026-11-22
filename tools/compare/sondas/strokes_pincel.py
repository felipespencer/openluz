# O pincel do OpenLuz para o Strokes (desenho nosso, só PARECIDO com o do Resolume: corpo cheio, ponta direita rasgada em
# fios, borda dura). Gera as tabelas dos fios para o shader (engine.strokesPass) e calcula quanto mede a mancha
# (comprimento e largura "4 sigma", como a sonda mede) para acertar o tamanho do quadrado.
# Uso: py tools/compare/sondas/strokes_pincel.py [previa.png]
import sys
import numpy as np

N = 16                                   # fios (faixas ao longo da pincelada)
rng = np.random.default_rng(7281)
PONTA = np.round(0.52 + 0.46 * rng.random(N), 3)            # onde cada fio acaba (x de −1 a 1)
PONTA[[0, N - 1]] = np.minimum(PONTA[[0, N - 1]], 0.62)     # os fios de fora acabam antes: a ponta afina
tem = rng.random(N) > 0.5
F0 = np.where(tem, np.round(PONTA - 0.12 - 0.28 * rng.random(N), 3), 9.0)   # começo da falha do fio (9 = sem falha)
F1 = np.where(tem, np.round(F0 + 0.05 + 0.09 * rng.random(N), 3), 9.0)      # fim da falha


def alfa(x, y):
    ay = np.abs(y)
    esq = -1.0 + 0.5 * (1.0 - np.sqrt(np.clip(1.0 - ay * ay, 0, 1)))        # ponta esquerda redonda
    i = np.clip(np.floor((y * 0.5 + 0.5) * N), 0, N - 1).astype(int)
    cima = 0.97 - 0.10 * np.clip((x - 0.2) / 0.8, 0, 1) ** 2                  # afina um pouco para a ponta
    return (x > esq) & (x < PONTA[i]) & (ay < cima) & ~((x > F0[i]) & (x < F1[i]))


def medidas(n=1200):
    y, x = np.mgrid[-1:1:n * 1j, -1:1:n * 1j]
    m = alfa(x, y); xs, ys = x[m], y[m]
    return m, 4 * xs.std(), 4 * ys.std(), xs.mean(), ys.mean(), m.mean() * 4


if __name__ == '__main__':
    m, L, W, cx, cy, area = medidas()
    print('PONTA', list(PONTA)); print('F0', list(F0)); print('F1', list(F1))
    print(f'no quadrado de −1 a 1: comprimento 4σ {L:.4f}, largura 4σ {W:.4f}, centro ({cx:.4f}, {cy:.4f}), área {area:.4f}')
    # alvo (Resolume, 1080 linhas): comprimento 4σ = 169,5 × Size px; largura 4σ = 0,414 × comprimento
    print(f'meio-comprimento do quadrado = {169.5 / L:.2f} × Size px; meia-largura = {169.5 * 0.414 / W:.2f} × Size px; área/(π/4·L·W) = {area / (np.pi / 4 * L * W):.3f}')
    if len(sys.argv) > 1:
        from PIL import Image
        a = 169.5 / L * 2; b = 169.5 * 0.414 / W * 2      # Size 2: grande, para ver
        w, h = int(2 * a) + 40, int(2 * b) + 40
        yy, xx = np.mgrid[0:h, 0:w]
        im = alfa((xx - w / 2) / a, -(yy - h / 2) / b)
        Image.fromarray((im * 255).astype(np.uint8)).save(sys.argv[1])
