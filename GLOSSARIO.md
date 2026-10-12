# Glossário

Um termo, uma definição. Use estes nomes, na interface e nos documentos, em vez de sinônimos.

- **Entra aqui:** o que cada termo quer dizer, em uma ou duas frases, e onde está a regra.
- **Não entra aqui:** as regras em si, que ficam no `SPEC.md`. Se uma definição daqui e uma regra do `SPEC.md` divergirem, vale o `SPEC.md`, e a divergência vai para o `INCOERENCIAS.md`.

Os termos marcados com ⚠ ainda têm mais de um sentido nos documentos; o item do `INCOERENCIAS.md` diz onde.

## Captura

- **Nota do dia:** o agrupamento dos blocos de um dia, dividido em seções. Existe enquanto houver blocos ligados a ela. (`spec/nota-do-dia.md`)
- **Seção:** uma parte da nota do dia, com horário de criação e título opcional. Pode ser **geral** ou **de reunião**. (`spec/nota-do-dia.md`)
- **Quadro branco:** o estado de uma seção sem vínculo com projeto. Não é um tipo de seção. (`spec/nota-do-dia.md`)
- **Bloco:** uma linha da nota, gravada como um registro próprio. É **tarefa** (começa com `[] `), **nota geral** (todo o resto) ou, a partir da seção 5, **compromisso**. (`spec/nota-do-dia.md`; `spec/compromissos.md`)
- **Wiki pessoal:** a lista das notas que foram para a wiki no checkout, uma entrada por seção. (`spec/nota-do-dia.md`)

## Tarefas e datas

- **Data de intenção (de execução):** o dia em que a tarefa aparece na nota do dia. (`spec/tarefas.md`)
- **Prazo máximo:** a segunda data, opcional. No dia do prazo, a tarefa vira prioridade do dia. (`spec/tarefas.md`)
- **Adiamento:** mudar a data de intenção para depois, tirar a data, ou passar pelo checkout sem fazer a tarefa no dia da intenção. (`spec/tarefas.md`)
- **Precisão da data de intenção:** a parte das tarefas finalizadas com data de intenção que foram feitas no dia da intenção. (`spec/rituais.md`)
- **Tarefas ativas:** as tarefas não finalizadas, arquivadas nem abandonadas. (`spec/tarefas.md`)
- **Tarefa travada:** tarefa de projeto adiada 3 vezes ou mais, ou com a data de intenção vencida. ⚠ Não confundir com o assistente "Prioridades travadas" (`INCOERENCIAS.md`, 2.10). (`spec/projetos.md`)
- **Dia seguinte:** num checkout, o próximo dia ativo depois do dia triado, nunca antes de hoje. (`spec/checkout.md`)
- **Dias ativos:** os dias da semana em que o app espera uso; os outros não contam como pulados. (`spec/rituais.md`)

## Destinos

- **Finalizar:** a tarefa foi feita (eu engajei com ela). Gera log de execução. (`spec/checkout.md`)
- **Arquivar:** a tarefa sai das escolhas do dia, mas pode ser **reativada** depois. (`spec/checkout.md`)
- **Abandonar:** a tarefa sai de circulação sem ter sido feita. Só para tarefas. (`spec/checkout.md`)
- **Descartar:** as notas de uma seção saem de circulação e não vão para a wiki. Só para notas (e, na seção 5, compromissos). (`spec/checkout.md`)
- **Largar:** um lembrete sai de circulação. (`spec/abertura-do-dia.md`)
- **Migrar:** marcar que um compromisso foi criado no Google Agenda. Conta como concluído. (`spec/compromissos.md`)
- **Decidir na reflexão semanal:** deixar um item para ser triado na reflexão semanal. (`spec/checkout.md`)

## Checkout e triagem

- **Checkout:** a triagem de um dia, que dá destino a tudo o que foi coletado. ⚠ "Checkout completo" tem três definições (`INCOERENCIAS.md`, 2.4).
- **Checkout pendente:** um dia com algum item ainda sem destino. (`spec/checkout.md`)
- **Auto-triagem:** as regras que decidem sozinhas (**automático**), pré-selecionam (**sugerido**) ou deixam para mim (**sempre manual**). (`spec/checkout.md`)
- **Fechar dias pendentes:** aplica a auto-triagem a vários dias pendentes de uma vez; as tarefas não feitas voltam sem data. (`spec/checkout.md`)
- **Planejamento do dia seguinte:** escolher, na lista de tarefas ativas, as tarefas da próxima nota do dia. Não é o mesmo que priorizar. (`spec/checkout.md`)

