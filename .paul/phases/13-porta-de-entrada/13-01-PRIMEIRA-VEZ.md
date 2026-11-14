---
description: "Porta de entrada (13-01): a primeira abertura do OpenLuz medida, o que trava um novato e os caminhos para assinar o instalador"
type: Findings
about: "OpenLuz"
---

# 13-01 — A primeira vez

Medido em 2026-11-14 na **0.3.0-beta.2 instalada**, com uma pasta de dados nova (só com a marca que impede a cópia dos dados
antigos), um monitor só, janela de 1584×861. Roteiro: `node tools/primeira-vez.mjs`; fotos em `tools/compare/saida/primeira-vez/`.

## 1. O caminho, passo a passo

| Passo | O que aparece | Um novato saberia? |
|---|---|---|
| Abrir | Grade vazia (5 camadas × 8 colunas), nenhum diálogo, nome "sem nome". Aba Arquivos com atalhos: Vídeos, Imagens, Área de trabalho, Documentos, Downloads e os discos | Sim. Mas **a grade vazia não diz o que fazer**; a única dica é a caixa de Ajuda ("Passe o mouse sobre um item…") |
| Aba Fontes | 20 fontes prontas; duplo clique põe a fonte numa casa mesmo sem nada selecionado | Sim |
| Pôr um clipe na casa | O clipe fica na casa e **não vai para o ar**; o quadro Composição continua preto | **Não**: nada indica que falta clicar. É o ponto em que eu esperaria uma pessoa travar |
| Clicar na casa | Vai para o ar; aparece no quadro Composição | Sim, depois de descobrir |
| Abrir saída | Abre uma janela "OpenLuz — saída"; o botão vira "Fechar saída" e ao lado diz "saída no ar" | Sim |
| Ctrl+S | Abre a aba Composições com o campo "nome da composição" e OK | Sim |

Tudo funcionou na primeira tentativa. Nenhuma exceção.

## 2. O que trava ou assusta quem chega de fora

1. **O aviso do Windows no instalador** (SmartScreen): é a primeira coisa que a pessoa vê. Ver a seção 4.
2. **Clipe na casa não é clipe no ar.** Sugestão (não feita): pôr no ar sozinho o primeiro clipe de uma grade vazia, ou uma frase na grade vazia.
3. **Grade vazia sem convite.** Sugestão (não feita): "Arraste um vídeo para cá ou escolha uma fonte" enquanto não há clipe nenhum.
4. **Tudo em português.** A página de primeiros passos em inglês traduz os nomes dos botões; a interface não.
5. **273 MB** de download.
6. **Com segundo monitor**, o assistente Projetores aparece na primeira vez (não medido hoje: só havia um monitor ligado).

## 3. O que eu não conferi

- O instalador rodando com janela (instalei em modo silencioso): não sei que telas ele mostra.
- Arrastar um arquivo de uma pasta do Windows para a grade (o CDP não faz esse arrasto); está na página porque o COMO-USAR diz e o arrasto pela aba Arquivos foi provado no 12-08.
- F e duplo clique para tela cheia na janela de saída (vem do COMO-USAR).
- Um computador que não seja este.

## 4. Assinatura do instalador

| Caminho | Custo | O que pede | O que muda | Fonte |
|---|---|---|---|---|
| **SignPath Foundation** (programa para código aberto) | gratuito | projeto de código aberto com repositório público; todos da equipe com autenticação em dois fatores; publicar uma página de "política de assinatura" dando o crédito; candidatura e aprovação (prazo não informado) | o publicador que aparece no Windows é "SignPath Foundation", não o Felipe; a assinatura passa a ser feita num build automático | signpath.org |
| **Certum Open Source, na nuvem** | a partir de € 49 (não confirmei se é por ano) | certificado em nome de pessoa física, com conferência de identidade; aparece como "Open Source Developer, <nome>" | assina daqui mesmo, com o programa da Certum como chave virtual | shop.certum.eu |
| **Azure Artifact Signing** (antigo Trusted Signing) | US$ 9,99 por mês | pessoa física só nos EUA e no Canadá; empresa em EUA, Canadá, União Europeia e Reino Unido | não serve para o Felipe hoje | learn.microsoft.com |
| Certificado pago comum ou EV | não pesquisado em detalhe | empresa ou pessoa, com chave em token | — | — |
| Loja da Microsoft | não pesquisado | conta de desenvolvedor, pacote MSIX | outro formato de instalador | — |

**Recomendação:** candidatar o OpenLuz ao SignPath Foundation. É gratuito, o projeto já cumpre o que eu consegui confirmar
(GPL-3.0, repositório público) e não pede documento nem pagamento do Felipe. O custo é meu: montar o build automático e a
página de política. Se a candidatura demorar ou for recusada, a Certum Open Source é a segunda opção.

**Não confirmado:** se um instalador assinado por qualquer desses caminhos deixa de mostrar o aviso do SmartScreen logo na
primeira versão, ou só depois de um número de downloads; o prazo de aprovação do SignPath; a lista completa de exigências
dele (a página oficial veio cortada na pesquisa).
