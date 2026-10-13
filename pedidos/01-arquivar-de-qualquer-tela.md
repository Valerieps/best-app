# 1. Arquivar tarefas de qualquer tela

Poder arquivar uma tarefa em qualquer lugar onde ela aparece: nota do dia, página do projeto, lista de tarefas ativas, prioridades do dia, próximos dias.

- **O que muda:** hoje arquivar é só um destino do checkout e da reflexão semanal (`spec/checkout.md`, "Destinos").
- **Em aberto:**
  - [ ] Arquivar fora do checkout conta como a decisão daquele dia, ou a tarefa ainda passa pela triagem?
  - [ ] Abandonar também deveria estar disponível fora do checkout?
- **Incoerências com o modelo atual:**
  - O princípio "Sempre dá para criar ou editar qualquer coisa fora dos rituais" (`spec/principios.md`, "Princípios") já sugere que arquivar valha em qualquer tela, mas a tabela do checkout trata arquivar e abandonar como destinos do checkout.
  - O `spec/nota-do-dia.md` ("Execução") já diz que, para tirar de circulação uma tarefa que veio de outro dia, "eu arquivo ou abandono", sem dizer onde.
  - Tarefas criadas na página do projeto não passam pelo checkout (`spec/projetos.md`, "Projetos") e hoje não têm como sair de circulação (`DEBITO-TECNICO.md`, "Projetos e projetos em foco"). Este pedido resolveria isso.
  - Pela regra de triagem atual (ADR-011), só tarefas ativas ficam pendentes; uma tarefa arquivada fora do checkout já sairia da triagem daquele dia.
