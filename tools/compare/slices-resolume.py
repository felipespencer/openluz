# Escreve a Saída avançada do Resolume com várias slices (entrada = saída), para medir efeitos que dependem das slices.
# Uso: py tools/compare/slices-resolume.py <layout>      layouts: 4 (tamanhos, lugares e nomes diferentes), 2, 9, original
# Guarda a cópia do arquivo original em tools/compare/saida/AdvancedOutput.original.xml na primeira vez.
# Só com o Arena fechado: ele lê o arquivo ao abrir e grava ao sair.
import os, re, shutil, sys

ARQ = os.path.expandvars(r'%USERPROFILE%\OneDrive\Documentos\Resolume Arena\Preferences\AdvancedOutput.xml')
AQUI = os.path.dirname(os.path.abspath(__file__))
COPIA = os.path.join(AQUI, 'saida', 'AdvancedOutput.original.xml')

LAYOUTS = {
    # nome, x, y, w, h — ordens todas diferentes: X 3,1,2,0  Y 2,3,0,1  área 2,1,0,3  largura 2,3,1,0  altura 1,0,2,3  nome 2,0,3,1
    '4': [('B', 1200, 600, 600, 420), ('D', 100, 640, 560, 400), ('A', 700, 50, 400, 500), ('C', 50, 80, 500, 550)],
    '2': [('Esq', 0, 0, 960, 1080), ('Dir', 960, 0, 960, 1080)],
    '9': [(f'S{f * 3 + c + 1}', c * 640, f * 360, 640, 360) for f in range(3) for c in range(3)],
}


def v(x, y): return f'<v x="{x:g}" y="{y:g}"/>'


def quad(x, y, w, h, tab):
    return ''.join(f'\n{tab}' + v(a, b) for a, b in ((x, y), (x + w, y), (x + w, y + h), (x, y + h)))


def slice_xml(i, nome, x, y, w, h):
    t = '\t' * 5
    grade = ''.join(f'\n{t}\t\t\t\t' + v(x + w * c / 3, y + h * f / 3) for f in range(4) for c in range(4))
    return f'''{t[:-1]}<Slice uniqueId="{1792956712782 + i * 101}">
{t}<Params name="Common">
{t}\t<Param name="Name" T="STRING" default="Layer" value="{nome}"/>
{t}</Params>
{t}<InputRect orientation="0">{quad(x, y, w, h, t + chr(9))}
{t}</InputRect>
{t}<OutputRect orientation="0">{quad(x, y, w, h, t + chr(9))}
{t}</OutputRect>
{t}<Warper>
{t}\t<BezierWarper controlWidth="4" controlHeight="4">
{t}\t\t<vertices>{grade}
{t}\t\t</vertices>
{t}\t</BezierWarper>
{t}\t<Homography>
{t}\t\t<src>{quad(x, y, w, h, t + chr(9) * 3)}
{t}\t\t</src>
{t}\t\t<dst>{quad(x, y, w, h, t + chr(9) * 3)}
{t}\t\t</dst>
{t}\t</Homography>
{t}</Warper>
{t[:-1]}</Slice>
'''


def main():
    alvo = sys.argv[1]
    if not os.path.exists(COPIA):
        os.makedirs(os.path.dirname(COPIA), exist_ok=True); shutil.copyfile(ARQ, COPIA)
    if alvo == 'original':
        shutil.copyfile(COPIA, ARQ); print('original de volta'); return
    s = open(COPIA, encoding='utf-8').read()
    novo = ''.join(slice_xml(i, *sl) for i, sl in enumerate(LAYOUTS[alvo]))
    s2, n = re.subn(r'(<layers>\r?\n).*?(\r?\n\t\t\t</layers>)', lambda m: m.group(1) + novo.rstrip('\n') + m.group(2), s, count=1, flags=re.S)
    assert n == 1, 'não achei <layers>'
    open(ARQ, 'w', encoding='utf-8', newline='').write(s2)
    print(f'{len(LAYOUTS[alvo])} slices escritas')


main()
