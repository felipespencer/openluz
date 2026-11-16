---
description: "Desenho da aba 3D da Saída avançada do OpenLuz: cena com superfícies e projetores que gera os slices deformados (14-01)"
type: Design
about: "OpenLuz"
---

# 14-01 — Aba 3D da Saída avançada: desenho

Maquete que funciona: `saida-3d-mockup.html`, na raiz do projeto (abre no Chrome; precisa de internet para o three.js).
Fotos do teste em `tools/compare/saida/maquete-3d/` (fora do git). Nada disto está no programa.

## A ideia

Hoje, para mapear um cubo ou uma empena, você cria um slice por face e puxa canto por canto até casar com a parede. A
aba 3D inverte: você descreve **a cena como ela é** (uma parede de 6,4 × 3,6 m, um cubo de 1,2 m na frente dela) e **onde
o projetor está**. O programa calcula sozinho como cada face aparece vista da lente e cria os slices já deformados. O
ajuste fino continua sendo o de hoje, na aba Transformação de saída.

O Resolume não tem isso na Advanced Output. É recurso próprio do OpenLuz, como o Automape.

## O que a maquete mostra

1. **Terceira aba**, ao lado de Seleção de entrada e Transformação de saída. As outras duas ficam como estão.
2. **Lista** à esquerda: Superfícies (plano, caixa) e Projetores, com um "+" para acrescentar.
3. **Palco 3D** no meio: arrastar gira a vista, a roda aproxima, o botão direito desliza; clicar seleciona; Shift +
   arrastar move o objeto no chão. A imagem da composição aparece **só onde algum projetor ligado alcança**; o resto da
   superfície fica apagado. Cada projetor é uma caixinha laranja com o cone de luz.
4. **Painel** à direita, em metros: posição, giro e tamanho da superfície, e qual pedaço da composição ela mostra;
   posição, mira e abertura (throw ratio do manual) do projetor.
5. **Visão do projetor**, no canto: a cena vista da lente, com fundo preto. É a imagem que o projetor precisa mandar.
6. **Gerar slices na Saída avançada**: para cada projetor ligado, cada face voltada para ele e dentro do quadro vira um
   slice com os quatro cantos já no lugar. Na cena de exemplo: 4 slices com um projetor, 9 com os dois.
7. **Achar o projetor por foto (Automape)**: na maquete só explica; ver "depois".

## Como entra no programa

- **Modelo:** a cena 3D é guardada junto das telas (`screens.js`): superfícies (tipo, posição, giro, tamanho, recorte de
  entrada) e, em cada tela, a pose do projetor (posição, mira, abertura). Tela = projetor, como já é.
- **Gerar:** cada face vira um slice comum, com a entrada no recorte da superfície e a saída em quatro cantos
  (`warp.mode = 'corners'`, que já faz a perspectiva certa). Nada novo no motor de saída: a imagem final continua saindo
  pelos slices que já existem e que já foram provados.
- **Ligação:** o slice gerado guarda de qual face veio. Mexer na cena e gerar de novo atualiza os slices dela; os que
  você ajustou à mão ficam marcados e o programa pergunta antes de passar por cima.
- **three.js** já está no programa (clipes de modelo 3D), então não entra dependência nova.

## O que fica de fora da primeira versão

- **Oclusão:** uma superfície na frente de outra (o cubo tapando parte da empena). A primeira versão cria os dois
  slices e você resolve com a ordem deles ou uma máscara, como hoje. Recortar sozinho vem depois.
- **Superfícies curvas e modelos 3D** (GLB, OBJ): a maquete já tem o item no menu, mas a primeira versão faz plano e
  caixa. Curvas pedem a malha bezier; modelos pedem um slice por face ou uma textura inteira renderizada.
- **Achar o projetor por foto:** calcular a pose do projetor a partir de quatro pontos marcados na foto do Automape. É o
  que faria a aba ser rápida de verdade em campo; entra como segundo passo, depois que a cena básica estiver provada.
- **Distorção da lente e lens shift.**
- **Emenda (soft edge) calculada pela cena** quando dois projetores cobrem a mesma face.

## Riscos que eu vejo

- **Medir a cena no mundo real é chato.** Se a pessoa precisa de trena para tudo, ninguém usa. Por isso o "achar o
  projetor por foto" pesa tanto, e por isso o ajuste fino 2D continua existindo.
- **Dois jeitos de fazer a mesma coisa** (3D e 2D) confundem se a ligação entre eles não for clara. A regra proposta:
  o 3D gera, o 2D ajusta; nunca o contrário.
- **A abertura do projetor** (throw ratio) com zoom no meio do curso não bate com o manual; vai precisar de um jeito de
  acertar olhando.

## Tamanho

Estimativa minha, sem medida: três planos.

| Plano | O que entrega |
|-------|---------------|
| 14-02 | A aba no programa: cena, lista, palco 3D, painel, visão do projetor; salvar e abrir com a saída |
| 14-03 | Gerar slices (plano e caixa), a ligação com a aba de saída e o "gerar de novo" sem perder o ajuste fino |
| 14-04 | Achar o projetor por foto (com o Automape) |

Cada um do tamanho de um dos planos grandes da Saída avançada (um a três dias de trabalho meu, com as baterias).

## Perguntas para você

1. **É isso que você imaginou** quando disse "tudo é 3D"? Ou a ideia era outra: por exemplo, ver o show em 3D para
   apresentar a um cliente, ou eu entender a superfície a partir de um desenho seu?
2. **Unidade:** metros está bom?
3. **Por onde você começaria uma cena:** digitando medidas, arrastando no palco, ou a partir da foto do Automape?
4. **O que você mais mapeia:** parede plana, cubo e caixa, ou coisa curva e irregular? Isso decide se plano e caixa
   bastam para a primeira versão.
5. **Ordem:** fazer a aba 3D agora, ou primeiro terminar o que falta da lista do Resolume (slice polígono, exportar SVG)?
