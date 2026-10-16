# Projetos

- **Entra aqui:** o que é um projeto, a lista de projetos, a página do projeto, a atividade, o projeto parado e a tarefa travada.
- **Não entra aqui:** os projetos em foco (`prioridades.md`), o vínculo de projeto no fechamento do dia (`checkout.md`) e os objetivos (`objetivos.md`).

## Projetos *(2)*

- Um projeto é uma coleção de tarefas que fazem sentido juntas. Os projetos já existem por baixo dos panos desde o 1a, criados a partir de seções em quadro branco convertidas; esta parte dá a eles funcionalidades próprias.
- Uma tarefa pode existir sem projeto e se vincula a no máximo um projeto.
- Projetos só são finalizados manualmente: eu abro o projeto e finalizo.
- Posso criar uma tarefa direto na página do projeto; ela já nasce vinculada a ele. Ela nasce ativa e sem data, e fica só no projeto: não entra na nota do dia de hoje nem no fechamento do dia. Ela só aparece numa nota do dia quando eu der a ela uma data de intenção, como qualquer tarefa. Assim eu monto o backlog do projeto sem precisar triar cada item no fim do dia.
- Cada projeto tem um ícone, que eu escolho numa coleção de ícones estilizados do app. Enquanto eu não escolho, o projeto mostra a inicial do nome.

## Lista de projetos *(2)*

- A lista de projetos é onde eu acompanho os projetos; a página do projeto é onde eu executo. Métricas e visualizações de acompanhamento ficam na lista, e a página do projeto fica focada nas tarefas.
- A lista de projetos mostra os projetos em foco em cards, lado a lado, e os outros projetos ativos numa lista com contador, que eu posso recolher. Os projetos finalizados ficam num grupo recolhido. O app lembra se deixei cada grupo aberto ou fechado.
- Cada projeto ativo mostra na lista um mapa de atividade por dia, no estilo do GitHub: 16 semanas nos cards dos projetos em foco. As linhas dos outros projetos ativos não mostram o mapa. A intensidade da cor indica quanto aconteceu no dia. Não há contagem de dias seguidos.
- Atividade num projeto é qualquer uma destas coisas: tarefa criada, tarefa finalizada, nota escrita ou seção aberta vinculada a ele, também as notas escritas direto na página do projeto.
- Junto do mapa, a lista mostra quantas tarefas estão ativas e travadas, quantas eu finalizei nas últimas 2 semanas, o objetivo e quando foi a última atividade.
- A lista não mostra progresso em fração do total ("4 de 10"), porque eu nem sempre sei todas as tarefas que vão compor o projeto. O mapa de atividade mostra o ritmo no lugar.
- Um projeto ativo está parado quando passa 14 dias sem nenhuma atividade. A lista mostra "Parado há N dias", e o grupo dos outros ativos mostra quantos estão parados mesmo quando está recolhido.

## Página do projeto *(2)*

- Uma tarefa de projeto está travada quando foi adiada 3 vezes ou mais, ou quando a data de intenção já passou e ela continua ativa.
- Na página do projeto, as tarefas aparecem em cinco grupos, do mais para o menos destacado: travadas, com o motivo e a ação de dar uma nova data à vista; próximos dias; sem data, mais discretas e num grupo que eu posso recolher; aguardando, num grupo que eu posso recolher; e feitas, recolhidas.
- "Próximos dias" é um pequeno calendário com três colunas, uma para cada um dos próximos 3 dias ativos (a configuração de dias ativos), começando hoje quando hoje é um dia ativo. Cada coluna mostra o dia da semana e a data, e as tarefas com a data de intenção daquele dia; uma coluna sem tarefas diz "Nada marcado". Tarefas com data depois desses 3 dias não aparecem na página até chegarem perto.
- Toda tarefa aguardando do projeto fica só no grupo "Aguardando", com data ou sem, e nunca entre as travadas.
- As linhas das tarefas na página do projeto usam uma fonte maior que a do resto da página, do mesmo tamanho em todos os grupos.
- O campo "Nova tarefa" fica na aba "Tarefas", logo abaixo de "Próximos dias" e antes de "Sem data".
- A aba "Notas" da página do projeto mostra as notas das seções vinculadas a ele, da seção mais recente para a mais antiga, depois que o dia é fechado, com o Markdown formatado como na nota do dia. Ali eu posso apagar uma nota, com um segundo clique para confirmar. O histórico de eventos guarda a nota apagada.
- No topo da timeline da aba "Notas", um ícone de + abre o campo "Nova nota". Enter salva, Shift + Enter quebra a linha e Esc desiste; cada linha vira uma nota. A nota criada aqui vive só no projeto: aparece na timeline na hora, como "Nota do projeto", e não entra em nenhuma nota do dia nem no fechamento do dia.
- "Editar", no hover de uma entrada da timeline, abre a entrada inteira no mesmo editor de linhas da nota do dia: Enter quebra a nota em duas, Backspace no começo junta com a nota de cima e o Markdown aparece formatado fora da linha em que estou, com os mesmos ícones e atalhos de formatação da nota do dia. As linhas continuam notas: `[] ` não vira tarefa ali. "Concluir" fecha o editor.
- A página do projeto não tem mais o botão que abre a coluna lateral (objetivo, status, número de seções e recursos). A coluna só aparece quando já estava fixada, e desafixar a esconde de vez. O objetivo continua sendo vinculado pelo menu de ações do projeto.
- Posso vincular o objetivo, adicionar o projeto aos projetos em foco (enquanto houver vaga) e finalizar o projeto tanto pela lista quanto pela página do projeto.
- Para dar uma data de intenção a uma tarefa do projeto, uso o calendário, como em qualquer tarefa. Não há arrastar e soltar.
