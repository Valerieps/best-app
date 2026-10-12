# Tarefas e datas

- **Entra aqui:** a tarefa, a lista de tarefas ativas, a data de intenção, o prazo máximo, o adiamento e a tela "Próximos dias".
- **Não entra aqui:** os destinos da tarefa no checkout (`checkout.md`), as prioridades (`prioridades.md`) e as tarefas de projeto (`projetos.md`).

## Tarefas *(1a)*

- Tarefas que ainda não foram finalizadas, arquivadas ou abandonadas moram na lista de tarefas ativas. É dela que eu escolho as tarefas no planejamento do dia seguinte.
- Toda tarefa guarda o vínculo com a seção em que foi originalmente criada, com o título e o horário da seção. Se a seção está vinculada a um projeto, a tarefa também fica vinculada a ele.
- A tarefa tem uma data de intenção de execução, definida no checkout. Definir essa data é escolher o dia em que a tarefa aparece na nota do dia. Quando a data chega, a tarefa aparece sozinha na nota daquele dia.
- Conta como adiamento toda mudança da data de intenção para depois, e também a tarefa que passa pelo checkout sem ter sido feita no dia da intenção. Tirar a data de intenção, deixando a tarefa sem data, também conta como adiamento.
- O app guarda stats de quantos adiamentos e da distância entre a primeira intenção de execução e a ação final (finalizar, arquivar, abandonar).

## Prazo máximo e origem *(1b)*

- A tarefa ganha uma segunda data, o prazo máximo, que é opcional.
- O vínculo da tarefa com a seção de origem vira um link clicável quando as notas dela foram para a wiki pessoal; se foram descartadas, a tarefa ainda mostra de onde veio.

## Próximos dias *(1b)*

- Uma tela mostra as tarefas agendadas para hoje e para os 2 próximos dias ativos, uma lista por dia, na ordem dos dias. Entram as tarefas ativas cuja data de intenção é um desses dias.
- Os dias inativos das configurações são pulados na contagem, como no "dia seguinte" do checkout: numa sexta, a tela mostra sexta, segunda e terça. Uma tarefa agendada para um dia inativo dentro desse intervalo aparece mesmo assim, no dia dela.
- Nas tarefas, eu tenho as mesmas ações da nota do dia: finalizar pelo checkbox e, no hover, mudar a data de intenção e o prazo e promover a prioridade do dia. Uma tarefa cuja data muda vai para o dia novo, ou sai da tela se o dia novo ficar fora dela.
- A tela abre pela barra lateral, no grupo Hoje, logo abaixo de "Hoje", que abre a nota do dia (`navegacao.md`, "Navegação").
