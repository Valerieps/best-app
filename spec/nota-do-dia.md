# Nota do dia e wiki

- **Entra aqui:** a captura ao longo do dia: nota do dia, seções, blocos, o editor, a paginação entre dias e a wiki pessoal.
- **Não entra aqui:** as regras das tarefas e das datas (`tarefas.md`), das prioridades (`prioridades.md`), do "Fechar o dia" (`checkout.md`) e dos compromissos (`compromissos.md`).

## Blocos e notas *(1a)*

- Blocos ∈ notas semânticas: notas são agrupamentos de blocos, e um bloco pode aparecer em mais de uma nota.
- A nota do dia é um agrupamento de blocos que só existe enquanto houver blocos vinculados a ela. Depois do fechamento completo, ela desaparece.
- A nota do dia é dividida em seções, como um notebook do Colab. Há dois tipos de seção: geral e reunião.
- Ao longo do dia, se eu entrar em reunião, abro uma seção de reunião para deixar separadas as notas que tomei naquela reunião.
- Toda seção guarda o horário de criação como metadado e pode ter um título opcional. Na nota do dia, o tipo da seção aparece como um ícone, e não como texto: um bloco de notas para a seção geral e duas pessoas para a de reunião *(1b)*. Ao digitar o título, o app sugere os projetos que já existem, como "Data Studios"; escolher um deles vincula a seção ao projeto, e o nome do projeto vira o título da seção, no lugar do que eu digitei para achá-lo. Numa seção já vinculada, que mostra um ícone de vínculo ao lado do título, clicar no título abre as opções: "Reverter para quadro branco", que mantém o título; "Renomear projeto"; e a lista de todos os outros projetos ativos, para eu vincular a seção a outro, e as tarefas da seção vão junto. Enquanto nada é escolhido, o Enter não muda nada. Se eu digito no título, a lista de projetos é filtrada pelo texto, aparece "Criar o projeto…" e a primeira opção passa a ser renomear o projeto para o texto digitado. Renomear muda o nome do projeto no app todo e o título de todas as seções vinculadas a ele que ainda têm o nome antigo; uma seção a que eu dei outro título fica com ele. Por baixo dos panos, os projetos existem desde o 1a, ainda sem funcionalidades próprias: eles só agrupam as seções, tarefas e notas vinculadas.
- Toda seção nasce como quadro branco, ou seja, sem vínculo com projeto, a menos que eu escolha um projeto ao dar o título. O quadro branco é um estado, não um tipo: uma seção geral ou de reunião pode estar em quadro branco. A qualquer momento, ele pode ser convertido em um projeto novo ou vinculado a um projeto existente.
- É possível abrir mais de uma seção geral. Separar o conteúdo em seções ao longo do dia funciona como uma pré-triagem.
- Há dois tipos de bloco: tarefa e nota geral. Uma linha que começa com `[]` seguido de um espaço é tarefa, em qualquer tipo de seção; todo o resto é nota geral. A partir da seção 5, entra o compromisso (`compromissos.md`).

## Execução *(1a)*

