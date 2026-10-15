# Navegação

- **Entra aqui:** onde cada opção mora (barra lateral, cabeçalho da tela, ações do item), o menu "Rituais" e a fila de avisos.
- **Não entra aqui:** o comportamento de cada tela (fica no arquivo da funcionalidade).

Toda opção do app mora num de três níveis, e cada nível tem um lugar fixo, para eu saber onde procurar.

## 1. Global: a barra lateral, igual em toda tela

- Tudo o que é global fica numa única barra lateral fixa, à esquerda. Não há barra de cima nem gaveta: o centro fica limpo para eu focar no trabalho. A área central é toda branca em toda tela, como no Obsidian, para dar a sensação de que tudo é área de trabalho *(1b)*. O rascunho é o `rascunhos/rascunho-barra-lateral_1.png`, mas dele vale só a barra lateral, e os itens são os desta lista.
- O app ainda não tem versão para celular: a barra lateral é pensada para a tela do computador.
- Eu posso recolher a barra lateral num botão no topo dela. Recolhida, ela vira uma faixa estreita só com o botão de abrir e o contador de "Rituais". Recolher e abrir é uma transição suave, e a área central acompanha *(1b)*. O app lembra se deixei a barra aberta ou recolhida. Aberta, eu posso arrastar a borda direita dela com o mouse para deixá-la mais larga ou mais estreita, e a área central encolhe ou cresce junto *(1b)*. A largura vai de 200 a 480 pixels, começa em 260, e um clique duplo na borda volta para ela. O app lembra a largura que escolhi.
- No topo da barra fica o nome do app, "Best App" por enquanto. Clicar nele abre a nota do dia.
- A barra lateral tem só lugares, em grupos, nesta ordem: Hoje (Hoje, próximos dias e Rituais); Planejamento (projetos, objetivos, hábitos); Listas (tarefas ativas, tarefas arquivadas, wiki); e, no rodapé, Dados e backup e Configurações.
- "Hoje" volta para a nota do dia de qualquer tela.
- "Rituais" abre, ali mesmo na barra, a lista dos rituais: "Fechar o dia" de hoje e os dias pendentes, Revisão de Foco, Revisão de Rumo e "Colocar ordem na casa". A lista começa fechada, e já aberta quando estou numa tela de ritual. Um contador soma os dias pendentes e as revisões disponíveis. Uma revisão disponível aparece nos dois lugares: no contador e num aviso na nota do dia (`rituais.md`, "Quando uma revisão fica disponível").
- O status do backup fica sempre visível, na mesma linha de "Dados e backup", como um ponto colorido com um rótulo curto ("Backup 14:32", "Sem backup", "Backup pausado"). Clicar nele abre "Dados e backup", também quando o backup pede autorização de novo; o botão de retomar fica lá. A faixa de backup aparece em todas as telas só enquanto não houver nenhum backup, ou quando o backup estiver bloqueado ou com erro.
- Só um aviso aparece por vez no topo da tela, nesta ordem: backup bloqueado ou com erro, fechamento pendente, backup ainda não ativado, revisão disponível. Quando um some, o próximo aparece. Os lembretes que voltaram ficam fora dessa fila e aparecem sempre, porque são o único sinal deles.
- O aviso de fechamento pendente e o de backup não ativado têm "Lembrar depois", que os esconde até o dia seguinte. O aviso de revisão disponível também tem "Lembrar depois", mas ele o esconde até o próximo fechamento (`rituais.md`). O contador de "Rituais" continua mostrando os dias pendentes. O aviso de backup bloqueado ou com erro não pode ser adiado.
- Quando uma mudança não é salva, a tela volta ao que está salvo e um aviso curto aparece no rodapé, fora da fila do topo: "Uma mudança não foi salva. A tela mostra o que está salvo; tente de novo." Ele fica até eu fechar, e conta as mudanças se mais de uma falhar.

## 2. Da tela: um cabeçalho no topo do centro

- Título à esquerda; à direita, no máximo uma ação principal e um "⋯" com as outras.
- Na nota do dia, o título é a data com as setas entre dias pendentes, a ação principal é "Fechar o dia" daquele dia, e o "⋯" tem "Fixar prioridades". Os botões "+ Seção geral" e "+ Seção de reunião" ficam sempre visíveis no fim da nota, porque abrir seção é parte da captura. Uma seção nova entra no fim da nota, então não há botão entre as seções; depois eu posso mudá-la de lugar (`nota-do-dia.md`, "Ordem das linhas e das seções"). O "Fechar o dia" fica nos dois lugares: em "Rituais" e na nota do dia.
- No modo foco da nota do dia, o cabeçalho da tela sai: fica só a parte em foco, e o ícone de reduzir dela faz o papel da ação principal (`nota-do-dia.md`, "Modo foco").
- Os avisos que dizem respeito só àquela tela ficam logo abaixo do cabeçalho dela, como o fechamento pendente, a revisão disponível e os lembretes que voltaram, que aparecem só na nota do dia.
- Nos fluxos ("Fechar o dia" e revisões), a decisão fica no fim da página, porque eu leio de cima para baixo antes de decidir. O botão de confirmar a triagem se chama "Confirmar decisões".
- A tela "Iniciar Dia" é a única sem barra lateral: é uma tela branca só com um desenho simples de sol e o botão.

## 3. Do item: ações no hover

- Ações de uma linha ou de um item aparecem quando passo o mouse por cima ou quando o cursor está na linha, como data, prazo e prioridade numa tarefa.
- O que já está definido fica visível na própria linha, sem hover: a data de intenção e o prazo viram etiquetas, e clicar numa delas muda a data. A estrela é uma só: cheia, ela marca a prioridade do dia e fica sempre visível; vazia, aparece no hover e promove a tarefa. Finalizar é pelo checkbox, sem botão repetido.
- Uma linha vazia mostra uma dica de como criar tarefa enquanto eu escrevo nela.
