# Sonda da aba Clip do Resolume: mouse de verdade na janela + leitura pela API REST. Só observa o comportamento.
import ctypes, ctypes.wintypes as w, time, sys, json, urllib.request
from PIL import ImageGrab, Image
u = ctypes.windll.user32
try: ctypes.windll.shcore.SetProcessDpiAwareness(2)
except Exception: pass
API = 'http://127.0.0.1:8080/api/v1'; CLIP = '/composition/layers/1/clips/1'
def get(p=CLIP): return json.load(urllib.request.urlopen(API + p))
def put(body, p=CLIP):
    r = urllib.request.Request(API + p, data=json.dumps(body).encode(), method='PUT', headers={'Content-Type': 'application/json'}); urllib.request.urlopen(r).read()
def pos():
    t = get()['transport']['position']; return round(t['value'], 1), round(t['in'], 1), round(t['out'], 1)
def setpos(ms): put({'transport': {'position': {'value': ms}}}); time.sleep(0.3)
def direction(d): put({'transport': {'controls': {'playdirection': {'value': d}}}}); time.sleep(0.3)
found = []
@ctypes.WINFUNCTYPE(ctypes.c_bool, w.HWND, w.LPARAM)
def cb(h, l):
    n = u.GetWindowTextLengthW(h)
    if n and u.IsWindowVisible(h):
        b = ctypes.create_unicode_buffer(n + 1); u.GetWindowTextW(h, b, n + 1)
        if b.value.startswith('Resolume Arena - '): found.append(h)
    return True
u.EnumWindows(cb, 0); h = found[0]
def front():
    for _ in range(4):
        fg = u.GetForegroundWindow(); me = ctypes.windll.kernel32.GetCurrentThreadId(); t1 = u.GetWindowThreadProcessId(fg, None); t2 = u.GetWindowThreadProcessId(h, None)
        u.keybd_event(0x12, 0, 0, 0); u.keybd_event(0x12, 0, 2, 0)
        u.AttachThreadInput(me, t1, True); u.AttachThreadInput(t2, t1, True); u.BringWindowToTop(h); u.SetForegroundWindow(h); u.AttachThreadInput(t2, t1, False); u.AttachThreadInput(me, t1, False)
        time.sleep(0.8)
        if u.GetForegroundWindow() == h: return
    print('o Resolume não ficou na frente'); sys.exit(2)
front(); r = w.RECT(); u.GetWindowRect(h, ctypes.byref(r))
def mv(x, y): u.SetCursorPos(r.left + int(x), r.top + int(y)); time.sleep(0.12)
def click(x, y, right=False, n=1):
    mv(x, y)
    for _ in range(n):
        u.mouse_event(8 if right else 2, 0, 0, 0, 0); time.sleep(0.06); u.mouse_event(16 if right else 4, 0, 0, 0, 0); time.sleep(0.09)
    time.sleep(0.5)
def drag(x0, y0, x1, y1, steps=10):
    mv(x0, y0); u.mouse_event(2, 0, 0, 0, 0); time.sleep(0.1)
    for i in range(1, steps + 1): mv(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps)
    time.sleep(0.15); u.mouse_event(4, 0, 0, 0, 0); time.sleep(0.5)
def key(vk): u.keybd_event(vk, 0, 0, 0); time.sleep(0.05); u.keybd_event(vk, 0, 2, 0); time.sleep(0.4)
def grab(name, box=(470, 408, 780, 1000), z=2):
    im = ImageGrab.grab(bbox=(r.left + box[0], r.top + box[1], r.left + box[2], r.top + box[3]), all_screens=True)
    if z != 1: im = im.resize((im.width * z, im.height * z), Image.LANCZOS)
    im.save(name); return im
