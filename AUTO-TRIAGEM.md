# Auto-triagem

O checkout é em lote: o app chega com os destinos já aplicados ou pré-selecionados, e eu só cuido das exceções. O app decide sozinho o que é óbvio e reversível, sugere o que é provável, e nunca decide o que só eu sei ou o que tira coisas de circulação.

## Em aberto

- [ ] O limite de 3 adiamentos para destacar uma tarefa é o número certo?

## Como funciona o checkout em lote

- Ao abrir o checkout, as decisões automáticas já foram aplicadas e as sugeridas aparecem pré-selecionadas.
- Os itens que precisam de decisão manual ficam destacados no topo.
- Um botão "Aceitar sugestões" confirma todas as sugestões de uma vez. Antes disso, eu posso trocar qualquer uma.
- Tudo o que o app aplicou sozinho pode ser desfeito na própria tela do checkout.

## Regras

Cada regra vale a partir da parte da spec em que a funcionalidade dela aparece.

| Nível | Regra | A partir de |
| --- | --- | --- |
| Automático | Tarefa finalizada durante o dia sai da triagem | 1a |
| Automático | Notas de seções vinculadas a um projeto vão para a wiki, ligadas ao projeto | 1a |
| Automático | Seção sem notas, só com tarefas, não aparece na triagem de notas | 1a |
| Automático | Tarefa que já tem data de intenção futura, definida durante o dia, sai da triagem | 1b |
| Automático | Compromisso com a integração do Google Agenda ativa é migrado assim que é criado | Fase com conexões externas |
| Sugerido | Tarefa não feita: "dia seguinte" pré-selecionado; a partir da seção 3, o próximo dia ativo | 1a |
| Sugerido | Tarefa adiada 3 vezes ou mais ganha um destaque; a partir da seção 2, a sugestão passa a ser "decidir na reflexão semanal" | 1a |
| Sugerido | Notas de seções em quadro branco: "mover para a wiki" pré-selecionado | 1a |
| Sugerido | Quadro branco cujo texto cita o nome de um projeto existente: vincular a ele | 1a |
| Sugerido | Tarefa com prazo máximo: uma data de intenção antes do prazo | 1b |
| Sempre manual | Finalizar uma tarefa, porque só eu sei se fiz | 1a |
| Sempre manual | Abandonar, arquivar ou descartar notas, porque tiram coisas de circulação | 1a |
| Sempre manual | Converter um quadro branco em projeto novo, porque cria estrutura | 1a |

## Fechar dias pendentes

- Quando há mais de um dia com checkout pendente, por exemplo depois de vários dias úteis sem abrir o app, o aviso da nota do dia sugere "Fechar dias pendentes". Com um dia só, o aviso oferece apenas "Fazer checkout".
- Ele aplica as decisões automáticas e as sugestões a todos os dias pendentes de uma vez.
- As tarefas não feitas desses dias voltam para a lista de tarefas ativas, sem data de intenção, para não criar uma pilha no dia de hoje. Elas contam como adiamento.
- Seções em quadro branco ficam sem vínculo, como no fim de um dia comum.
- Nada é apagado: abandonar, arquivar e descartar nunca acontecem sozinhos.
