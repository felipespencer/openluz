# Como igualar um efeito ao Resolume pelo gabarito

O gabarito (`tools/compare/saida/ref/<efeito>/`, fora do git) são fotos da saída do Resolume 7.28 com o efeito no
padrão e com cada controle em vários valores, sobre a carta de prova `clips/carta.png`. Com ele dá para refazer
um efeito sem o Resolume aberto. Regra do projeto: copia-se o COMPORTAMENTO (controles e imagem), escrevendo a
conta do zero. Nada de shader, `.wired` ou código do Resolume; não abrir `referencia-resolume/extraido/`
(fora o `effects-rest.json`, que é só a ficha dos controles).

## Ferramentas

| Comando | O que faz |
|---|---|
| `py tools/compare/folha.py "<efeito>"` | folha de contato do gabarito (todos os casos numa imagem, `_folha*.png`) para olhar |
| `py tools/compare/pontos.py "<efeito>" [filtro] [--xy x,y ...]` | cor (RGBA premultiplicado) das amostras da carta em cada caso: 9 cinzas, 8 cores puras e pontos à escolha (960×540) |
| `node tools/compare/abre-dev.mjs <porta>` | abre um OpenLuz de desenvolvimento naquela porta (pasta de dados à parte); `abre-dev.mjs fecha <porta>` fecha |
| `node tools/compare/confere.mjs "<efeito>" --porta <porta> [--so caso1,caso2] [--espera n]` | leva cada caso do gabarito ao OpenLuz e mede a diferença por pixel (0–255); grava `saida/conf/<efeito>/<caso>.png` = Resolume \| OpenLuz \| diferença ×4 |
| `py tools/compare/folha.py "<efeito>" conf [filtro]` | folha de contato dos lado a lado |
| `node tools/compare/censo.mjs` | quantos efeitos já têm os controles da ficha |

`casos.json` de cada efeito traz a ficha (`params`: tipo, mínimo, máximo, padrão, opções) e a lista de casos
(`valores`, `anima` = a imagem mexe sozinha, `igual_ao_padrao` = aquele valor não mudou nada).
A carta (1920×1080): degradê R = 0,15 + 0,7x, G = 0,15 + 0,7y, B = 0,85 − 0,6xy; grade de 240×216 com casas A1…H5;
cinzas em y≈895 e cores puras em y≈990 (px de 1920×1080); círculo de raio 260 no centro com uma diagonal; foto embaixo
à direita. `saida/ref/carta-sem-efeito.png` é a carta como o Resolume a mostra sem efeito (bate exata com o OpenLuz).

## Onde escrever

Cada lote é um arquivo `app/effects-rN.js` que exporta uma lista; `app/effects-r.js` junta os lotes e
`app/effects.js` põe cada efeito novo no lugar do antigo de mesmo `id`. Modelo: `app/effects-r1.js`.
Os construtores estão em `app/effects-rk.js`:

```js
def({ id: 'brightcontrast',            // o MESMO id do efeito antigo (app/effects.js ou effects2.js), para tomar o lugar dele
  name: 'Bright.Contrast',             // o nome do Resolume
  desc: 'Ajusta brilho e contraste.',  // uma frase nossa, em português (não copiar a descrição do Resolume)
  params: [N('bright', 'Brightness', 'Brilho', 0, -1, 1), ...],   // N(chave, nome no Resolume, rótulo em português, padrão, mín, máx[, passo, unidade])
  glsl: `vec4 fx(vec2 uv){ ... }` })
```

- Controles na MESMA ordem, faixa e padrão da ficha; todos os controles da ficha menos `Opacity` (é do painel).
  `B` = liga/desliga, `L` = lista (o valor que chega ao shader é o índice), `C` = cor, `E` = botão (Reset).
  Rótulos em português; opções de lista também (`L(chave, nome, rótulo, [opções do Resolume], [em português])`).
