# Glossário

Um termo, uma definição. Use estes nomes, na interface e nos documentos, em vez de sinônimos.

- **Entra aqui:** o que cada termo quer dizer, em uma ou duas frases, e onde está a regra.
- **Não entra aqui:** as regras em si, que ficam no `SPEC.md`. Se uma definição daqui e uma regra do `SPEC.md` divergirem, vale o `SPEC.md`, e o termo daqui é corrigido.

Os termos marcados com ⚠ ainda têm mais de um sentido nos documentos.

## Captura

- **Nota do dia:** o agrupamento dos blocos de um dia, dividido em seções. Existe enquanto houver blocos ligados a ela. (`spec/nota-do-dia.md`)
- **Seção:** uma parte da nota do dia, com horário de criação e título opcional. Pode ser **geral** ou **de reunião**. (`spec/nota-do-dia.md`)
- **Quadro branco:** o estado de uma seção sem vínculo com projeto. Não é um tipo de seção. (`spec/nota-do-dia.md`)
- **De outros dias:** a seção da nota do dia com as tarefas que vieram de outros dias para aquele dia. Muda de lugar como as outras seções, mas não é gravada como uma. (`spec/nota-do-dia.md`)
- **Bloco:** uma linha da nota, gravada como um registro próprio. É **tarefa** (começa com `[] `), **nota geral** (todo o resto) ou, a partir da seção 5, **compromisso**. (`spec/nota-do-dia.md`; `spec/compromissos.md`)

## Tarefas e datas

- **Data de intenção (de execução):** o dia em que a tarefa aparecia na nota do dia. Saiu em 12/11/2026: o que eu quero fazer vai para a fila de execução. As datas antigas ficam guardadas. (`spec/tarefas.md`)
- **Prazo máximo:** a segunda data, opcional. No dia do prazo, a tarefa vira prioridade do dia. (`spec/tarefas.md`)
- **Adiamento:** era mudar a data de intenção para depois, ou tirá-la. Saiu: o app não conta mais, e o que foi contado fica guardado sem aparecer. (`spec/tarefas.md`)
- **Tarefas:** a lista das tarefas abertas, ou seja, nem finalizadas nem abandonadas, que também mostra as finalizadas quando eu peço. Antes se chamava "tarefas ativas". (`spec/tarefas.md`)
- **Pessoa:** alguém que eu cito com `@Nome`, de uma palavra só. Tem uma página com o que eu devo a ela e o que ela me deve. (`spec/pessoas.md`)
- **Tag de projeto:** `#Projeto` numa linha, que liga só aquela linha a um projeto, vencendo o vínculo da seção. (`spec/nota-do-dia.md`)
- **Ideia:** algo que eu ainda nem sei se quero fazer, capturado com `[?] `. Não é tarefa. (`spec/ideias.md`)
- **Menção:** `@Nome` numa linha, que liga a linha à pessoa. Numa tarefa, quer dizer que eu devo aquilo à pessoa. (`spec/pessoas.md`)
- **Aguardando:** uma tarefa que alguém me deve, criada com `[a] ` no começo da linha. Fica fora da lista de tarefas. (`spec/pessoas.md`)
- **Data para cobrar:** a data de uma tarefa aguardando: o dia em que ela aparece na nota do dia para eu cobrar. Continuou quando a data de intenção saiu. Mudá-la não conta como adiamento. (`spec/pessoas.md`)
- **Dia seguinte:** num fechamento do dia, o próximo dia ativo depois do dia triado, nunca antes de hoje. (`spec/checkout.md`)
- **Dias ativos:** os dias da semana em que o app espera uso; os outros não contam como pulados. (`spec/abertura-do-dia.md`, "Rituais pulados")

## Destinos

- **Finalizar:** a tarefa foi feita (eu engajei com ela). Gera log de execução. (`spec/checkout.md`)
- **Abandonar:** a tarefa sai de circulação sem ter sido feita, como se fosse apagada: some de todas as telas. Só para tarefas. Não existe mais **arquivar**. (`spec/checkout.md`)
- **Descartar:** só para compromissos (seção 5). Notas não são mais descartadas: eu apago a nota. Não existe mais **wiki**. (`spec/checkout.md`; `spec/nota-do-dia.md`)
- **Largar:** um lembrete sai de circulação. (`spec/abertura-do-dia.md`)
- **Migrar:** marcar que um compromisso foi criado no Google Agenda. Conta como concluído. (`spec/compromissos.md`)

