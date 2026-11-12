# Projetos

- **Entra aqui:** o que é um projeto, a lista de projetos, a página do projeto, a atividade e o projeto parado.
- **Não entra aqui:** os projetos em foco e a fila de execução (`prioridades.md`), o vínculo de projeto no fechamento do dia (`checkout.md`), a tag de projeto na linha (`nota-do-dia.md`), as ideias (`ideias.md`) e os objetivos (`objetivos.md`).

## Em aberto

- [ ] As notas de uma seção vinculada, ou com a tag do projeto, só aparecem na aba "Notas" depois que o dia é fechado. Elas deveriam aparecer na hora, para o projeto estar em dia quando eu vou executar? *(7)*

## Projetos *(2)*

- Um projeto é uma coleção de tarefas que fazem sentido juntas. Os projetos já existem por baixo dos panos desde o 1a, criados a partir de seções em quadro branco convertidas; esta parte dá a eles funcionalidades próprias.
- Uma tarefa pode existir sem projeto e se vincula a no máximo um projeto.
- Projetos só são finalizados manualmente: eu abro o projeto e finalizo.
- Posso criar uma tarefa direto na página do projeto; ela já nasce vinculada a ele. Ela nasce ativa e fica só no projeto: não entra na nota do dia de hoje nem no fechamento do dia. Quando eu quiser fazê-la, ponho na fila de execução. Assim eu monto a lista de tarefas do projeto sem precisar triar cada item no fim do dia.
- Cada projeto tem um ícone, que eu escolho numa coleção de ícones estilizados do app. Enquanto eu não escolho, o projeto mostra a inicial do nome.

## Lista de projetos *(2)*

- A lista de projetos é onde eu acompanho os projetos; a página do projeto é onde eu executo. Métricas e visualizações de acompanhamento ficam na lista, e a página do projeto fica focada nas tarefas.
- A lista de projetos mostra os projetos em foco numa lista, no alto, e os outros projetos ativos em outra lista com contador, que eu posso recolher. As duas listas têm as mesmas linhas. Um "Colocar em foco" abaixo da lista deixa eu escolher um projeto ativo. Os projetos em backlog ficam num grupo "Backlog", recolhido, e os finalizados em outro grupo recolhido. O app lembra se deixei cada grupo aberto ou fechado.
- Um projeto tem um destes status: em foco, ativo, backlog ou finalizado. Backlog é onde eu guardo os projetos que não vou tocar agora, sem finalizá-los. Um projeto em backlog nunca conta como parado e não aparece onde eu escolho projetos ativos (vincular seção, autocompletar tag, mover tarefa); uma `#tag` com o nome dele ainda acha o projeto. *(2)*
  - Por quê: separar o que está parado de propósito do que está parado por esquecimento, sem ter de finalizar.
- Quando eu passo o mouse numa linha da lista, aparecem os botões "Em foco", "Ativo" e "Backlog", com o status atual marcado. Um projeto vai de qualquer status para qualquer outro, inclusive um finalizado, que é reaberto. *(2)*
- Cada linha mostra o nome e quantas tarefas estão ativas, ou "Parado há N dias". Não há mapa de atividade nem contagem de dias seguidos.
- Atividade num projeto é qualquer uma destas coisas: tarefa criada, tarefa finalizada, nota escrita ou seção aberta vinculada a ele, também as notas escritas direto na página do projeto.
- A lista não mostra progresso em fração do total ("4 de 10"), porque eu nem sempre sei todas as tarefas que vão compor o projeto.
- Um projeto ativo está parado quando passa 14 dias sem nenhuma atividade. A lista mostra "Parado há N dias", e o grupo dos outros ativos mostra quantos estão parados mesmo quando está recolhido.

## Página do projeto *(2)*

- Na página do projeto, as tarefas aparecem nestes grupos: as que estão na fila de execução, no grupo "Na fila" *(7)* (`prioridades.md`, "Fila de execução"); as outras tarefas minhas, no grupo "A fazer", que eu posso recolher; aguardando, num grupo que eu posso recolher; e feitas, recolhidas. Dentro de cada grupo, as tarefas vão da mais antiga para a mais nova. *("A fazer" foi decidido pelo agente; veja a issue #164)*
- Não existe mais tarefa travada: com o fim da data de intenção (`tarefas.md`), saiu o grupo "Travadas", com o motivo e a ação de dar uma nova data. Decidido em 12/11/2026.
- Toda tarefa aguardando do projeto fica só no grupo "Aguardando".
- As linhas das tarefas na página do projeto usam uma fonte maior que a do resto da página, do mesmo tamanho em todos os grupos.
- As ideias ligadas ao projeto ficam num grupo "Ideias" da página do projeto, que eu posso recolher (`ideias.md`). *(7)*
- O campo "Nova tarefa" fica na aba "Tarefas", acima de "Na fila". O atalho Ctrl + A leva o foco até ele, quando eu não estou digitando em outro campo.
- A aba "Notas" da página do projeto mostra as notas das seções vinculadas a ele, da seção mais recente para a mais antiga, depois que o dia é fechado, com o Markdown formatado como na nota do dia. Ali eu posso apagar uma nota, com um segundo clique para confirmar. O histórico de eventos guarda a nota apagada.
- No topo da timeline da aba "Notas", um ícone de + abre o campo "Nova nota". Enter salva, Shift + Enter quebra a linha e Esc desiste; cada linha vira uma nota. A nota criada aqui vive só no projeto: aparece na timeline na hora, como "Nota do projeto", e não entra em nenhuma nota do dia nem no fechamento do dia.
- "Editar", no hover de uma entrada da timeline, abre a entrada inteira no mesmo editor de linhas da nota do dia: Enter quebra a nota em duas, Backspace no começo junta com a nota de cima e o Markdown aparece formatado fora da linha em que estou, com os mesmos ícones e atalhos de formatação da nota do dia. As linhas continuam notas: `[] ` não vira tarefa ali. "Concluir" fecha o editor.
- A página do projeto não tem mais o botão que abre a coluna lateral (objetivo, status, número de seções e recursos). A coluna só aparece quando já estava fixada, e desafixar a esconde de vez. O objetivo continua sendo vinculado pelo menu de ações do projeto.
- Posso vincular o objetivo, colocar o projeto em foco, tirá-lo do foco, finalizar o projeto e apagá-lo tanto pela lista quanto pela página do projeto (`prioridades.md`, "Projetos em foco").
- "Apagar projeto", no "⋯", é para o projeto que criei sem querer: remove o projeto por completo, inclusive o histórico dele, e não dá para desfazer. Ele pede uma confirmação ("Apagar de vez"). Vão junto o que foi escrito na página do projeto (tarefas e notas) e os links do projeto. As tarefas e notas escritas na nota do dia ficam, sem vínculo com projeto, e as seções da nota do dia que estavam vinculadas voltam a ser quadros brancos. Se o projeto estava em foco, sai da lista. Só um registro sem texto, com os ids apagados, fica no histórico, para o backup automático entender que foi de propósito.
  - *Por quê:* finalizar guarda o projeto; apagar existe para o engano, que não deve deixar rastro.
