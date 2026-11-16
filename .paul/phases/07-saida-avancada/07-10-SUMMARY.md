---
phase: 07-saida-avancada
plan: 10
subsystem: saida-avancada
tags: [mascara, inverter, resolume]

requires:
  - phase: 07-saida-avancada
    provides: máscara nova quadrada (07-05), com a dúvida do Inverter em aberto
provides:
  - máscara criada pelo menu "+" (formas e desenho à mão) nasce com Inverter ligado, como no Resolume
  - 07-10-MEDIDAS.md
  - ao-painel-check com a leitura dos pixels da máscara nova (24 verificações)
affects: []

key-files:
  created: [.paul/phases/07-saida-avancada/07-10-MEDIDAS.md]
  modified: [app/ao.js, tools/ao-painel-check.mjs]

key-decisions:
  - "Só a máscara criada pelo menu muda; mkMask, o Automape e os arquivos salvos continuam como estavam"
  - "A máscara desenhada à mão também nasce invertida, por coerência: não medida no Resolume"

duration: 2026-11-16
started: 2026-11-16
completed: 2026-11-16
description: "Máscara de saída nova nasce com Inverter ligado, como medido na saída do Resolume"
type: Summary
about: "OpenLuz"
---

# Fase 7 Plano 10: Inverter da máscara — Resumo

**No Resolume a máscara de saída nasce como janela (a imagem só dentro da forma). A caixa Inverter do OpenLuz já tinha o
mesmo sentido; agora a máscara nova nasce com ela ligada. Era uma decisão que eu ia deixar para o Felipe por falta de
medida; a medida resolveu.**

## Critérios de aceite

| AC | Resultado |
|----|-----------|
| AC-1 medido | Passou (07-10-MEDIDAS.md) |
| AC-2 mesmo resultado de fábrica | Passou — painel e pixels da tela (imagem dentro, preto fora) |
| AC-3 nada quebra | Com ressalva — dez baterias da Saída avançada e 30 baterias aprovadas; selftest 74/75: de novo só "fonte Captura: página web num navegador escondido" ("quadrado parado"), que oscila com os monitores desligados (passou no 07-09, reprovou no 07-08 e aqui) |

## Desvios

- `app/screens.js` estava na lista e não mudou.

## Muda para quem usa

- Quem acrescentava uma máscara para tapar um pedaço da projeção vai ver o contrário ao criar: tudo preto menos a forma.
  Basta desligar Inverter. Vale avisar nas notas da próxima versão.

## Pendências

- O item do selftest que oscila com monitor desligado merece um plano próprio.
