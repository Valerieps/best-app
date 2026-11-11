# Prioridades

- **Entra aqui:** as prioridades do dia, os projetos em foco, os próximos passos dos projetos e a tela "Executar".
- **Não entra aqui:** as funcionalidades dos projetos (`projetos.md`).

## Em aberto

- [ ] Onde a tela "Executar" fica na barra lateral, e se ela substitui "Próximos dias" (`tarefas.md`), que mostra parte do mesmo conteúdo.
- [ ] A tela "Executar" mostra também as tarefas com prazo máximo nos próximos dias, ou só as que o prazo já tornou prioridade?
- [ ] A tarefa sem data e sem projeto só volta por "Tarefas esquecidas" (`assistentes.md`). O planejamento do "Fechar o dia" deveria sugerir 2 ou 3 delas por dia, em rodízio pelas que estão há mais tempo sem aparecer?

Eu escolho os projetos em foco quando quiser, e o fechamento do dia escolhe tarefas. Fora do dia, a única prioridade de tarefa é o próximo passo de um projeto *(7)*.

## Prioridades do dia *(1b)*

- Data de intenção é diferente de prioridade: as prioridades são um destaque dentro das tarefas do dia.
- As 3 prioridades do dia são sempre tarefas, e a qualquer momento uma tarefa pode ser promovida a prioridade do dia. A tarefa priorizada aparece nos dois lugares: no bloco de prioridades e na seção em que está. O bloco de prioridades pode ser fixado no topo, para não sumir quando eu rolar a nota: um ícone de pin no canto do próprio bloco fixa e desfixa. O pin aparece quando passo o mouse no bloco, e fica sempre à vista enquanto o bloco está fixado. O bloco tem o fundo da mesma cor da barra lateral, para se destacar das seções na área branca. Quando não está fixado, ele fica entre as seções da nota e muda de lugar como elas (`nota-do-dia.md`, "Ordem das linhas e das seções"). No bloco, cada prioridade escolhida à mão tem uma estrela preenchida; clicar nela tira a tarefa das prioridades. Uma tarefa que é prioridade porque o prazo máximo é hoje não tem estrela, e sim um ícone vermelho de alerta à esquerda dela, fora do bloco.
- No dia do prazo máximo, a tarefa se torna prioridade automaticamente. Se as 3 prioridades do dia já estiverem definidas, ela ocupa o lugar da terceira, sem criar uma quarta.
- A lista pode estar vazia: no primeiro uso, quando o dia anterior não foi fechado, ou quando as 3 prioridades já foram completadas. Prioridades finalizadas saem da lista.
- Promover uma tarefa quando as 3 prioridades já estão definidas não é bloqueado: a nova ocupa o lugar da terceira.
- Se mais de uma tarefa tiver o prazo máximo no mesmo dia, cada uma ocupa o lugar da última prioridade escolhida à mão, sem tirar outra que entrou pelo prazo.
- No bloco de prioridades eu também mudo as duas datas da tarefa, como na seção: a data de intenção e o prazo máximo. O prazo muda na hora. Mudar a data de intenção para outro dia, ou tirá-la, mostra uma barrinha que vai se esvaziando por 5 segundos, com a opção de cancelar. Se eu não cancelar, a tarefa vai para a data nova e sai das prioridades de hoje; na seção em que ela está, continua aparecendo com a data nova. Uma tarefa que é prioridade porque o prazo máximo é hoje continua prioridade, já que o prazo não mudou. Nas seções, mudar a data continua imediato, sem contagem.

## Projetos em foco *(2)*

- Os projetos em foco são até 3 projetos e formam uma lista separada das prioridades do dia.
- Eu adiciono, troco e tiro projetos da lista a qualquer momento, pela lista de projetos ou pela página do projeto, no "⋯" do projeto. A lista vale até eu mudá-la; o tempo sozinho não a muda. A Revisão de Foco, que antes era o único lugar para trocar ou tirar um projeto, saiu do app.
- "Colocar em foco" põe um projeto ativo numa vaga livre, no fim da lista. Na lista de projetos, cada vaga livre também tem "Colocar em foco".
- Com a lista cheia, "Colocar em foco no lugar de…" troca um projeto ativo por um dos 3 em foco, numa mudança só: o novo fica na posição do que saiu.
- "Tirar do foco", no "⋯" de um projeto em foco, tira o projeto da lista e libera a vaga.
- Finalizar um projeto em foco tira o projeto da lista e libera a vaga. Reabrir o projeto não o devolve à lista; se eu quiser, adiciono de novo.
- No planejamento do dia seguinte, o fechamento mostra as tarefas dos projetos em foco primeiro, para eu escolher entre elas as tarefas do dia seguinte (`checkout.md`, "Quadros do fechamento e fim do dia").

## Próximos passos *(7)*

Por quê: na hora de executar, eu não sabia no que focar, e a única forma de priorizar era dar a data de hoje, entrando em cada projeto.

- Um próximo passo é uma tarefa de projeto marcada como uma das próximas coisas a fazer nele. Cada projeto tem até 3. Uma tarefa sem projeto não pode ser próximo passo: para ela, a data de intenção faz esse papel.
- Eu marco e desmarco "Próximo" no hover da tarefa, tanto na página do projeto quanto na lista de tarefas (`tarefas.md`). Marcar um quarto não é bloqueado: o novo ocupa o lugar do terceiro, como nas prioridades do dia.
- Próximo passo não é data: a tarefa continua com a data que tinha, ou sem data. Finalizar ou abandonar a tarefa a tira dos próximos passos, e o app não me pede outra.
- Na página do projeto, os próximos passos ficam num grupo "Próximos passos", logo depois das travadas (`projetos.md`, "Página do projeto"). Uma tarefa travada que também é próximo passo fica só nas travadas, com a marca de próximo.
- Na lista de tarefas, a tarefa marcada mostra a marca de próximo, e um seletor "Só próximos passos" deixa só elas na lista, combinando com agrupar, ordenar e "Só projetos em foco".
- Uma tarefa aguardando (`pessoas.md`) não é minha para fazer e não ganha "Próximo". Se a tarefa muda de projeto ou perde o projeto, ela sai dos próximos passos do projeto antigo e não entra nos do novo; juntar projetos faz o mesmo com as tarefas que mudam. Reabrir uma tarefa finalizada não a devolve aos próximos passos.
- Um próximo passo que não está travado sai de "Próximos dias" e de "Sem data" na página do projeto e aparece só em "Próximos passos", com a data na linha: a tarefa nunca aparece duas vezes na página.

## Tela "Executar" *(7)*

- É a tela de quando eu paro para fazer as coisas: mostra numa visão só o que pede atenção agora, sem eu entrar em cada projeto.
- Mostra, nesta ordem: as prioridades do dia; as outras tarefas com data de hoje ou atrasadas; e os próximos passos dos projetos, agrupados por projeto.
- Um filtro escolhe se os próximos passos vêm de todos os projetos ativos ou só dos projetos em foco. Eu escolho na hora, e a escolha fica guardada neste navegador.
- Nas tarefas, eu tenho as mesmas ações da nota do dia: finalizar pelo checkbox e, no hover, mudar a data de intenção e o prazo, promover a prioridade do dia e marcar ou desmarcar "Próximo".
