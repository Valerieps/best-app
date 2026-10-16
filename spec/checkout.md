# Fechar o dia e auto-triagem

- **Entra aqui:** o "Fechar o dia", o ritual diário que antes se chamava checkout; os destinos de cada tipo de item; o planejamento do dia seguinte; a auto-triagem; e o "Fechar dias pendentes". Antes, a auto-triagem tinha um arquivo próprio (`AUTO-TRIAGEM.md`).
- **Não entra aqui:** o que acontece com o item depois do destino, como um hábito criado a partir de uma tarefa (`habitos.md`); a triagem da Revisão de Foco (`rituais.md`), que reaproveita esta; e o que não perece de um dia para o outro, como seções sem projeto e tarefas esquecidas, que fica nos "Assistentes" da tela "Rituais" (`assistentes.md`).

## Em aberto

- [ ] O limite de 3 adiamentos é o número certo? Ele decide quais tarefas aparecem destacadas na triagem do "Fechar o dia".

## Fechar o dia *(1a)*

O "Fechar o dia" é curto, de cerca de um minuto: ele cuida só do que perece de um dia para o outro, enquanto eu ainda lembro do contexto. Todo o resto o app resolve sozinho ou deixa para os "Assistentes", que eu faço quando quiser e sem data (`assistentes.md`).

- O dia só vira depois da meia-noite.
- O fechamento pode ser feito antes de o dia terminar e mais de uma vez por dia. Ao fim dele, eu posso continuar o mesmo dia normalmente. Se eu adicionar itens depois do fechamento, ele volta a ficar pendente.
- Posso fechar o dia na manhã seguinte, descansada e com o contexto ainda fresco, sem que isso conte como atraso.
- As notas não passam pelo fechamento: as de todas as seções, gerais ou de reunião, com projeto ou em quadro branco, ficam onde foram escritas, e as de seções vinculadas também aparecem na página do projeto (veja "Regras da auto-triagem" e `nota-do-dia.md`, "Notas depois do dia").
- As seções em quadro branco também não passam pelo fechamento. Se o dia termina com uma seção em quadro branco, o conteúdo dela fica sem vínculo com projeto, e o assistente "Seções soltas" oferece converter em projeto ou vincular depois (`assistentes.md`).
- O fechamento não parte do princípio de que uma tarefa sem data vai para o dia seguinte: as datas que eu dei durante o dia ficam exatamente como estão. Passam pelo fechamento só as tarefas abertas sem data, as que estão com a data do próprio dia (escritas com data de hoje ou vindas de outro dia) e as tarefas aguardando (`pessoas.md`). As que têm data futura já têm destino e ficam de fora.
- As tarefas são triadas em lote, agrupadas por projeto. Numa seção vinculada a um projeto, elas continuam vinculadas a ele.
- Um fechamento é considerado finalizado quando o dia termina sem nenhum item pendente para triagem.
- Dentro de cada projeto, a triagem mostra as tarefas na mesma ordem da nota do dia, inclusive a que eu escolhi ao reordenar (`nota-do-dia.md`, "Ordem das linhas e das seções"). Os projetos aparecem na ordem da primeira tarefa de cada um, e as tarefas sem projeto ficam por último. *(1b)*

## Destinos

| Tipo de bloco | Destino no "Fechar o dia" | A partir de |
| --- | --- | --- |
| Tarefa | Finalizar; dar uma data de intenção (atalho para o dia seguinte, ou outra data); sem data, que vai para a lista de tarefas; abandonar | 1a |
| Tarefa | Converter em hábito (`habitos.md`) | 6 |
| Tarefa aguardando (`pessoas.md`) | Passa pela mesma lista: a data vira a data para cobrar; finalizar conclui; "sem data" deixa como está; abandonar | 2 |
| Notas de uma seção | Ficam onde foram escritas; não passam pelo fechamento | 1a |
| Compromisso | Marcar como migrado; marcar como feito; descartar; vincular a um projeto (opcional) | 5 |
| Lembrete ignorado | Manter; mudar; largar | 3 |

