# Traz uma janela do Resolume pelo começo do título, faz ações e fotografa SÓ ela.
# Uso: python janela.py "Advanced Output" saida.png [ação ...]
#   x y          clique esquerdo (coordenadas da janela)
#   r x y        clique direito
#   k TECLA      tecla virtual (hex ou nome: esc, enter, down, up)
#   w SEG        espera
#   sel          com o ponto seguinte, só move o mouse (passar por cima de submenu): m x y
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
KEYS = {'esc': 0x1B, 'enter': 0x0D, 'down': 0x28, 'up': 0x26, 'right': 0x27, 'left': 0x25}
def mv(x, y): u.SetCursorPos(r.left + int(float(x)), r.top + int(float(y))); time.sleep(0.25)
i = 0
while i < len(args):
    a = args[i]
    if a == 'r': mv(args[i+1], args[i+2]); u.mouse_event(8, 0, 0, 0, 0); time.sleep(0.08); u.mouse_event(16, 0, 0, 0, 0); time.sleep(0.8); i += 3
    elif a == 'm': mv(args[i+1], args[i+2]); time.sleep(0.6); i += 3
    elif a == 'k': v = KEYS.get(args[i+1]) or int(args[i+1], 16); u.keybd_event(v, 0, 0, 0); u.keybd_event(v, 0, 2, 0); time.sleep(0.5); i += 2
    elif a == 'w': time.sleep(float(args[i+1])); i += 2
    else: mv(a, args[i+1]); u.mouse_event(2, 0, 0, 0, 0); time.sleep(0.08); u.mouse_event(4, 0, 0, 0, 0); time.sleep(0.7); i += 2
# fotografa a janela com uma folga embaixo e à direita, para o menu que abrir para fora dela
ImageGrab.grab(bbox=(r.left, r.top, r.right + 300, r.bottom + 200), all_screens=True).save(png)
print('ok', found[0][1], (r.left, r.top, r.right, r.bottom))
