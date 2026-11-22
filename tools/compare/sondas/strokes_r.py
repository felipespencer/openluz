# Strokes parado no Resolume: põe os valores (padrão: Frequency 0 e Feedback 0, pinceladas paradas sobre preto), aperta Reset,
# captura pelo Spout, guarda saida/stk/R-<rotulo>.png e imprime a medida das pinceladas.
# Uso: py tools/compare/sondas/strokes_r.py <rotulo> [Controle=valor ...]     CLIP=<arquivo> abre essa imagem antes
import json, os, sys, time

from PIL import Image

from strokes_lib import PARADO, SAIDA, abrir, efeito, por, reset, resumo
from capture import capturar


def main():
    rot = sys.argv[1]; vals = dict(PARADO)
    for kv in sys.argv[2:]:
        k, v = kv.split('=', 1); vals[k] = v
    if os.environ.get('CLIP'): abrir(os.environ['CLIP'])
    e = efeito(); por(e, vals); time.sleep(0.3); reset(e); time.sleep(float(os.environ.get('ASSENTA', '1.0')))
    a = capturar(6); time.sleep(0.4); b = capturar(3)
    if abs(a.astype(int) - b.astype(int)).mean() > 0.5 and float(vals['Frequency']) == 0: print('aviso: duas capturas diferentes (marca d\'água?)', file=sys.stderr)
    Image.fromarray(b).save(os.path.join(SAIDA, f'R-{rot}.png'))
    print(json.dumps({'rot': rot, **resumo(b)}, ensure_ascii=False))


main()
