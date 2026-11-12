# Segunda passada do gabarito: casos que a varredura de um controle por vez não mostra (dois controles juntos, valores
# finos, clipe com transparência) e fotos a refazer. Acrescenta os casos ao casos.json do efeito (arquivo começa com "x_"),
# no mesmo formato, e o confere.mjs passa a medi-los também.
# Uso: py tools/compare/gabarito2.py [efeito ...]     (sem nomes: tudo o que está em CASOS e REFAZER)
import json, os, re, sys, time

import numpy as np
from PIL import Image

import gabarito as G

ALFA = 'alfa.png'
M = lambda **k: k


def lista(base, chave, valores):
    return [dict(base, **{chave: v}) for v in valores]


CASOS = {
    'Shift RGB': [dict(Mode=m, R=0.25, Distance=0.5) for m in ('Shift X', 'Shift Y', 'Rotate X', 'Rotate Y', 'Rotate Z', 'Zoom')]
                 + [dict(Mode=m, R=0.25, G=-0.25, B=0.5) for m in ('Shift X', 'Shift Y', 'Rotate Z', 'Zoom')]
                 + [{'Mode': 'Rotate Z', 'R': 0.25, 'Black BG': True}, {'Mode': 'Zoom', 'R': -0.5, 'Black BG': True}],
    'Levels': lista({}, 'Base', [0.4, 0.45, 0.48, 0.52, 0.55, 0.6]) + lista({}, 'Midpoint', [0.45, 0.55]) + lista({}, 'Ratio', [0.45, 0.55]),
    'Mirror': [{'X': 0.25, 'Flip X': True}, {'Y': 0.25, 'Flip Y': True}, {'X': 0.25, 'Y': 0.25}, {'X': 0.25, 'Y': 0.25, 'Flip X': True, 'Flip Y': True},
               {'X': 0.25, 'Y': 0.25, 'In / Out': 0.5}, {'X': 0.25, 'In / Out': 0}, {'X': 0.75, 'Flip X': True}],
    'Displace': [{'X factor': 0.75}, {'X factor': 0.75, 'Smooth': True}, {'X factor': 0.75, 'Threshold': 0.25}, {'X factor': 0.75, 'Threshold': 0.5},
                 {'X factor': 0.75, 'Invert': True}, {'X factor': 0.75, 'Y factor': 0.25}, {'X factor': 1, 'Y factor': 1},
                 {'X factor': 1, 'Mode': 'Wrap'}, {'X factor': 1, 'Mode': 'Transparent'}, {'X factor': 1, 'Mode': 'Transparent', 'Black BG': True}],
    'Distortion': lista({'Distort': 0.5}, 'Radius', [0, 0.25, 0.55, 0.75, 1]) + [{'Distort': 1, 'Radius': 0.25}, {'Distort': 0.25, 'Radius': 0.25}],
    'Transform': lista({}, 'Rotation X', [30, 45, 60]) + lista({}, 'Rotation Y', [30, 45]) + [{'Rotation X': 30, 'Rotation Y': 30}, {'Rotation Z': 30},
                 {'Rotation X': 45, 'Anchor Y': 200}],
    'Drop Shadow': [dict(c, clip=ALFA) for c in [{}, {'Distance': 50}, {'Distance': 100}, {'Distance': 50, 'Angle': -90}, {'Distance': 50, 'Angle': 0},
                    {'Distance': 50, 'Color': '#3366ffff'}, {'Distance': 50, 'Color': '#ffffff80'}, {'Distance': 50, 'Spread': 0}, {'Distance': 50, 'Spread': 0.0025},
                    {'Distance': 50, 'Spread': 0.005}, {'Distance': 50, 'Strength': 1}, {'Distance': 50, 'Strength': 16}, {'Distance': 50, 'Strength': 32}]],
    'Recolor': [dict(c, clip=ALFA) for c in [{'Cycle Speed': 0.5}, {'Use Alpha': True}, {'Use Alpha': True, 'Palette': 0.5}]]
               + lista({}, 'Palette', [0.05, 0.1, 0.15, 0.2, 0.3, 0.35, 0.4, 0.45, 0.55, 0.6, 0.65, 0.7, 0.8, 0.85, 0.9, 0.95]),
    'RadialBlur': lista({'Distance': 0.3}, 'Rotation', [0, 0.25, 0.5, 0.75, 1]) + lista({'Distance': 0.3}, 'Steps', [0, 0.1, 0.6, 1])
                  + [{'Distance': 0}, {'Distance': 0.3, 'High Quality': True}, {'Distance': 0.5, 'Black BG': True}, {'Distance': 0.5, 'Rotation': 0.6}],
    'Edge Detection': [{'Use Color': True, 'Color': '#3366ffff'}, {'Use Color': True, 'Color': '#3366ffff', 'Amount': 0.5}, {'Amount': 0.5}, {'Amount': 0},
                       {'Use Color': True, 'Color': '#ffffff80'}, {'Mode': 0, 'Use Color': True, 'Color': '#3366ffff'}, {'Mode': 0, 'Amount': 0.5}],
    'Dilate': [{'Shape': s, 'Size': 6} for s in ('Rectangle', 'Circle', 'Triangle', 'Cross')] + [{'Shape': 'Triangle'}, {'Shape': 'Circle'}, {'Shape': 'Cross'}]
              + [{'Threshold': 0.25}, {'Threshold': 0.5}, {'Mode': 'Dark', 'Threshold': 0.25}, {'Mode': 'Dark', 'Threshold': 0.5}, {'Mode': 'Dark', 'Shape': 'Triangle', 'Size': 6}],
    'Hatched': lista({}, 'Density', [2, 3, 5, 6, 7]) + lista({}, 'Levels', [3, 4, 5]),
    'ChromaKey': [{'Edge Shrink': 0, 'Edge Blur': 0}, {'Edge Shrink': 0.5, 'Edge Blur': 0}, {'Edge Shrink': 1, 'Edge Blur': 0}, {'Edge Shrink': 0, 'Edge Blur': 0.5},
                  {'Edge Shrink': 0, 'Edge Blur': 1}, {'Show Mask': True, 'Edge Shrink': 0, 'Edge Blur': 0}, {'Show Mask': True},
                  {'White Threshold': 0.5, 'Edge Shrink': 0, 'Edge Blur': 0}, {'White Threshold': 0.8, 'Edge Shrink': 0, 'Edge Blur': 0},
                  {'Black Threshold': 0.5, 'Edge Shrink': 0, 'Edge Blur': 0}, {'Black Threshold': 0.8, 'Edge Shrink': 0, 'Edge Blur': 0},
                  {'Key Hue': 0.6, 'Edge Shrink': 0, 'Edge Blur': 0}, {'Key Hue': 0.6, 'Show Mask': True, 'Edge Shrink': 0, 'Edge Blur': 0}],
    'Exposure': lista({}, 'Exposure', [0.55, 0.6, 0.7, 0.8, 0.9]),
    'Saturation': lista({}, 'Saturation', [0.55, 0.6, 0.7, 0.8, 0.9]),
    'Vibrance': lista({}, 'Vibrance', [0.25, 0.75, -0.25, -0.75]),
    'Colorize': lista({'GreysKeep': True}, 'GreysTolerance', [0, 0.15, 0.6, 1]) + [{'GreysKeep': True, 'Invert': True}],
    'Point Grid': [{'Rotate Z': 0.55}, {'Rotate Z': 0.6}, {'Rotate X': 0.6}, {'Rotate Y': 0.6}, {'Rotate X': 0.6, 'Space': 0.5}],
    'Bloom': lista({}, 'Size', [0.4, 0.6]) + [{'Iterations': 1, 'Size': 0.5}, {'Iterations': 3, 'Size': 0.5}, {'Iterations': 5, 'Size': 0.5}, {'Iterations': 1}, {'Iterations': 1, 'Threshold': 0.5}],
    'Wave Warp': [{'Speed': 0.5, 'Height': h} for h in (0, 0.5, 1)] + [{'Width': w} for w in (0, 0.5, 1)] + [{'Angle': a} for a in (0, 0.25, 0.5, 0.75)]
                 + [{'Mode': m} for m in (0.25, 0.5, 0.75, 1)] + [{'Pin edges?': False}, {'Pin edges?': False, 'Height': 0.5}, {'Speed': 0}, {'Speed': 1}],
    'Twitch': [{'Max Pos X': 0.5, 'Pos Frequency': 1}, {'Max Pos Y': 0.5, 'Pos Frequency': 1}, {'Max Scale': 0.5, 'Scale Frequency': 1}, {'Max Opacity': 1, 'Opacity Frequency': 1},
               {'Max Light': 1, 'Light Frequency': 1}, {'Max RGB Shift': 1, 'RGB Frequency': 1}, {'Max Blur': 1, 'Blur Frequency': 1}, {'Max Pos X': 1, 'Pos Frequency': 0.5}],
    'Tunnel': [{'Speed': 0.5}, {'Speed': 0}, {'Speed': 1}],
    'Noisy': lista({}, 'Noise', [0.6, 0.8, 0.9, 0.95]),
}
# fotos do gabarito que saíram com a marca d'água do demo (efeitos em que o molde da marca não funciona)
REFAZER = {'Iterate': ['DTranslateZ_1.png', 'DRotateX_0.png', 'DRotateX_0.25.png'], 'Fragment': ['FragRotationZ_0.png', 'FragRotationZ_0.25.png']}