- Interface: uma página parecida com uma nota do Obsidian ou Notion, ou seja, como se fosse um arquivo de texto, mas com blocos estruturados de conteúdo.
- *(1b)* A nota ocupa a área principal toda, de lado a lado, como no Obsidian, sobre a área central branca (veja `navegacao.md`, "Global"). Cada parte do dia (prioridades, "De outros dias", seções) fica marcada só pela barra colorida à esquerda e por uma linha fina embaixo, para eu continuar vendo onde uma seção acaba e a outra começa. Cada seção tem um espaço livre de umas três linhas embaixo, como se já tivesse algumas linhas escritas: dá respiro, e uma seção nova já nasce com espaço para eu escrever. No modo foco, a parte ocupa também a altura toda.
- O dia abre com uma seção geral já criada. As tarefas com data de intenção para aquele dia, incluindo as escolhidas no fechamento do dia anterior, entram no topo dela, sem distinção visual das tarefas criadas no dia. A partir do 1b, elas ficam numa seção própria, "De outros dias", que de começo vem logo acima da primeira seção geral e que eu posso mudar de lugar como as outras (veja "Ordem das linhas e das seções").
- Ao longo do dia eu vou coletando tudo em uma única nota, de forma sequencial, como um bloco de notas. A ideia é não gastar processamento mental escolhendo onde salvar cada coisa.
- Cada tarefa tem um checkbox para finalizar.
- Clicar no espaço vazio abaixo das linhas de uma seção, até a próxima seção, abre uma linha nova no fim dela, já com o cursor, para eu escrever sem ir até o fim da última linha e apertar Enter. A linha só é gravada quando eu digito; se eu sair dela vazia, ela some. Numa seção ainda sem linhas, clicar em qualquer lugar dela, fora do título e dos botões, já me põe na primeira linha. Só a nota de hoje ganha linhas novas.
- Enquanto escrevo, posso apagar uma linha ou tirar o `[]` do começo para mudar o tipo, como num editor de texto, mas só em blocos criados no dia e ainda não triados. Uma tarefa que veio de outro dia não some quando eu apago o texto: para tirá-la de circulação, eu tiro a data dela ou abandono.
- Se eu abrir o app sem ter fechado o dia anterior, a nota de hoje abre normalmente, com um aviso no topo e um botão para fechar o dia pendente.
- A barra lateral dá acesso às listas: tarefas e wiki pessoal (`navegacao.md`, "Navegação").
- No final do dia, ou na manhã seguinte, eu clico em "Fechar o dia".

## Seções e atalhos *(1b)*

- A seção de reunião não tem campos próprios: os campos de participantes e de link para documentos saíram da nota do dia (15/10/2026). O que já estava preenchido continua guardado.
- Eu posso interagir com cada tipo de bloco com atalhos que aparecem com mouse hover. Na tarefa: finalizar, definir a data de intenção e o prazo máximo, e promover a prioridade. Na nota geral: converter em tarefa.
- No topo da nota do dia, onde aparece a data, um botão de setinha pagina entre os dias. Ele passa somente pelas notas que ainda têm itens pendentes.

## Formatação *(1b)*

Eu posso formatar o que escrevo na nota do dia com Markdown, como no Obsidian. O texto continua sendo o Markdown que eu digitei; o app só mostra a formatação.

- Cada linha pode ser um cabeçalho, de quatro níveis (`#` a `####` seguido de espaço), ou um item de lista com marcador (`- `) ou numerada (`1. `). Dentro da linha, posso usar negrito (`**texto**`), itálico (`_texto_` ou `*texto*`) e link (`[texto](endereço)`). Um endereço que começa com `http://` ou `https://` já vira link sozinho.
- Enquanto o cursor está na linha, eu vejo o Markdown cru, já no tamanho do cabeçalho; fora dela, a linha aparece formatada. Clicar num link abre o endereço numa aba nova; clicar no resto da linha volta a editar.
- No canto direito do cabeçalho de cada seção geral ou de reunião, ao lado do ícone do modo foco, ficam ícones discretos, que aparecem quando passo o mouse na seção ou estou escrevendo nela: negrito, itálico, cabeçalhos 1 a 4, lista, lista numerada, diminuir e aumentar o recuo, e link. Eles formatam a linha em que estou ou, se nenhuma linha da seção está com o cursor, a última linha da seção. Clicar de novo no mesmo formato tira o formato.
- Atalhos (⌘ no lugar de Ctrl no Mac): Ctrl + B para negrito, Ctrl + I para itálico, Ctrl + K para link, Ctrl + Shift + 1 a 4 para os cabeçalhos, Ctrl + Shift + 8 para lista e Ctrl + Shift + 7 para lista numerada. Num item de lista, Tab aumenta o recuo e Shift + Tab diminui, até 4 níveis; fora de lista, o Tab continua como sempre.
- O link sem nada selecionado entra como `[link](https://)`, com "link" selecionado para eu escrever o texto; com um texto selecionado, ele vira o texto do link e o endereço fica selecionado para eu digitar; com um endereço selecionado, ele vira o destino.
- Enter num item de lista começa a linha seguinte com o mesmo marcador e o mesmo recuo, e a lista numerada continua a contagem. Enter num item vazio tira o marcador e sai da lista, sem criar linha.
- A formatação vale para notas e tarefas, e não muda o tipo do bloco. Fora da nota do dia (wiki, checkout, listas), o texto ainda aparece com o Markdown cru.

