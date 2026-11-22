# Sonda do Bloom: a parte de cada volta (Iterations) sobre a carta, sem estourar. Com Amount 0,2 a saída é
# imagem + (soma das voltas)², então raiz(saída − imagem) é a soma, e a diferença entre N e N − 1 voltas é a volta N sozinha.
# Fotografa o Resolume (Iterations 1 a 5) e o OpenLuz de desenvolvimento (porta 9333) e compara volta por volta.
# Uso: py tools/compare/sondas/bloom_voltas.py [Size=0.25]     SO_LER=1 só refaz a conta
import os, subprocess, sys, time
import numpy as np
from PIL import Image
AQUI = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, AQUI)
OUT = os.path.join(AQUI, 'saida', 'sonda_bloom'); CARTA = os.path.join(AQUI, 'clips', 'carta.png')
extra = dict(kv.split('=') for kv in sys.argv[1:]); tag = ''.join(f'_{k}{v}' for k, v in extra.items())
if not os.environ.get('SO_LER'):
    import gabarito as G
    sp = G.Spout(); G.abrir(CARTA); time.sleep(1.0); ps = G.por('Bloom')['params']; time.sleep(0.8)
    poe = lambda k, v: G.req('PUT', f"/parameter/by-id/{ps[k]['id']}", {'value': float(v)})
    poe('Amount', 0.2)
    for k, v in extra.items(): poe(k, v)
    for it in range(1, 6):
        poe('Iterations', it); time.sleep(1.2); G.sem_marca(sp).convert('RGB').save(os.path.join(OUT, f'voltas_R{it}{tag}.png'))
        subprocess.run(['node', os.path.join(AQUI, 'sondas', 'strokes_o.mjs'), 'voltas', CARTA, '--efeito', 'Bloom', 'Amount=0.2', f'Iterations={it}', '--n', '1', '--espera', '8'] + [f'{k}={v}' for k, v in extra.items()], check=True, capture_output=True)
        Image.open(os.path.join(AQUI, 'saida', 'stk', 'O-voltas-0.png')).convert('RGB').resize((960, 540), Image.BILINEAR).save(os.path.join(OUT, f'voltas_O{it}{tag}.png'))
c = np.asarray(Image.open(CARTA).convert('RGB').resize((960, 540), Image.BILINEAR)).astype(float) / 255
le = lambda q, it: np.asarray(Image.open(os.path.join(OUT, f'voltas_{q}{it}{tag}.png'))).astype(float) / 255
ant = {}
for it in range(1, 6):
    linha = f'volta {it}:'
    for q in 'RO':
        o = le(q, it); ok = (o < 0.97).all(axis=2)                       # onde não estourou
        soma = np.sqrt(np.clip(o - c, 0, None)).mean(axis=2)             # soma das voltas até aqui
        e = soma - ant.get(q, 0); ant[q] = soma; m = ok
        # largura: quanto a volta varia de um ponto para outro (desvio) e a correlação a 60 px
        linha += f'  {"Resolume" if q == "R" else "OpenLuz "} média {e[m].mean():.4f} máx {np.percentile(e[m], 99):.3f} desvio {e[m].std():.4f} válidos {m.mean():.2f} |'
        np.save(os.path.join(OUT, f'voltas_e_{q}{it}{tag}.npy'), e.astype(np.float32))
    print(linha)
