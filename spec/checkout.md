# Fechar o dia e auto-triagem

- **Entra aqui:** o "Fechar o dia", o ritual diário que antes se chamava checkout; os destinos de cada tipo de item; o planejamento do dia seguinte; a auto-triagem; e o "Fechar dias pendentes". Antes, a auto-triagem tinha um arquivo próprio (`AUTO-TRIAGEM.md`).
- **Não entra aqui:** o que acontece com o item depois do destino, como um hábito criado a partir de uma tarefa (`habitos.md`); a triagem da Revisão de Foco (`rituais.md`), que reaproveita esta; e o que não perece de um dia para o outro, como seções sem projeto e tarefas esquecidas, que fica nos assistentes de "Colocar ordem na casa" (`assistentes.md`).

## Em aberto

- [ ] O limite de 3 adiamentos é o número certo? Ele decide quando uma tarefa não feita deixa de ir sozinha para o dia seguinte e passa a pedir decisão.

## Fechar o dia *(1a)*

O "Fechar o dia" é curto, de cerca de um minuto: ele cuida só do que perece de um dia para o outro, enquanto eu ainda lembro do contexto. Todo o resto o app resolve sozinho ou deixa para o "Colocar ordem na casa", que eu faço quando quiser e sem data (`assistentes.md`).

- O dia só vira depois da meia-noite.
- O fechamento pode ser feito antes de o dia terminar e mais de uma vez por dia. Ao fim dele, eu posso continuar o mesmo dia normalmente. Se eu adicionar itens depois do fechamento, ele volta a ficar pendente.
- Posso fechar o dia na manhã seguinte, descansada e com o contexto ainda fresco, sem que isso conte como atraso.
- As notas não passam pelo fechamento: as de todas as seções, gerais ou de reunião, com projeto ou em quadro branco, vão sozinhas para a wiki (veja "Regras da auto-triagem"). Descartar as notas de uma seção, ou vinculá-las como recurso, fica na própria wiki (`nota-do-dia.md`, "Wiki pessoal").
- As seções em quadro branco também não passam pelo fechamento. Se o dia termina com uma seção em quadro branco, o conteúdo dela fica sem vínculo com projeto, e o assistente "Seções soltas" oferece converter em projeto ou vincular depois (`assistentes.md`).
- As tarefas são triadas uma a uma. Numa seção vinculada a um projeto, elas continuam vinculadas a ele.
- Um fechamento é considerado finalizado quando o dia termina sem nenhum item pendente para triagem.
- A triagem mostra as tarefas na mesma ordem da nota do dia, inclusive a que eu escolhi ao reordenar (`nota-do-dia.md`, "Ordem das linhas e das seções"). *(1b)*

## Destinos

| Tipo de bloco | Destino no "Fechar o dia" | A partir de |
| --- | --- | --- |
| Tarefa | Finalizar; arquivar; abandonar; alterar data de intenção de execução (atalho para mover para o dia seguinte) | 1a |
| Tarefa | Vincular a um projeto (opcional) | 2 |
| Tarefa | Decidir na Revisão de Foco | 2 |
| Tarefa | Converter em hábito (`habitos.md`) | 6 |
| Notas de uma seção | Vão sozinhas para a wiki; não passam pelo fechamento | 1a |
| Compromisso | Marcar como migrado; marcar como feito; descartar; vincular a um projeto (opcional) | 5 |
| Lembrete ignorado | Manter; mudar; largar | 3 |

- Finalizar significa que eu engajei com a tarefa, e gera um log de execução histórica, com os dados necessários para calcular métricas de qualquer período. Tarefas podem ser finalizadas a qualquer momento e, depois disso, não passam mais por triagens.
- Arquivar move a tarefa para uma lista de tarefas que podem ser reativadas depois; ela deixa de aparecer entre as tarefas que podem ser escolhidas para um dia.
- Abandonar tira a tarefa de circulação sem que ela tenha sido realizada: ela some de todas as listas e não gera log de execução, mas o histórico de eventos guarda o abandono.
- Descartar tira as notas de circulação da mesma forma: elas saem da wiki, e o histórico de eventos guarda o descarte.
- Num fechamento atrasado, "dia seguinte" é o dia depois do dia triado, mas nunca antes de hoje.
- O vínculo da tarefa com um projeto serve de cold start para os projetos e objetivos da Revisão de Rumo. *(2)*
- Se eu estiver indecisa sobre uma tarefa, eu posso escolher "decidir na Revisão de Foco". Não há limite para isso. *(2)*
- As notas vinculadas como recurso continuam na wiki, porque as notas não moram num lugar só. *(4)*
- Um lembrete ignorado continua na faixa da nota do dia até o fechamento, onde o item vira pergunta: manter, mudar ou largar. "Manter" vem pré-selecionado, porque largar tira o item de circulação. *(3)*

## Planejamento do dia seguinte e fim do dia