def nome_caso(v):
    return 'x_' + '_'.join(G.rotulo(k, x)[:40] for k, x in v.items() if k != 'clip')[:110] + ('_alfa' if v.get('clip') else '')


def mediana(sp, n=7, pausa=2.5):
    """Mediana por pixel de várias capturas espaçadas: a marca d'água aparece de vez em quando e some na mediana."""
    qs = []
    for _ in range(n):
        qs.append(np.asarray(sp.quadro(2)))
        time.sleep(pausa)
    return Image.fromarray(np.median(np.stack(qs), 0).astype(np.uint8))


def um(sp, nome, casos_novos, refazer):
    pasta = os.path.join(G.REF, re.sub(r'[^\w.\- ]+', '_', nome))
    alvo = os.path.join(pasta, 'casos.json')
    g = json.load(open(alvo, encoding='utf-8'))
    G.abrir(G.CARTA)
    clip = None
    posto = G.por(nome)
    ps = posto['params']
    time.sleep(0.8)
    anima = bool(g['casos'][0].get('anima'))
    feitos = 0

    def poe(valores):
        for k, v in valores.items():
            G.req('PUT', f"/parameter/by-id/{ps[k]['id']}", {'value': v})

    def tira(valores):
        for k in valores:
            G.req('PUT', f"/parameter/by-id/{ps[k]['id']}", {'value': ps[k]['value']})

    for c in casos_novos:
        c = dict(c)
        quer = c.pop('clip', None)
        if quer != clip:
            G.abrir(os.path.join(G.AQUI, 'clips', quer) if quer else G.CARTA)
            clip = quer
            time.sleep(1.0)
        arq = nome_caso(dict(c, **({'clip': quer} if quer else {})))
        try:
            poe(c)
        except Exception as e:
            print(f'  {nome} {arq}: ERRO {str(e)[:120]}', flush=True)
            tira(c)
            continue
        time.sleep(1.2)
        img, b, mexe = G.firme(sp, anima)
        img.save(os.path.join(pasta, arq + '.png'))
        if b is not None:
            b.save(os.path.join(pasta, arq + '.b.png'))
        novo = {'arquivo': arq + '.png', 'valores': c, 'anima': mexe, 'media': round(float(np.asarray(img.convert('RGB')).mean()), 2), 'igual_ao_padrao': False, 'passada': 2}
        if quer:
            novo['clip'] = quer
        g['casos'] = [x for x in g['casos'] if x.get('arquivo') != novo['arquivo']] + [novo]
        feitos += 1
        tira(c)
    if clip:
        G.abrir(G.CARTA)
        time.sleep(1.0)
    for arq in refazer:
        c = next(x for x in g['casos'] if x.get('arquivo') == arq)
        poe(c['valores'])
        time.sleep(1.2)
        img = mediana(sp)
        img.save(os.path.join(pasta, arq))
        c['media'] = round(float(np.asarray(img.convert('RGB')).mean()), 2)
        c['anima'] = False
        c['passada'] = 2
        feitos += 1
        tira(c['valores'])
    json.dump(g, open(alvo, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return feitos


def main():
    nomes = sys.argv[1:] or sorted(set(CASOS) | set(REFAZER))
    sp = G.Spout()
    t0 = time.time()
    for n in nomes:
        try:
            r = f'{um(sp, n, CASOS.get(n, []), REFAZER.get(n, []))} casos'
        except Exception as e:
            r = 'ERRO ' + str(e)[:200]
            if 'Spout' in r or 'refused' in r or 'timed out' in r:
                print(f'{n}: {r}', flush=True)
                sys.exit(2)
        print(f'{n}: {r}  ({int(time.time() - t0)} s)', flush=True)
    G.limpar()
    G.abrir(G.CARTA)


if __name__ == '__main__':
    main()
