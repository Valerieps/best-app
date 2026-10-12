# Navegação

- **Entra aqui:** onde cada opção mora (barra lateral, cabeçalho da tela, ações do item), o menu "Rituais" e a fila de avisos.
- **Não entra aqui:** o comportamento de cada tela (fica no arquivo da funcionalidade).

Toda opção do app mora num de três níveis, e cada nível tem um lugar fixo, para eu saber onde procurar.

## 1. Global: a barra lateral, igual em toda tela

- Tudo o que é global fica numa única barra lateral fixa, à esquerda, sempre aberta. Não há barra de cima nem gaveta: o centro fica limpo para eu focar no trabalho. O rascunho é o `rascunhos/rascunho-barra-lateral_1.png`, mas dele vale só a barra lateral, e os itens são os desta lista.
- A barra lateral tem só lugares, em grupos: Hoje (Hoje, próximos dias e Rituais); Listas (tarefas ativas, tarefas arquivadas, wiki); Planejamento (projetos, objetivos, hábitos); e, no rodapé, Dados e backup, Configurações e o status do backup.
- "Hoje" volta para a nota do dia de qualquer tela.
- "Rituais" abre a lista dos rituais: checkout de hoje e checkouts pendentes, reflexão semanal, reflexão mensal e "Colocar ordem na casa". Um contador soma os checkouts pendentes e as reflexões disponíveis. Uma reflexão disponível aparece nos dois lugares: no contador e num aviso na nota do dia.
- O status do backup fica sempre visível, como um ponto colorido com um rótulo curto ("Backup 14:32", "Sem backup", "Backup pausado"). Clicar nele abre "Dados e backup". A faixa de backup aparece em todas as telas só enquanto não houver nenhum backup, ou quando o backup estiver bloqueado ou com erro.
- Só um aviso aparece por vez no topo da tela, nesta ordem: backup bloqueado ou com erro, checkout pendente, backup ainda não ativado, reflexão disponível. Quando um some, o próximo aparece. Os lembretes que voltaram ficam fora dessa fila e aparecem sempre, porque são o único sinal deles.
- O aviso de checkout pendente e o de backup não ativado têm "Lembrar depois", que os esconde até o dia seguinte. O contador de "Rituais" continua mostrando os checkouts pendentes. O aviso de backup bloqueado ou com erro não pode ser adiado.

## 2. Da tela: um cabeçalho no topo do centro

- Título à esquerda; à direita, no máximo uma ação principal e um "⋯" com as outras.
- Na nota do dia, o título é a data com as setas entre dias pendentes, a ação principal é "Fazer checkout" daquele dia, e o "⋯" tem "Fixar prioridades". Os botões "+ Seção geral" e "+ Seção de reunião" ficam sempre visíveis no fim da nota, porque abrir seção é parte da captura. As seções seguem a ordem em que foram criadas, então não há botão entre elas. O checkout fica nos dois lugares: em "Rituais" e na nota do dia.
- Os avisos que dizem respeito só àquela tela ficam logo abaixo do cabeçalho dela, como o checkout pendente, a reflexão disponível e os lembretes que voltaram, que aparecem só na nota do dia.
- Nos fluxos (checkout e reflexões), a decisão fica no fim da página, porque eu leio de cima para baixo antes de decidir. O botão de confirmar a triagem se chama "Confirmar decisões".
- A tela "Iniciar Dia" é a única sem barra lateral: é uma tela branca só com um desenho simples de sol e o botão.

## 3. Do item: ações no hover

- Ações de uma linha ou de um item aparecem quando passo o mouse por cima ou quando o cursor está na linha, como data, prazo e prioridade numa tarefa.
- O que já está definido fica visível na própria linha, sem hover: a data de intenção e o prazo viram etiquetas, e clicar numa delas muda a data. A estrela é uma só: cheia, ela marca a prioridade do dia e fica sempre visível; vazia, aparece no hover e promove a tarefa. Finalizar é pelo checkbox, sem botão repetido.
- Uma linha vazia mostra uma dica de como criar tarefa enquanto eu escrevo nela.
