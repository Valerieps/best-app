# Pessoas

- **Entra aqui:** a pessoa, a menção com `@`, a tarefa aguardando e a data para cobrar, a tela "Pessoas" e a página da pessoa. Vale a partir da fase 2.
- **Não entra aqui:** onde "Pessoas" fica na barra lateral (`navegacao.md`), a tarefa em si e o fim da data de intenção (`tarefas.md`), e o que o "Fechar o dia" faz com uma tarefa aguardando (`checkout.md`, "Destinos").

## Pessoa e menção

- Uma pessoa tem só nome, de uma palavra só: não há nomes compostos.
- Eu cito uma pessoa escrevendo `@Nome` em qualquer linha, de qualquer seção. Ao digitar `@`, o app sugere as pessoas que já existem, e escolher uma completa o nome. Se eu não escolho nenhuma da lista, o app cria uma pessoa nova com o nome que eu digitei, quando eu saio da linha ou escolho "Criar a pessoa…".
- Maiúsculas não contam (`@ana` e `@Ana` são a mesma pessoa), mas acentos contam (`@Aná` é outra).
- `@Nome` numa tarefa quer dizer que eu devo aquilo à pessoa. `@Nome` numa nota é só uma menção.
- Cada pendência envolve uma pessoa só: se a linha cita mais de uma, vale a primeira.

## Reunião com pessoas

- Numa seção de reunião, se o título começa com `@`, a reunião é com pessoas: eu escrevo `@Ana @Rafael` e o `@` sugere as pessoas, como numa linha. Nesse caso o app não sugere nem cria projeto, e a seção não aparece nas seções soltas do "Fechar o dia".
- Tudo o que escrevo nessa reunião vai para a página das pessoas do título: as tarefas contam como se citassem a primeira pessoa (eu devo; ou me deve, se aguardando), a menos que a linha cite outra, e as notas aparecem na aba "Notas" de cada uma.
- Se eu vinculo a seção a um projeto, ela passa a ser do projeto e deixa de aparecer nas pessoas.

## Aguardando

- Uma tarefa aguardando é algo que a pessoa me deve. Eu crio uma começando a linha com `[a]` e espaço (a de aguardando), como o `[]` da tarefa comum, ou marco uma tarefa já escrita com "Aguardando", no hover.
- Ela tem uma data para cobrar. Na data para cobrar, ela aparece na nota do dia. A data para cobrar continuou quando a data de intenção das minhas tarefas saiu (`tarefas.md`), e é a única data que a página da pessoa mostra. *(decidido pelo agente; veja a issue #164)*
- Sem data para cobrar, ela passa pelo "Fechar o dia" (`checkout.md`). No dia da data para cobrar, se ainda não chegou, ela também passa.
- A data para cobrar não entra nas métricas da precisão da data de intenção.
- Ela não entra na lista de tarefas, na fila de execução nem nas prioridades do dia: aparece na página da pessoa, na tela "Pessoas" e na nota do dia da data para cobrar.
- Quando a pessoa entrega, eu concluo pelo checkbox, e acontece o mesmo que com uma tarefa concluída.

## Tela "Pessoas"

- A tela "Pessoas" lista as pessoas em ordem alfabética, cada uma com quantas coisas eu devo a ela e quantas ela me deve, e há quanto tempo está aberta a mais antiga.
- Embaixo, ela junta todas as tarefas aguardando, das mais antigas para as mais novas, com a pessoa e a data para cobrar.
- As pessoas arquivadas ficam num grupo recolhido no fim.

## Página da pessoa

- A página da pessoa tem duas listas, "Eu devo" e "Me deve", com as tarefas ativas que citam a pessoa. Cada item mostra há quanto tempo está aberto, e os mais antigos vêm primeiro.
- Embaixo, duas abas, como na página do projeto. "Tarefas": as tarefas ativas, das mais antigas para as mais novas, e as feitas, recolhidas. "Notas": as notas que citam a pessoa e as escritas em reuniões com ela, das mais novas para as mais antigas, com o dia e a seção.
- Não há página de reunião: a reunião é só um lugar para escrever, e as pessoas aparecem pelas menções e pelo título da reunião.
- Na página da pessoa, eu posso renomear a pessoa, e o nome muda em todas as linhas e em todos os títulos de reunião que a citam. Posso juntar duas pessoas que são a mesma: as menções passam a citar a que fica. Posso arquivar a pessoa, que sai das sugestões do `@` e vai para o grupo das arquivadas, e reativar depois. E posso apagar a pessoa: o texto das linhas continua como está, só deixa de ser uma menção.
