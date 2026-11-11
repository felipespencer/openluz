---
description: "Revisão geral do OpenLuz (12-01): achados por área, priorizados"
type: Findings
about: "OpenLuz"
---

# 12-01 — Achados da revisão geral

Código revisado: branch `efeitos-resolume`, commit `9a20760` (beta.65), em 2026-11-11. Nenhum arquivo do programa
foi alterado. A linha de base das baterias está em `12-01-LINHA-DE-BASE.md`.

**Como ler a coluna "Prova":**
- **REPRODUZIDO** — aconteceu no programa de desenvolvimento, com tecla e clique de verdade pelo CDP (porta 9333),
  numa pasta de dados de teste (`PROJ_USERDATA`).
- **conferido** — li o trecho no código e ele é como descrito; não rodei.
- **só lido** — veio da leitura (revisor por área), não reproduzido. O motivo vem junto quando tentei e não deu.
- **não reproduziu** — tentei e não aconteceu.

**Gravidade:** perde trabalho / trava / errado na tela / lento / limpeza. **Tamanho:** P, M, G.

## Resumo: os dez que mais importam

| # | Ao fazer isto… | …acontece isto | Prova | Tam. |
|---|---|---|---|---|
| 1 | Beat Snap ligado, clicar num clipe e remover a camada antes da batida | A imagem congela em tudo (monitor, prévia, projetores) até reabrir o programa. Qualquer erro dentro de um quadro faz o mesmo: o laço não tem proteção | REPRODUZIDO | P |
| 30 | Apertar Delete na Saída avançada | Apaga o slice **e também** o clipe selecionado na grade, que sai do ar atrás do editor | REPRODUZIDO | P |
| 13 | Abrir a composição B depois da A e dar Ctrl+Z | A grade volta a ser a A com o nome da B; o Ctrl+S seguinte grava a A dentro do arquivo da B | REPRODUZIDO | P |
| 14 | Clicar no ✕ de uma composição na lista | O arquivo é apagado do disco na hora, sem pergunta, sem lixeira e sem desfazer | REPRODUZIDO | P |
| 69 | Fechar um menu com Esc | O menu fecha e a camada selecionada sai do ar | REPRODUZIDO | P |
| 70 | Confirmar um diálogo com Enter (Sobre, Preferências…) | O clipe selecionado é disparado | REPRODUZIDO | P |
| 60 | O processo nativo do "tirar o fundo" morre (ou a máquina não tem) | A reserva entrega 1 máscara em 15 s (o nativo entrega 256 em 9 s): a silhueta fica parada sobre o vídeo | REPRODUZIDO | P |
| 63 | Mudar o tamanho da composição com a webcam virtual ligada | A câmera sai toda preta no Meet (falha firme do webcam-check; causa não apurada) | REPRODUZIDO pela bateria | ? |
| 46 | Ligar o notebook no wi-fi do lugar | Qualquer aparelho da rede consegue mandar a câmera dele para a casa selecionada da grade, sem senha, mesmo sem ninguém ter pedido "Celular" | conferido | P/M |
| 47 | Abrir um site como fonte "Página web" | O site recebe câmera, microfone e MIDI sem pergunta; o endereço pode vir dentro de uma composição recebida de outra pessoa | conferido | P |

Logo abaixo destes: 15 (F5 recarrega sem perguntar), 34 e 35 (saída de projetor que cai ou congela ao mexer nas telas),
62 (processo nativo que morre deixa webcam, rosto e recorte presos) e 2 (a Prévia suja o rastro do que está no ar).

---

## Área 1 — Motor e reprodução

