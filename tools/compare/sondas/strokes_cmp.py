# Strokes: a mesma medida no Resolume e no OpenLuz, lado a lado (plano 02-12, critério AC-1).
# Para cada caso põe os mesmos valores nos dois programas, com Frequency 2 e Feedback 0 (uma rodada parada a cada meio
# segundo, pinceladas sobre preto), guarda várias rodadas de cada um e mede: cobertura, comprimento e largura "4 sigma"
# das pinceladas sozinhas, ângulo, quantas por rodada; e as medidas próprias do Edges Only e do Size Mode Brightness.
# O efeito é sorteado: compara-se estatística, não pixel.
# Uso: py tools/compare/sondas/strokes_cmp.py [caso ...]        (sem nome roda todos; SO_LER=1 só refaz a tabela)
#   Resolume aberto com o Strokes na camada 1 (API 8080, Spout) e OpenLuz de desenvolvimento na porta 9333.
# Sai a tabela na tela e em tools/compare/saida/stk/cmp.json.
import json, os, subprocess, sys, time

import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from strokes_lib import SAIDA, abrir, efeito, manchas, por, reset  # noqa: E402

CLIPS = os.path.join(AQUI, '..', 'clips')
BASE = {'Amount': 150, 'Edges Only': False, 'Frequency Mode': 'Hz', 'Frequency': 2, 'Size Mode': 'Random', 'Size': 0.2, 'Variation': 0,
        'Swirl': 0.3, 'Flow': 0, 'Feedback': 0, 'Rotation': 0}
CASOS = {   # nome: (imagem, valores que mudam, medidas que entram na conta e a folga de cada uma)
    'amount100': ('branco.png', {'Amount': 100}, {'inteiras': 0.10, 'cob': 0.10, 'comp': 0.10, 'larg': 0.10}),
    'amount1024': ('branco.png', {'Amount': 1024}, {'cob': 0.10}),
    'size0.1': ('branco.png', {'Size': 0.1}, {'cob': 0.10, 'comp': 0.10, 'larg': 0.10}),
    'size0.2': ('branco.png', {}, {'cob': 0.10, 'comp': 0.10, 'larg': 0.10, 'ang': 5}),
    'size0.4': ('branco.png', {'Size': 0.4}, {'cob': 0.10, 'comp': 0.10, 'larg': 0.10}),
    'var0.5': ('branco.png', {'Variation': 0.5}, {'cob': 0.10}),
    'var1': ('branco.png', {'Variation': 1}, {'cob': 0.10}),
    'var0.2pouca': ('branco.png', {'Variation': 0.2, 'Amount': 60}, {'cob': 0.15, 'comp_p95': 0.20}),   # poucas, para não encostarem: aí o tamanho das maiores dá para medir (a mediana não: o pincel do Resolume solta pontinhos que contam como manchas pequenas)
    'var0.5pouca': ('branco.png', {'Variation': 0.5, 'Amount': 40}, {'cob': 0.20, 'comp_p95': 0.25}),
    'var0.25size0.1': ('branco.png', {'Variation': 0.25, 'Size': 0.1, 'Amount': 100}, {'cob': 0.15}),   # a Variation soma ao Size: com Size menor pesa mais
    'var0.6brilho': ('branco.png', {'Variation': 0.6, 'Size': 0.1, 'Amount': 100, 'Size Mode': 'Brightness'}, {'cob': 0.15}),
    'rot0.25': ('branco.png', {'Rotation': 0.25}, {'cob': 0.10, 'comp': 0.10, 'ang': 5}),
    'cone': ('stk-radial.png', {'Amount': 300, 'Size': 0.15}, {'ang_borda': 6}),
    'edges': ('stk-degraus.png', {'Amount': 1000, 'Size': 0.05, 'Edges Only': True}, {'por_rodada': 0.15, 'na_borda': 10}),
    'edges_swirl1': ('stk-degraus.png', {'Amount': 1000, 'Size': 0.05, 'Edges Only': True, 'Swirl': 1}, {'por_rodada': 0.15, 'na_borda': 10}),
    'brilho': ('stk-rampa0.png', {'Amount': 300, 'Size Mode': 'Brightness'}, {'claro_escuro': 0.20, 'comp_claro': 0.10}),
}


def rodadas_resolume(nome, img, vals):
    import array, SpoutGL
    abrir(os.path.join(CLIPS, img)); e = efeito(); por(e, vals); time.sleep(0.5); reset(e)
    for tent in range(4):
        with SpoutGL.SpoutReceiver() as r:
            r.createOpenGL(); r.setReceiverName('Arena - Screen 1')
            buf, qs, t0 = None, [], None
            fim = time.time() + 12
            while time.time() < fim:
                ok = r.receiveImage(buf, 0x1908, False, 0)
                if r.isUpdated(): buf = array.array('B', bytes(r.getSenderWidth() * r.getSenderHeight() * 4)); continue
                if buf is not None and ok and r.isFrameNew():
                    if t0 is None: t0 = time.time(); continue          # o primeiro quadro vem vazio
                    if time.time() - t0 > 4.2: break
                    f = np.frombuffer(buf, np.uint8).reshape(r.getSenderHeight(), r.getSenderWidth(), 4)[:, :, :3].max(axis=2)
                    if not qs or not np.array_equal(f, qs[-1]): qs.append(f.copy())
                r.waitFrameSync('Arena - Screen 1', 100)
        if len(qs) <= 11: return qs[1:]        # mais que isso é a marca d'água do demo passando: repete
        time.sleep(6)
    return qs[1:10]


