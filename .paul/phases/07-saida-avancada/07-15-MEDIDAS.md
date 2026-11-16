---
description: "Export to SVG… do menu Presets da Advanced Output do Resolume 7.28.1, medido pelos arquivos que ele grava (07-15)"
type: Findings
about: "OpenLuz"
---

# 07-15 — Export to SVG do Resolume: o que ele grava

Resolume Arena 7.28.1, em 2026-11-16, três monitores ligados. Mouse real na janela dele. Fotos e os arquivos exportados
em `tools/compare/saida/svg-ao/` (fora do git). O `AdvancedOutput.xml` foi guardado antes e está igual no fim; nenhum
preset foi gravado na pasta do Felipe. Só o FORMATO do arquivo é copiado; nenhum código do Resolume.

## Como é

**O gesto**
- Presets › **Export to SVG…** fica depois de Load…, sempre ligado (não depende de haver preset carregado).
- Abre uma janela de **escolher PASTA** ("Export Screens as SVG files", botão "Selecionar pasta"), não de nome de arquivo.
- Grava na pasta e em seguida **abre a pasta no Explorador** com o `Input.svg` selecionado.

**Os arquivos** (saída de prova: Screen 1 com Slice, Slice 1 deformado num canto, Polygon triângulo e Mask redonda)
- `Input.svg`: a aba de entrada. Tamanho da composição.
- `Output1_Screen 1.svg`: a aba de saída da tela 1. Nome = `Output` + número da tela + `_` + nome da tela. Tamanho da tela.

**Dentro de cada arquivo**
```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="1920.0" height="1080.0" viewport="0 0 1920 1080"
     stroke-width="1.0" stroke="#000000" fill="none">
  <g id="Screen 1">
    <polygon id="Slice" points="0,0,1920,0,1920,1080,0,1080"/>
    <polygon id="Slice 1" points="248.471,152.471,1384,0,1384,755,0,755"/>
    <path id="Polygon" d="M 960 0 L 1583.54 1080 L 336.462 1080 L 960 0 z"/>
    <path id="Mask" d="M 960 162 C 1168.76 162 1338 331.237 … z"/>
  </g>
</svg>
```
- Um `<g>` por tela, com `id` = nome da tela. Cada item é um elemento com `id` = nome do item, na ordem de baixo para
  cima da lista (Slice, Slice 1, Polygon, Mask).
- **Slice:** `<polygon>` com os quatro cantos (cima-esquerda, cima-direita, baixo-direita, baixo-esquerda), tudo separado
  por vírgula. Na saída, os cantos são os do slice deformado.
- **Polígono:** `<path>` com `M`, `L` por ponto, o primeiro ponto repetido no fim e `z`.
- **Máscara:** `<path>`; a redonda sai em quatro curvas `C`. Só aparece no arquivo de **saída**; o `Input.svg` não a traz.
- Coordenadas em pixels, até seis algarismos significativos. Traço preto de 1, sem preenchimento.
- O atributo é `viewport` (não `viewBox`). No OpenLuz vai `viewBox`, que é o nome que os programas de desenho leem.

## Não medido

Na segunda exportação o Resolume deixou de obedecer: depois da primeira, o campo Presets passou a abrir em modo de dar
nome ("untitled") e o clique em Export to SVG… zerou a saída de prova (três vezes); depois o Arena congelou (o
congelamento conhecido desta máquina) e, reaberto, não abriu mais menu nenhum. Ficou sem medir:
- Com **duas telas**: se o `Input.svg` traz um `<g>` por tela (é o que a estrutura sugere) e o nome do segundo arquivo
  (`Output2_Screen 2.svg`, pela regra do primeiro).
- Slice com **subdivisões** ou bezier: se sai só com os quatro cantos ou com o contorno da malha.
- Slice com a **entrada girada**, **máscara de entrada** e máscara de lados retos.
- Nomes com caracteres que o Windows não aceita em nome de arquivo.

## O que vai para o OpenLuz

- Exportar SVG… depois de Abrir…, sempre ligado; escolhe uma pasta; grava `Input.svg` e um `Output<N>_<nome>.svg` por
  tela; abre a pasta no fim.
- Mesmos elementos: slice = `<polygon>` dos quatro cantos; polígono e máscara = `<path>`.
- Onde não foi medido, decisão nossa, dita aqui: `Input.svg` com um `<g>` por tela; slice de malha sai como `<path>` do
  contorno (os quatro cantos sozinhos perderiam a forma); entrada girada sai com os cantos girados; máscara de entrada
  fica de fora, como a de saída ficou de fora do `Input.svg`; caracteres proibidos em nome de arquivo viram `_`.