| # | Onde | O que acontece | Prova / como reproduzir | Gravidade | Tam. |
|---|---|---|---|---|---|
| 1 | `app/app.js:1568-1621` `loop()` (o `requestAnimationFrame(loop)` é a última linha, sem `try`); gatilho em `:431` `tickBeat` → `:270` `trigger` (`L.clips` com `L` indefinido); `:609` `removeLayer` não limpa a fila | Uma exceção em qualquer etapa do quadro impede o reagendamento: tudo congela no último quadro; a interface responde mas nada anda | **REPRODUZIDO.** BPM 60, Beat Snap 16; clique na miniatura de um clipe da Camada 1 (fila = 1); menu Camada › Remover (5→4 camadas); antes da batida 43 quadros em 1,5 s, depois da batida **0 quadros em 2 s**; registro: `TypeError: Cannot read properties of undefined (reading 'clips') at trigger (app.js:270) at tickBeat (app.js:431) at loop` | trava | P |
| 2 | `app/engine.js:411-413` `applyChain` (`fxMem.get(f)`), usado também pela Prévia `:651`, por slice com fonte camada `:627` e pela transição `:581-583` | Efeito com memória (Trails, Acuarela, Delay RGB, Grid Cloner com atraso, Strokes, WarpSpeed…) na camada: clicar no nome de outro clipe (vai para a Prévia) põe a imagem da Prévia no rastro do telão; com Prévia do próprio clipe o rastro anda dois passos por quadro; o Delay RGB zera | só lido. Trails na camada, clipe A no ar, clicar no nome do clipe B | errado na tela | M |
| 3 | `app/effects2.js:245-246` Freeze (`P('frozen', 'Congelado', 1, …)`) | O efeito nasce congelando uma memória vazia: ao soltar o Freeze no clipe a imagem some até desligar e religar "Congelado" | só lido | errado na tela | P |
| 4 | `app/player.js:170` `advance` (não limpa `this.frame`), `app/engine.js:221-222` | Clipe preparado (.proj.mp4): ao pausar, mudar a velocidade ou inverter, pisca um quadro antigo | só lido | errado na tela | P |
| 5 | `app/app.js:1581` (só `liveClip(L)` recebe transporte) | Durante a transição, o clipe que sai não respeita loop nem fim: congela no último quadro | só lido. Transição de 3 s, disparar outro clipe a menos de 1 s do fim | errado na tela | P |
| 6 | `app/record.js:27` `begin`, `app/app.js:1612-1613` | Gravar uma Tela com a saída fechada: o tempo conta e o arquivo sai vazio; fechar a saída no meio congela a gravação calada | só lido | perde trabalho (a gravação) | P |
| 7 | `app/record.js:35`, `:57`; `main.js:377` `rec:save` | A gravação fica inteira na memória e atravessa o IPC de uma vez (≈60 MB/min a 8 Mb/s); gravação longa pode não salvar | só lido (pede gravar 30–60 min) | perde trabalho | M |
| 8 | `app/engine.js:152` (`fxMem` WeakMap), `:743-752` `geomFor`, `:768-770` `maskTexFor`; `app/clips.js:396` (`cloneFx` a cada desfazer) | Texturas de efeito, geometria de slice e máscaras nunca são liberadas à mão; cada Ctrl+Z, Cancelar ou preset cria tudo de novo (Delay RGB padrão = 13 texturas do tamanho da composição). Na medição de 5 min trocando clipes a memória ficou estável (ver linha de base); o caso do Ctrl+Z repetido não foi medido | só lido | lento / vazamento | M |
| 9 | `app/player.js:16` (`CACHE = 45`), `:102` | Cada clipe preparado que tocou em ré ou fora de 1× guarda até 45 quadros inteiros até ser apagado | só lido | lento | P |
| 10 | `app/app.js:1590` | Em monitor de 50, 75 ou 100 Hz, 30 qps vira 25 (o desenho só cai em múltiplos do período do monitor) | só lido (é conta, não medição) | lento | P/M |
| 11 | `app/effects2.js:231-232` Dilate, `:268-269` Kuwahara | Raio 4, 5 e 6 dão a mesma imagem que 3 (o laço do shader vai só até 3) | conferido | errado na tela | P |
| 12 | `app/effects2.js:258` Iterate | Esmaecer em 1 dá `pow(0, 0)`, indefinido no shader; pode apagar tudo conforme a placa | só lido, confiança baixa | errado na tela | P |

Conferido e sem achado: FBOs refeitos ao mudar o tamanho da composição; perda de contexto WebGL tratada (`app.js:76`);
premultiplicação consistente; relógios sem mistura de segundo com milissegundo; duração zero protegida; todo
parâmetro de efeito declarado é usado (fora o 11).

## Área 2 — Salvar, abrir e desfazer

