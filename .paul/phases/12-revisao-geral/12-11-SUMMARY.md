---
phase: 12-revisao-geral
plan: 11
subsystem: saida-avancada
tags: [pente-fino, lote-b2, mascara, degrade, desfazer, esc, beta]

requires:
  - phase: 12-revisao-geral
    provides: lista em lotes (12-08), lotes A e C1 (12-09, 12-10)
provides:
  - máscaras Hexágono e Coração
  - limite de 8 degradês por slice com aviso
  - desfazer da Saída avançada sem passos vazios
  - Esc que fecha o menu suspenso antes da janela
  - desenho de máscara encerrado ao escolher outro item
  - tools/loteb-check.mjs
  - 0.3.0-beta.2 instalada e publicada como pré-release
affects: [07-03 (Saída avançada × Resolume)]

key-files:
  created: [tools/loteb-check.mjs]
  modified: [app/ao.js, app/screens.js, package.json]

key-decisions:
  - "Item 40: bloquear o nono degradê com aviso em vez de aumentar a lista fixa de oito do shader"
  - "Felipe, 2026-11-14: o pente fino para nos lotes A, C1 e B2 ('fecha no risco 1'); B1, C2, D, E, F ficam na lista"
  - "Felipe, 2026-11-14: beta.2 pública ('deixa publico vou mandar pra umas pessoas')"

patterns-established:
  - "P.reset() não zera as telas da Saída avançada: bateria que roda depois de mexer nelas tem de abrir o programa de novo"
  - "Release: push do branch, depois gh release create --prerelease --target <branch> com o MSI"

duration: ~3h
started: 2026-11-14T15:30:00-03:00
completed: 2026-11-14T17:30:00-03:00
description: "Lote B2 consertado (9 pontos), 0.3.0-beta.2 instalada e publicada; pente fino encerrado no risco 1"
type: Summary
about: "OpenLuz"
---

# Fase 12 Plano 11: lote B2 do pente fino — Resumo

**Cinco itens da Saída avançada consertados; `loteb-check` reprovava nos 9 pontos e aprova; 0.3.0-beta.2 pública.**

## Critérios de aceite

| Critério | Resultado | Notas |
|---|---|---|
| AC-1: Hexágono e Coração (39) | Passa em parte | 6 e 48 pontos; conferido pelos pontos e pela foto do editor, **não medido na janela de saída**; Coração só existe na máscara de entrada (o menu da de saída nunca teve o botão) |
| AC-2: nono degradê (40) | Passa | para em 8 ligados e avisa |
| AC-3: palco não fica vazio (44) | Passa | desenho encerrado, 10 itens no palco |
| AC-4: Ctrl+Z desfaz o que foi feito (42) | Passa | desfazer 1 → 1 depois de três cliques; refazer preservado |
| AC-5: Esc do menu + (N2) | Passa | fecha só o menu |
| AC-6: nada mais quebra | Passa em parte | ao 20, ao-menu 42, soft 42, malha, teclas 21, undo 11, lotea, lotec, show-passada; 30 baterias: 29 limpas, **rosto reprovou uma vez e passou na repetição**; preset antigo aberto campo a campo: **não feito** |

## Beta e release

- 0.3.0-beta.2 (`7fc9d06`): MSI de 273 MB, instalada no CAIOPRADO.
- Push do branch `efeitos-resolume` e pré-release pública: https://github.com/felipespencer/openluz/releases/tag/v0.3.0-beta.2
- No instalado: loteb 9/9, lotea 9/9, queda 3/3, lotec 9/10 na primeira rodada e 10/10 na segunda.

## Desvios e pendências

- **Clique perdido com Autopilot** (resto do achado 74): clique que cai no instante em que a grade é redesenhada some. Nas notas da release como conhecido.
- Bateria do rosto oscila na rodada completa; não investigado.
- Visto na foto e não consertado: nomes do slice e da máscara se sobrepõem no palco quando a máscara fica centrada.
- Sem prova: imagem na janela de saída, preset antigo, composição da 0.2.0 na beta.

## Checkpoint

Felipe, 2026-11-14: mandou o link para os amigos e depois "Continua, paizão". **Leitura minha: seguiu em frente, aprovado por uso**
(o mesmo que valeu no 02-07); não houve a palavra "aprovado".

## Próximo

O Felipe disse que acha que a Saída avançada não está igual à do Resolume. Ela nunca foi comparada inteira: plano 07-03, só medição.

---
*Fase: 12-revisao-geral, Plano: 11 — fechado em 2026-11-14*
