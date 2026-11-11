# OpenLuz

**[Português](#português) · [English](#english)**

---

## Português

OpenLuz é um software livre e de código aberto pra VJ, performance visual ao vivo e projeção mapeada. A inspiração é o Resolume, com melhorias pensadas por quem faz projeção na rua e em palco.

Vai ter três versões: **web** (abre no navegador), **Windows** e **Android**, todas com o mesmo motor por baixo.

> **Status:** a versão **Windows** (10 e 11, 64 bits) está na **0.2.0**. Web e Android vêm depois, do mesmo código.

### O que já tem (Windows)

- **Grade de clipes** no jeito do Resolume: camadas, colunas, decks, grupos, crossfader, BPM com Beat Snap, autopilot, transporte do clipe com entrada, saída e cue points
- **Fontes:** vídeo, imagem, GIF, texto (com editor de cartaz), geradores, câmera, captura de tela, de janela e de página web, YouTube, celular como câmera pela rede local, modelos 3D (GLB, OBJ, FBX, STL e outros)
- **Efeitos e misturas** no modelo do Resolume, aplicados no clipe, na camada ou na composição, com animação por batida, tempo ou som
- **Tirar o fundo** de pessoas com modelos que rodam no próprio computador, e **Seguir rosto** no clipe de câmera
- **Saída avançada:** uma tela por projetor, slices, quatro cantos, malha com bezier, máscaras, emenda entre projetores (soft edge) por degradê, presets
- **Automape:** assistente que fatia uma foto da cena em slices e máscaras (nesta versão com fotos de exemplo; em foto nova o fatiamento é à mão)
- **Webcam virtual:** a composição aparece como câmera no Meet e afins (precisa do [OBS](https://obsproject.com) instalado)
- **Gravação** da composição ou de uma tela, direto para o disco
- **Atalhos de teclado** configuráveis
- Funciona offline. Os recursos de IA generativa são opcionais e usam serviços de terceiros, com a sua chave

Ainda **em teste com o equipamento**: laser (LaserCube por Wi-Fi) e a controladora APC40 mkII.

### O que vem depois

Celular como controle (pads, sliders, desenho), plugins, versão web e Android, mais efeitos igualados ao Resolume. O rumo está em [ROADMAP.md](ROADMAP.md).

### De onde vem

O OpenLuz nasce da experiência do [projecionista.app](https://projecionista.app), ferramenta de projeção mapeada feita no Brasil pra rede [Projetemos](https://projetemos.org). A partir de agora o OpenLuz é o motor, e o projecionista.app passa a ser uma versão feita em cima dele.

### Idioma

A interface começa em português. A tradução pra inglês e outros idiomas vem depois.

### Baixar

Instalador do Windows (MSI) e versão sem instalar (zip) na página de [releases](https://github.com/felipespencer/openluz/releases).

### Rodar do código (versão Windows, hoje)

```sh
npm install
npm start
```

O programa é feito em Electron, sem bundler: `main.js` é o processo principal e a pasta `app/` é a interface e o motor
(WebGL2). Como usar: [COMO-USAR.md](COMO-USAR.md). O instalador sai com `npx electron-builder --win msi zip --x64`.

### Testar antes de mexer

O projeto tem baterias que usam o programa com mouse e teclado de verdade (pelo protocolo de depuração do Chromium).
Abra o programa com `npx electron . --remote-debugging-port=9333` e rode, por exemplo, `node tools/trava-check.mjs` ou
`node tools/salvar-check.mjs`. Cada arquivo `tools/*-check.mjs` explica no começo o que confere.

### Contribuir

O projeto ainda está tomando forma. Ideias, relatos de uso e bugs são bem-vindos nas [issues](https://github.com/felipespencer/openluz/issues).

### Licença

GPL-3.0. Você pode usar, estudar, modificar e distribuir o OpenLuz, mas quem distribuir uma versão modificada tem que liberar o código dela com a mesma licença. Texto completo em [LICENSE](LICENSE).

### Autor

Felipe Spencer · [Videodifusora](https://github.com/felipespencer)

---

## English

OpenLuz is a free and open source tool for VJing, live visual performance and projection mapping. It's inspired by Resolume, with improvements shaped by people who project on streets and stages.

It will ship in three versions: **web** (runs in the browser), **Windows** and **Android**, all sharing the same engine underneath.

> **Status:** the **Windows** version (10 and 11, 64-bit) is at **0.2.0**. Web and Android come later, from the same code.

### What it does today (Windows)

- **Clip grid** in the Resolume style: layers, columns, decks, groups, crossfader, BPM with Beat Snap, autopilot, clip transport with in, out and cue points
- **Sources:** video, image, GIF, text (with a poster-style editor), generators, camera, screen, window and web page capture, YouTube, phone as a camera over the local network, 3D models (GLB, OBJ, FBX, STL and more)
- **Effects and blend modes** modelled on Resolume, on the clip, the layer or the composition, animated by beat, time or sound
- **Background removal** for people, with models that run on your own computer, and **face tracking** on camera clips
- **Advanced output:** one screen per projector, slices, corner pin, bezier mesh, masks, gradient-based edge blending between projectors, presets
- **Automape:** a wizard that slices a photo of the scene into slices and masks (in this version with sample photos; on a new photo you slice by hand)
- **Virtual webcam:** the composition shows up as a camera in Meet and similar apps (needs [OBS](https://obsproject.com) installed)
- **Recording** of the composition or of a screen, straight to disk
- Configurable **keyboard shortcuts**
- Works offline. Generative AI features are optional and use third-party services with your own key

Still **being tested on real hardware**: laser (LaserCube over Wi-Fi) and the APC40 mkII controller.

### What comes next

Phone as a controller (pads, sliders, drawing), plugins, web and Android versions, more effects matched to Resolume. The roadmap (in Portuguese) is in [ROADMAP.md](ROADMAP.md).

### Background

OpenLuz grows out of [projecionista.app](https://projecionista.app), a projection mapping tool made in Brazil for the [Projetemos](https://projetemos.org) network. From now on OpenLuz is the engine, and projecionista.app becomes a version built on top of it.

### Language

The interface starts in Portuguese. English and other languages will come later.

### Download

Windows installer (MSI) and portable zip on the [releases](https://github.com/felipespencer/openluz/releases) page.

### Run from source (Windows version, for now)

```sh
npm install
npm start
```

The app is built on Electron with no bundler: `main.js` is the main process and the `app/` folder holds the interface
and the engine (WebGL2). Usage (Portuguese): [COMO-USAR.md](COMO-USAR.md). The installer is built with
`npx electron-builder --win msi zip --x64`.

### Test before you change things

The project ships test suites that drive the app with real mouse and keyboard events (through the Chromium debugging
protocol). Start the app with `npx electron . --remote-debugging-port=9333` and run, for instance,
`node tools/trava-check.mjs` or `node tools/salvar-check.mjs`. Each `tools/*-check.mjs` file says at the top what it checks.

### Contributing

The project is still taking shape. Ideas, usage reports and bug reports are welcome in the [issues](https://github.com/felipespencer/openluz/issues).

### License

GPL-3.0. You're free to use, study, change and share OpenLuz, but if you distribute a modified version you have to release its source under the same license. Full text in [LICENSE](LICENSE).

### Author

Felipe Spencer · [Videodifusora](https://github.com/felipespencer)