| # | Onde | O que acontece | Prova / como reproduzir | Gravidade | Tam. |
|---|---|---|---|---|---|
| 13 | `app/app.js:1128` (`hist` nunca é zerado em `loadComposition` `:1106` nem em `resetComposition` `:1099`); `restoreComp` `:1164-1189` não repõe `state.name`; o mesmo em `laser.hist` | Com a A aberta, abrir a B e dar Ctrl+Z: a grade vira a A e o título continua B; Ctrl+S grava a A em `B.json` | **REPRODUZIDO.** rep-A (quadA.png) e rep-B (barras.png); abrir A, abrir B, Ctrl+Z → grade `quadA.png`, nome `rep-B`; Ctrl+S → `rep-B.json` no disco passou a ter `quadA.png` | perde trabalho | P |
| 14 | `app/browser.js:98` (`x.onclick … D.comps.remove(c.name)`), `main.js:376` (`unlinkSync`) | O ✕ da linha da composição apaga o arquivo na hora. Na mesma família: "Apagar preset" (`ao.js:796`) não confirma; salvar preset (`ao.js:793`) e "Salvar como" (`browser.js:89`) gravam por cima de nome existente sem avisar | **REPRODUZIDO** (o ✕): `rep-A.json` existia, um clique, sumiu, nenhum diálogo. O resto: conferido | perde trabalho | P |
| 15 | `main.js:210` (`if (input.key === 'F5') { win.webContents.reloadIgnoringCache(); …`) | F5 recarrega a janela sem perguntar: a composição não salva some e as saídas ficam sem conteúdo; a recuperação (`app.js:93`) só roda depois de travamento | só lido — tentei: a tecla mandada pelo CDP não chega ao processo principal, então não dá para provar por aqui; o trecho é inequívoco | perde trabalho | P |
| 16 | `app/clips.js:386` `deserializeClip` (`return null`), `app/composition.js:62-63` | Clipe que não abre vira casa vazia e o salvar seguinte o tira do arquivo | **não reproduziu** com arquivo renomeado no disco (imagem e vídeo): o clipe continuou na casa e no arquivo depois do Ctrl+S. Pode valer para câmera desligada, janela capturada fechada, YouTube sem internet e vídeo que leva mais de 8 s (`clips.js:59`) — não testado | perde trabalho (a conferir) | M |
| 17 | `app/app.js:1131` `undoBlocked` (`ao.open \|\| laser.open`), `:1186` | Sem retratos enquanto os editores estão abertos: um Ctrl+Z na grade, depois de fechar a Saída avançada ou o Laser, desfaz a sessão inteira de mapeamento | só lido | perde trabalho (volta com Ctrl+Y, se a pessoa notar) | M |
| 18 | `app/app.js:85-87` | O autosalvar só roda se houver clipe no deck atual (mapear uma hora com a grade vazia não gera nada para recuperar) e marca como salvo antes de gravar (se a gravação falha, não tenta de novo) | conferido | perde trabalho | P |
| 19 | `main.js:375` `comps:save`, `:370` `prefs:set`, `:363` `presets:save` (`writeFileSync` direto no arquivo final) | Queda de energia no meio da escrita trunca a composição (inclusive a automática, regravada a cada 30 s); `prefs.json` truncado vira `{}` em silêncio | conferido | perde trabalho | P |
| 20 | `app/app.js:1081` `newComp` (Ctrl+N `:1544`), `app/browser.js:99`, `main.js:372` | "Nova" e abrir outra composição não perguntam (o Ctrl+Z traz de volta, fora do ar e sem o nome); composição salva com nome começando em `_` grava e nunca aparece na lista | conferido | perde trabalho | P |
| 21 | `app/clips.js:366` (grava `laserId` = id do quadro), `app/composition.js:52` (lê como posição `lz.frames[idx]`); `app/laser.js:138` | Clipe de laser reabre apontando para o quadro seguinte, e o do último quadro some; Ctrl+Z dentro do Laser deixa os clipes de laser da grade órfãos | conferido | errado na tela | P |
| 22 | `app/ao.js:705` (`s.source = +v` guarda o id da camada), `app/engine.js:738`, `app/app.js:49` (`id: seq++` a cada abrir e a cada desfazer) | Slice com Fonte = camada sai preto ao abrir a composição e congela no último quadro depois de um Ctrl+Z na grade | só lido | errado na tela | M |
| 23 | `app/keymap.js:41`, `:47` (guardam ids de sessão), uso em `:163`, `:169` | Atalho com alvo "Este clipe" ou "Esta camada" não funciona (ou dispara outro) depois de fechar e abrir o programa; "Esta camada" quebra a cada Ctrl+Z | só lido (o keymap-check cobre mover o clipe, não reabrir) | errado no uso | M |
| 24 | `app/composition.js:28` (lista de campos da camada sem `ignoreColumn`); ligado em `app/app.js:1492`, usado em `:288` | "Ignorar disparo de coluna" não é salvo e some a cada Ctrl+Z: a camada de fundo ou de máscara volta a obedecer a coluna | conferido | errado na tela | P |
| 25 | `app/app.js:1162` `clipKey`, `:1176` | Ctrl+Z tira do ar o clipe que seguia tocando de outro deck; modelos 3D, textos e câmeras de celular são reaproveitados pela chave errada (com dois .glb, o desfazer troca nome e parâmetros entre eles) | só lido | errado na tela | M |
| 26 | `app/app.js:1149-1152` `undoComp` | O retrato inclui o mapa de atalhos e o nome, que o desfazer não sabe repor: o Ctrl+Z "não muda nada", segue o laço e desfaz a ação anterior | só lido | errado no uso | P/M |
| 27 | `app/composition.js:28` grava `on`, `:57-58` nunca lê; `app/app.js:1116` ramo morto; `app/app.js:89-96` não chama `openOutputs` | Depois de travar e reabrir sozinho, a composição volta com nada no ar e o projetor fica preto até alguém clicar em "Abrir saída" | conferido | errado na tela (no pior momento) | P |
| 28 | `app/composition.js:23` (só o deck atual passa por `restoreAnims`) | Valor animado de clipe que segue tocando de outro deck é salvo no valor do instante; cada clique enche o desfazer de passos vazios | só lido | errado no uso | P |
| 29 | `app/clips.js:181` (`toDataURL` em 1920×1080), `:395` | Ctrl+Z e abrir redesenham todos os textos em 1080p com PNG, na thread da saída | só lido, não medido (o retrato do desfazer em si mede 0,73 ms no undo-check) | lento | P |

