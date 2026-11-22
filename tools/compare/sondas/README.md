# Sondas de medição no Resolume (só o Resolume, pelo Spout)

Scripts usados para descobrir o comportamento de cada efeito antes de escrever o nosso. Todos leem a saída
"Arena - Screen 1" pelo Spout; os que disparam clipe usam a API REST (porta 8080). Uso: `py tools/compare/sondas/<x>.py ...`.

| Script | O que mede |
|---|---|
| `sonda.py N [casa]` | depois de 5 quadros dispara a casa (padrão 3) da camada 1 e imprime, por quadro, 4 pixels (quadrados A/B/C e laranjas); só quando muda |
| `sonda2.py N` | x mínimo do quadrado branco em cada canal R, G, B por quadro (Delay RGB) |
| `lag.py N` | média do atraso em px entre os canais R e G e a taxa de passos do quadrado |
| `pixel.py N x y` | valor RGB de um pixel por quadro (decaimento do Trails) |
| `veloc.py N` | posição do quadrado por quadro com o relógio |
| `cap_rgba.py rotulo` | pixels com o canal alfa (o Spout entrega RGBA premultiplicado) |
| `caixas.py captura.png` | caixa do quadrado branco por canal numa captura |

## Strokes (plano 02-12)

O Strokes é sorteado e tem memória: não se compara por pixel. As sondas medem estatística e comportamento no tempo.
Imagens de prova: `py tools/compare/clips/gera-strokes.py` (`clips/stk-*.png`).

| Script | O que faz |
|---|---|
| `strokes_lib.py` | partes comuns: API REST (efeito na camada 1), abrir imagem na casa 2, medida das manchas (comprimento e largura "4 sigma", ângulo) |
| `strokes_tempo.py rot seg [Controle=valor ...]` | rajada de quadros do Resolume pelo Spout (só guarda quando a imagem muda); `RESET=1`, `PASSO`, `COR=1`, `MUDA` |
| `strokes_tempo_le.py rot ...` | resumo de uma rajada sobre branco: quadros por segundo, fator de escurecimento por quadro, área nova por quadro |
| `strokes_trilha.py rot ...` | com Feedback 1: para onde e quanto o fundo anda por quadro (Flow) |
| `strokes_cor.py rot ...` | cor da pincelada contra a cor da imagem no lugar (a mistura com o fundo) |
| `strokes_r.py rot [Controle=valor ...]` | uma foto com as pinceladas paradas (Frequency 0, Feedback 0) e a medida |
| `strokes_presets.py` | lê os seis presets pela API → `saida/stk/presets.json` |
| `strokes_pincel.py [previa.png]` | o pincel do OpenLuz: tabelas dos fios para o shader e medidas do quadrado |
| `strokes_o.mjs rot imagem [Controle=valor ...]` | o lado do OpenLuz: mesmos valores (nomes do Resolume), guarda quadros do motor |
| `strokes_cmp.py [caso ...]` | a mesma medida nos dois programas, tabela com a folga de cada uma (`saida/stk/cmp.json`) |
| `strokes_folha.py [imagem ...]` | folha lado a lado do padrão e dos seis presets (`saida/conf/Strokes/_presets-*.png`) |

O que saiu: rodadas (Frequency por segundo ou por minuto), fundo × raiz(1 − (1 − Feedback)²) por quadro, pincelada em "luz dura" sobre o
fundo, direção pelo gradiente do brilho desfocado (raio 5 + 101 × Swirl px), Flow empurra o fundo ao longo das bordas, tamanho
169,5 px × |Size + Variation × sorteio normal|, modo Brightness × (0,1 + 0,9 × maior canal). A marca d'água do demo estraga rajadas
(vêm com dezenas de quadros em vez de uns oito): repetir.
