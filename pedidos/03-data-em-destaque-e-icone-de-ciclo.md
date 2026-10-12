# 3. Data de intenção em destaque e ícone de ciclo no lugar de "adiada"

Na linha da tarefa, destacar a data de intenção de execução e trocar a palavra "adiada" por um ícone de ciclo.

- **O que muda:** hoje a data aparece como uma etiqueta discreta, e "adiada N×" é um texto (na página do projeto e no checkout).
- **Em aberto:**
  - [ ] O ícone de ciclo vem com o número ao lado (por exemplo, "↻ 3")?
  - [ ] O ícone aparece a partir do primeiro adiamento ou só a partir de 3, como o aviso atual?
  - [ ] O destaque da data vale em todas as telas (nota do dia, próximos dias, projeto, tarefas ativas, checkout)?
- **Incoerências com o modelo atual:**
  - O pedido 5 cria um grupo "adiadas para hoje", que volta a pôr o adiamento em evidência como rótulo, no sentido oposto deste pedido e dos pedidos de reforço positivo (7 a 10).
  - O limite de 3 adiamentos aparece em três regras: o destaque no checkout (`spec/checkout.md`), a tarefa travada no projeto (`spec/projetos.md`, "Página do projeto") e a sugestão de "decidir na reflexão semanal". Mostrar o ícone desde o primeiro adiamento desacopla o ícone desse limite.