Conferido e sem achado: sem referência circular no salvar; as pilhas de desfazer não dividem objeto com o estado
vivo; "Fechar sem salvar" exige clique.

## Área 3 — Saída avançada e janelas de saída

| # | Onde | O que acontece | Prova / como reproduzir | Gravidade | Tam. |
|---|---|---|---|---|---|
| 30 | `app/app.js:1553` (Delete), `:1554` (Enter), `:1544` (Ctrl+N), `:1550-1552` (Ctrl+X/C/V) sem `when: () => !ao.open`; `app/ao.js:158` | Os atalhos da grade continuam valendo com a Saída avançada aberta: Delete apaga o slice e limpa a casa selecionada; Enter (terminar a máscara) dispara o clipe; Ctrl+N zera a composição | **REPRODUZIDO.** quadA.png no ar, Saída avançada aberta com o slice selecionado, Delete: itens 1→0 **e** a grade ficou vazia | perde trabalho, tira do ar | P |
| 31 | `app/ao.js:150-160` `key` (não olha `.dlgOver`), `app/automape.js:359-364` | As teclas do Automape vazam para a Saída avançada que está atrás: Delete apaga o slice selecionado lá, Ctrl+Z desfaz a última edição de lá, setas empurram o slice | só lido | perde trabalho | P |
| 32 | `app/app.js:594-607` `automapeCreate` (`ao.show()` no fim), `app/ao.js:98` | "Criar" do Automape zera o desfazer da Saída avançada e troca o retrato do Cancelar: os itens criados só saem um por um | só lido | perde trabalho | P |
| 33 | `app/ao.js:154` (Esc = Cancelar); `app/menus.js:80`, `:83` + `app/automape.js:378`; `app/text-editor.js:58-59` | Esc descarta a sessão sem perguntar: na Saída avançada (é o desenhado; o soft-check confere), no Automape (Esc ou clique fora, e reabrir começa do zero) e no editor de texto mesmo com o foco num campo (ex.: "Buscar fonte") | conferido. No Automape tentei e meu teste não chegou a carregar o exemplo, então lá fica só lido | perde trabalho | P |
| 34 | `app/app.js:989-1000` `setScreens` (casa telas pela posição) | Com duas telas no ar, duplicar a primeira e desfazer (ou cancelar depois de apagar/duplicar tela, ou preset em outra ordem): a saída da outra tela fecha e não reabre | só lido (precisa de dois monitores com saída aberta) | trava (saída cai) | M |
| 35 | `app/ao.js:530` `removeScreen` | Apagar uma tela no editor não fecha a janela dela: o projetor fica com o último quadro parado e "Fechar saída" não a alcança | só lido | trava (saída congela) | P |
| 36 | `app/app.js:857` (única leitura dos monitores); `main.js:189`, `:193`; sem `display-added/removed` | Projetor ligado depois de abrir o programa não aparece nas listas; composição salva com monitor que não existe abre a saída como janela 960×540 no monitor de controle | só lido | errado na tela (saída no lugar errado) | M |
| 37 | `app/app.js:1514`, `main.js:188` | Saída › "Automático" com a saída já aberta reabre como janela pequena (o monitor ainda consta como ocupado) | só lido, confiança média | errado na tela | P |
| 38 | `app/ao.js:611` | Desligar uma tela no editor não desliga a saída, mas tira os slices dela da conta da emenda: os vizinhos perdem o degradê | só lido | errado na tela | P |
| 39 | `app/screens.js:230-233` `maskShape` (só trata círculo e triângulo) | Máscara "Hexágono" e "Coração" criam um retângulo | conferido | errado na tela | P |
| 40 | `app/screens.js:201` (`.slice(0, 8)`), `app/ao.js:654` | O 9º degradê ligado aparece no editor com alças e não age na imagem, sem aviso | conferido | errado na tela | P |
| 41 | `app/output.html:48`, `main.js:154` (campo `scale` nunca usado) | Com a escala do Windows diferente de 100% no projetor, a tela é medida em pixels lógicos (ex.: 1280×720 num projetor 1920×1080): imagem renderizada menor e ampliada | só lido, não medido | errado na tela | M |
| 42 | `app/ao.js:376` `down` (`pushUndo()` incondicional) | Cada clique num item empilha um desfazer vazio e apaga o refazer: Ctrl+Z "não faz nada" várias vezes | só lido | errado no uso | P |
| 43 | `app/app.js:1051` (`setInterval(renderScreens, 1000)`) | A lista "Telas" é refeita a cada segundo: o seletor de monitor fecha sozinho antes da escolha | só lido | errado no uso | P |
| 44 | `app/ao.js:290`, `:366` | Desenhar máscara de entrada e clicar numa tela na árvore: o palco fica vazio até Esc | só lido | errado na tela | P |
| 45 | `app/ao.js:391`, `:430`; `app/ao.js:202-213`; `app/engine.js:818` | O editor refaz o SVG inteiro a cada movimento do mouse (e o painel e a lista de telas no arrasto), na thread da saída | só lido, não medido | lento | M |