- Finalizar significa que eu engajei com a tarefa, e gera um log de execução histórica, com os dados necessários para calcular métricas de qualquer período. Tarefas podem ser finalizadas a qualquer momento e, depois disso, não passam mais por triagens.
- Abandonar tira a tarefa de circulação sem que ela tenha sido realizada, como se eu a apagasse: ela some de todas as telas e não gera log de execução, mas o histórico de eventos guarda o abandono.
- Não existe mais arquivar: para deixar uma tarefa para algum dia, eu tiro a data dela.
- Num fechamento atrasado, "dia seguinte" é o dia depois do dia triado, mas nunca antes de hoje.
- O vínculo da tarefa com um projeto serve de cold start para os projetos e objetivos da Revisão de Rumo. *(2)*
- A tarefa que eu não mexo na triagem vai para a lista de tarefas, sem data, quando eu sigo para a próxima etapa, e isso não conta como adiamento. "Sem data" escolhido por mim numa tarefa que tinha data conta, como em qualquer mudança de data (`tarefas.md`). Uma tarefa aguardando que eu não mexo fica como está.
- As notas vinculadas como recurso continuam na página do projeto, porque as notas não moram num lugar só. *(4)*
- Um lembrete ignorado continua na faixa da nota do dia até o fechamento, onde o item vira pergunta: manter, mudar ou largar. "Manter" vem pré-selecionado, porque largar tira o item de circulação. *(3)*

## Planejamento do dia seguinte e fim do dia

- Depois da triagem, eu faço o planejamento do dia seguinte: cada tarefa tem uma data, e eu posso mudar a de qualquer uma, para o dia seguinte, para outra data ou para "sem data". A tela mostra as tarefas que já estão na nota do dia seguinte (entre elas, as que eu levei para lá na triagem), as agendadas para os 3 dias depois dele e as da lista de tarefas com data que já passou. As tarefas sem data não aparecem no planejamento: elas são o "algum dia" e ficam na lista de tarefas. Nada é finalizado ali, e a tarefa que eu não mudo fica como estava: com a data dela, ou sem data na lista de tarefas. *(1a)*
- No planejamento, eu posso mudar a data de várias tarefas de uma vez: entro no modo de seleção, seleciono as linhas (Shift + clique seleciona um intervalo, e cada grupo tem "selecionar grupo") e escolho a data numa barra no rodapé. Selecionar uma linha só destaca a linha, sem caixinha, para nunca parecer que finaliza a tarefa. *(1a)*
- No planejamento do dia seguinte, as tarefas dos projetos em foco aparecem primeiro (`prioridades.md`, "Projetos em foco"). *(2)*
- Quando tudo for triado, aparece o botão "finalizar meu dia" com sonzinho de "plim" e uma rápida animação de fogos de artifício. *(1a)*

## Fechamento em lote

O fechamento é em lote: eu seleciono várias tarefas e decido o destino de todas de uma vez. O app decide sozinho só o que não envolve tarefa aberta (as notas e os quadros brancos), e nunca muda a data de uma tarefa, nem decide o que só eu sei ou o que tira coisas de circulação.

### Fechamento em etapas

Mostrar tudo numa tela só pesava, porque misturava tipos de decisão diferentes. O fechamento é uma sequência de etapas, cada uma com um tipo só de decisão, e a etapa sem nada para decidir é pulada. Num dia tranquilo, sobra o planejamento.

