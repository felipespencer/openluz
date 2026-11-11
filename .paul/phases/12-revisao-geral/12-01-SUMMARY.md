---
phase: 12-revisao-geral
plan: 01
subsystem: testing
tags: [revisao, baterias, cdp, seguranca, desfazer, saida-avancada]

requires:
  - phase: todas
    provides: o programa na beta.65 e as baterias de tools/
provides:
  - linha de base das 24 baterias, quadros por segundo e memória
  - lista de 85 achados em seis áreas, com 7 reproduzidos por CDP
  - escolha do Felipe do que vira conserto (12-02 em diante)
affects: [12-02 em diante, 02-efeitos-do-resolume, 08-webcam-virtual]

tech-stack:
  added: []
  patterns:
    - "Cada bateria num Electron recém-aberto; reprovou, roda de novo em outro"
    - "Reprodução de achado grave com tecla e clique reais pelo CDP numa pasta PROJ_USERDATA de teste"

key-files:
  created:
    - .paul/phases/12-revisao-geral/12-01-LINHA-DE-BASE.md
    - .paul/phases/12-revisao-geral/12-01-ACHADOS.md
  modified: []

key-decisions:
  - "Consertar primeiro o que perde trabalho ou trava, mais o 46, o 47 e o 63; o resto fica para depois dos efeitos do Resolume"

patterns-established:
  - "Achado de revisor só entra como REPRODUZIDO depois de acontecer no programa; senão fica 'conferido' ou 'só lido'"

duration: 60min
started: 2026-11-11T08:35:00-03:00
completed: 2026-11-11T09:40:00-03:00
description: "Revisão geral só de leitura: linha de base de 24 baterias e 85 achados em seis áreas, 7 reproduzidos no programa; o Felipe escolheu consertar os graves"
type: Summary
about: "OpenLuz"
---

# Fase 12 Plano 01: Revisão geral (só leitura) — Resumo

**Linha de base das 24 baterias na beta.65 e 85 achados em seis áreas, sete deles reproduzidos no programa com tecla
e clique de verdade; nenhum arquivo do programa foi alterado.**

## Desempenho

| Medida | Valor |
|---|---|
| Duração | cerca de 1 h |
| Tarefas | 2 automáticas + 1 checkpoint de decisão |
| Arquivos criados | 2 (mais este resumo) |
| Arquivos do programa alterados | 0 |

## Critérios de aceite

| Critério | Resultado | Notas |
|---|---|---|
| AC-1: Linha de base medida | Passa | 24 baterias (as 21 do plano + engrenagem, lote2 e lote3), intermitente separado de firme, qps e memória |
| AC-2: Todas as áreas revisadas | Passa | Seis seções; cada achado com arquivo:linha, efeito, prova, gravidade e tamanho |
| AC-3: Achado grave provado, não suposto | Passa | 7 reproduzidos por CDP; os demais marcados "conferido", "só lido" (com o motivo quando tentei) ou "não reproduziu" |
| AC-4: Nada do programa muda | Passa | `git status`: só `.paul/STATE.md` e os arquivos novos de `.paul/phases/12-revisao-geral/` |
| AC-5: O Felipe escolhe | Passa, com ressalva | Ele respondeu "pronto ok" à recomendação (graves + 46, 47, 63); a leitura dessa resposta é minha e está anotada assim no fim de `12-01-ACHADOS.md` |

## O que saiu

- **Linha de base:** 19 baterias passam limpas (selftest 75/75). grade-check reprova firme por defeito da bateria (não
  fecha o diálogo "Projetores"); webcam-check reprova firme (câmera preta ao mudar a composição para quadrada);
  rosto-check é intermitente; ui-check aprova e cai na saída. 28,7–29,0 qps; memória estável em 5 min de trocas.
- **Achados reproduzidos:** laço de quadros que morre (1), Ctrl+Z depois de abrir outra composição (13), ✕ que apaga
  a composição (14), Delete na Saída avançada que limpa a grade (30), reserva do recorte que não entrega máscara (60),
  Esc do menu que tira a camada do ar (69), Enter do diálogo que dispara o clipe (70).
- **Achados conferidos no código, de rede e de sites:** servidor do celular aberto para a rede sem senha (46) e
  Página web com câmera e microfone sem pergunta (47).
- **Não confirmado:** clipe cujo arquivo some do disco (16) continuou na casa e no arquivo, com imagem e com vídeo.

## Arquivos

| Arquivo | Mudança | Para quê |
|---|---|---|
| `.paul/phases/12-revisao-geral/12-01-LINHA-DE-BASE.md` | Criado | Resultado de cada bateria, qps, memória e reproduções |
| `.paul/phases/12-revisao-geral/12-01-ACHADOS.md` | Criado | 85 achados por área, resumo dos dez principais, escolha do Felipe |
| `.paul/STATE.md`, `.paul/ROADMAP.md` | Modificados | Posição do loop |

## Decisões

| Decisão | Motivo | Efeito |
|---|---|---|
| Consertar os graves (perde trabalho e trava) mais 46, 47 e 63, em seis lotes | Quase todos são pequenos; os efeitos do Resolume voltam logo | Planos 12-02 em diante, cada um com as baterias antes e depois |
| O 16 fica para conferir com câmera, captura e YouTube | Não reproduziu com arquivo renomeado | Não entra em plano de conserto ainda |
| Errado na tela, lento, limpeza e baterias B1–B5 ficam na lista | Escolha dos graves primeiro | Revisitar depois do 02-08/02-09 |

## Desvios do plano

| Tipo | Quantos | Efeito |
|---|---|---|
| Ajustes de escopo | 4 | Nenhum no resultado |

- O plano citava a beta.62; o código revisado é a beta.65 (`9a20760`), o estado atual do branch.
- A Área 6 foi lida por dois revisores (500 KB): sete no total, em paralelo.
- Além das baterias listadas, rodaram engrenagem-check, lote2-check e lote3-check.
- O webcam-check com espera maior e as reproduções rodaram de scripts fora do projeto (pasta temporária da sessão);
  `tools/` não foi tocado. As reproduções usaram `PROJ_USERDATA` de teste, então nenhuma composição do Felipe foi mexida.

## Problemas encontrados

| Problema | Como ficou |
|---|---|
| A tecla F5 mandada pelo CDP não chega ao processo principal | O achado 15 ficou "só lido"; provar à mão ou por `webContents.sendInputEvent` no plano de conserto |
| Meu teste do Esc no Automape não carregou o exemplo | O caso do Automape no achado 33 ficou "só lido" |
| A causa da webcam preta (63) não foi apurada | O plano de conserto começa por investigar (pode ser o programa ou a bateria) |

## Prontidão para o próximo plano

**Pronto:**
- Lista priorizada e ordem dos lotes no fim de `12-01-ACHADOS.md`
- Jeito de provar cada conserto: a mesma reprodução por CDP que hoje dá REPRODUZIDO tem de passar a não reproduzir

**Atenção:**
- grade-check e ui-check dão falso alarme num programa recém-aberto (B1, B2); ao usá-los como prova, fechar o
  diálogo antes e olhar a linha "APROVADO", não o código de saída
- A leitura do "pronto ok" como aceite da recomendação é minha; o plano 12-02 passa pela aprovação dele de qualquer jeito

**Bloqueios:** nenhum

---
*Fase: 12-revisao-geral, Plano: 01*
*Concluído: 2026-11-11*
