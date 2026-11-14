# Gabarito: fotografa a saída do Resolume para cada efeito de vídeo, no padrão e com cada controle em vários
# valores, sobre a carta de prova. Com o gabarito no disco dá para igualar um efeito do OpenLuz sem o Resolume aberto.
# Uso: py tools/compare/gabarito.py [efeito ...]        (sem nomes: todos; pula os que já têm casos.json)
#      REFAZER=1 refaz os que já existem.
# Sai em tools/compare/saida/ref/<efeito>/: <caso>.png (960x540) e casos.json
#   casos.json = { efeito, clip, params: {nome: ficha}, casos: [{ arquivo, valores, anima, igual_ao_padrao, media }] }
# Precisa do Resolume com servidor web (8080) e Spout na Screen 1. Só usa a API pública; nada do Resolume entra no OpenLuz.
import array, json, os, re, sys, time, urllib.parse, urllib.request

import numpy as np
import SpoutGL
from PIL import Image

API = os.environ.get('RESOLUME_API', 'http://127.0.0.1:8080/api/v1')
AQUI = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(AQUI, 'saida', 'ref')
CARTA = os.path.join(AQUI, 'clips', 'carta.png')
FOTO = os.path.join(AQUI, 'clips', 'rostos.jpg')
NOME = 'Arena - Screen 1'
GL_RGBA = 0x1908


def req(metodo, url, corpo=None):
    dados, cab = None, {}
    if corpo is not None:
        if isinstance(corpo, str):
            dados, cab = corpo.encode(), {'Content-Type': 'text/plain'}
        else:
            dados, cab = json.dumps(corpo).encode(), {'Content-Type': 'application/json'}
    r = urllib.request.urlopen(urllib.request.Request(API + url, data=dados, headers=cab, method=metodo), timeout=20)
    t = r.read().decode('utf-8', 'replace')
    return json.loads(t) if t else None


def efeitos_camada():
    return req('GET', '/composition/layers/1')['video']['effects']


def limpar():
    fx = efeitos_camada()
    for i in range(len(fx), 0, -1):
        if fx[i - 1].get('is_user_removable') is not False:
            req('DELETE', f'/composition/layers/1/effects/video/{i - 1}')


def por(nome):
    limpar()
    req('POST', '/composition/layers/1/effects/video/add', 'effect:///video/' + urllib.parse.quote(nome))
    return efeitos_camada()[-1]


def abrir(arq):
    u = 'file:///' + urllib.parse.quote(os.path.abspath(arq).replace('\\', '/'), safe='/:')
    req('POST', '/composition/layers/1/clips/2/open', u)
    req('POST', '/composition/layers/1/clips/2/connect')


class Spout:
    def __init__(self):
        self.r = SpoutGL.SpoutReceiver()
        self.r.createOpenGL()
        if NOME not in (self.r.getSenderList() or []):
            sys.exit(f'remetente Spout "{NOME}" não existe. Há: {self.r.getSenderList()}')
        self.r.setReceiverName(NOME)
        self.buf = None
        import atexit
        atexit.register(self.fecha)   # sem soltar o receptor, o remetente do Resolume some da lista quando este programa sai

    def fecha(self):
        try:
            self.r.releaseReceiver()
            self.r.closeOpenGL()
        except Exception:
            pass

    def quadro(self, espera=4, limite=6.0):
        r, novos, fim = self.r, 0, time.time() + limite
        while time.time() < fim:
            ok = r.receiveImage(self.buf, GL_RGBA, False, 0)
            if r.isUpdated():
                self.buf = array.array('B', bytes(r.getSenderWidth() * r.getSenderHeight() * 4))
                continue
            if self.buf is not None and ok and r.isFrameNew():
                novos += 1
                if novos > espera:
                    img = np.frombuffer(self.buf, np.uint8).reshape(r.getSenderHeight(), r.getSenderWidth(), 4)
                    im = Image.fromarray(np.ascontiguousarray(img))   # RGBA premultiplicado
                    return im.copy() if os.environ.get('CHEIA') else im.resize((960, 540), Image.BOX)   # CHEIA=1: resolução cheia (grade fina do CRT)
            r.waitFrameSync(NOME, 100)
        raise RuntimeError('o Spout não mandou quadro novo a tempo (Resolume congelou?)')


