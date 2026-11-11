---
description: "Revisão geral do OpenLuz (12-01): linha de base das baterias, quadros por segundo e memória"
type: Baseline
about: "OpenLuz"
---

# 12-01 — Linha de base

- **Quando:** 2026-11-11, 08:39–09:20, no CAIOPRADO, programa de desenvolvimento, Resolume fechado.
- **Código:** branch `efeitos-resolume`, commit `9a20760` (0.2.0-beta.65). `git status` na partida: só arquivos soltos
  que já existiam (`brag-output*/`, `tools/compare/__pycache__/`, `tools/compare/clips/contador.mp4` e `longo90.mp4`,
  `tools/compare/sondas/__pycache__/`, `tools/compare/x.png`, `x.png`).
- **Como:** cada bateria num Electron recém-aberto (`electron . --remote-debugging-port=9333`), com a pasta de dados
  de verdade do programa; bateria que reprovou rodou uma segunda vez em outro Electron novo. O selftest roda por
  `PROJ_TEST=%TEMP%\proj-test electron .`. O rosto-check roda com câmera falsa do Chromium e `PROJ_USERDATA` próprio,
  como o cabeçalho dele manda.

## Baterias

| Bateria | 1ª rodada | 2ª rodada | Veredito |
|---|---|---|---|
| selftest | 75/75 APROVADO (116 s) | — | passa |
| ui-check | 18/18 APROVADO, mas o node cai ao sair (código 3221226505, `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), src\win\async.c:76`) | igual | passa; **código de saída errado, firme** (achado B2) |
| undo-check | 11/11 (retrato da composição: 0,73 ms) | — | passa |
| keymap-check | tudo certo | — | passa |
| transform-check | tudo certo | — | passa |
| camadas-check | 31/31 | — | passa |
| grade-check | **4 falhas**: "nome: seleciona e vai só para a Prévia" (`on1:-1, pv:null`), "miniatura: põe no ar e seleciona" (`on1:-1, sel:null`), "classes: no ar / selecionado / na Prévia", "nome de outro clipe com um no ar" | as mesmas 4 | **reprova firme — defeito da bateria** (achado B1): não fecha o diálogo "Projetores" da abertura; o ponto clicado está sob `.dlgOver`. Com o diálogo fechado o clique funciona |
| soft-check | 42/42 | — | passa |
| ao-check | 20/20 | — | passa |
| ao-menu-check | 42/42 | — | passa |
| ao-mesh-check | tudo certo | — | passa |
| automape-check | 23/23 | — | passa |
| texto-check | 18/18 | — | passa |
| editor-check | 23/23 (cinco caixas: 0,8 ms por quadro) | — | passa |
| ia-check | 13/13 (Ollama local respondeu: llama3.1:8b) | — | passa |
| iagen-check | 17/17 — a parte do servidor de mentira ficou de fora porque há chave do Higgsfield guardada (com ela seriam 27) | — | passa, cobertura parcial (B5) |
| modelo3d-check | 13/13 (um quadro do modelo: 0,2 ms) | — | passa |
| rosto-check | **1 falha**: "com a pessoa parada o recorte não treme" — centro variou 12,29% da largura | 21/21 (detector 14,3/s) | **intermitente** (B3) |
| presets-check | 27/27 | — | passa |
| transport-check | tudo certo | — | passa |
| webcam-check | **1 falha** em 10: "composição quadrada: barras pretas dos lados, imagem no meio" — esq 0,0,0 meio 0,0,0 dir 0,0,0 | a mesma | **reprova firme** (achado 63). Uma terceira rodada, com 5 s de espera depois de mudar a composição (cópia da bateria fora do projeto), deu o mesmo |
| engrenagem-check | tudo certo | — | passa |
| lote2-check (`prova.png`) | APROVADO; salvar ok; qps 28,6 | — | passa |
| lote3-check (`barras.png`) | APROVADO; salvar ok; qps 29,0 | — | passa |

Resumo: 24 baterias; 19 passam limpas; ui-check passa com código de saída errado; iagen-check passa com cobertura
parcial; rosto-check é intermitente; grade-check e webcam-check reprovam firme (a primeira por defeito da bateria,
a segunda por algo a investigar no programa).

`npm test` não roda: o `package.json` aponta para `tools/selftest.mjs`, que não existe (B4).

## Quadros por segundo e memória

Medido numa pasta de dados de teste (`PROJ_USERDATA`), composição padrão, saídas fechadas.

| Medida | Valor |
|---|---|
| Composição parada (grade vazia), 4 s | 28,7 qps |
| Duas camadas de vídeo no ar (`andando.mp4` + `quadrado.mp4`), 5 s | 28,8 qps |
| Depois de 5 min trocando clipes | 29,0 qps |
| Memória de todos os processos do programa, grade vazia | 999 MB |
| Memória com seis clipes carregados e dois vídeos no ar | 1273 MB |
| Memória durante os 5 min (a cada ~43 s) | 1289 → 1308 → 1322 → 1333 → 1336 → 1289 MB |
| Memória no fim | 1298 MB |
| Heap de JavaScript da janela | 13 MB do começo ao fim |
| Exceções na página durante os 5 min | nenhuma |

Os 5 minutos foram 418 disparos com clique de verdade na miniatura, alternando três clipes (dois vídeos e uma
imagem) em cada uma de duas camadas. A memória oscilou 47 MB e voltou: sem sinal de vazamento ao trocar clipes. Não
foi medido: Ctrl+Z repetido com efeitos de memória, abrir e fechar composições em série, câmeras e capturas
apagadas (achados 8 e 77).

O programa fica em 28,7–29,0 qps com a meta em 30, parado ou com dois vídeos — combina com o achado 10 (o desenho só
acontece em múltiplos do período do monitor), mas isso não foi investigado aqui.

## Reproduções dos achados graves

Feitas com tecla e clique de verdade pelo CDP, numa pasta de dados de teste; o detalhe de cada uma está em
`12-01-ACHADOS.md`.

| Achado | Resultado |
|---|---|
| 1 — laço morre (Beat Snap + remover camada) | REPRODUZIDO: 43 quadros em 1,5 s antes da batida, 0 em 2 s depois |
| 13 — Ctrl+Z depois de abrir outra composição | REPRODUZIDO: `rep-B.json` gravado com o conteúdo da A |
| 14 — ✕ apaga a composição | REPRODUZIDO: arquivo sumiu, sem pergunta |
| 30 — Delete na Saída avançada limpa a grade | REPRODUZIDO |
| 60 — reserva do recorte | REPRODUZIDO: 1 máscara em 15 s (nativo: 256 em 9 s) |
| 69 — Esc do menu tira a camada do ar | REPRODUZIDO |
| 70 — Enter do diálogo dispara o clipe | REPRODUZIDO |
| 15 — F5 | não deu para provar: a tecla pelo CDP não chega ao processo principal |
| 16 — clipe que não abre some do arquivo | não reproduziu com imagem nem com vídeo renomeados no disco |
| 33 — Esc no Automape | meu teste não carregou o exemplo; fica só lido |

O programa de desenvolvimento foi fechado no fim (nenhum `electron.exe` do projeto rodando).
