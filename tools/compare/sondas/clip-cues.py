import sys; sys.path.insert(0, sys.argv[1]); from clip_sonda import *
S = sys.argv[1]
B = (786, 520, 1182, 780)
direction('||'); setpos(15000)
click(808, 734); print('clique na setinha do cue 1 (agulha em 15 s):', pos()); grab(S + '/p5-a.png', B, 3)
setpos(5000); click(840, 734); print('clique no botão grande do cue 1:', pos())
setpos(22000); click(898, 734); print('clique no botão grande do cue 2 (vazio):', pos()); grab(S + '/p5-b.png', B, 3)
setpos(3000); click(808, 734); print('setinha do cue 1 de novo (agulha em 3 s):', pos()); click(840, 734); print('  e pular:', pos())
click(840, 734, right=True); grab(S + '/p5-c.png', (786, 520, 1400, 900), 2); key(0x1B)
