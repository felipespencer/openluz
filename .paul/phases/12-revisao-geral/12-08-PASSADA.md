---
description: "Pente fino por uso (12-08): show de mentira com mouse e teclado reais, achados novos e lista única com o que sobrou do 12-01"
type: Findings
about: "OpenLuz"
---

# 12-08 — Pente fino por uso

Feito em 2026-11-13/14 no OpenLuz de desenvolvimento (branch `efeitos-resolume`, commit `311c476`), janela de 1584×861, com um
segundo monitor em pé ligado. Roteiro: `node tools/show-passada.mjs` (fotos e `passos.json` em `tools/compare/saida/passada/`,
fora do git). Tudo por `Input.dispatchMouseEvent`, `dispatchKeyEvent` e arrastar-e-soltar interceptado do Chromium; nenhum
`.click()`. **Nenhum arquivo do programa foi alterado.**

## 1. O que foi usado e funcionou

Rodada inteira do zero: 15 passos, nenhum falhou, nenhuma exceção nem `console.error` na página. Cada passo rodou pelo menos
duas vezes (uma avulsa, uma na rodada inteira); a rodada inteira do zero rodou **uma** vez, não duas como o plano pedia.

- **Grade**: fonte por duplo clique na casa selecionada e por arrasto; GIF e vídeo arrastados da aba Arquivos.
- **Disparo**: clique na casa, ▶ da coluna, ✕ da camada, ■ ‖ ▶ do transporte, |◀ ▶| da camada.
- **Camadas**: B (bypass), S (solo), faders M e V, bus A/B.
- **Crossfader, BPM, decks**: arrasto do crossfader (0 → 0,9 → 0), botões A e B; TAP (5 toques a ~0,6 s deram 100,2), /2, ×2, +1,
  digitar 128; deck novo e voltar.
- **Desfazer**: Ctrl+Z e Ctrl+Y devolvem casa e bypass (o que é salvo fica igual, campo a campo).
- **Efeitos**: busca na lista, duplo clique, arrasto para a casa e para "Solte outro efeito aqui", − do parâmetro, digitar valor
  com ponto e com vírgula, ▲ (subir), ✕ (tirar), Ctrl+Z.
- **Painel Clipe**: Velocidade, estilo Piano, Opacidade, Posição X.
- **Saída avançada**: abrir, arrastar canto na aba Entrada, Ctrl+Z lá dentro, aba Saída, arrastar na aba Saída.
- **Gravar**: REC ligou, contou o tempo, e a gravação virou clipe na camada 1, coluna 4.
- **Salvar e reabrir**: Salvar como…, fechar o programa, abrir, duplo clique na composição: voltou igual campo a campo, menos o
  que estava no ar (achado N4).

Não foi usado nesta passada: texto e editor de texto, câmera, 3D, IA, Autopilot, grupos, máscaras e soft edge da Saída
avançada, presets, atalhos, laser, APC40, celular, webcam virtual, janela de saída num projetor. O plano pedia câmera de
mentira, texto, autopilot, máscara e soft edge: **ficaram de fora** (o roteiro tem o esqueleto para acrescentar).

## 2. Achados novos (cada um repetido)

| # | O que eu fiz | Esperava | Aconteceu | Prova | Tipo |
|---|---|---|---|---|---|
| N1 | Aba Efeitos, mouse sobre um efeito de descrição longa (Blur) quando ele é o último visível da lista; duplo clique | O efeito entrar no clipe selecionado | A caixa de Ajuda cresce de 64 para 80 px com o texto, a lista encolhe (797 → 781) e o item fica debaixo da Ajuda: o clique cai na Ajuda e nada acontece | medido duas vezes; foto `A1-ajuda-cobre-item.jpg`; com descrição curta (Bendoscope) não acontece | engana |
| N2 | Saída avançada, abrir o menu "+" (Tela / Slice / Máscara de saída), apertar Esc | Fechar só o menu | Sem mudanças pendentes: a Saída avançada inteira fecha. Com mudanças: aparece "Sair sem guardar o que foi feito…?" e o menu continua aberto atrás | repetido nas duas situações (passo `A3`) | engana |
| N3 | Trocar para um deck novo e voltar ao Deck 1 com dois clipes no ar | Os clipes seguirem no ar (no Resolume o que está tocando continua até ser trocado) | Nada no ar ao voltar: `[2,1,-1,-1,-1]` → `[-1,-1,-1,-1,-1]` | repetido em duas rodadas | errado na tela (a decidir: pode ter sido escolha do 02-04) |
| N4 | Salvar com um clipe no ar, fechar, abrir a composição | O clipe voltar ao ar, ou ao menos a opção | O arquivo guarda `on: 2`, mas ao abrir nada vai ao ar | repetido em duas rodadas; é o achado 27 do 12-01 visto no uso | errado na tela |
| N5 | Abrir o programa com um segundo monitor ligado | Abrir direto | O diálogo "Projetores" aparece na frente toda vez ("Ao abrir o programa: perguntar sempre" vem marcado) | visto nas quatro aberturas | incômodo (a decidir) |
| N6 | Duplo clique no valor de um parâmetro, digitar "abc", Enter | Voltar a mostrar o valor de antes | O valor guardado não muda (certo), mas a linha fica mostrando vazio e o campo fica com "abc" | visto uma vez (passo `A2`), não repetido | incômodo |
| N7 | Passar por cima dos botões do transporte do painel Clipe | Dica em cada botão | Três botões logo depois de Entrada/Saída e todos os − e + não têm dica (title vazio) | lido do painel em duas rodadas | incômodo |