- O shader é GLSL ES 3.0: `vec4 fx(vec2 uv)` devolve cor PREMULTIPLICADA; uv vai de 0 a 1 (qual canto é o (0,0)
  confere-se com um caso assimétrico: não supor). Uniforms: `uTex` (entrada), `uRes` (px), `uTime` (s) e um `float` por
  controle (cor: `vec3`/`vec4`). Ajudantes em `app/effects.js` (HELPERS): `tex`, `texIn`, `un`, `pre`, `lum`,
  `hash`, `vnoise`, `rgb2hsv`, `hsv2rgb`, `rot2`, `ar`, `over`, `prv`.
- O motor (`app/engine.js`, `applyChain`) também oferece, por campos da definição: `feedback: true` (a saída
  anterior em `uPrev`), `gauss: (v, w, h) => sigma` (a entrada desfocada em `uPrev`), `stage` (um passe antes, em
  `uMid`), `hist` (fila de quadros), `uniforms: (v, w, h) => ({ nome: [números] })`. Ler um efeito que já usa
  (Tilt Shift, CRT, Trails, Grid Cloner em `app/effects2.js`) antes de usar. Não mudar o `engine.js`: se um efeito
  precisar de algo que o motor não tem, anotar no relatório e fazer o melhor possível sem isso.

## Passo a passo de um efeito

1. Ler a ficha e a definição antiga (procurar `id: '...'` em `app/effects.js` e `app/effects2.js`).
2. `folha.py` e olhar; para efeito de cor, `pontos.py` e deduzir a conta dos números (as contas do Resolume
   costumam ser simples: soma, ganho, limiar, mistura).
3. Escrever no arquivo do lote. `confere.mjs` relê a definição do disco e troca dentro do OpenLuz aberto: não
   precisa reabrir o programa a cada tentativa (só se a definição tiver função, como `gauss`).
4. Rodar `confere.mjs`, olhar os piores casos (`folha.py ... conf`), ajustar, repetir.

## Meta

- Efeito parado (cor, geometria): média até 2 em todos os casos é "igual"; até 6 é "perto" (dizer o que difere).
  Borda de 1 px e serrilhado diferentes não contam.
- Efeito que mexe sozinho (`anima`), sorteado ou com memória: não bate por pixel. Vale a aparência no padrão e a
  resposta de cada controle (tamanho, quantidade, direção, cor), olhando as folhas. Dizer no relatório.
- Um controle que não se conseguiu entender fica na lista de controles (para a ficha bater) e entra no relatório
  como "sem efeito ainda". Nunca inventar número de medição.

## Vários lotes ao mesmo tempo

Cada pessoa (ou agente) mexe SÓ no seu `app/effects-rN.js` e usa a sua porta. Depois de cada edição:
`node --check app/effects-rN.js`. Se o `confere.mjs` falhar com erro de sintaxe num arquivo de outro lote, é
alguém no meio de uma edição: esperar uns 20 s e tentar de novo. Não tocar no Resolume (uma camada só, os lotes
se atropelariam); dúvida que só uma medição nova resolve vai para o relatório.

## Armadilhas achadas nos primeiros lotes

- A chave de um controle vira uniform do shader: não pode ser nome de função nem palavra reservada do GLSL (`floor`,
  `input`, `mix`, `sample`…). Com chave assim o shader não compila e o efeito deixa a imagem passar sem aviso.
  `node tools/compare/compila.mjs` compila todos os efeitos no OpenLuz aberto e lista os que falham.
- O gabarito é uma imagem parada com um controle mexido por vez: efeito que precisa de movimento (Freeze, Stop Motion),
  de transparência no clipe (Drop Shadow) ou de dois controles juntos (Twitch, Shift RGB) não aparece nele.
- Efeito que anima: a foto pode ter saído com a fase de um caso anterior (Tunnel, Recolor) ou atrasada um valor (Wave Warp).
- O Resolume às vezes apaga só o alfa e deixa a cor (Raster): o `confere` mede também contra a foto multiplicada pelo alfa.
- `node tools/compare/confere-tudo.mjs` roda todos e grava `saida/conf/_tudo.json`.
