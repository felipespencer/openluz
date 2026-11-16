---
phase: 13-porta-de-entrada
plan: 05
subsystem: versao
tags: [beta, msi, instalado]
key-files:
  created: []
  modified: [package.json, docs/notas-0.3.0-beta.3-rascunho.md]
completed: 2026-11-16
description: "0.3.0-beta.3 gerada (MSI) e instalada no CAIOPRADO; não publicada"
type: Summary
about: "OpenLuz"
---

# Fase 13 Plano 05: 0.3.0-beta.3 — Resumo

**A 0.3.0-beta.3 foi gerada (`dist/OpenLuz 0.3.0-beta.3.msi`, 287 MB) e instalada por cima da beta.2, a pedido do Felipe
("faz a beta"). Nada foi enviado ao GitHub: sem push, sem tag, sem release.**

| AC | Resultado |
|----|-----------|
| AC-1 beta.3 instalada e funcionando | Passou — o instalado se identifica como OpenLuz/0.3.0-beta.3; com pasta de dados de teste: ao-origem 31/31, ao-poligono 41/41, ao-presets 30/30 na segunda abertura |

## Desvios e notas

- ao-presets reprovou na primeira abertura com pasta de dados nova ("não achei #aoPresetBtn"): o diálogo de primeira vez
  cobre o botão da Saída avançada. Na segunda abertura passa. É da bateria com pasta nova, não do programa.
- A versão foi lida do pacote instalado e do agente do navegador; a janela Sobre não foi aberta.
- Notas completadas (Test Card na Composição, Composição › Nova, menu OUTPUT) e marcadas como geradas e não publicadas.
- A beta leva tudo do branch desde a beta.2, quase tudo sem o teste do Felipe na mão.

## Pendências

- Publicar: push do branch (51 commits), tag e `gh release create --prerelease --target efeitos-resolume`, só com o "publica" dele.
