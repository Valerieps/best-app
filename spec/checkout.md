# Checkout e auto-triagem

- **Entra aqui:** o checkout diário, os destinos de cada tipo de item, o planejamento do dia seguinte, o checkout em lote com auto-triagem e o "Fechar dias pendentes". Antes, a auto-triagem tinha um arquivo próprio (`AUTO-TRIAGEM.md`).
- **Não entra aqui:** o que acontece com o item depois do destino, como um hábito criado a partir de uma tarefa (`habitos.md`), e a triagem da reflexão semanal (`rituais.md`), que reaproveita esta.

## Em aberto

- [ ] O limite de 3 adiamentos para destacar uma tarefa é o número certo?

## Checkout *(1a)*

- O dia só vira depois da meia-noite.
- O checkout pode ser feito antes de o dia terminar e mais de uma vez por dia. Ao fim dele, eu posso continuar o mesmo dia normalmente. Se eu adicionar itens depois do checkout, ele volta a ficar pendente.
- Em qualquer seção, geral ou de reunião, todas as notas são triadas como um bloco só, e as tarefas são triadas separadamente, como qualquer outra tarefa. O destino das notas de reunião é o mesmo das notas gerais. Numa seção vinculada a um projeto, as notas continuam ligadas a ele, e as tarefas chegam à triagem vinculadas ao projeto e com "dia seguinte" pré-selecionado; eu confirmo o destino de cada uma.
- Para cada seção ainda em quadro branco, o checkout oferece uma última chance: converter em projeto, vincular a um projeto existente ou deixar sem vínculo. É um aviso, não um bloqueio: se o dia terminar com a seção em quadro branco, todo o conteúdo dela fica sem vínculo com projeto.
- Um checkout é considerado finalizado quando o dia termina sem nenhum item pendente para triagem.

## Destinos

Tudo o que foi coletado naquele dia precisa de destino, e cada tipo de bloco tem os seus:

| Tipo de bloco | Destino no checkout | A partir de |
| --- | --- | --- |
| Tarefa | Finalizar; arquivar; abandonar; alterar data de intenção de execução (atalho para mover para o dia seguinte) | 1a |
| Tarefa | Vincular a um projeto (opcional) | 2 |
| Tarefa | Converter em hábito (`habitos.md`) | 6 |
| Notas de uma seção (geral ou de reunião) | Mover para a wiki pessoal; descartar | 1a |
| Notas de uma seção | Vincular a um objetivo ou projeto como recurso | 4 |
| Qualquer bloco | Decidir na reflexão semanal | 2 |
| Compromisso | Marcar como migrado; marcar como feito; descartar; vincular a um projeto (opcional) | 5 |
| Lembrete ignorado | Manter; mudar; largar | 3 |

- Finalizar significa que eu engajei com a tarefa, e gera um log de execução histórica, com os dados necessários para calcular métricas até o nível mensal. Tarefas podem ser finalizadas a qualquer momento e, depois disso, não passam mais por triagens.
- Arquivar move a tarefa para uma lista de tarefas que podem ser reativadas depois; ela deixa de aparecer entre as tarefas que podem ser escolhidas para um dia.
- Abandonar tira a tarefa de circulação sem que ela tenha sido realizada: ela some de todas as listas e não gera log de execução, mas o histórico de eventos guarda o abandono.
- Descartar tira as notas de circulação da mesma forma: elas não vão para a wiki, e o histórico de eventos guarda o descarte.
- Num checkout atrasado, "dia seguinte" é o dia depois do dia triado, mas nunca antes de hoje.
- O vínculo da tarefa com um projeto serve de cold start para os projetos e objetivos da reflexão mensal. *(2)*
- Se eu estiver indecisa sobre algum bloco, eu posso escolher "decidir na reflexão semanal". Não há limite para isso. *(2)*
- As notas vinculadas como recurso também vão para a wiki, porque as notas não moram num lugar só. *(4)*
- Um lembrete ignorado continua na faixa da nota do dia até o checkout, onde o item vira pergunta: manter, mudar ou largar. "Manter" vem pré-selecionado, porque largar tira o item de circulação. *(3)*

## Planejamento do dia seguinte e fim do dia

- Depois da triagem, eu faço o planejamento do dia seguinte: escolho, na lista de tarefas ativas, as que vão constar na próxima nota do dia. *(1a)*
- No planejamento do dia seguinte, eu posso puxar uma prioridade da semana. *(2)*
- Quando tudo for triado, aparece o botão "finalizar meu dia" com sonzinho de "plim" e uma rápida animação de fogos de artifício. *(1a)*

## Checkout em lote

O checkout é em lote: o app chega com os destinos já aplicados ou pré-selecionados, e eu aceito as sugestões de uma vez, cuidando só das exceções. O app decide sozinho o que é óbvio e reversível, sugere o que é provável, e nunca decide o que só eu sei ou o que tira coisas de circulação.

- Ao abrir o checkout, as decisões automáticas já foram aplicadas e as sugeridas aparecem pré-selecionadas.
- Os itens que precisam de decisão manual ficam destacados no topo.
- Um botão "Aceitar sugestões" confirma todas as sugestões de uma vez. Antes disso, eu posso trocar qualquer uma.
- Tudo o que o app aplicou sozinho pode ser desfeito na própria tela do checkout.

### Regras da auto-triagem

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
