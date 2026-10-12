# Nota do dia e wiki

- **Entra aqui:** a captura ao longo do dia: nota do dia, seções, blocos, o editor, a paginação entre dias e a wiki pessoal.
- **Não entra aqui:** as regras das tarefas e das datas (`tarefas.md`), das prioridades (`prioridades.md`), do checkout (`checkout.md`) e dos compromissos (`compromissos.md`).

## Blocos e notas *(1a)*

- Blocos ∈ notas semânticas: notas são agrupamentos de blocos, e um bloco pode aparecer em mais de uma nota.
- A nota do dia é um agrupamento de blocos que só existe enquanto houver blocos vinculados a ela. Depois do checkout completo, ela desaparece.
- A nota do dia é dividida em seções, como um notebook do Colab. Há dois tipos de seção: geral e reunião.
- Ao longo do dia, se eu entrar em reunião, abro uma seção de reunião para deixar separadas as notas que tomei naquela reunião.
- Toda seção guarda o horário de criação como metadado e pode ter um título opcional. Ao digitar o título, o app sugere os projetos que já existem, como "Data Studios"; escolher um deles vincula a seção ao projeto. Por baixo dos panos, os projetos existem desde o 1a, ainda sem funcionalidades próprias: eles só agrupam as seções, tarefas e notas vinculadas.
- Toda seção nasce como quadro branco, ou seja, sem vínculo com projeto, a menos que eu escolha um projeto ao dar o título. O quadro branco é um estado, não um tipo: uma seção geral ou de reunião pode estar em quadro branco. A qualquer momento, ele pode ser convertido em um projeto novo ou vinculado a um projeto existente.
- É possível abrir mais de uma seção geral. Separar o conteúdo em seções ao longo do dia funciona como uma pré-triagem.
- Há dois tipos de bloco: tarefa e nota geral. Uma linha que começa com `[]` seguido de um espaço é tarefa, em qualquer tipo de seção; todo o resto é nota geral. A partir da seção 5, entra o compromisso (`compromissos.md`).

## Execução *(1a)*

- Interface: uma página parecida com uma nota do Obsidian ou Notion, ou seja, como se fosse um arquivo de texto, mas com blocos estruturados de conteúdo.
- O dia abre com uma seção geral já criada. As tarefas com data de intenção para aquele dia, incluindo as escolhidas no checkout do dia anterior, entram no topo dela, sem distinção visual das tarefas criadas no dia.
- Ao longo do dia eu vou coletando tudo em uma única nota, de forma sequencial, como um bloco de notas. A ideia é não gastar processamento mental escolhendo onde salvar cada coisa.
- Cada tarefa tem um checkbox para finalizar.
- Enquanto escrevo, posso apagar uma linha ou tirar o `[]` do começo para mudar o tipo, como num editor de texto, mas só em blocos criados no dia e ainda não triados. Uma tarefa que veio de outro dia não some quando eu apago o texto: para tirá-la de circulação, eu arquivo ou abandono.
- Se eu abrir o app sem ter feito o checkout do dia anterior, a nota de hoje abre normalmente, com um aviso no topo e um botão para fazer o checkout pendente.
- A barra lateral dá acesso às listas: tarefas ativas, tarefas arquivadas e wiki pessoal (`navegacao.md`, "Navegação").
- No final do dia, eu clico em "fazer checkout".

## Seções e atalhos *(1b)*

- A seção de reunião ganha dois campos opcionais: participantes e link para documentos.
- Eu posso interagir com cada tipo de bloco com atalhos que aparecem com mouse hover. Na tarefa: finalizar, definir a data de intenção e o prazo máximo, e promover a prioridade. Na nota geral: converter em tarefa.
- No topo da nota do dia, onde aparece a data, um botão de setinha pagina entre os dias. Ele passa somente pelas notas que ainda têm itens pendentes.

## Wiki pessoal

- A wiki pessoal, para onde vão as notas gerais, é interna ao app. No núcleo, ela é uma lista em ordem cronológica, em que cada entrada reúne as notas de uma seção, com o título e o horário dela. As notas não moram num lugar só: cada nota também fica ligada ao projeto da seção de onde veio, quando a seção tem um. *(1a)*
- A wiki pessoal pode ser ordenada por linha temporal ou por ordem alfabética e tem um campo de busca textual. As notas também podem ser vistas por tipo ou por projeto vinculado. *(1b)*
