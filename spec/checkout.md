# Fechar o dia e auto-triagem

- **Entra aqui:** o "Fechar o dia", o ritual diário que antes se chamava checkout; os destinos de cada tipo de item; o quadro em que eu ponho tarefas na fila de execução; a auto-triagem; e o "Fechar dias pendentes". Antes, a auto-triagem tinha um arquivo próprio (`AUTO-TRIAGEM.md`).
- **Não entra aqui:** o que acontece com o item depois do destino, como um hábito criado a partir de uma tarefa (`habitos.md`); e o que não perece de um dia para o outro, como seções sem projeto, que fica nos "Assistentes" da tela "Rituais" (`assistentes.md`).

## Em aberto

- [ ] O limite de 3 adiamentos é o número certo? Ele decide quais tarefas aparecem destacadas na triagem do "Fechar o dia". Com o fim da data de intenção, quase nenhuma tarefa nova ganha adiamentos: o destaque ainda faz sentido?

## Fechar o dia *(1a)*

O "Fechar o dia" é curto, de cerca de um minuto: ele cuida só do que perece de um dia para o outro, enquanto eu ainda lembro do contexto. Todo o resto o app resolve sozinho ou deixa para os "Assistentes", que eu faço quando quiser e sem data (`assistentes.md`).

- O dia só vira depois da meia-noite.
- O fechamento pode ser feito antes de o dia terminar e mais de uma vez por dia. Ao fim dele, eu posso continuar o mesmo dia normalmente. Se eu adicionar itens depois do fechamento, ele volta a ficar pendente.
- Posso fechar o dia na manhã seguinte, descansada e com o contexto ainda fresco, sem que isso conte como atraso.
- As notas não passam pelo fechamento: as de todas as seções, gerais ou de reunião, com projeto ou em quadro branco, ficam onde foram escritas, e as de seções vinculadas também aparecem na página do projeto (veja "Regras da auto-triagem" e `nota-do-dia.md`, "Notas depois do dia").
- As seções em quadro branco também não passam pelo fechamento. Se o dia termina com uma seção em quadro branco, o conteúdo dela fica sem vínculo com projeto, e o assistente "Seções soltas" oferece converter em projeto ou vincular depois (`assistentes.md`).
- O fechamento não leva nenhuma tarefa sozinho para lugar nenhum. Passam por ele as tarefas abertas do dia: as escritas nele e as que ainda têm uma data antiga para aquele dia (`tarefas.md`), além das tarefas aguardando (`pessoas.md`). Uma tarefa com data futura antiga, de antes do fim da data de intenção, fica de fora até o dia dela.
- As tarefas são triadas num quadro (veja "Quadro do fechamento e fim do dia"). Numa seção vinculada a um projeto, elas continuam vinculadas a ele.
- Um fechamento é considerado finalizado quando o dia termina sem nenhum item pendente para triagem.
- Na coluna das tarefas do dia, elas aparecem na mesma ordem da nota do dia, inclusive a que eu escolhi ao reordenar (`nota-do-dia.md`, "Ordem das linhas e das seções"). Os projetos aparecem na ordem da primeira tarefa de cada um, e as tarefas sem projeto ficam por último. *(1b)*

## Destinos

| Tipo de bloco | Destino no "Fechar o dia" | A partir de |
| --- | --- | --- |
| Tarefa | Finalizar; colocar na fila de execução *(7)*; deixar como está, no projeto ou com a pessoa; abandonar | 1a |
| Tarefa | Converter em hábito (`habitos.md`) | 6 |
| Tarefa aguardando (`pessoas.md`) | Passa pelo mesmo quadro, mas não vai para a fila: finalizar conclui; deixar como está; abandonar. A data para cobrar muda na página da pessoa | 2 |
| Notas de uma seção | Ficam onde foram escritas; não passam pelo fechamento | 1a |
| Compromisso | Marcar como migrado; marcar como feito; descartar; vincular a um projeto (opcional) | 5 |
| Lembrete ignorado | Manter; mudar; largar | 3 |

