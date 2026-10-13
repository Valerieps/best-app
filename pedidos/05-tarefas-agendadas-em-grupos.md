# 5. Tarefas agendadas organizadas em grupos

Na nota do dia e na tela "Próximos dias", organizar as tarefas já agendadas em três grupos: prazo máximo hoje, prioridades do dia e adiadas para hoje.

- **O que muda:** o `spec/nota-do-dia.md` ("Execução") diz que, a partir do 1b, as tarefas com data de intenção que vêm de outros dias ficam numa seção própria, "De outros dias", que eu posso mudar de lugar. Este pedido divide essas tarefas em grupos. A tela "Próximos dias" hoje mostra uma lista simples por dia.
- **Em aberto:**
  - [ ] Os grupos substituem o bloco "Prioridades do dia" ou convivem com ele?
  - [ ] Uma tarefa que está em mais de um grupo (prioridade com prazo hoje, por exemplo) aparece onde?
  - [ ] "Adiadas para hoje" quer dizer toda tarefa agendada para hoje que não está nos outros grupos, ou só as que já foram adiadas pelo menos uma vez?
  - [ ] Na tela "Próximos dias", os grupos se repetem para cada dia? "Prazo máximo hoje" e "prioridades do dia" só fazem sentido para hoje.
  - [ ] As tarefas agendadas saem do topo da primeira seção, ou aparecem nos dois lugares?
- **Incoerências com o modelo atual:**
  - Pelo `spec/prioridades.md` ("Prioridades do dia"), toda tarefa com prazo máximo hoje já vira prioridade do dia. O grupo "prazo máximo hoje" é, então, parte do grupo "prioridades do dia", e não um grupo separado.
  - A tarefa priorizada já aparece em dois lugares (bloco de prioridades e seção). Com os grupos, ela pode aparecer em três.
  - O grupo "adiadas para hoje" contradiz o pedido 3 e os pedidos de reforço positivo (7 a 10), que querem tirar o peso do adiamento.