## Ordem das linhas e das seções *(1b)*

- Eu posso mudar a ordem das linhas (tarefas e notas) dentro de uma seção: arrastando pela alça que aparece à esquerda da linha só no hover do mouse (ela some enquanto eu digito e volta quando eu mexo o mouse), ou com Alt + ↑/↓ com o cursor na linha. Vale para todas as linhas da seção, mesmo as já triadas ou finalizadas, porque a ordem não muda data, status nem triagem. Uma linha não muda de seção assim.
- As tarefas de outros dias mudam de ordem só entre elas, dentro da seção "De outros dias". A ordem vale para aquele dia: uma tarefa que chega depois, ou que vai para outro dia, entra no fim das tarefas de outros dias.
- Eu também posso mudar a ordem das seções da nota do dia: as seções gerais e de reunião, a seção "De outros dias" e o bloco de prioridades, quando ele não está fixado no topo. Arrasto pela alça à esquerda da seção, que também só aparece no hover do mouse e some enquanto eu digito, ou uso Ctrl + Shift + ↑/↓ (⌘ + Shift no Mac) com o cursor em qualquer linha, no título da seção ou na alça.
- Cada dia tem a sua ordem. Um dia novo começa no padrão: prioridades, tarefas de outros dias e depois as seções na ordem em que foram criadas. Uma seção nova entra no fim.
- Eu posso reordenar linhas e seções em qualquer dia, inclusive nos dias passados com itens pendentes: mudar a ordem não cria linhas.
- O "Fechar o dia" segue a ordem da nota do dia (`checkout.md`, "Fechar o dia").

## Modo foco *(1b)*

Quando a nota do dia acumula muitas seções, eu posso focar numa só, para escrever sem distração.

- Dá para focar qualquer parte da nota: uma seção geral ou de reunião, a seção "De outros dias" ou o bloco de prioridades, mesmo fixado no topo.
- Eu entro no foco pelo ícone de seta dupla na diagonal, à direita do cabeçalho da parte, ou com Ctrl + Shift + Enter (⌘ + Shift + Enter no Mac) com o cursor em qualquer lugar dela.
- No foco, a tela mostra só a parte ampliada e a barra lateral. Somem o título do dia, as setas entre os dias, o "Fechar o dia", os avisos do topo e os lembretes que voltaram. Por isso não há como trocar de dia com o foco aberto.
- Entrar e sair do foco é uma transição suave: a parte aparece aos poucos, sem um corte seco.
- Eu saio do foco pelo ícone de reduzir, que fica no lugar do ícone de ampliar, ou pelo mesmo atalho. Escrever, criar linhas e editar funcionam como na nota inteira.
- O foco sobrevive a recarregar a página e a passar por outras telas: "Hoje" volta para a parte em foco.
- O app nunca sai do foco sozinho, para não interromper um fluxo de pensamento. Se virar meia-noite, eu continuo escrevendo na mesma parte, e nem o "Iniciar Dia" nem o "Fechar o dia" começam sozinhos. Se a parte em foco deixar de existir, a tela avisa e espera eu sair.

## Wiki pessoal

- A wiki pessoal, para onde vão sozinhas as notas gerais no fim do dia, é interna ao app. No núcleo, ela é uma lista em ordem cronológica, em que cada entrada reúne as notas de uma seção, com o título e o horário dela. As notas não moram num lugar só: cada nota também fica ligada ao projeto da seção de onde veio, quando a seção tem um. *(1a)*
- Em cada entrada da wiki, posso descartar as notas daquela seção. *(1a)* A partir da seção 4, também posso vinculá-las como recurso de um objetivo ou projeto (`objetivos.md`).
- A wiki pessoal pode ser ordenada por linha temporal ou por ordem alfabética e tem um campo de busca textual. As notas também podem ser vistas por tipo ou por projeto vinculado. *(1b)*