- Finalizar significa que eu engajei com a tarefa, e gera um log de execução histórica, com os dados necessários para calcular métricas de qualquer período. Tarefas podem ser finalizadas a qualquer momento e, depois disso, não passam mais por triagens.
- Abandonar tira a tarefa de circulação sem que ela tenha sido realizada, como se eu a apagasse: ela some de todas as telas e não gera log de execução, mas o histórico de eventos guarda o abandono.
- Não existe mais arquivar: para deixar uma tarefa para depois, eu simplesmente não a ponho na fila, e ela fica no projeto ou com a pessoa. O que eu nem sei se quero fazer é ideia (`ideias.md`) *(7)*.
- O vínculo da tarefa com um projeto serve de cold start para os projetos e os objetivos. *(2)*
- O fechamento não tem mais a opção "Decidir na Revisão de Foco": a revisão saiu do app. As tarefas que esperavam por ela voltaram a ser tarefas sem data, e as notas deixadas para ela ficaram guardadas, como as de um dia fechado. *(2)*
- A tarefa que eu não mexo no quadro fica como está, na lista de tarefas e no projeto ou com a pessoa, quando eu sigo para a próxima etapa. Se ela ainda tinha uma data antiga, fica sem data, e isso não conta como adiamento (`tarefas.md`). Uma tarefa aguardando que eu não mexo fica como está.
- As notas vinculadas como recurso continuam na página do projeto, porque as notas não moram num lugar só. *(4)*
- Um lembrete ignorado continua na faixa da nota do dia até o fechamento, onde o item vira pergunta: manter, mudar ou largar. "Manter" vem pré-selecionado, porque largar tira o item de circulação. *(3)*

## Quadro do fechamento e fim do dia

Por quê: dar uma data a cada tarefa virava uma pilha de datas empurradas para a frente. No quadro, eu só escolho o que vai para a fila de execução; o resto fica onde já está. Decidido em 12/11/2026, no lugar dos quadros de dias.

- O fechamento das tarefas é feito num quadro de duas colunas, em que cada tarefa é um card só com o texto dela e o nome do projeto. *(7)*
- A coluna da esquerda tem as tarefas do dia que passam pelo fechamento ("Tarefas de hoje", ou "Tarefas do dia" num fechamento atrasado), cada uma com a caixinha de finalizar. A da direita é a "Fila de execução" (`prioridades.md`, "Fila de execução"), com as tarefas que já estão nela, na ordem dela. *(7)*
- Eu arrasto da esquerda para a fila as tarefas que eu quero fazer. Elas entram no fim da fila, na ordem em que eu arrastei, e eu posso arrastá-las de volta para a esquerda antes de seguir. As tarefas que já estavam na fila só aparecem ali, para eu ver a fila inteira: elas mudam na tela da fila. Uma tarefa aguardando não vai para a fila. *(7)*
- Acima do quadro fica a área "Abandonar tarefa", com o ícone de lixeira, para onde eu arrasto o que quero abandonar. A tarefa abandonada ou finalizada continua onde estava, esmaecida. *(7)*
- O que eu não arrasto para a fila nem abandono fica como está: continua na lista de tarefas, vinculado ao projeto ou à pessoa. *(7)*
- Embaixo do quadro, o app diz com quantas tarefas a fila fica.
- Nada é gravado até eu clicar em seguir (ou "Finalizar meu dia"): só aí as tarefas entram na fila, as marcadas são finalizadas e as abandonadas saem de circulação. *(7)*
- Não há mais o quadro das atrasadas nem colunas de dias, e o quadro não tem "Selecionar várias". *(7)*
- Na última etapa, o botão "finalizar meu dia" vem com sonzinho de "plim" e uma rápida animação de fogos de artifício. *(1a)*

## Fechamento em lote