def dif(a, b):
    return float(np.abs(np.asarray(a.convert('RGB'), np.int16) - np.asarray(b.convert('RGB'), np.int16)).mean())


_MARCA = None


def tem_marca(img):
    """A marca d'água do demo (logotipo do Arena no meio, o resto escurecido) está na imagem?"""
    global _MARCA
    if os.environ.get('SEM_MARCA'):   # efeito que deixa o meio branco (Fragment, Iterate) engana o molde
        return False
    if _MARCA is None:
        arq = os.path.join(REF, '_marca.npy')
        _MARCA = np.load(arq) if os.path.exists(arq) else False
    if _MARCA is False:
        return False
    px = np.asarray(img.convert('RGB'))
    return (px[_MARCA].min(-1) >= 222).mean() > 0.93 and px[~_MARCA].mean() < 225   # 245 deixava passar a marca sobre imagem girada (o A sai um pouco cinza)


def sem_marca(sp, espera=4):
    for _ in range(60):
        img = sp.quadro(espera)
        if not tem_marca(img):
            return img
        time.sleep(0.5)
        espera = 1
    raise RuntimeError("a marca d'água não saiu")


def firme(sp, anima):
    """Captura sem a marca d'água: duas capturas iguais. Devolve (imagem, segunda ou None, mexe?)."""
    a = sem_marca(sp)
    for tent in range(1 if anima else 3):
        time.sleep(0.45)
        b = sem_marca(sp, 1)
        if dif(a, b) < 0.5:
            return a, None, False
        if anima:
            return a, b, True
        a = b
    time.sleep(0.45)
    return a, sem_marca(sp, 1), True


def valores_de(p):
    """Valores a experimentar num controle, fora o padrão."""
    t, v = p.get('valuetype'), p.get('value')
    if t == 'ParamRange':
        lo, hi = p['min'], p['max']
        if hi - lo > 5000:
            cand = [v - 500, v - 100, v + 100, v + 500]
        else:
            cand = [lo, lo + (hi - lo) * 0.25, lo + (hi - lo) * 0.5, lo + (hi - lo) * 0.75, hi]
        fora = []
        for c in cand:
            c = min(hi, max(lo, c))
            if abs(c - v) > 1e-6 * max(1.0, hi - lo) and all(abs(c - f) > 1e-9 for f in fora):
                fora.append(c)
        return fora
    if t == 'ParamBoolean':
        return [not v]
    if t in ('ParamChoice', 'ParamState'):
        ops = [o for o in (p.get('options') or []) if o != v]
        return ops[:14]
    if t == 'ParamColor':
        return [c for c in ('#3366ffff', '#ffffff80', '#000000ff') if c != v][:2]
    return []


def rotulo(nome, v):
    s = ('%g' % v) if isinstance(v, float) else str(v)
    return re.sub(r'[^\w.\-]+', '_', f'{nome}={s}')[:90]


