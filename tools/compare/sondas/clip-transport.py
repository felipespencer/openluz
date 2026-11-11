import sys; sys.path.insert(0, sys.argv[1]); from clip_sonda import *
import numpy as np
S = sys.argv[1]
YW, YB = 568, 588
def sdrag(x0, y0, x1, y1, steps=24, hold=0.25):
    mv(x0 - 3, y0); time.sleep(0.2); mv(x0, y0); time.sleep(0.25); u.mouse_event(2, 0, 0, 0, 0); time.sleep(hold)
    for i in range(1, steps + 1): mv(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps); time.sleep(0.03)
    time.sleep(0.3); u.mouse_event(4, 0, 0, 0, 0); time.sleep(0.5)
def sclick(x, y):
    mv(x - 3, y); time.sleep(0.2); mv(x, y); time.sleep(0.25); u.mouse_event(2, 0, 0, 0, 0); time.sleep(0.25); u.mouse_event(4, 0, 0, 0, 0); time.sleep(0.5)
def agulha():
    mv(900, 520); time.sleep(0.2)
    im = np.asarray(ImageGrab.grab(bbox=(r.left + 790, r.top + 556, r.left + 1180, r.top + 578), all_screens=True).convert('RGB')).astype(int)
    m = (abs(im[:, :, 0] - 77) < 30) & (abs(im[:, :, 1] - 153) < 35) & (abs(im[:, :, 2] - 128) < 35)
    xs = np.where(m.sum(0) >= 6)[0]
    return (790 + xs.min() + 790 + xs.max()) / 2 if len(xs) else None
direction('||')
setpos(0); x0 = agulha(); setpos(30000); x1 = agulha(); print('agulha 0% e 100%:', x0, x1)
X = lambda f: x0 + f * (x1 - x0)
setpos(15000)
sclick(X(0.25), YW); print('clique na onda 25%:', pos())
sclick(X(0.60), YB); print('clique na barra 60%:', pos())
setpos(15000)
sdrag(X(0.5), YW, X(0.8), YW); print('arrasto da agulha 50→80%:', pos())
sdrag(X(0.2), YW, X(0.3), YW); print('arrasto de fora 20→30%:', pos())
sdrag(X(0.6), YB, X(0.9), YB); print('arrasto na barra 60→90%:', pos())
setpos(15000)
sdrag(x0 - 3, YB, X(0.30), YB); print('IN → 30%:', pos())
sdrag(x1 + 3, YB, X(0.70), YB); print('OUT → 70%:', pos())
grab(S + '/p4-a.png', (786, 520, 1182, 620), 3)
p = pos(); fi, fo = p[1] / 30000, p[2] / 30000
sdrag(X(fi) - 3, YB, X(0.60), YB); print('IN → 60% (passa pela agulha em 50%):', pos())
sdrag(X(pos()[1] / 30000) - 3, YB, X(0.20), YB); print('IN → 20%:', pos())
sdrag(X(pos()[2] / 30000) + 3, YB, X(0.40), YB); print('OUT → 40% (passa pela agulha):', pos())
sdrag(X(pos()[1] / 30000) - 3, YB, X(0.55), YB); print('IN → 55% (passaria do OUT em 40%):', pos())
grab(S + '/p4-b.png', (786, 520, 1182, 620), 3)
# clique duplo e botão direito na entrada
click(X(pos()[1] / 30000) - 3, YB, n=2); print('duplo clique no IN:', pos())
click(X(0.5), YW, right=True); grab(S + '/p4-c.png', (786, 430, 1300, 900), 2); key(0x1B)
