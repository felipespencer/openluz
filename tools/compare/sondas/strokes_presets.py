# Lê os presets do Strokes pela API REST do Resolume: põe o efeito com cada preset numa posição a mais da camada 1, copia os
# valores dos controles e tira o efeito de novo. Sai em tools/compare/saida/stk/presets.json.
# Uso: py tools/compare/sondas/strokes_presets.py
import json, os, time, urllib.parse

from strokes_lib import SAIDA, req

nomes = [p['name'] for p in [e for e in req('GET', '/effects')['video'] if e['name'] == 'Strokes'][0]['presets']]
out = {}
for n in nomes:
    antes = len(req('GET', '/composition/layers/1')['video']['effects'])
    req('POST', '/composition/layers/1/effects/video/add', ('effect:///video/Strokes/' + urllib.parse.quote(n)).encode(), texto=True)
    time.sleep(0.8)
    fx = req('GET', '/composition/layers/1')['video']['effects']
    if len(fx) != antes + 1 or fx[-1]['name'] != 'Strokes': print('não entrou:', n); continue
    out[n] = {k: v.get('value') for k, v in fx[-1]['params'].items() if 'value' in v}
    req('DELETE', f'/composition/layers/1/effects/video/{len(fx) - 1}')
    time.sleep(0.4)
json.dump(out, open(os.path.join(SAIDA, 'presets.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
pad = None
for n, v in out.items(): print(n, {k: (round(x, 4) if isinstance(x, float) else x) for k, x in v.items() if k not in ('Opacity', 'Resource')})
print([e['name'] for e in req('GET', '/composition/layers/1')['video']['effects']])
