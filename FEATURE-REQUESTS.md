# Feature requests

12/10/2026 · Valeria

Pedidos ainda não implementados. Cada um tem uma nota com o que ele muda no `SPEC.md` e as perguntas que precisam de resposta antes do código. Quando um pedido for decidido, a regra vai para o `SPEC.md` e o item sai daqui.

Já decididos e retirados desta lista: "Próximos dias" no menu (foi para o `SPEC.md`, seção 1b) e o bloco de prioridades sempre fixado (fixar continua opcional).

## 1. Arquivar tarefas de qualquer tela

Poder arquivar uma tarefa em qualquer lugar onde ela aparece: nota do dia, página do projeto, lista de tarefas ativas, prioridades do dia, próximos dias.

- **O que muda:** hoje arquivar é só um destino do checkout e da reflexão semanal (`SPEC.md`, "Checkout").
- **Em aberto:**
  - [ ] Arquivar fora do checkout conta como a decisão daquele dia, ou a tarefa ainda passa pela triagem?
  - [ ] Abandonar também deveria estar disponível fora do checkout?

## 2. Reordenar blocos dentro de uma seção

Poder mudar a ordem das linhas (tarefas e notas) dentro de uma seção.

- **O que muda:** hoje a ordem é a da escrita. O banco já guarda uma posição por bloco, que permite inserir uma linha entre duas outras sem reescrever as vizinhas.
- **Em aberto:**
  - [ ] Como reordenar: arrastar, atalho de teclado (Alt + ↑/↓) ou os dois?
  - [ ] Tarefas que vieram de outros dias, que hoje ficam no topo da primeira seção, também podem ser reordenadas?
  - [ ] Vale para todas as linhas ou só para as criadas no dia?

## 3. Data de intenção em destaque e ícone de ciclo no lugar de "adiada"

Na linha da tarefa, destacar a data de intenção de execução e trocar a palavra "adiada" por um ícone de ciclo.

- **O que muda:** hoje a data aparece como uma etiqueta discreta, e "adiada N×" é um texto (na página do projeto e no checkout).
- **Em aberto:**
  - [ ] O ícone de ciclo vem com o número ao lado (por exemplo, "↻ 3")?
  - [ ] O ícone aparece a partir do primeiro adiamento ou só a partir de 3, como o aviso atual?
  - [ ] O destaque da data vale em todas as telas (nota do dia, próximos dias, projeto, tarefas ativas, checkout)?

## 4. Título do app leva para a nota do dia

Clicar em "Best App", na barra de cima, abre a nota do dia.

- **O que muda:** hoje o título é só texto, e a nota do dia abre pelo botão "Hoje". Com "Próximos dias" no lugar da nota do dia no menu (`SPEC.md`, seção 1b), o título passa a ser um segundo caminho para ela.
- **Em aberto:**
  - [ ] Com o título levando para a nota do dia, o botão "Hoje" continua na barra ou sai?

## 5. Tarefas agendadas organizadas em grupos

Na nota do dia e na tela "Próximos dias", organizar as tarefas já agendadas em três grupos: prazo máximo hoje, prioridades do dia e adiadas para hoje.

- **O que muda:** o `SPEC.md` ("Execução") diz que as tarefas com data de intenção entram no topo da primeira seção geral "sem distinção visual das tarefas criadas no dia". Este pedido muda essa regra. A tela "Próximos dias" hoje mostra uma lista simples por dia.
- **Em aberto:**
  - [ ] Os grupos substituem o bloco "Prioridades do dia" ou convivem com ele?
  - [ ] Uma tarefa que está em mais de um grupo (prioridade com prazo hoje, por exemplo) aparece onde?
  - [ ] "Adiadas para hoje" quer dizer toda tarefa agendada para hoje que não está nos outros grupos, ou só as que já foram adiadas pelo menos uma vez?
  - [ ] Na tela "Próximos dias", os grupos se repetem para cada dia? "Prazo máximo hoje" e "prioridades do dia" só fazem sentido para hoje.
  - [ ] As tarefas agendadas saem do topo da primeira seção, ou aparecem nos dois lugares?
