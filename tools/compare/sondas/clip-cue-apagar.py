# Sonda: como se apaga um Cue Point no Resolume? Tenta Shift, Ctrl e Alt + clique, e clique duplo, no botão do cue 1.
# Coordenadas da janela em 1577×922 com a aba Clip aberta e Cue Points desdobrado (ver clip-transport.py).
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from clip_sonda import *
XS, XJ, Y = 808, 840, 734
def aceso():
    mv(900, 660); time.sleep(0.3)
    px = ImageGrab.grab(bbox=(r.left + XS - 4, r.top + Y - 2, r.left + XS + 2, r.top + Y + 2), all_screens=True).convert('RGB').getpixel((2, 2))
    return px[1] > 180 and px[0] < 180, px
def com(vk, fn):
    u.keybd_event(vk, 0, 0, 0); time.sleep(0.1); fn(); time.sleep(0.1); u.keybd_event(vk, 0, 2, 0); time.sleep(0.3)
direction('||'); setpos(15000)
print('antes:', aceso())
if not aceso()[0]: click(XS, Y); print('gravei o cue 1:', aceso())
for nome, vk in (('Shift', 0x10), ('Ctrl', 0x11), ('Alt', 0x12)):
    com(vk, lambda: click(XJ, Y)); a = aceso(); print(nome + ' + clique no botão:', a)
    if not a[0]: click(XS, Y)
    com(vk, lambda: click(XS, Y)); a = aceso(); print(nome + ' + clique na setinha:', a)
    if not a[0]: click(XS, Y)
click(XS, Y, n=2); print('clique duplo na setinha:', aceso(), pos())
grab(os.path.join(os.environ.get('TEMP', '.'), 'cue-fim.png'), (786, 660, 1182, 780), 3)