Conferido e sem achado: as escutas de mouse e teclado do editor não se acumulam (o `build()` roda uma vez).

## Área 4 — Processo principal e fronteiras (com o olhar de segurança)

| # | Onde | O que acontece e quem alcança | Prova | Gravidade | Tam. |
|---|---|---|---|---|---|
| 46 | `main.js:270-284` (`phoneSrv.listen(0, '0.0.0.0', …)`, sobe em toda abertura); `app/app.js:202-210` (`const alvo = phoneWait \|\| (state.sel ? …)`) | **Qualquer aparelho da mesma rede** manda a câmera para a grade, sem senha nem token, mesmo sem a fonte Celular ter sido pedida; o clipe entra na casa selecionada e substitui o que estava lá. Um celular que reenvia a câmera também troca o clipe selecionado | conferido | errado na tela + perde trabalho; alcance: rede local | P/M |
| 47 | `main.js:239-241` (`setPermissionRequestHandler((_wc, perm, cb) => cb(OK.has(perm)))`), `:326-335`; `app/clips.js:380-382` | **Qualquer site** aberto como Página web recebe câmera, microfone, MIDI e fontes locais sem pergunta (mesma sessão da janela de controle); o endereço vem da composição sem validação, então uma composição recebida abre um site escondido que liga câmera e microfone | conferido | privacidade; alcance: site aberto / arquivo recebido | P |
| 48 | `package.json:76` (`"electron": "^33.4.11"`) | A linha 33 do Electron está sem correções; o programa navega em sites quaisquer com esse Chromium | conferido (a versão); falhas específicas não avaliadas | segurança; alcance: site aberto | G |
| 49 | `main.js:55`, `:353` (`app.exit(0)` não passa pelo `before-quit` da `:402`) | Na queda da placa e no reabrir automático, o comando de desligar a saída do laser nunca é enviado | conferido; o que o aparelho faz não sei (Fase 4) | errado na tela, com risco físico | P |
| 50 | `app/browser.js:30` `savePrefs`, `main.js:370` (grava o objeto inteiro, sem mesclar) | Cada troca de pasta ou favorito na aba Arquivos apaga as outras preferências (pasta de gravação, mostrar qps, decodificação, tamanhos, "não mostrar o assistente") | conferido | errado no uso | P |
| 51 | `main.js:215` (`preventDefault` + aviso para a página, sem prazo); `app/app.js:1085` | O X não fecha se a página não responde, se o `app.js` falhou na carga ou se há qualquer diálogo aberto (sem aviso): sobra o Gerenciador de Tarefas | conferido | trava | P |
| 52 | `main.js:50-56` | A queda do processo de GPU reabre o programa sem contador: placa que cai na abertura faz abrir e fechar para sempre | só lido | trava | P |
| 53 | `main.js:173-176`, `:181-201`, `:293` | Recarga ou queda da janela de controle deixa páginas web escondidas tocando e janelas de saída mortas ocupando o monitor | só lido | lento / errado na tela | P |
| 54 | `main.js:300-307` (`...(o.wp \|\| {})`) | A página pode pedir uma janela com `nodeIntegration` ou `preload` à escolha (parâmetro "só para depurar", sem chamador) | conferido | segurança, só local | P |
| 55 | `main.js:368` `fs:list`, `:377` `rec:save`, `:380-383` `media:*`; `ia-imagem-main.js:203`; `main.js:72` `serveMedia` | Canais que leem ou gravam em qualquer caminho e não conferem o remetente (hoje só a janela de controle os alcança); caminho `\\servidor\…` numa composição recebida faz o Windows tentar autenticar lá | conferido no código; o caso UNC é só lido | segurança; alcance: arquivo recebido | M |
| 56 | `main.js:372` `comps:list`, `:377`, `:381-388` | Leituras e escritas síncronas no processo principal (que também bombeia o laser a cada 4 ms): disco lento engasga a interface e o laser | só lido, não medido | lento | M |
| 57 | `main.js:109-126` `prepareMedia` | O ffmpeg continua depois de fechar o programa; conversão interrompida deixa um `.proj.mp4` pela metade que aparece como preparado e não toca | só lido | limpeza / errado na tela | P |
| 58 | `lasercube.js:78`, `:121-139`, `:53-70` | Respostas UDP aceitas de qualquer remetente; quadro malformado gera erro a cada 4 ms; falha no `bind` da descoberta deixa a promessa sem resolver | só lido | errado na tela; alcance: rede local | P |
| 59 | `main.js:234` (`startsWith(APP_DIR)` sem barra), `:63` (svg servido como mídia), `:13-14`, `:60` (variáveis `PROJ_*` valem no instalado), `:262-266` (chave do certificado em claro); `output.html`, `yt.html`, `celular.html` sem CSP; `ia-main.js:193` (serviço "falso" ativo em produção) | Miudezas de fronteira | só lido | limpeza | P |