1. **Tarefas:** a lista das tarefas que passam pelo fechamento, agrupadas por projeto. Na mesma tela eu decido se já fiz, se quero dar uma data ou se fica sem data. Eu seleciono as linhas (Shift + clique seleciona um intervalo, e cada grupo tem "selecionar o grupo") e escolho a ação na barra do rodapé: finalizar, levar para o dia seguinte, levar para uma data, sem data ou abandonar. Depois de cada ação em lote aparece um contador rápido do que foi feito ("3 tarefas finalizadas"), e as tarefas somem da lista. A tarefa adiada 3 vezes ou mais e a com prazo antes do dia seguinte aparecem destacadas, mas nunca mudam sozinhas. O que sobra na lista quando eu sigo vai para a lista de tarefas, sem data.
2. **Lembretes:** um card por lembrete ignorado: manter, mudar ou largar. *(3)*
3. **Planejamento do dia seguinte** (veja "Planejamento do dia seguinte e fim do dia").

- As ações de todas as etapas são ícones, com o nome numa dica ao passar o mouse. Voltar, Seguir e "Finalizar meu dia" continuam com texto.
- Nos cards, as opções ficam numa fileira compacta, e só a escolhida mostra a explicação e o campo de que precisa. Os números escolhem a opção e Enter avança.
- Cada ação em lote é salva na hora, e cada etapa é salva quando eu avanço. Se eu sair no meio, o que decidi fica, e o fechamento recomeça na primeira etapa que ainda tem algo pendente.

### Depois do fechamento

- Quando eu finalizo o dia, volto para onde comecei o fechamento: para a tela "Rituais", se eu o abri pelo calendário de "Fechar o dia" (`assistentes.md`), ou para a nota do dia de hoje, sem ir para o dia seguinte.
- Se eu fecho o dia antes de ele terminar, é porque quero recomeçar do zero: a nota de hoje fica limpa, como se eu tivesse acabado de começar o dia. Somem dela as notas (as de seção vinculada continuam na página do projeto, e as de seção sem vínculo no assistente "Seções soltas"), as tarefas finalizadas e as tarefas que ficaram sem data ou com outra data, que continuam na lista de tarefas e na página do projeto. Fica só o que está com a data de hoje, inclusive o que eu datei para hoje no fechamento. O que eu escrevo depois do fechamento aparece normalmente.
- A nota de um dia que já passou continua mostrando tudo o que foi escrito nele, porque é pela paginação entre dias que eu encontro as notas (`nota-do-dia.md`, "Notas depois do dia").

### Regras da auto-triagem

Cada regra vale a partir da parte da spec em que a funcionalidade dela aparece.

| Nível | Regra | A partir de |
| --- | --- | --- |
| Automático | Tarefa finalizada durante o dia sai da triagem | 1a |
| Automático | As notas de todas as seções saem da triagem; as de seções vinculadas a um projeto aparecem na página dele | 1a |
| Automático | Tarefa que já tem data de intenção futura, definida durante o dia, sai da triagem e fica com a data | 1b |
| Automático | Compromisso com a integração do Google Agenda ativa é migrado assim que é criado | Fase com conexões externas |
| Destaque | Tarefa não feita, adiada 3 vezes ou mais: aparece destacada na triagem | 1a |
| Destaque | Tarefa com prazo máximo antes do "dia seguinte": aparece destacada, com o prazo | 1b |
| Sempre manual | Dar uma data a uma tarefa: o app nunca a leva sozinho para o dia seguinte | 1a |
| Sempre manual | Finalizar uma tarefa, porque só eu sei se fiz | 1a |
| Sempre manual | Abandonar uma tarefa, porque tira coisas de circulação | 1a |

## Fechar dias pendentes

- Quando há mais de um dia com fechamento pendente, por exemplo depois de vários dias úteis sem abrir o app, o aviso da nota do dia sugere "Fechar dias pendentes". Com um dia só, o aviso oferece apenas "Fechar o dia".
- Ele aplica as decisões automáticas e as sugestões a todos os dias pendentes de uma vez.
- As tarefas não feitas desses dias voltam para a lista de tarefas, sem data de intenção, para não criar uma pilha no dia de hoje. Elas contam como adiamento.
- Seções em quadro branco ficam sem vínculo, como no fim de um dia comum.
- Nada é apagado: abandonar nunca acontece sozinho.
