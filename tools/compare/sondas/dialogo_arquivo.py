# Sonda do plano 07-08: digita um caminho num diálogo de arquivo do Windows já aberto (pelo título) e confirma com Enter.
# O caminho vai pela área de transferência (Ctrl+V); a área de transferência anterior, se era texto, é devolvida no fim.
# Uso: py tools/compare/sondas/dialogo_arquivo.py "Load Image" C:\caminho\arquivo.png
import ctypes, ctypes.wintypes as w, subprocess, sys, time
u = ctypes.windll.user32
alvo, caminho = sys.argv[1], sys.argv[2]
found = []
@ctypes.WINFUNCTYPE(ctypes.c_bool, w.HWND, w.LPARAM)
def cb(h, l):
    n = u.GetWindowTextLengthW(h)
    if n and u.IsWindowVisible(h):
        b = ctypes.create_unicode_buffer(n + 1); u.GetWindowTextW(h, b, n + 1)
        if b.value.startswith(alvo): found.append(h)
    return True
u.EnumWindows(cb, 0)
if not found: print('diálogo não achado:', alvo); sys.exit(1)
h = found[0]
def poe(t): subprocess.run(['powershell', '-NoProfile', '-Command', "Set-Clipboard -Value '" + t.replace("'", "''") + "'"], check=True)
antes = subprocess.run(['powershell', '-NoProfile', '-Command', 'Get-Clipboard -Raw'], capture_output=True, text=True).stdout
poe(caminho)
u.keybd_event(0x12, 0, 0, 0); u.keybd_event(0x12, 0, 2, 0); u.SetForegroundWindow(h); time.sleep(0.8)
if u.GetForegroundWindow() != h: print('o diálogo não ficou na frente'); sys.exit(2)
def tecla(v, mod=None):
    if mod: u.keybd_event(mod, 0, 0, 0)
    u.keybd_event(v, 0, 0, 0); u.keybd_event(v, 0, 2, 0)
    if mod: u.keybd_event(mod, 0, 2, 0)
    time.sleep(0.3)
tecla(0x41, 0x11); tecla(0x56, 0x11); time.sleep(0.4); tecla(0x0D); time.sleep(1.5)
if antes.strip(): poe(antes.rstrip('\r\n'))
print('ok')