## Fechar o dia e triagem

- **Fechar o dia:** o ritual diário e curto que dá destino ao que perece de um dia para o outro: as tarefas do dia, que eu ponho na fila de execução, abandono ou deixo no projeto, e os lembretes ignorados. As notas ficam onde foram escritas. Em texto corrido, "o fechamento do dia". Antes se chamava checkout, nome que o código ainda usa. ⚠ "Fechamento completo" tem três definições. (`spec/checkout.md`)
- **Fechamento pendente:** um dia com algum item ainda sem destino. (`spec/checkout.md`)
- **Auto-triagem:** as regras que decidem sozinhas (**automático**), pré-selecionam (**sugerido**) ou deixam para mim (**sempre manual**). (`spec/checkout.md`)
- **Fechar dias pendentes:** aplica a auto-triagem a vários dias pendentes de uma vez; as tarefas não feitas ficam na lista, fora da fila. (`spec/checkout.md`)
- **Planejamento do dia seguinte:** escolher as tarefas da próxima nota do dia dando a elas uma data. Saiu com a data de intenção (12/11/2026): no "Fechar o dia", eu ponho tarefas na fila de execução. (`spec/checkout.md`)

## Prioridades

- **Prioridades do dia:** até 3 tarefas em destaque dentro das tarefas do dia. (`spec/prioridades.md`)
- **Fila de execução:** a tela de quando eu paro para fazer as coisas: as tarefas que eu escolhi fazer, na ordem que eu quiser. Substituiu a tela "Executar". (`spec/prioridades.md`)
- **Projetos em foco:** até 3 projetos, que eu coloco, troco e tiro a qualquer momento; valem até eu mudá-los. Antes se chamavam "projetos prioritários da semana". (`spec/prioridades.md`)

## Projetos e objetivos

- **Projeto:** uma coleção de tarefas que fazem sentido juntas. Pode ter no máximo um objetivo. (`spec/projetos.md`)
- **Atividade (de um projeto):** tarefa criada, tarefa finalizada, nota escrita ou seção aberta vinculada a ele. (`spec/projetos.md`)
- **Projeto parado:** projeto ativo sem atividade há 14 dias ou mais. (`spec/projetos.md`)
- **Objetivo:** meta, motivação, projetos e recursos. (`spec/objetivos.md`)
- **Meta:** a frase que digo se atingi ou não. (`spec/objetivos.md`)
- **Motivação:** o que me faz querer engajar com o objetivo. Nome provisório. (`spec/objetivos.md`)
- **Recurso:** pensamento, anotação ou link que dá suporte a um objetivo ou projeto. (`spec/objetivos.md`)
- **Hábito:** uma ação com recorrência e critério de "feito", registrada como sim ou não. (`spec/habitos.md`)

## Rituais e abertura do dia

- **Ritual:** warm up e "Fechar o dia" (`spec/abertura-do-dia.md`, "Rituais pulados"). A Revisão de Foco e a Revisão de Rumo, que substituíram as reflexões semanal e mensal, saíram do app em 17/10/2026; as revisões fechadas ficam guardadas no histórico e no backup, sem tela.
- **Iniciar Dia:** a tela branca que abre o dia e começa o warm up. (`spec/abertura-do-dia.md`)
- **Warm up:** o checklist que eu defino para começar o dia. (`spec/abertura-do-dia.md`)
- **Dashboard:** a tela de boas-vindas depois do warm up, com os projetos em foco, mural e "Iniciar o Flow de Execução".
- **Flow de Execução:** o trabalho na nota do dia, que começa pelo botão "Iniciar o Flow de Execução" do dashboard. (`spec/abertura-do-dia.md`)
- **Mural:** as frases de mim para mim mesma que o dashboard mostra em rodízio. ⚠ O `spec/abertura-do-dia.md` também as chama de "lembretes".
- **Lembrete:** um item que volta dentro do app depois de um horário, como no "perguntar de novo às XXh" do warm up. Nunca é uma notificação. ⚠ Veja "Mural". (`spec/abertura-do-dia.md`)

## Backup e avisos

- **Backup automático:** o arquivo que o app regrava alguns segundos depois de cada mudança. (`spec/principios.md`)
- **Backup pausado / bloqueado:** ⚠ os dois termos aparecem em `spec/principios.md` e `spec/navegacao.md` sem uma distinção clara.
- **Lembrar depois:** esconde um aviso até o dia seguinte. (`spec/navegacao.md`, "Navegação")
