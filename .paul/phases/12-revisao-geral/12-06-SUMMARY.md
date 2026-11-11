---
phase: 12-revisao-geral
plan: 06
subsystem: infra
tags: [rede, celular, permissoes, seguranca, pagina-web]

requires:
  - phase: 12-revisao-geral
    provides: achados 46, 47, 54 (12-01)
provides:
  - servidor do celular com chave de uso único
  - permissões de mídia e captura só para as páginas do programa
  - tools/rede-check.mjs
affects: [03-celular-e-plugins]

tech-stack:
  added: []
  patterns:
    - "Endereço do celular com ?k=CHAVE: nasce em phone:info, vale 10 min, para um celular, e morre ao fechar o diálogo"
    - "doPrograma(wc, origem): filtro único das permissões da sessão"

key-files:
  created: [tools/rede-check.mjs]
  modified: [main.js, app/preload.js, app/celular.html, app/clips.js, app/app.js]

key-decisions:
  - "O servidor continua escutando na rede local, mas responde 403 a quem não traz a chave"
  - "A fonte Página web aceita http, https e data:text/html (página embutida do teste automático); nada de file:"

patterns-established:
  - "Teste de permissão roda sem --use-fake-ui-for-media-stream: essa opção aceita tudo por cima do filtro"

duration: 60min
started: 2026-11-11T17:45:00-03:00
completed: 2026-11-11T18:55:00-03:00
description: "O servidor do celular só aceita quem foi chamado e os sites abertos como fonte não recebem câmera, microfone nem captura; na 0.2.0"
type: Summary
about: "OpenLuz"
---

# Fase 12 Plano 06: Rede e sites — Resumo

**Achados 46, 47 e 54 consertados (commit `ef83f15`, junto com o 12-07); na 0.2.0 instalada.**

## Critérios de aceite

| Critério | Resultado | Notas |
|---|---|---|
| AC-1: o celular só entra quando foi chamado | Passa | Antes (reproduzido): GET e oferta sem chave davam 200, e um "celular" sem diálogo aberto trocou o clipe selecionado. Depois: 403 sem a chave, oferta recusada sem diálogo, chave usada ou diálogo fechado deixam de valer |
| AC-2: sites sem câmera, microfone e captura | Passa | Antes (reproduzido, sem truque no teste): o site ganhava câmera e microfone. Depois: `NotAllowedError`; a janela do programa segue com câmera e fontes; `file:` é recusado |
| AC-3: nada regrediu | Passa | selftest 75/75 e 29 baterias na primeira rodada |

## Verificação

- `node tools/rede-check.mjs`: 14/14 no desenvolvimento e na 0.2.0 instalada; no código antigo reprovava em 10.
- Não testado com celular de verdade (o Felipe estava fora de casa); o teste usa uma janela escondida do próprio
  programa como celular, com vídeo no lugar da câmera.

## Desvios

- Um comentário `//` no meio de uma linha longa cortou o resto dela no `main.js` (pego pelo `node --check`).
- O filtro de endereço barrou a página `data:` do selftest; passou a aceitar `data:text/html`.
- A primeira versão do teste do site usava `--use-fake-ui-for-media-stream`, que aceita as permissões sozinha: o teste
  acusava o programa à toa. Refeito sem a opção, e conferido no código antigo que o site ganhava a câmera.

## Aberto

- Celular que cai precisa de endereço novo para religar (consequência do desenho).
- 48 (Electron 33), 55 (canais com caminho livre), 53, 58 e 59 continuam na lista.

---
*Fase: 12-revisao-geral, Plano: 06*
*Concluído: 2026-11-11 (falta o aprovado do Felipe, com celular de verdade)*
