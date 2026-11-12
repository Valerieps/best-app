# Tarefas e prazos

- **Entra aqui:** a tarefa, a tabela de tarefas (com colunas, filtros, agrupar e ordenar), o fim da data de intenção, o prazo máximo e o fim do adiamento.
- **Não entra aqui:** os destinos da tarefa no fechamento do dia (`checkout.md`), as prioridades (`prioridades.md`) e as tarefas de projeto (`projetos.md`).

## Tarefas *(1a)*

- Uma tarefa está aberta, finalizada ou abandonada. Não existe mais tarefa arquivada: as tarefas que estavam arquivadas voltaram para a lista de tarefas, sem data.
- A tarefa é algo que eu vou fazer. O que eu nem sei se quero fazer não é tarefa, e sim ideia (`ideias.md`). *(7)*
- Tarefas que ainda não foram finalizadas nem abandonadas moram na lista de tarefas. É dela que eu escolho as tarefas no planejamento do dia seguinte. A tarefa aguardando, que alguém me deve, fica fora dessa lista (`pessoas.md`, "Aguardando").
- Abandonar é como apagar: a tarefa abandonada some de todas as telas. Só o histórico de eventos guarda o abandono, para as métricas.
- Toda tarefa guarda o vínculo com a seção em que foi originalmente criada, com o título e o horário da seção. Se a seção está vinculada a um projeto, a tarefa também fica vinculada a ele.
- A tarefa minha não tem mais data de intenção: eu escolho o que fazer pondo a tarefa na fila de execução (`prioridades.md`, "Fila de execução"), e não marcando um dia para ela. O que não vai para a fila fica no projeto ou com a pessoa. A única data da tarefa é o prazo máximo, que continua. *(7)*
  - Por quê: a data de intenção virava uma pilha de datas que eu empurrava para a frente. Decidido em 12/11/2026, junto com a saída de "Tarefas esquecidas" e da tarefa travada.
- Nenhuma tela mostra mais a data de intenção nem tem a ação "Data". As datas que as tarefas já tinham ficam guardadas: uma tarefa com data ainda aparece na nota daquele dia e, ao passar pelo "Fechar o dia", fica sem data, sem contar adiamento (`checkout.md`). *(decidido pelo agente; veja a issue #164)*
- A tarefa aguardando continua com a data para cobrar, que não é uma data de intenção (`pessoas.md`, "Aguardando"). *(decidido pelo agente; veja a issue #164)*
- O adiamento saiu: o app não conta mais quantas vezes uma tarefa foi adiada, nem mostra isso em tela (coluna, agrupar, ordenar ou detalhes) ou destaca a tarefa por isso. O que já foi contado fica guardado no histórico e nos backups, sem aparecer. *(decidido em 12/11/2026)*
  - Por quê: sem a data de intenção, quase nada mais se adia, e o contador só enfeitava a triagem.
- O app guarda stats da distância entre a primeira intenção de execução e a ação final (finalizar, abandonar), para as tarefas que tiveram data.

## A tabela de tarefas *(1b)*

- A tela de tarefas é uma tabela. A coluna "Tarefa" está sempre lá; as outras são "Prazo", "Projeto" e "Criada em". O botão "Colunas" mostra ou esconde cada uma delas, e "Tarefa" aparece com um cadeado. Sem nada escolhido, aparecem "Prazo" e "Projeto". A coluna "Data" saiu com a data de intenção. *(7)*
- Em cima da tabela, ficam a quantidade de tarefas que ela mostra, o "Agrupar por" e os botões "Filtros" e "Colunas".
- Clicar no título de uma coluna ordena a tabela por ela, e um segundo clique inverte a ordem. Uma seta no título mostra a coluna e o sentido. Sem nada escolhido, a tabela segue ordenada pela data de criação, da mais antiga para a mais nova. *(decidido pelo agente; veja a issue #164)*
- Na ordem normal, "Tarefa" vai de A a Z; "Prazo", do dia mais próximo para o mais distante; "Criada em", da mais antiga para a mais nova; "Projeto", pelo nome do projeto em ordem alfabética. As tarefas sem projeto ou sem prazo vão para o fim, nos dois sentidos. Quando empata, vale a data de criação.
- O botão "Filtros" abre um menu com as categorias à esquerda e as opções da escolhida à direita, com a opção ativa marcada. O botão mostra quantos filtros estão ativos, e "Limpar filtros" volta tudo ao normal. As categorias:
  - "Mostrar": as tarefas não concluídas, as concluídas ou todas. A tela sempre abre nas não concluídas, e essa escolha não fica guardada.
  - "Projeto": todos, só os projetos em foco (`projetos.md`), só as tarefas sem projeto, ou um projeto ativo.
- Os filtros combinam entre si e com agrupar e ordenar, e valem também para as concluídas.
- Uma tarefa concluída aparece riscada, com o checkbox marcado: desmarcar reabre a tarefa. Ela não tem as ações do hover e não entra em "Selecionar várias".
- Eu posso agrupar por projeto ou por data de criação, e ordenar por outra coluna (ou pela mesma). Sem nada escolhido, a tabela não tem grupos.
- Agrupado, cada grupo é uma linha com título e quantidade de tarefas, e eu posso recolher e abrir cada um. Os grupos seguem a ordem: projetos por nome, dias do mais cedo para o mais tarde, e "Sem projeto" por último. Na data de criação, o grupo é o dia em que a tarefa foi criada.
- O título do grupo de um dia usa "Hoje", "Amanhã" e "Ontem" quando é o caso, e a data curta nos outros dias. As datas das colunas seguem a mesma regra.
- O agrupar, a ordem, as colunas e o filtro de projeto ficam guardados neste navegador. Os grupos sempre abrem abertos, e um botão recolhe ou abre todos de uma vez.
- No hover de uma linha, eu posso mudar o prazo máximo, como na nota do dia, e abandonar a tarefa. Uma tarefa sem projeto também ganha "Projeto", que a vincula a um dos projetos ativos. Toda tarefa minha ganha "Adicionar à fila" (`prioridades.md`, "Fila de execução") *(7)*. Abandonar é um ícone de lixeira, em todas as telas onde existe: nesta lista, na seleção de várias tarefas, na tela de um projeto (no hover de qualquer tarefa ativa) e na área de soltar do quadro do fechamento. Na lista e na tela do projeto ele pede um segundo clique para confirmar, e a tarefa sai da tela.
- Em "Selecionar várias", a caixa de seleção some e eu clico na linha para selecionar, que fica destacada (Shift + clique pega um intervalo, e cada grupo tem "selecionar grupo") e, na barra de baixo, dou a todas o mesmo prazo, tiro o prazo de todas, ou abandono todas, também com um segundo clique para confirmar. Esc ou "Pronto" sai da seleção.

## Prazo máximo e origem *(1b)*

- A tarefa ganha uma segunda data, o prazo máximo, que é opcional.
- Na lista de tarefas, clicar no texto de uma tarefa não faz nada: a lista não mostra mais de onde ela veio. A cápsula com o nome do projeto abre a página do projeto, exceto em "Selecionar várias".
