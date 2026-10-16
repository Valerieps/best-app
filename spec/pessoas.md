# Pessoas

- **Entra aqui:** a pessoa, a menção com `@`, a tarefa aguardando e a data para cobrar, a tela "Pessoas" e a página da pessoa. Vale a partir da fase 2.
- **Não entra aqui:** onde "Pessoas" fica na barra lateral (`navegacao.md`), a tarefa em si e a data de intenção (`tarefas.md`), e o que o "Fechar o dia" faz com uma tarefa aguardando (`checkout.md`, "Destinos").

## Pessoa e menção

- Uma pessoa tem só nome, de uma palavra só: não há nomes compostos.
- Eu cito uma pessoa escrevendo `@Nome` em qualquer linha, de qualquer seção. Ao digitar `@`, o app sugere as pessoas que já existem, e escolher uma completa o nome. Se eu não escolho nenhuma da lista, o app cria uma pessoa nova com o nome que eu digitei, quando eu saio da linha ou escolho "Criar a pessoa…".
- Maiúsculas não contam (`@ana` e `@Ana` são a mesma pessoa), mas acentos contam (`@Aná` é outra).
- `@Nome` numa tarefa quer dizer que eu devo aquilo à pessoa. `@Nome` numa nota é só uma menção.
- Cada pendência envolve uma pessoa só: se a linha cita mais de uma, vale a primeira.

## Aguardando

- Uma tarefa aguardando é algo que a pessoa me deve. Eu crio uma começando a linha com `[a]` e espaço (a de aguardando), como o `[]` da tarefa comum, ou marco uma tarefa já escrita com "Aguardando", no hover.
- Ela tem uma data para cobrar, que é a data de intenção dela. Na data para cobrar, ela aparece na nota do dia.
- Sem data para cobrar, ela passa pelo "Fechar o dia" (`checkout.md`). No dia da data para cobrar, se ainda não chegou, ela também passa.
- Mudar a data para cobrar não conta como adiamento, e ela não entra nas métricas da precisão da data de intenção nem na tarefa travada.
- Ela não entra em "Tarefas ativas", no planejamento do dia seguinte nem nas prioridades do dia: aparece na página da pessoa, na tela "Pessoas" e na nota do dia da data para cobrar.
- Quando a pessoa entrega, eu concluo pelo checkbox, e acontece o mesmo que com uma tarefa concluída.

## Tela "Pessoas"

- A tela "Pessoas" lista as pessoas em ordem alfabética, cada uma com quantas coisas eu devo a ela e quantas ela me deve, e há quanto tempo está aberta a mais antiga.
- Embaixo, ela junta todas as tarefas aguardando, das mais antigas para as mais novas, com a pessoa e a data para cobrar.
- As pessoas arquivadas ficam num grupo recolhido no fim.

## Página da pessoa

- A página da pessoa tem duas listas, "Eu devo" e "Me deve", com as tarefas ativas que citam a pessoa. Cada item mostra há quanto tempo está aberto, e os mais antigos vêm primeiro.
- Embaixo, as menções: as notas que citam a pessoa, das mais novas para as mais antigas, com o dia e a seção.
- Não há página de reunião: a reunião é só um lugar para escrever, e as pessoas aparecem pelas menções.
- Na página da pessoa, eu posso renomear a pessoa, e o nome muda em todas as linhas que a citam. Posso juntar duas pessoas que são a mesma: as menções passam a citar a que fica. Posso arquivar a pessoa, que sai das sugestões do `@` e vai para o grupo das arquivadas, e reativar depois. E posso apagar a pessoa: o texto das linhas continua como está, só deixa de ser uma menção.