Conferido e certo: `contextIsolation`, `sandbox` e `nodeIntegration: false` em todas as janelas; Página web e YouTube
sem preload; CSP do `index.html`; `app://` confere host, extensão e `..`; servidor do YouTube só em 127.0.0.1;
`certificate-error` aceita só o próprio; chaves de IA cifradas com `safeStorage`, fora da página, da composição e do
registro; `spawn` sem shell; registro gira aos 2 MB.

## Área 5 — IA e peças nativas

| # | Onde | O que acontece | Prova / como reproduzir | Gravidade | Tam. |
|---|---|---|---|---|---|
| 60 | `app/segment-worker.js:57` (`st.get(id)` com o id do **pedido**; o do efeito vai em `fx`), `app/segment.js:77` | A reserva WebGPU do recorte guarda o estado por pedido: quase nunca devolve máscara, e cada pedido deixa memória para trás. É o que o programa usa quando o nativo morre e na versão web | **REPRODUZIDO.** Background Removal em andando.mp4: nativo 256 máscaras em 9 s; forçando a reserva (`seg.native = false`), **1 máscara em 15 s**, sem mensagem de erro | trava (máscara parada) | P |
| 61 | `app/segment.js:115` (`++this.natFails` sem valor inicial → `NaN`) | Se o nativo morre antes da primeira máscara, o programa nunca cai para a reserva; inferência pendurada ou DirectML em erro também não fazem cair nem recriar a sessão | conferido (o `natFails` só é zerado na `:37`); os outros casos só lidos | trava | P/M |
| 62 | `main.js:410`, `:420`, `:430` (`on('exit', () => { xProc = null; })`); `app/webcam.js:12`, `:19`, `:39`; `app/face.js` | Processo nativo que morre não avisa a janela nem é refeito: a webcam virtual congela no Meet com o menu dizendo "ligada", e desligar/ligar ficam pendurados; o Seguir rosto para no último rosto; o recorte cai nos 60 e 61 | só lido. Matar "OpenLuz webcam" no Gerenciador de Tarefas e tentar desligar e ligar | trava | M |
| 63 | `tools/webcam-check.mjs:82-85`; causa no programa não apurada (suspeitos: `app/webcam.js` `tick`, `engine.beginWebcam` depois de `setSize`) | Com a webcam virtual ligada, mudar a composição para 1080×1080: a câmera lida de volta sai toda preta (esquerda, meio e direita 0,0,0) | **REPRODUZIDO pela bateria**, firme: 2 rodadas e mais uma com 5 s de espera. No STATE a composição quadrada passava na beta.46 | errado na tela | ? (investigar) |
| 64 | `app/panels.js:570` `iaGerar` (sem `try/finally`) | Se a imagem gerada não abre, o botão ✦ Gerar daquele clipe não responde mais até recarregar a composição | só lido | trava de um controle | P |
| 65 | `app/segment.js:37` (aplica a máscara sem conferir o clipe do pedido) | Background Removal na camada: ao trocar de clipe, os primeiros quadros saem com a silhueta do clipe anterior | só lido | errado na tela | P |
| 66 | `app/model3d.js:195` `liberar` (sem chamador), `:132`, `:139-145` | Modelo 3D apagado não libera geometria, material nem textura; "Só contorno" com ♪ no Brilho refaz as arestas de toda malha a cada quadro | conferido (sem chamador); custo não medido | lento | P/M |
| 67 | `ia-imagem-main.js:77` (`finally { fim(); }` antes de ler o corpo); `ia-main.js:20` | Baixar a imagem gerada não tem tempo limite próprio; `ia.json` corrompido é lido como vazio e a próxima gravação apaga todas as chaves | só lido | trava branda / perde configuração | P |
| 68 | `app/seg-native.js:25`, `:117`; `app/seg-post.js:133`; `app/segment.js:102` | Estado e textura por efeito do recorte nunca liberados (ninguém manda `drop`); os três processos nativos ficam vivos depois do último uso; ramo `rvm` morto no nativo | só lido | limpeza | P/M |

Conferido e sem achado: a webcam virtual não escreve fora da memória (1920×1080 fixo, recusa tamanho diferente,
handles fechados); um só renderer WebGL para todos os clipes 3D; chaves fora de log, página e composição.

