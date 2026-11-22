# Folha lado a lado do Strokes: o padrão e os seis presets, Resolume à esquerda e OpenLuz à direita, sobre uma imagem.
# No Resolume o preset entra pela API (efeito posto com o nome do preset); no OpenLuz vão os mesmos valores (strokes_o.mjs).
# Uso: py tools/compare/sondas/strokes_folha.py <imagem> [<imagem> ...]     (padrão: carta.png e rostos.jpg de tools/compare/clips)
# Sai tools/compare/saida/conf/Strokes/_presets-<imagem>.png
import json, os, subprocess, sys, time, urllib.parse

import numpy as np
from PIL import Image, ImageDraw

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from strokes_lib import SAIDA, abrir, req  # noqa: E402
from capture import capturar  # noqa: E402
from gabarito import tem_marca  # noqa: E402

CLIPS = os.path.join(AQUI, '..', 'clips'); CONF = os.path.join(AQUI, '..', 'saida', 'conf', 'Strokes'); os.makedirs(CONF, exist_ok=True)
PRESETS = json.load(open(os.path.join(SAIDA, 'presets.json'), encoding='utf-8'))


def tira():
    fx = req('GET', '/composition/layers/1')['video']['effects']
    for i in range(len(fx) - 1, -1, -1):
        if fx[i]['name'] == 'Strokes': req('DELETE', f'/composition/layers/1/effects/video/{i}')


def resolume(preset):
    tira(); time.sleep(0.3)
    req('POST', '/composition/layers/1/effects/video/add', ('effect:///video/Strokes' + ('/' + urllib.parse.quote(preset) if preset else '')).encode(), texto=True)
    time.sleep(3.0)
    for _ in range(40):   # a marca d'água do demo aparece uns 5 s a cada minuto: a foto só vale se não houver marca nela nem logo depois (entrando)
        img = Image.fromarray(capturar(4)); time.sleep(1.2); depois = Image.fromarray(capturar(2))
        if not tem_marca(img.resize((960, 540))) and not tem_marca(depois.resize((960, 540))): return img
        time.sleep(1.5)
    raise RuntimeError("a marca d'água não saiu")


def openluz(preset, img):
    vals = {k: v for k, v in (PRESETS[preset] if preset else {}).items() if k != 'Opacity'}
    args = ['node', os.path.join(AQUI, 'strokes_o.mjs'), 'folha', img] + [f'{k}={v}' for k, v in vals.items()] + ['--n', '1', '--espera', '100']
    subprocess.run(args, check=True, capture_output=True)
    return Image.open(os.path.join(SAIDA, 'O-folha-0.png')).convert('RGB')


for img in (sys.argv[1:] or [os.path.join(CLIPS, 'carta.png'), os.path.join(CLIPS, 'rostos.jpg')]):
    abrir(img); nomes = [None] + list(PRESETS); W, H = 640, 360
    folha = Image.new('RGB', (2 * W + 6, len(nomes) * (H + 22)), (24, 24, 24)); d = ImageDraw.Draw(folha)
    for i, n in enumerate(nomes):
        a, b = resolume(n), openluz(n, img); y = i * (H + 22)
        d.text((4, y + 4), (n or 'padrão') + '   —   Resolume | OpenLuz', fill=(255, 255, 255))
        folha.paste(a.resize((W, H)), (0, y + 22)); folha.paste(b.resize((W, H)), (W + 6, y + 22))
        print(n or 'padrão', 'médias', round(float(np.asarray(a).mean()), 1), round(float(np.asarray(b).mean()), 1))
    sai = os.path.join(CONF, '_presets-' + os.path.splitext(os.path.basename(img))[0] + '.png'); folha.save(sai); print(sai)
tira(); req('POST', '/composition/layers/1/effects/video/add', b'effect:///video/Strokes', texto=True)
