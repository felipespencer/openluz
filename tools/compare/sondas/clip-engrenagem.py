# Sonda: a engrenagem que aparece ao lado de um parâmetro do Resolume quando o mouse passa por cima, e o que ela abre.
# Uso: python clip-engrenagem.py <pasta de saída> passo [x y]   (janela em 1577×922; ver clip-transport.py)
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from clip_sonda import *
S, passo = sys.argv[1], sys.argv[2]
args = [float(a) for a in sys.argv[3:]]
FULL = (0, 0, 1577, 922)
if passo == 'pairar':      # só passa o mouse na linha e fotografa
    mv(args[0], args[1]); time.sleep(0.8); grab(S + '/eng-pairar.png', (398, 430, 1180, 890), 2)
elif passo == 'clicar':    # passa o mouse, clica no ponto e fotografa a janela inteira
    mv(args[0] - 30, args[1]); time.sleep(0.5); click(args[0], args[1]); time.sleep(0.6); grab(S + '/eng-' + sys.argv[5] + '.png', FULL, 1)
elif passo == 'so-clicar':
    click(args[0], args[1]); time.sleep(0.6); grab(S + '/eng-' + sys.argv[5] + '.png', FULL, 1)
elif passo == 'esc':
    key(0x1B); grab(S + '/eng-esc.png', FULL, 1)
