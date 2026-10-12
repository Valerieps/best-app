# 6. Revisar o fluxo de checkout

Redesenhar o checkout como um fluxo com menos decisões por tela, resolvendo as incoerências da spec sobre ele. O checkout é a tela que prova a hipótese do app. O único rascunho dele (`rascunhos/rascunho-1a-checkout_1`) é do 1a, de antes das decisões que as fases 2 a 6 acrescentaram.

- **O que muda:** hoje o checkout é uma tela só (`spec/checkout.md`), e cada fase acrescentou decisões a ela:
  - tarefas: finalizar, dia seguinte, outra data, arquivar, abandonar, vincular a um projeto (2), decidir na reflexão semanal (2), virar hábito (6);
  - notas de cada seção: wiki, descartar, recurso de objetivo ou projeto (4);
  - quadros brancos: converter em projeto, vincular ou deixar sem vínculo;
  - lembretes ignorados: manter, mudar ou largar (3);
  - compromissos: migrado, feito, descartar, vincular (5);
  - depois disso, o planejamento do dia seguinte e, a partir da seção 2, puxar uma prioridade da semana.

  O P4 da avaliação de UX (`AVALIACAO-UX.md`) já apontou 7 opções de mesmo peso por tarefa, mais o seletor de projeto.
- **Incoerências da spec que este pedido resolve** (detalhes em `INCOERENCIAS.md`):
  - Lote ou item a item: o `spec/checkout.md` diz, em "Checkout", que eu confirmo o destino de cada tarefa de seção com projeto, e, em "Checkout em lote", que "Aceitar sugestões" confirma tudo de uma vez (1.1).
  - Três nomes para o botão: "Confirmar decisões", "Aceitar sugestões" e "finalizar meu dia" (2.5).
  - Três definições de checkout completo, e se a nota do dia some ao fim dele ou só à meia-noite (2.4).
  - Se o planejamento do dia seguinte inclui escolher as prioridades do dia (2.1).
  - Lembretes no checkout sem regra no `spec/checkout.md` (2.9).
- **Em aberto:**
  - [ ] Quais são as etapas e em que ordem? Por exemplo: o que o app já resolveu, tarefas, notas e quadros brancos, lembretes, planejamento de amanhã, fim do dia.
  - [ ] Cada etapa tem o próprio "Aceitar sugestões", ou há uma confirmação só no fim?
  - [ ] Quais opções ficam visíveis em cada item, e quais vão para um "Mais"?
  - [ ] Uma etapa sem nada para decidir é pulada?
  - [ ] Atalhos de teclado para triar sem mouse (P4 em `AVALIACAO-UX.md`)?
  - [ ] Dá para sair no meio e voltar depois sem perder o que já foi escolhido? Hoje sair sem aceitar não grava nada (ADR-012).
  - [ ] "Fechar dias pendentes" usa o mesmo fluxo, ou continua aplicando tudo de uma vez?
- **Pedidos relacionados:** arquivar de qualquer tela (pedido 1) tira decisões do checkout; o vínculo granular de projetos em seções de reunião (pedido 11) aumenta o número de decisões; as micro-celebrações no checkout (pedido 8) entram na etapa final. Vale um rascunho de tela antes do código.
