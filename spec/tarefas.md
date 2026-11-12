# Tarefas e datas

- **Entra aqui:** a tarefa, a tabela de tarefas (com colunas, filtros, agrupar e ordenar), a data de intenção, o prazo máximo, o adiamento e a tela "Próximos dias".
- **Não entra aqui:** os destinos da tarefa no fechamento do dia (`checkout.md`), as prioridades (`prioridades.md`) e as tarefas de projeto (`projetos.md`).

## Tarefas *(1a)*

- Uma tarefa está aberta, finalizada ou abandonada. Não existe mais tarefa arquivada: as tarefas que estavam arquivadas voltaram para a lista de tarefas, sem data.
- A tarefa sem data é algo que eu vou fazer e ainda não sei quando. O que eu nem sei se quero fazer não é tarefa, e sim ideia (`ideias.md`). *(7)*
- Tarefas que ainda não foram finalizadas nem abandonadas moram na lista de tarefas. É dela que eu escolho as tarefas no planejamento do dia seguinte. A tarefa aguardando, que alguém me deve, fica fora dessa lista (`pessoas.md`, "Aguardando").
- Abandonar é como apagar: a tarefa abandonada some de todas as telas. Só o histórico de eventos guarda o abandono, para as métricas.
- Toda tarefa guarda o vínculo com a seção em que foi originalmente criada, com o título e o horário da seção. Se a seção está vinculada a um projeto, a tarefa também fica vinculada a ele.
- A tarefa tem uma data de intenção de execução, definida no fechamento do dia. Definir essa data é escolher o dia em que a tarefa aparece na nota do dia. Quando a data chega, a tarefa aparece sozinha na nota daquele dia.
- Conta como adiamento toda mudança da data de intenção para depois, também a que eu faço no fechamento do dia. Tirar a data de intenção, deixando a tarefa sem data, também conta como adiamento, e o "Fechar dias pendentes" conta o adiamento de cada tarefa que devolve sem data. A tarefa que eu deixo sem mexer na triagem do "Fechar o dia" vai para a lista sem data e não conta (`checkout.md`).
- O app guarda stats de quantos adiamentos e da distância entre a primeira intenção de execução e a ação final (finalizar, abandonar).

## A tabela de tarefas *(1b)*

- A tela de tarefas é uma tabela. A coluna "Tarefa" está sempre lá; as outras são "Data" (de intenção), "Prazo", "Projeto", "Criada em" e "Adiamentos". O botão "Colunas" mostra ou esconde cada uma delas, e "Tarefa" aparece com um cadeado. Sem nada escolhido, aparecem "Data", "Prazo" e "Projeto".
- Em cima da tabela, ficam a quantidade de tarefas que ela mostra, o "Agrupar por" e os botões "Filtros" e "Colunas".
- Clicar no título de uma coluna ordena a tabela por ela, e um segundo clique inverte a ordem. Uma seta no título mostra a coluna e o sentido. Sem nada escolhido, a tabela segue ordenada pela data de intenção, do dia mais próximo para o mais distante.
- Na ordem normal, "Tarefa" vai de A a Z; "Data" e "Prazo", do dia mais próximo para o mais distante; "Criada em", da mais antiga para a mais nova; "Projeto", pelo nome do projeto em ordem alfabética; "Adiamentos", da mais adiada para a menos adiada. As tarefas sem projeto, sem data ou sem prazo vão para o fim, nos dois sentidos. Quando empata, vale a data de intenção e depois a de criação.
- O botão "Filtros" abre um menu com as categorias à esquerda e as opções da escolhida à direita, com a opção ativa marcada. O botão mostra quantos filtros estão ativos, e "Limpar filtros" volta tudo ao normal. As categorias:
  - "Mostrar": as tarefas não concluídas, as concluídas ou todas. A tela sempre abre nas não concluídas, e essa escolha não fica guardada.
  - "Projeto": todos, só os projetos em foco (`projetos.md`), só as tarefas sem projeto, ou um projeto ativo.
  - "Próximos passos": todas as tarefas ou só os próximos passos (`prioridades.md`, "Próximos passos").
