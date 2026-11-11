---
phase: 12-revisao-geral
plan: 03
subsystem: persistence
tags: [salvar, abrir, desfazer, autosalvar, lixeira, preferencias, f5]

requires:
  - phase: 12-revisao-geral
    provides: achados 13, 14, 15, 17, 18, 19, 20, 50 (12-01)
provides:
  - desfazer que não atravessa a troca de composição
  - confirmação ao apagar e ao gravar por cima; Lixeira
  - gravação atômica de composição, preset e preferências
  - tools/salvar-check.mjs
affects: [12-04, 05-versao-web]

tech-stack:
  added: []
  patterns:
    - "sujo(): retrato atual × retrato do último salvar/abrir/nova (marcaLimpo)"
    - "Pergunta só nos pontos de entrada da interface (parâmetro `perguntar`); a API usada pelas baterias segue direta"
    - "writeAtomic: arquivo .tmp + renameSync"

key-files:
  created: [tools/salvar-check.mjs]
  modified: [app/app.js, app/browser.js, app/ao.js, main.js]

key-decisions:
  - "Zerar o desfazer ao abrir/nova (como o Resolume) em vez de restaurar o nome no Ctrl+Z; a rede de segurança passa a ser a pergunta quando há mudança não salva"
  - "O achado 17 ficou no aviso ('Desfeito, incluindo o que foi feito na Saída avançada'); a reestruturação do desfazer fica fora"

patterns-established:
  - "Com o OpenLuz instalado aberto, as baterias rodam com PROJ_USERDATA próprio (a trava de instância única é por pasta de dados)"

duration: 120min
started: 2026-11-11T11:40:00-03:00
completed: 2026-11-11T14:30:00-03:00
description: "Salvar, abrir e desfazer não perdem mais composição: desfazer não atravessa a troca, apagar e sobrescrever perguntam, autosalvar cobre a grade vazia, gravação atômica; beta.68"
type: Summary
about: "OpenLuz"
---

# Fase 12 Plano 03: Salvar, abrir e desfazer — Resumo

**Oito achados consertados (13, 14, 15, 17 em parte, 18, 19, 20, 50) no commit `ab2882f`; MSI da beta.68 gerado, à
espera de o Felipe fechar o OpenLuz instalado para instalar.**

## Critérios de aceite

| Critério | Resultado | Notas |
|---|---|---|
| AC-1: Ctrl+Z não atravessa a troca | Passa | Antes: grade da A com o nome da B, e `B.json` gravado com a A. Depois: a B fica, "Nada para desfazer" |
| AC-2: apagar e sobrescrever perguntam | Passa | ✕ da composição, "Salvar como" por cima de outra, "Apagar preset" e salvar preset por cima; o apagado vai para a Lixeira |
| AC-3: Nova e abrir avisam | Passa | Com mudança não salva pergunta; sem mudança vem direto |
| AC-4: autosalvar e nome com _ | Passa | Grade vazia com mudança grava; o programa como abriu não grava por cima da automática anterior; `_nome` vira `nome` |
| AC-5: gravação inteira; prefs mescladas | Passa | Sem `.tmp` sobrando; a preferência de teste sobrevive ao `savePrefs` da aba Arquivos (antes sumia) |
| AC-6: F5 e aviso do desfazer | Passa em parte | Aviso conferido por tecla real. O F5 foi conferido só no código (`!app.isPackaged`): a tecla pelo CDP não chega ao processo principal e a beta.68 ainda não foi instalada |
| AC-7: nada regrediu | Passa | selftest 75/75 e 25 baterias aprovadas numa pasta de dados de teste; só o webcam-check reprova, como na linha de base |

## Verificação

- `node tools/salvar-check.mjs`: 21/21 no desenvolvimento; no código antigo reprovava em 12.
- No instalado: **não rodou** (o OpenLuz instalado estava aberto com o Felipe; instalar e rodar lá fica pendente).
- Checkpoint humano: pendente (testar a beta.68).

## Desvios

- Junto, a pedido do Felipe na mesma sessão: a agulha do clipe nunca sai do trecho entre a entrada e a saída
  (`8efbb2f`; `seekClip` e `place()`; 7 verificações novas no transport-check, 5 delas reprovavam antes).
- A primeira rodada de regressão não valeu: com o instalado aberto, o programa de desenvolvimento não abre na mesma
  pasta de dados. Refeita com `PROJ_USERDATA` de teste.
- A bateria manda `salvar-check-A.json` e o preset de teste para a Lixeira do Windows de verdade (é o que o conserto faz).

## Aberto

- 17: um Ctrl+Z ainda desfaz a sessão inteira da Saída avançada (agora avisando). Reestruturar é um plano próprio.
- A pergunta de "mudanças não salvas" pode aparecer sem mudança de verdade se algo assíncrono mexer no retrato depois
  de abrir (não aconteceu nos testes com imagem; não testei com vídeo longo, câmera ou modelo 3D).

---
*Fase: 12-revisao-geral, Plano: 03*
*Concluído: 2026-11-11 (falta instalar e o aprovado do Felipe)*