- Depois da triagem, eu faço o planejamento do dia seguinte: cada tarefa tem uma data, e eu posso mudar a de qualquer uma, para o dia seguinte, para outra data ou para "sem data". A tela mostra as tarefas que já estão na nota do dia seguinte (entre elas, as que foram sozinhas para lá), as agendadas para os 3 dias depois dele e as da lista de tarefas ativas (sem data ou com data que já passou). Nada é finalizado ali, e a tarefa que eu não mudo fica como estava: com a data dela, ou sem data na lista de tarefas ativas. *(1a)*
- No planejamento, eu posso mudar a data de várias tarefas de uma vez: entro no modo de seleção, seleciono as linhas (Shift + clique seleciona um intervalo, e cada grupo tem "selecionar grupo") e escolho a data numa barra no rodapé. Selecionar uma linha só destaca a linha, sem caixinha, para nunca parecer que finaliza a tarefa. *(1a)*
- No planejamento do dia seguinte, as tarefas dos projetos em foco aparecem primeiro (`prioridades.md`, "Projetos em foco"). *(2)*
- Quando tudo for triado, aparece o botão "finalizar meu dia" com sonzinho de "plim" e uma rápida animação de fogos de artifício. *(1a)*

## Fechamento em lote

O fechamento é em lote: o app chega com os destinos já aplicados ou pré-selecionados, e eu cuido só das exceções. O app decide sozinho o que é óbvio e reversível, sugere o que é provável, e nunca decide o que só eu sei ou o que tira coisas de circulação.

- Ao abrir o "Fechar o dia", as decisões automáticas já foram aplicadas e as sugeridas aparecem pré-selecionadas.
- Tudo o que o app aplicou sozinho às tarefas pode ser desfeito no próprio fechamento, na etapa "Confirmação".

### Fechamento em etapas

Mostrar tudo numa tela só pesava, porque misturava tipos de decisão diferentes. O fechamento é uma sequência de etapas, cada uma com um tipo só de decisão, e a etapa sem nada para decidir é pulada. Num dia tranquilo, sobram a confirmação e o planejamento.

1. **Fez e não marcou?:** uma lista só com as tarefas ainda abertas, agrupadas por seção, inclusive as que vão sozinhas para o dia seguinte. Eu marco as que fiz. Vem primeiro para eu não decidir o destino de algo que já fiz.
2. **Pedem atenção:** um card por tarefa adiada 3 vezes ou mais, ou com prazo antes do dia seguinte. O título é a pergunta, e a tarefa aparece como na nota do dia. Arquivar e abandonar aparecem como opção, nunca como sugestão.
3. **Lembretes:** um card por lembrete ignorado: manter, mudar ou largar. *(3)*
4. **Confirmação:** o que vai acontecer quando eu confirmar. As tarefas que vão sozinhas para o dia seguinte ficam num grupo recolhido, com o número delas, e eu posso abrir o grupo para finalizar ou mudar qualquer uma. Uma linha lembra que as notas foram para a wiki e que as seções em quadro branco ficaram para o assistente "Seções soltas".
5. **Planejamento do dia seguinte** (veja "Planejamento do dia seguinte e fim do dia").

- Nos cards, as opções ficam numa fileira compacta, e só a escolhida mostra a explicação e o campo de que precisa. Os números escolhem a opção e Enter avança.
- Cada etapa é salva quando eu avanço. Se eu sair no meio, o que decidi fica, e o fechamento recomeça na primeira etapa que ainda tem algo pendente. As tarefas que eu não marquei como feitas continuam abertas até a confirmação, então "Fez e não marcou?" aparece de novo.

### Regras da auto-triagem

Cada regra vale a partir da parte da spec em que a funcionalidade dela aparece.

| Nível | Regra | A partir de |
| --- | --- | --- |
| Automático | Tarefa finalizada durante o dia sai da triagem | 1a |
| Automático | As notas de todas as seções vão para a wiki; as de seções vinculadas a um projeto ficam ligadas a ele | 1a |
| Automático | Tarefa não feita, adiada menos de 3 vezes, vai para o "dia seguinte"; a partir da seção 3, para o próximo dia ativo. Conta como adiamento | 1a |
| Automático | Tarefa que já tem data de intenção futura, definida durante o dia, sai da triagem | 1b |
| Automático | Compromisso com a integração do Google Agenda ativa é migrado assim que é criado | Fase com conexões externas |
| Sugerido | Tarefa não feita, adiada 3 vezes ou mais: pede decisão, com destaque e "dia seguinte" pré-selecionado; a partir da seção 2, a sugestão passa a ser "decidir na Revisão de Foco" | 1a |
| Sugerido | Tarefa com prazo máximo: uma data de intenção antes do prazo, no lugar do "dia seguinte" | 1b |
| Sempre manual | Finalizar uma tarefa, porque só eu sei se fiz | 1a |
| Sempre manual | Abandonar ou arquivar uma tarefa, ou descartar notas, porque tiram coisas de circulação | 1a |

## Fechar dias pendentes

- Quando há mais de um dia com fechamento pendente, por exemplo depois de vários dias úteis sem abrir o app, o aviso da nota do dia sugere "Fechar dias pendentes". Com um dia só, o aviso oferece apenas "Fechar o dia".
- Ele aplica as decisões automáticas e as sugestões a todos os dias pendentes de uma vez.
- As tarefas não feitas desses dias voltam para a lista de tarefas ativas, sem data de intenção, para não criar uma pilha no dia de hoje. Elas contam como adiamento.
- Seções em quadro branco ficam sem vínculo, como no fim de um dia comum.
- Nada é apagado: abandonar, arquivar e descartar nunca acontecem sozinhos.