- Os filtros combinam entre si e com agrupar e ordenar, e valem também para as concluídas.
- Uma tarefa concluída aparece riscada, com o checkbox marcado: desmarcar reabre a tarefa, com a data que ela tinha. Ela não tem as ações do hover e não entra em "Selecionar várias".
- Eu posso agrupar por projeto, por data de intenção, por data de criação ou por quantidade de adiamentos, e ordenar por outra coluna (ou pela mesma). Sem nada escolhido, a tabela não tem grupos.
- Agrupado, cada grupo é uma linha com título e quantidade de tarefas, e eu posso recolher e abrir cada um. Os grupos seguem a ordem: projetos por nome, dias do mais cedo para o mais tarde, adiamentos da mais adiada ("Adiada 3 vezes") até "Nunca adiada", e "Sem projeto" ou "Sem data" por último. Na data de criação, o grupo é o dia em que a tarefa foi criada.
- O título do grupo de um dia usa "Hoje", "Amanhã" e "Ontem" quando é o caso, e a data curta nos outros dias. As datas das colunas seguem a mesma regra.
- O agrupar, a ordem, as colunas e os filtros de projeto e de próximos passos ficam guardados neste navegador. Os grupos sempre abrem abertos, e um botão recolhe ou abre todos de uma vez.
- No hover de uma linha, eu posso mudar a data de intenção e o prazo máximo, como na nota do dia, e abandonar a tarefa. Uma tarefa sem projeto também ganha "Projeto", que a vincula a um dos projetos ativos. Uma tarefa de projeto ganha "Próximo", que a marca como próximo passo do projeto, e de novo desmarca (`prioridades.md`, "Próximos passos") *(7)*. Abandonar é um ícone de lixeira, em todas as telas onde existe: nesta lista, na seleção de várias tarefas, na tela de um projeto (no hover de qualquer tarefa ativa) e na área de soltar do quadro do fechamento. Na lista e na tela do projeto ele pede um segundo clique para confirmar, e a tarefa sai da tela.
- Em "Selecionar várias", como no planejamento do fechamento do dia, a caixa de seleção some e eu clico na linha para selecionar, que fica destacada (Shift + clique pega um intervalo, e cada grupo tem "selecionar grupo") e, na barra de baixo, dou a todas a mesma data de intenção ou o mesmo prazo, tiro a data ou o prazo de todas, ou abandono todas, também com um segundo clique para confirmar. Esc ou "Pronto" sai da seleção.

## Prazo máximo e origem *(1b)*

- A tarefa ganha uma segunda data, o prazo máximo, que é opcional.
- Na lista de tarefas, clicar no texto de uma tarefa não faz nada: a lista não mostra mais de onde ela veio. A cápsula com o nome do projeto abre a página do projeto, exceto em "Selecionar várias".

## Próximos dias *(1b)*

- Uma tela mostra as tarefas agendadas para hoje e para os 2 próximos dias ativos, uma lista por dia, na ordem dos dias. Entram as tarefas abertas cuja data de intenção é um desses dias.
- Os dias inativos das configurações são pulados na contagem, como no "dia seguinte" do fechamento: numa sexta, a tela mostra sexta, segunda e terça. Uma tarefa agendada para um dia inativo dentro desse intervalo aparece mesmo assim, no dia dela.
- Nas tarefas, eu tenho as mesmas ações da nota do dia: finalizar pelo checkbox e, no hover, mudar a data de intenção e o prazo e promover a prioridade do dia. Uma tarefa cuja data muda vai para o dia novo, ou sai da tela se o dia novo ficar fora dela.
- A tela abre pela barra lateral, no grupo Hoje, logo abaixo de "Executar" (`prioridades.md`, "Tela "Executar""; `navegacao.md`, "Navegação").