## Área 6 — Interface e controles

| # | Onde | O que acontece | Prova / como reproduzir | Gravidade | Tam. |
|---|---|---|---|---|---|
| 69 | `app/menus.js:16` (`stopPropagation` não segura o outro ouvinte do `window`), `app/app.js:1555` | Esc para fechar um menu (da barra ou do botão direito) também tira do ar a camada selecionada | **REPRODUZIDO.** quadA.png no ar, abrir o menu Composição, Esc: `on` 0 → −1 | errado no uso (apaga a saída ao vivo) | P |
| 70 | `app/menus.js:80` (o Enter do diálogo não para a tecla), `app/app.js:1554` | Enter num diálogo confirma e também dispara o clipe selecionado. No diálogo de fechar, com o foco no botão errado, pode dar "Salvar e fechar" seguido de "Fechar sem salvar" | **REPRODUZIDO** no Sobre: clipe selecionado fora do ar, Enter → no ar. O caso do diálogo de fechar é só lido | errado no uso | P |
| 71 | `app/app.js:158-170` `prepareClip` | "Preparar" grava o resultado na casa de origem mesmo que o clipe tenha sido movido: sobrescreve o que estiver lá e deixa o movido sem imagem | só lido | perde trabalho | P |
| 72 | `app/app.js:747-751`, `:739-743`, `:450-452`; `app/keymap.js:18` | Depois de escolher numa lista (mistura da camada, transição, Beat Snap) o foco fica nela: atalhos param e setas/letras trocam a mistura no ar | só lido | errado no uso | P |
| 73 | `app/app.js:785` + `:274`; `app/keymap.js:143-146` (sem `blur`); `app/apc40.js:60` | Clipe piano fica preso no ar: com Beat Snap (entra depois de soltar), ao soltar a tecla fora da janela (Alt+Tab) e sempre pela APC40 (o soltar do pad é ignorado) | só lido | errado no uso | P |
| 74 | `app/app.js:271` `trigger`, `:640-647` `tickAutopilot`, `:267` `queueTrigger` | O Autopilot rouba a seleção a cada troca (o painel Clipe pula); com Beat Snap ele refaz a grade inteira a cada quadro de espera e cliques se perdem | só lido | errado no uso / lento | P |
| 75 | `app/app.js:353-359` `removeColumn` (não ajusta `selCol`, `colSnap`, `pv`) | Coluna › Remover duas vezes na última coluna some com a coluna mas deixa os clipes dela sem casa (se um estava no ar, continua) | só lido | errado na tela | P |
| 76 | `app/keymap.js:194` (nudge só tem `onpointerdown`), `:239`; `app/browser.js:153`, `:165-166`; `app/app.js:1398-1402`, `:94`, `:1452` | Controles sem efeito ou textos errados: ◁\| e \|▷ mapeados em tecla não fazem nada; lista "Modo" dos Atalhos desabilitada com uma opção; cabeçalho "NDI · SPOUT · VIDEO ROUTER — fora por enquanto"; o diálogo MIDI descreve 4 linhas e o código usa 5; "Projecionista" ainda aparece em dois textos; câmera ligada depois não aparece até reabrir; "Disparo de clipe" da composição só muda o deck atual | só lido | errado no uso (regra: tudo que aparece funciona) | P cada |
| 77 | `app/app.js:174` `dropClip`, `app/clips.js:258` `freeClip`; `app/audio.js:100` `detach` sem chamador | Clipe apagado não solta câmera (a luz fica acesa), captura de tela, conexão do celular nem o áudio do vídeo; "Nova" e abrir composição acumulam o mesmo | só lido | lento / vazamento | M |
| 78 | `app/app.js:826-831` `renderPreview` | Cada vídeo visto na Prévia da aba Arquivos continua tocando escondido | só lido, não medido | lento | P |
| 79 | `app/app.js:1376` | Cada mensagem do fader da APC40 refaz a grade inteira (o knob tem espera de 80 ms, o fader não) | só lido | lento | P |
| 80 | `app/text-editor.js:15-21` (`open` só vira verdadeiro depois do `await`) | Dois cliques rápidos em "✎ Editar texto" na primeira vez podem abrir duas janelas; uma fica presa por cima do programa | só lido, confiança média | trava da interface | P |
| 81 | `app/panels.js:97`, `app/beat.js:74` | Tirar a animação (engrenagem › Basic) de Velocidade ou Volume: o painel mostra 1× / 100% e o vídeo segue no último valor animado | só lido | errado na tela | P |
| 82 | `app/panels.js:577` | IA generativa esperando o serviço refaz os dois painéis a cada segundo: barra arrastada solta, campo perde o foco | só lido | errado no uso | P |
| 83 | `app/panels.js:693-710`, `:500`; `app/text-editor.js:113` | Arrastar uma barra do Text Block codifica um PNG 1080p e refaz a grade a cada movimento; as miniaturas das versões da IA são redesenhadas a cada render do painel | só lido, não medido | lento | P/M |
| 84 | `app/app.js:840`, `app/clips.js:103-104` | Abrir composição com muitos vídeos calcula todas as ondas de áudio de uma vez, lendo cada arquivo inteiro (até 300 MB cada) | só lido | lento | P |
| 85 | `app/app.js:21` (`confirmBox` importado e nunca usado), `:88`, `:569`, `:577`, `:980`; `app/clips.js:304`, `:354`; `app/ao.js:8`, `:13`; `app/screens.js:8`; `app/engine.js:14`; `app/panels.js:22`; `app/beat.js:76`; `app/laser.js:276`; `app/app.js:564` (`recorder.refresh` não existe) | Código morto e restos de versões antigas | conferido por busca nos casos de import sem uso | limpeza | P |