def um_efeito(sp, nome):
    pasta = os.path.join(REF, re.sub(r'[^\w.\- ]+', '_', nome))
    alvo = os.path.join(pasta, 'casos.json')
    if os.path.exists(alvo) and not os.environ.get('REFAZER'):
        return 'já tinha'
    os.makedirs(pasta, exist_ok=True)
    abrir(CARTA)
    posto = por(nome)
    params = {k: p for k, p in posto['params'].items() if k != 'Opacity' and isinstance(p, dict) and 'valuetype' in p}
    casos = []

    def salva(arq, valores, anima, extra=None):
        img, b, mexe = firme(sp, anima)
        img.save(os.path.join(pasta, arq + '.png'))
        if b is not None:
            b.save(os.path.join(pasta, arq + '.b.png'))
        c = {'arquivo': arq + '.png', 'valores': valores, 'anima': mexe, 'media': round(float(np.asarray(img.convert('RGB')).mean()), 2)}
        c.update(extra or {})
        casos.append(c)
        return img, mexe

    time.sleep(0.6)
    padrao, anima = salva('padrao', {}, False)
    for k, p in params.items():
        vs = valores_de(p)
        if not vs:
            continue
        for v in vs:
            try:
                req('PUT', f"/parameter/by-id/{p['id']}", {'value': v})
            except Exception as e:
                casos.append({'valores': {k: v}, 'erro': str(e)[:200]})
                continue
            img, _ = salva(rotulo(k, v), {k: v}, anima)
            casos[-1]['igual_ao_padrao'] = (not anima) and dif(img, padrao) < 0.3
        try:
            req('PUT', f"/parameter/by-id/{p['id']}", {'value': p['value']})
        except Exception:
            pass
    # o padrão sobre uma foto de verdade
    abrir(FOTO)
    time.sleep(0.8)
    salva('padrao-foto', {}, anima, {'clip': 'rostos.jpg'})
    ficha = {k: {x: p.get(x) for x in ('valuetype', 'min', 'max', 'value', 'options') if p.get(x) is not None} for k, p in params.items()}
    json.dump({'efeito': nome, 'clip': 'carta.png', 'params': ficha, 'casos': casos}, open(alvo, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return f'{len(casos)} casos' + (' (mexe sozinho)' if anima else '')


def reparar(sp):
    """Refaz os casos marcados "mexe" em efeito que no padrão fica parado: quase sempre é a marca d'água entrando ou saindo."""
    for pasta in sorted(os.listdir(REF)):
        alvo = os.path.join(REF, pasta, 'casos.json')
        if not os.path.exists(alvo):
            continue
        g = json.load(open(alvo, encoding='utf-8'))
        casos = g['casos']
        if not casos or casos[0].get('anima'):
            continue
        ruins = [c for c in casos[1:] if c.get('anima') and c.get('arquivo')]
        if not ruins:
            continue
        abrir(CARTA)
        posto = por(g['efeito'])
        time.sleep(0.6)
        padrao = Image.open(os.path.join(REF, pasta, 'padrao.png'))
        ainda = 0
        for c in ruins:
            if c.get('clip'):
                abrir(FOTO)
                time.sleep(0.8)
            for k, v in c['valores'].items():
                req('PUT', f"/parameter/by-id/{posto['params'][k]['id']}", {'value': v})
            time.sleep(2.5)
            img, b, mexe = firme(sp, False)
            img.save(os.path.join(REF, pasta, c['arquivo']))
            bb = os.path.join(REF, pasta, c['arquivo'][:-4] + '.b.png')
            if os.path.exists(bb) and not mexe:
                os.remove(bb)
            c['anima'] = mexe
            c['media'] = round(float(np.asarray(img.convert('RGB')).mean()), 2)
            if c['valores']:
                c['igual_ao_padrao'] = (not mexe) and dif(img, padrao) < 0.3
            ainda += mexe
            for k in c['valores']:
                req('PUT', f"/parameter/by-id/{posto['params'][k]['id']}", {'value': posto['params'][k]['value']})
            if c.get('clip'):
                abrir(CARTA)
        json.dump(g, open(alvo, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f"{g['efeito']}: {len(ruins)} refeitos, {ainda} mexem de verdade", flush=True)
    limpar()


def main():
    if os.environ.get('REPARAR'):
        return reparar(Spout())
    nomes = sys.argv[1:] or [e['name'] for e in req('GET', '/effects')['video']]
    os.makedirs(REF, exist_ok=True)
    sp = Spout()
    abrir(CARTA)
    limpar()
    time.sleep(1)
    sem_marca(sp).save(os.path.join(REF, 'carta-sem-efeito.png'))
    t0 = time.time()
    for i, n in enumerate(nomes):
        try:
            r = um_efeito(sp, n)
        except Exception as e:
            r = 'ERRO ' + str(e)[:200]
            if 'Spout' in r or 'refused' in r or 'timed out' in r:
                print(f'[{i + 1}/{len(nomes)}] {n}: {r}', flush=True)
                sys.exit(2)
        print(f'[{i + 1}/{len(nomes)}] {n}: {r}  ({int(time.time() - t0)} s)', flush=True)
    limpar()
    abrir(CARTA)


if __name__ == '__main__':
    main()