**Suspeitas, não confirmadas:** escolher o modo de mistura da camada pelo teclado (clique na lista, duas setas, Enter) não mudou
o modo, mas pode ser limite do meu teste com lista nativa; tem a ver com o achado 72. A barra de espaço não fez nada visível e
eu não sei o que ela deveria fazer.

**Não é achado (artefato do teste):** a aba Arquivos abre em `Temp\proj-test` com 99 gravações porque a pasta de dados da
bancada herdou ajustes de testes antigos.

## 3. O que sobrou do 12-01 (54 achados)

Nesta passada só o **27** foi provocado no uso (é o N4). Os outros 53 **não foram provocados**: o plano pedia tentar cada um que
aparece no uso e isso não foi feito. Continuam com a prova que tinham no 12-01 ("conferido" ou "só lido").

## 4. Lista única, por quanto atrapalha um show, em lotes

Números sem letra são do `12-01-ACHADOS.md`; com N são desta passada.

**Lote A — some coisa ou o projetor fica errado no pior momento (8)**
27/N4 (reabre com nada no ar) · 49 (queda da placa não desliga o laser; risco físico) · 24 ("Ignorar disparo de coluna" não é
salvo e some no Ctrl+Z) · 22 (slice com Fonte = camada sai preto ao abrir) · 21 (clipe de laser reabre no quadro errado) ·
75 (remover coluna duas vezes deixa clipes sem casa) · 5 (clipe que sai na transição congela no último quadro) · 16 (clipe que
não abre some do arquivo; não reproduziu, a conferir)

**Lote B — Saída avançada e projetores (10, em dois)**
B1: 36 (projetor ligado depois não aparece) · 37 (Automático reabre janela pequena) · 38 (desligar tela bagunça a emenda) ·
41 (escala do Windows no projetor) · 43 (lista Telas refeita a cada segundo fecha o seletor)
B2: 39 (máscara Hexágono e Coração viram retângulo) · 40 (9º degradê não age) · 44 (palco vazio ao desenhar máscara) ·
42 (clique empilha desfazer vazio) · N2 (Esc com o menu "+" aberto)

**Lote C — engana quem está usando (13, em dois)**
C1: N1 (Ajuda cobre o item) · N3 (trocar de deck tira do ar) · N5 (diálogo Projetores toda vez) · 72 (foco preso na lista) ·
73 (clipe piano preso no ar) · 74 (Autopilot rouba a seleção)
C2: 23 (atalho "este clipe" some ao reabrir) · 26 (Ctrl+Z que "não muda nada") · 76 (controles sem efeito e textos errados) ·
81 (tirar animação mostra 1× e não aplica) · 82 (IA esperando refaz os painéis) · N6 · N7

**Lote D — efeito que sai errado (6)**
2 (efeito com memória não troca com o clipe) · 3 (Freeze nasce congelando o vazio) · 4 (clipe preparado pisca quadro antigo) ·
11 (Dilate e Kuwahara: raio 4–6 igual a 3) · 12 (Iterate com Esmaecer 1) · 65 (Background Removal com a silhueta do clipe anterior)

**Lote E — fica lento com o tempo (14, em dois)**
E1: 8 · 77 · 66 · 68 · 53 · 78 · 9 (memória e coisas que nunca são soltas)
E2: 10 · 29 · 45 · 56 · 79 · 83 · 84 (trabalho demais por quadro ou por movimento)

**Lote F — segurança e limpeza (9, em dois)**
F1: 48 (Electron 33 sem correções) · 55 · 58 · 59 · 67
F2: 57 · 85 · 28 · 25

## 5. Minha recomendação

Lote A primeiro (é o que derruba um show), depois C1 (são os que você sente na mão) e B2. E e F podem esperar.