Conferido e sem achado: diálogos removem o `keydown` ao fechar; atalhos não disparam ao digitar em campo de texto;
faders tratam `pointercancel`; não há ouvintes acumulando por abertura de menu ou diálogo; nenhum painel estoura com
clipe antigo, sem vídeo ou de duração zero.

## Baterias (defeito de bateria vira achado, não conserto)

| # | Onde | O que acontece | Prova | Tam. |
|---|---|---|---|---|
| B1 | `tools/grade-check.mjs` (não fecha o diálogo "Projetores" da abertura) | Num programa recém-aberto reprova 4 verificações: o primeiro clique cai no fundo do diálogo e só o fecha. O programa está certo (com o diálogo fechado, o clique na miniatura põe no ar) | REPRODUZIDO (o ponto clicado está sob `.dlgOver`) | P |
| B2 | `tools/ui-check.mjs` | Aprova 18/18 e o node cai na saída (`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`, código 3221226505): quem olha só o código de saída vê reprovação | REPRODUZIDO, 2 rodadas | P |
| B3 | `tools/rosto-check.mjs` | Intermitente: "com a pessoa parada o recorte não treme" reprovou numa rodada (centro variou 12,29%) e passou na outra | REPRODUZIDO | P |
| B4 | `package.json:10` (`"test": "node tools/selftest.mjs"`) | O arquivo não existe (`npm test` falha); o selftest roda por `PROJ_TEST=<pasta> electron .` | conferido | P |
| B5 | `tools/iagen-check.mjs` | Com chave do Higgsfield guardada, a parte do servidor de mentira fica de fora (17 verificações em vez de 27) | observado | — |

## Já registrado no STATE.md (não conta como achado novo)

- ui-check reprova às vezes no Esc logo depois do transport-check (intermitente antiga). Não apareceu nesta rodada.
- selftest "fonte Captura: página web" reprova com o Resolume aberto. Passou (75/75, Resolume fechado).
- modelo3d-check cai abaixo de 20 qps com o Resolume aberto. Passou (13/13).
- Pendências de recurso (Layer FFT, lupa do Clipe, presets do CRT etc.) são da Fase 2, não desta revisão.

## Desvios do plano

- O plano falava em beta.62; o código revisado é a beta.65 (commit `9a20760`), que é o estado atual do branch.
- A Área 6 foi dividida em duas leituras (são 500 KB de código): sete revisores no total.
- A medição de memória foi feita trocando clipes com clique de verdade por 5 minutos, numa pasta de dados de teste.
- O webcam-check com espera maior foi rodado de uma cópia fora do projeto; `tools/` não foi tocado.

## Escolha do Felipe

2026-11-11 — No checkpoint recomendei "graves, somando o 46, o 47 e o 63"; o Felipe respondeu **"pronto ok"**.
Leitura minha da resposta: aceitou a recomendação (ele não escreveu "graves" nem números).

Viram plano de conserto (12-02 em diante), nesta ordem:

1. **Trava e saída que cai:** 1, 34, 35, 51, 52, 80
2. **Perde trabalho ao salvar, abrir e desfazer:** 13, 14, 15, 17, 18, 19, 20
3. **Teclas que fazem o que não deviam e editores que descartam:** 30, 31, 32, 33 (mais 69 e 70, reproduzidos e do
   mesmo conserto de teclado)
4. **Recorte, webcam e nativos:** 60, 61, 62, 63 (investigar a causa primeiro), 64
5. **Rede e sites:** 46, 47
6. **Gravação e Preparar:** 6, 7, 71
7. **16** fica para conferir com câmera, captura e YouTube antes de decidir (não reproduziu com arquivo).

O resto da lista (errado na tela, lento, limpeza e as baterias B1–B5) fica para depois dos efeitos do Resolume.
As baterias B1 e B2 entram junto do primeiro plano só se atrapalharem a prova dos consertos.