## Prioridades

- **Prioridades do dia:** até 3 tarefas em destaque dentro das tarefas do dia. (`spec/prioridades.md`)
- **Prioridades da semana:** tarefas em destaque na semana, numa lista separada da do dia. A quantidade ainda está em aberto. (`spec/prioridades.md`)
- **Projetos prioritários da semana:** até 3 projetos, numa lista separada das prioridades de tarefas. (`spec/prioridades.md`)

## Projetos e objetivos

- **Projeto:** uma coleção de tarefas que fazem sentido juntas. Pode ter no máximo um objetivo. (`spec/projetos.md`)
- **Atividade (de um projeto):** tarefa criada, tarefa finalizada, nota escrita ou seção aberta vinculada a ele. (`spec/projetos.md`)
- **Projeto parado:** projeto ativo sem atividade há 14 dias ou mais. (`spec/projetos.md`)
- **Objetivo:** meta, motivação, projetos e recursos. (`spec/objetivos.md`)
- **Meta:** a frase que digo se atingi ou não. (`spec/objetivos.md`)
- **Motivação:** o que me faz querer engajar com o objetivo. Nome provisório. (`spec/objetivos.md`)
- **Recurso:** pensamento, anotação ou link que dá suporte a um objetivo ou projeto. (`spec/objetivos.md`)
- **Raio-x / métricas de desconexão:** as métricas mensais que mostram o quanto o dia a dia se desconecta dos objetivos. (`spec/rituais.md`)
- **Hábito:** uma ação com recorrência e critério de "feito", registrada como sim ou não. (`spec/habitos.md`)

## Rituais e abertura do dia

- **Ritual:** warm up, checkout, reflexão semanal e reflexão mensal (`spec/rituais.md`, "Rituais pulados"). O menu "Rituais" lista os checkouts, as reflexões e "Colocar ordem na casa" (`spec/navegacao.md`, "Navegação").
- **Reflexão semanal / mensal:** os rituais que fecham a semana e o mês. (`spec/rituais.md`)
- **Iniciar Dia:** a tela branca que abre o dia e começa o warm up. (`spec/abertura-do-dia.md`)
- **Warm up:** o checklist que eu defino para começar o dia. (`spec/abertura-do-dia.md`)
- **Dashboard:** a tela de boas-vindas depois do warm up, com prioridades da semana, mural e "Iniciar o Flow de Execução". ⚠ A `ARQUITETURA.md` e o código também chamam "Colocar ordem na casa" de dashboard (`INCOERENCIAS.md`, seção 3).
- **Flow de Execução:** o trabalho na nota do dia, que começa pelo botão "Iniciar o Flow de Execução" do dashboard. (`spec/abertura-do-dia.md`)
- **Mural:** as frases de mim para mim mesma que o dashboard mostra em rodízio. ⚠ O `spec/abertura-do-dia.md` também as chama de "lembretes" (`INCOERENCIAS.md`, 2.9).
- **Lembrete:** um item que volta dentro do app depois de um horário, como no "perguntar de novo às XXh" do warm up. Nunca é uma notificação. ⚠ Veja "Mural". (`spec/abertura-do-dia.md`)

## Limpeza

- **Colocar ordem na casa:** a tela que lista os assistentes que têm algo a limpar. (`spec/assistentes.md`)
- **Assistente (de limpeza):** encontra o que está fora do lugar e sugere uma ação, que aceito em lote. Os nomes de cada um estão na tabela do `spec/assistentes.md`.

## Backup e avisos

- **Backup automático:** o arquivo que o app regrava alguns segundos depois de cada mudança. (`spec/principios.md`)
- **Backup pausado / bloqueado:** ⚠ os dois termos aparecem em `spec/principios.md` e `spec/navegacao.md` sem uma distinção clara (`INCOERENCIAS.md`, 2.6).
- **Lembrar depois:** esconde um aviso até o dia seguinte. (`spec/navegacao.md`, "Navegação")
