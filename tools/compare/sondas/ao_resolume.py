# Sonda do plano 07-03: percorre a Advanced Output do Resolume com mouse e teclado reais e fotografa só a janela dela.
# É o tools/compare/janela.py com mais gestos. Só comportamento observado na tela; nada de arquivo do Resolume além do
# AdvancedOutput.xml das preferências do usuário (guardado antes em tools/compare/saida/ao-resolume/).
# Uso: py tools/compare/sondas/ao_resolume.py "Advanced Output" saida.png [ação ...]
#   x y | r x y | m x y | dc x y | k TECLA | t TEXTO | ca | w SEG | box x0 y0 x1 y1      (como no janela.py)
#   d x0 y0 x1 y1          arrasta com o botão esquerdo, em passos
#   md MOD x0 y0 x1 y1     arrasta segurando shift, ctrl ou alt
#   mk MOD TECLA           tecla com modificador (ex.: mk ctrl 5A = Ctrl+Z)
#   wh x y CLIQUES         roda do mouse (negativo desce);  mwh MOD x y CLIQUES com modificador
#   foto ARQ.png           fotografa no meio do roteiro (a foto final continua sendo a do segundo argumento)
import ctypes, ctypes.wintypes as w, time, sys
from PIL import ImageGrab
u = ctypes.windll.user32
try: ctypes.windll.shcore.SetProcessDpiAwareness(2)
except Exception: pass
alvo, png, args = sys.argv[1], sys.argv[2], sys.argv[3:]
found = []
@ctypes.WINFUNCTYPE(ctypes.c_bool, w.HWND, w.LPARAM)
def cb(h, l):
    n = u.GetWindowTextLengthW(h)
    if n:
        b = ctypes.create_unicode_buffer(n + 1); u.GetWindowTextW(h, b, n + 1)
        if b.value.startswith(alvo): found.append((h, b.value))
    return True
