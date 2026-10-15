# Tarefas e datas

- **Entra aqui:** a tarefa, a lista de tarefas ativas (com agrupar e ordenar), a data de intenção, o prazo máximo, o adiamento e a tela "Próximos dias".
- **Não entra aqui:** os destinos da tarefa no fechamento do dia (`checkout.md`), as prioridades (`prioridades.md`) e as tarefas de projeto (`projetos.md`).

## Tarefas *(1a)*

- Tarefas que ainda não foram finalizadas, arquivadas ou abandonadas moram na lista de tarefas ativas. É dela que eu escolho as tarefas no planejamento do dia seguinte.
- Toda tarefa guarda o vínculo com a seção em que foi originalmente criada, com o título e o horário da seção. Se a seção está vinculada a um projeto, a tarefa também fica vinculada a ele.
- A tarefa tem uma data de intenção de execução, definida no fechamento do dia. Definir essa data é escolher o dia em que a tarefa aparece na nota do dia. Quando a data chega, a tarefa aparece sozinha na nota daquele dia.
- Conta como adiamento toda mudança da data de intenção para depois, e também a tarefa que passa pelo fechamento do dia sem ter sido feita no dia da intenção, inclusive quando ela vai sozinha para o dia seguinte. Tirar a data de intenção, deixando a tarefa sem data, também conta como adiamento.
- O app guarda stats de quantos adiamentos e da distância entre a primeira intenção de execução e a ação final (finalizar, arquivar, abandonar).

## Agrupar e ordenar as tarefas ativas *(1b)*

- Na tela de tarefas ativas, eu posso agrupar e ordenar as tarefas por projeto, por data de intenção, por data de criação ou por quantidade de adiamentos. Dá para usar as duas coisas ao mesmo tempo: agrupar por uma e ordenar por outra (ou pela mesma).
- Sem nada escolhido, a lista não tem grupos e segue ordenada pela data de intenção, como antes.
- Ordenar por projeto segue o nome do projeto, em ordem alfabética; por data de intenção, do dia mais próximo para o mais distante; por data de criação, da mais antiga para a mais nova; por adiamentos, da mais adiada para a menos adiada. As tarefas sem projeto ou sem data vão para o fim. Quando empata, vale a data de intenção e depois a de criação.
- Agrupado, cada grupo é uma sublista com título e quantidade de tarefas, e eu posso recolher e abrir cada uma. Os grupos seguem a mesma ordem: projetos por nome, dias do mais cedo para o mais tarde, adiamentos da mais adiada ("Adiada 3 vezes") até "Nunca adiada", e "Sem projeto" ou "Sem data" por último. Na data de criação, o grupo é o dia em que a tarefa foi criada.
- O título do grupo de um dia usa "Hoje", "Amanhã" e "Ontem" quando é o caso, e a data curta nos outros dias.
- A escolha de agrupar e ordenar fica guardada neste navegador. Os grupos sempre abrem abertos.
- No hover de uma tarefa, eu posso mudar a data de intenção e o prazo máximo, como na nota do dia, e abandonar a tarefa. Abandonar pede um segundo clique para confirmar, e a tarefa sai da lista. A linha mostra o prazo, quando tem.

## Prazo máximo e origem *(1b)*

- A tarefa ganha uma segunda data, o prazo máximo, que é opcional.
- O vínculo da tarefa com a seção de origem vira um link clicável quando as notas dela foram para a wiki pessoal; se foram descartadas, a tarefa ainda mostra de onde veio.

## Próximos dias *(1b)*

- Uma tela mostra as tarefas agendadas para hoje e para os 2 próximos dias ativos, uma lista por dia, na ordem dos dias. Entram as tarefas ativas cuja data de intenção é um desses dias.
- Os dias inativos das configurações são pulados na contagem, como no "dia seguinte" do fechamento: numa sexta, a tela mostra sexta, segunda e terça. Uma tarefa agendada para um dia inativo dentro desse intervalo aparece mesmo assim, no dia dela.
- Nas tarefas, eu tenho as mesmas ações da nota do dia: finalizar pelo checkbox e, no hover, mudar a data de intenção e o prazo e promover a prioridade do dia. Uma tarefa cuja data muda vai para o dia novo, ou sai da tela se o dia novo ficar fora dela.
- A tela abre pela barra lateral, no grupo Hoje, logo abaixo de "Hoje", que abre a nota do dia (`navegacao.md`, "Navegação").
