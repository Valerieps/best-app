# 4. Título do app leva para a nota do dia

Clicar em "Best App", na barra de cima, abre a nota do dia.

- **O que muda:** hoje o título é só texto, e a nota do dia abre pelo botão "Hoje". Com "Próximos dias" no lugar da nota do dia no menu (`spec/tarefas.md`, "Próximos dias"), o título passa a ser um segundo caminho para ela.
- **Em aberto:**
  - [ ] Com o título levando para a nota do dia, o botão "Hoje" continua na barra ou sai?
- **Incoerências com o modelo atual:**
  - O pedido 12 (reorganização do menu lateral) põe "Hoje" também na gaveta. Com os dois, a nota do dia teria três caminhos (título, botão "Hoje" e gaveta), e a gaveta voltaria a ter a nota do dia, que o `spec/tarefas.md` ("Próximos dias") acabou de trocar por "Próximos dias".
