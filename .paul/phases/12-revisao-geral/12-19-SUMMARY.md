---
phase: 12-revisao-geral
plan: 19
description: "Teste de carga com vídeos de verdade e efeitos nas duas saídas"
type: Summary
about: "OpenLuz"
---

# Fase 12 Plano 19 — Resumo

Plano só de teste, em 2026-11-17, a convite do Felipe ("quer testar com videos de verdade e efeitos etc nas duas telas?"; li a pergunta como sinal verde e apliquei sem esperar o "1"). O programa não mudou. Detalhe em `12-19-CARGA.md`.

## Critérios

- **AC-1, cumprido:** duas saídas em tela cheia ao mesmo tempo (SAMSUNG e 23MP55 em pé), com vídeo de verdade mudando nas duas, no dev e no instalado.
- **AC-2, cumprido com um ponto abaixo do limite:** seis cenas medidas; motor entre 27,6 e 30 qps, saídas a 59–60, nenhuma exceção. A cena (c) deu 27,7 (dev) e 27,6 (instalado), abaixo dos 28; repetida deu 29,2 e, com uma saída, 29,7.
- **AC-3, cumprido:** dez minutos na cena mais pesada, 29,4 → 28,4 qps, memória 2387 → 2402 MB, duas saídas abertas no fim.
- **AC-4, cumprido em parte:** cenas (a) a (e) no instalado com números iguais aos do dev; a (f) e os dez minutos não foram rodados no instalado. Nada aberto no fim; só o `.paul` mudou.

## Desvios

- As duas primeiras rodadas mediram três vídeos decodificando com um só na tela (camada de cima tapando; depois Add a 100%, que no programa vira normal por cima, como no Resolume). Só a terceira vale.
- Vídeos: os que havia na máquina (stock 1080p e 4K, drone 4K HEVC, exemplos), não material de show.
- Telas apontadas e misturas escolhidas por evento do seletor, não por tecla ou mouse.

## Para depois (não viraram plano)

- Queda para ~27,6 qps nos 20 s depois de entrarem três efeitos; causa não investigada.
- Intervalos de até 117 ms entre quadros com dois vídeos 4K no ar.