def rodadas_openluz(nome, img, vals):
    args = ['node', os.path.join(AQUI, 'strokes_o.mjs'), 'cmp-' + nome, os.path.join(CLIPS, img)] + [f'{k}={v}' for k, v in vals.items()] + ['--n', '8', '--intervalo', '520', '--espera', '20']
    subprocess.run(args, check=True, capture_output=True)
    return [np.asarray(Image.open(os.path.join(SAIDA, f'O-cmp-{nome}-{i}.png')).convert('RGB')).max(axis=2) for i in range(8)]


def medir(nome, qs):
    ms = [manchas(q, limiar=40, minimo=6) for q in qs]
    r = {'rodadas': len(qs), 'cob': float(np.mean([(q > 40).mean() for q in qs])), 'por_rodada': float(np.mean([len(m) for m in ms]))}
    t = np.vstack(ms)
    if len(t):
        # pinceladas sozinhas: mancha compacta, na proporção do pincel; os pedacinhos soltos da ponta rasgada ficam de fora (só nos casos de tamanho igual)
        comp = t[:, 0] / (np.pi / 4 * t[:, 1] * t[:, 2]); u = t[(comp > 0.8) & (t[:, 2] / t[:, 1] > 0.3) & (t[:, 2] / t[:, 1] < 0.55)]
        if not nome.startswith('var') and nome != 'brilho' and len(u): u = u[u[:, 0] > 0.3 * np.percentile(u[:, 0], 90)]
        r['inteiras'] = float(len(u) / max(1, len(qs)))
        if len(u):
            d = ((u[:, 3] + 90) % 180) - 90; x = np.radians(2 * u[:, 3])
            r.update(sozinhas=int(len(u)), comp=float(np.median(u[:, 1])), larg=float(np.median(u[:, 2])), comp_p95=float(np.percentile(u[:, 1], 95)),
                     ang=float(np.degrees(np.arctan2(np.sin(x).mean(), np.cos(x).mean())) / 2))
            if nome == 'cone':       # eixo da pincelada − direção do gradiente (o cone clareia para fora): 90 = ao longo da borda
                phi = np.degrees(np.arctan2(-(u[:, 5] - 540), u[:, 4] - 960)); k = np.hypot(u[:, 4] - 960, u[:, 5] - 540) > 200
                y = np.radians(2 * (u[k, 3] - phi[k])); r['ang_borda'] = float(np.degrees(np.arctan2(np.sin(y).mean(), np.cos(y).mean())) / 2 % 180)
            if nome == 'brilho':     # a imagem vai de preto (esquerda) a branco (direita)
                esc, cla = u[(u[:, 4] > 384) & (u[:, 4] < 768), 1], u[u[:, 4] > 1536, 1]
                if len(esc) and len(cla): r.update(comp_claro=float(np.median(cla)), claro_escuro=float(np.median(cla) / np.median(esc)))
        if nome.startswith('edges'):   # bordas verticais em x = 640 e 1280; quadrado de x 200–440, y 340–740
            x, y = t[:, 4], t[:, 5]; dv = np.minimum(np.abs(x - 640), np.abs(x - 1280))
            dq = np.where((y > 340) & (y < 740), np.minimum(np.abs(x - 200), np.abs(x - 440)), np.where((x > 200) & (x < 440), np.minimum(np.abs(y - 340), np.abs(y - 740)),
                          np.hypot(np.minimum(np.abs(x - 200), np.abs(x - 440)), np.minimum(np.abs(y - 340), np.abs(y - 740)))))
            dist = np.minimum(dv, dq); r.update(na_borda=float(100 * (dist < 20).mean()), dist_p90=float(np.percentile(dist, 90)))
    return r


def main():
    nomes = sys.argv[1:] or list(CASOS)
    arq = os.path.join(SAIDA, 'cmp.json'); tudo = json.load(open(arq, encoding='utf-8')) if os.path.exists(arq) else {}
    for n in nomes:
        img, muda, _ = CASOS[n]; vals = dict(BASE, **muda)
        if not os.environ.get('SO_LER'):
            a = medir(n, rodadas_resolume(n, img, vals)); b = medir(n, rodadas_openluz(n, img, vals)); tudo[n] = {'resolume': a, 'openluz': b}
            json.dump(tudo, open(arq, 'w', encoding='utf-8'), indent=1)
    falhas = 0
    print(f"{'caso':13} {'medida':13} {'Resolume':>10} {'OpenLuz':>10} {'diferença':>10}  folga")
    for n in nomes:
        if n not in tudo: continue
        a, b = tudo[n]['resolume'], tudo[n]['openluz']
        for k, folga in CASOS[n][2].items():
            if k not in a or k not in b: print(f'{n:13} {k:13} sem medida'); falhas += 1; continue
            if folga >= 1:   # folga em unidades (graus ou pontos percentuais)
                d = abs(a[k] - b[k]); d = min(d, 180 - d) if k.startswith('ang') else d; ok = d <= folga; ds = f'{d:9.1f} '
            else:
                d = abs(b[k] - a[k]) / max(abs(a[k]), 1e-9); ok = d <= folga; ds = f'{100 * d:8.1f} %'
            falhas += not ok
            print(f"{n:13} {k:13} {a[k]:10.3f} {b[k]:10.3f} {ds}  {'até ' + (str(folga) if folga >= 1 else str(int(folga * 100)) + ' %'):9} {'ok' if ok else 'FORA'}")
    print(f'{falhas} fora da folga')


main()
