# 2. Reordenar blocos dentro de uma seção

Poder mudar a ordem das linhas (tarefas e notas) dentro de uma seção.

- **O que muda:** hoje a ordem é a da escrita. O banco já guarda uma posição por bloco, que permite inserir uma linha entre duas outras sem reescrever as vizinhas.
- **Em aberto:**
  - [ ] Como reordenar: arrastar, atalho de teclado (Alt + ↑/↓) ou os dois?
  - [ ] Tarefas que vieram de outros dias, que hoje ficam no topo da primeira seção, também podem ser reordenadas?
  - [ ] Vale para todas as linhas ou só para as criadas no dia?
- **Incoerências com o modelo atual:**
  - As tarefas que vieram de outros dias não pertencem a uma seção do dia: elas aparecem no topo da primeira seção geral só na leitura (`ARQUITETURA.md`, "Consultas derivadas"), e a `position` delas é a da seção de origem. Reordená-las exige guardar uma ordem própria por dia.
  - O `spec/nota-do-dia.md` ("Execução") descreve a captura como sequencial, na ordem da escrita.
  - Em dias passados, o editor não cria linhas (ADR-018); falta dizer se reordenar vale ali.
  - Mudar a posição não gera evento hoje (ADR-004 trata só de texto); falta decidir se reordenar entra no histórico.
  - Mover uma linha para outra seção (`DEBITO-TECNICO.md`, "Editor e telas") é um pedido vizinho que este não cobre.