u.EnumWindows(cb, 0)
if not found: print('janela não achada:', alvo); sys.exit(1)
h = found[0][0]
if not u.IsWindowVisible(h): print('janela escondida:', alvo); sys.exit(3)
u.ShowWindow(h, 9)
fg = u.GetForegroundWindow(); me = ctypes.windll.kernel32.GetCurrentThreadId(); t1 = u.GetWindowThreadProcessId(fg, None); t2 = u.GetWindowThreadProcessId(h, None)
u.keybd_event(0x12, 0, 0, 0); u.keybd_event(0x12, 0, 2, 0)
u.AttachThreadInput(me, t1, True); u.AttachThreadInput(t2, t1, True); u.BringWindowToTop(h); u.SetForegroundWindow(h); u.AttachThreadInput(t2, t1, False); u.AttachThreadInput(me, t1, False)
time.sleep(1.0)
r = w.RECT(); u.GetWindowRect(h, ctypes.byref(r))
MODS = {'shift': 0x10, 'ctrl': 0x11, 'alt': 0x12}
KEYS = {'esc': 0x1B, 'enter': 0x0D, 'down': 0x28, 'up': 0x26, 'right': 0x27, 'left': 0x25, 'del': 0x2E, 'tab': 0x09}
def mv(x, y): u.SetCursorPos(r.left + int(float(x)), r.top + int(float(y))); time.sleep(0.25)
i = 0
BOX = None
while i < len(args):
    a = args[i]
    if a == 'r': mv(args[i+1], args[i+2]); u.mouse_event(8, 0, 0, 0, 0); time.sleep(0.08); u.mouse_event(16, 0, 0, 0, 0); time.sleep(0.8); i += 3
    elif a == 'm': mv(args[i+1], args[i+2]); time.sleep(0.6); i += 3
    elif a == 'k': v = KEYS.get(args[i+1]) or int(args[i+1], 16); u.keybd_event(v, 0, 0, 0); u.keybd_event(v, 0, 2, 0); time.sleep(0.5); i += 2
    elif a == 'w': time.sleep(float(args[i+1])); i += 2
    elif a == 't':   # digita números (e - .)
        for ch in args[i+1]:
            v = {'-': 0xBD, '.': 0xBE}.get(ch) or ord(ch)
            u.keybd_event(v, 0, 0, 0); u.keybd_event(v, 0, 2, 0); time.sleep(0.05)
        time.sleep(0.3); i += 2
    elif a == 'ca': u.keybd_event(0x11, 0, 0, 0); u.keybd_event(0x41, 0, 0, 0); u.keybd_event(0x41, 0, 2, 0); u.keybd_event(0x11, 0, 2, 0); time.sleep(0.3); i += 1
    elif a == 'dc': mv(args[i+1], args[i+2]); [ (u.mouse_event(2,0,0,0,0), u.mouse_event(4,0,0,0,0), time.sleep(0.06)) for _ in range(2) ]; time.sleep(0.5); i += 3
    elif a in ('d', 'md'):
        mod = MODS[args[i+1]] if a == 'md' else None; o = i + (2 if a == 'md' else 1); x0, y0, x1, y1 = [float(q) for q in args[o:o+4]]
        if mod: u.keybd_event(mod, 0, 0, 0); time.sleep(0.1)
        mv(x0, y0); u.mouse_event(2, 0, 0, 0, 0); time.sleep(0.15)
        for k in range(1, 13): u.SetCursorPos(r.left + int(x0 + (x1 - x0) * k / 12), r.top + int(y0 + (y1 - y0) * k / 12)); time.sleep(0.04)
        time.sleep(0.2); u.mouse_event(4, 0, 0, 0, 0); time.sleep(0.2)
        if mod: u.keybd_event(mod, 0, 2, 0)
        time.sleep(0.5); i = o + 4
    elif a == 'mk':   # as setas vão com a marca de tecla estendida: sem ela, Shift+seta vira o teclado numérico e o Windows solta o Shift
        mod = MODS[args[i+1]]; v = KEYS.get(args[i+2]) or int(args[i+2], 16); ext = 1 if v in (0x25, 0x26, 0x27, 0x28, 0x2E) else 0
        u.keybd_event(mod, 0, 0, 0); time.sleep(0.1); u.keybd_event(v, 0, ext, 0); u.keybd_event(v, 0, ext | 2, 0); time.sleep(0.1); u.keybd_event(mod, 0, 2, 0); time.sleep(0.5); i += 3
    elif a in ('wh', 'mwh'):
        mod = MODS[args[i+1]] if a == 'mwh' else None; o = i + (2 if a == 'mwh' else 1)
        mv(args[o], args[o+1])
        if mod: u.keybd_event(mod, 0, 0, 0); time.sleep(0.1)
        u.mouse_event(0x0800, 0, 0, int(float(args[o+2])) * 120, 0); time.sleep(0.3)
        if mod: u.keybd_event(mod, 0, 2, 0)
        time.sleep(0.5); i = o + 3
    elif a == 'foto': ImageGrab.grab(bbox=(r.left, r.top, r.right, r.bottom), all_screens=True).save(args[i+1]); i += 2
    elif a == 'box': BOX = tuple(int(float(x)) for x in args[i+1:i+5]); i += 5
    else: mv(a, args[i+1]); u.mouse_event(2, 0, 0, 0, 0); time.sleep(0.08); u.mouse_event(4, 0, 0, 0, 0); time.sleep(0.7); i += 2
# fotografa a janela com uma folga embaixo e à direita, para o menu que abrir para fora dela
if BOX: ImageGrab.grab(bbox=(r.left + BOX[0], r.top + BOX[1], r.left + BOX[2], r.top + BOX[3]), all_screens=True).save(png)
else: ImageGrab.grab(bbox=(r.left, r.top, r.right, r.bottom), all_screens=True).save(png)
print('ok', found[0][1], (r.left, r.top, r.right, r.bottom))
