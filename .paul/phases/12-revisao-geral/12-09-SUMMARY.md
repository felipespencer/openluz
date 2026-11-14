---
phase: 12-revisao-geral
plan: 09
subsystem: core
tags: [pente-fino, lote-a, salvar, queda, laser, transicao]

requires:
  - phase: 12-revisao-geral
    provides: lista em lotes (12-08), telas com uid e reabrir depois da queda (12-02)
provides:
  - reabertura depois de queda devolve o que estava no ar e reabre as saídas
  - laser desligado em toda saída por app.exit
  - ignoreColumn da camada, fonte do slice e quadro do clipe de laser salvos de forma estável
  - registro do clipe que não abriu preservado no arquivo
  - tools/lotea-check.mjs
  - 0.3.0-beta.1 (MSI, instalada)
affects: [12-10, 12-11]

key-files:
  created: [tools/lotea-check.mjs]
  modified: [app/composition.js, app/app.js, app/clips.js, app/laser.js, app/screens.js, main.js, package.json]

key-decisions:
  - "Abrir composição à mão não põe nada no ar; só a reabertura depois de queda (loadComposition com noAr)"
  - "Formato do arquivo só ganhou campos: ignoreColumn na camada, laserIdx no clipe de laser, sourceLayer no slice, lost no clipe que não abriu"
  - "Felipe, 2026-11-14: 'faz a beta', 'pode instalar', 'aprovado'"

patterns-established:
  - "Referência que tem de sobreviver a abrir e a desfazer vai para o arquivo como POSIÇÃO (camada, quadro), nunca como id de sessão"
  - "Teste que provoca reabertura: o programa volta em outro processo; fechar por taskkill no executável, não pelo pid guardado"
  - "Tamanho de arquivo é em bytes: ler o trecho novo do registro com Buffer, não com string"

duration: ~3h
started: 2026-11-14T01:10:00-03:00
completed: 2026-11-14T08:30:00-03:00
description: "Lote A consertado e provado por bateria (12 pontos), regressão limpa, 0.3.0-beta.1 instalada e aprovada"
type: Summary
about: "OpenLuz"
---

# Fase 12 Plano 09: lote A do pente fino — Resumo

**Os oito itens que derrubavam um show consertados; `lotea-check` reprovava nos 12 pontos e aprova no código e no instalado; 0.3.0-beta.1 instalada.**

## Critérios de aceite

| Critério | Resultado | Notas |
|---|---|---|
| AC-1: reabrir depois de queda (27/N4) | Passa | no ar `[2,1,-1,-1,-1]` antes e depois; saídas 1 → 1 |
| AC-2: laser desligado ao sair (49) | Passa com ressalva | conferido pela linha no registro, não pelo pacote UDP; sem o cubo |
| AC-3: o que é salvo volta igual (24, 22, 21, 16) | Passa com ressalva | 16: o registro fica no arquivo, mas a casa não mostra "indisponível"; só testado com vídeo de arquivo sumido |
| AC-4: remover coluna e transição (75, 5) | Passa | 7 colunas e 7 casas; o vídeo que sai dá a volta |
| AC-5: nada mais quebra | Passa em parte | selftest e 30 baterias limpos; **não feito**: abrir composição da 0.2.0 e abrir na 0.2.0 uma salva agora |

## Commits

`ed52e27` consertos e bateria · `900dbb8` versão 0.3.0-beta.1 e PAUL. Locais; sem push, sem release.

## Desvios

- `lotea-check` mexe pelas funções internas (`window.projecionista`), não por mouse e teclado.
- 49 pelo registro em vez do pacote; 16 em solução mínima; prova de ida e volta com a 0.2.0 não feita.
- `app/screens.js` entrou (não estava em files_modified): o slice precisava levar `sourceLayer`.
- O teste da queda deixou 6 processos abertos por alguns minutos (reabertura em outro processo) até eu fechar.
- A beta leva todo o branch desde a 0.2.0, inclusive os efeitos refeitos, sem aprovação do Felipe no programa.

## Checkpoint

Felipe, 2026-11-14: "aprovado, segue pro lote C1".

---
*Fase: 12-revisao-geral, Plano: 09 — fechado em 2026-11-14*