O fechamento é em lote: eu decido o destino das tarefas do dia num quadro só e gravo tudo de uma vez. O app decide sozinho só o que não envolve tarefa aberta (as notas e os quadros brancos), e nunca põe uma tarefa na fila, nem decide o que só eu sei ou o que tira coisas de circulação.

### Fechamento em etapas

Mostrar tudo numa tela só pesava, porque misturava tipos de decisão diferentes. O fechamento é uma sequência de etapas, cada uma com um tipo só de decisão, e a etapa sem nada para decidir é pulada. Num dia tranquilo, sobra o quadro das tarefas do dia.

1. **Tarefas:** o quadro das tarefas do dia e da fila de execução (veja "Quadro do fechamento e fim do dia"). Essa etapa sempre aparece, porque fecha o dia mesmo quando está vazia. A etapa "Atrasadas" saiu com a data de intenção.
2. **Lembretes:** um card por lembrete ignorado: manter, mudar ou largar. *(3)*

- As ações de todas as etapas são ícones, com o nome numa dica ao passar o mouse. Voltar, Seguir e "Finalizar meu dia" continuam com texto.
- Nos cards, as opções ficam numa fileira compacta, e só a escolhida mostra a explicação e o campo de que precisa. Os números escolhem a opção e Enter avança.
- Cada etapa é salva quando eu avanço. Se eu sair no meio, o que decidi fica, e o fechamento recomeça na primeira etapa que ainda tem algo pendente.

### Depois do fechamento

- Quando eu finalizo o dia, volto para onde comecei o fechamento: para a tela "Rituais", se eu o abri pelo calendário de "Fechar o dia" (`assistentes.md`), ou para a nota do dia de hoje, sem ir para o dia seguinte.
- Se eu fecho o dia antes de ele terminar, é porque quero recomeçar do zero: a nota de hoje fica limpa, como se eu tivesse acabado de começar o dia. Somem dela as notas (as de seção vinculada continuam na página do projeto, e as de seção sem vínculo no assistente "Seções soltas"), as tarefas finalizadas e as tarefas triadas, que continuam na lista de tarefas, na fila e na página do projeto. O que eu escrevo depois do fechamento aparece normalmente.
- A nota de um dia que já passou continua mostrando tudo o que foi escrito nele, porque é pela paginação entre dias que eu encontro as notas (`nota-do-dia.md`, "Notas depois do dia").

### Regras da auto-triagem

Cada regra vale a partir da parte da spec em que a funcionalidade dela aparece.

| Nível | Regra | A partir de |
| --- | --- | --- |
| Automático | Tarefa finalizada durante o dia sai da triagem | 1a |
| Automático | As notas de todas as seções saem da triagem; as de seções vinculadas a um projeto aparecem na página dele | 1a |
| Automático | Compromisso com a integração do Google Agenda ativa é migrado assim que é criado | Fase com conexões externas |
| Destaque | Tarefa não feita, adiada 3 vezes ou mais: aparece destacada na triagem | 1a |
| Destaque | Tarefa com prazo máximo antes do dia seguinte: aparece destacada, com o prazo | 1b |
| Sempre manual | Colocar uma tarefa na fila de execução: o app nunca a põe sozinho | 7 |
| Sempre manual | Finalizar uma tarefa, porque só eu sei se fiz | 1a |
| Sempre manual | Abandonar uma tarefa, porque tira coisas de circulação | 1a |

## Fechar dias pendentes

- Quando há mais de um dia com fechamento pendente, por exemplo depois de vários dias úteis sem abrir o app, o aviso da nota do dia sugere "Fechar dias pendentes". Com um dia só, o aviso oferece apenas "Fechar o dia".
- Ele aplica as decisões automáticas e as sugestões a todos os dias pendentes de uma vez.
- As tarefas não feitas desses dias ficam na lista de tarefas, sem data e fora da fila, para não criar uma pilha no dia de hoje. Elas contam como adiamento.
- Seções em quadro branco ficam sem vínculo, como no fim de um dia comum.
- Nada é apagado: abandonar nunca acontece sozinho.
