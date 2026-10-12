# Feature requests

12/10/2026 · Valeria

Pedidos ainda não decididos. Cada um tem uma nota com o que ele muda no `SPEC.md`, as perguntas que precisam de resposta antes do código e as incoerências com o modelo atual. Quando um pedido for decidido, a regra vai para o `SPEC.md`, o andamento para o `ROADMAP.md`, e o item sai daqui.

- **Entra aqui:** pedidos de funcionalidade ou de mudança ainda não decididos, inclusive os que sobraram da avaliação de UX.
- **Não entra aqui:** regras já decididas (`SPEC.md`), bugs e débito técnico (`DEBITO-TECNICO.md`).

Já decididos e retirados desta lista: "Próximos dias" no menu (foi para o `spec/tarefas.md`) e o bloco de prioridades sempre fixado (fixar continua opcional).

## 1. Arquivar tarefas de qualquer tela

Poder arquivar uma tarefa em qualquer lugar onde ela aparece: nota do dia, página do projeto, lista de tarefas ativas, prioridades do dia, próximos dias.

- **O que muda:** hoje arquivar é só um destino do checkout e da reflexão semanal (`spec/checkout.md`, "Checkout").
- **Em aberto:**
  - [ ] Arquivar fora do checkout conta como a decisão daquele dia, ou a tarefa ainda passa pela triagem?
  - [ ] Abandonar também deveria estar disponível fora do checkout?
- **Incoerências com o modelo atual:**
  - O princípio "Sempre dá para criar ou editar qualquer coisa fora dos rituais" (`spec/principios.md`, "Princípios") já sugere que arquivar valha em qualquer tela, mas a tabela do checkout trata arquivar e abandonar como destinos do checkout.
  - O `spec/nota-do-dia.md` ("Execução") já diz que, para tirar de circulação uma tarefa que veio de outro dia, "eu arquivo ou abandono", sem dizer onde.
  - Tarefas criadas na página do projeto não passam pelo checkout (`spec/projetos.md`, "Projetos") e hoje não têm como sair de circulação (`DEBITO-TECNICO.md`, "Editor e telas"). Este pedido resolveria isso.
  - Pela regra de triagem atual (ADR-011), só tarefas ativas ficam pendentes; uma tarefa arquivada fora do checkout já sairia da triagem daquele dia.

## 2. Reordenar blocos dentro de uma seção

Poder mudar a ordem das linhas (tarefas e notas) dentro de uma seção.

- **O que muda:** hoje a ordem é a da escrita. O banco já guarda uma posição por bloco, que permite inserir uma linha entre duas outras sem reescrever as vizinhas.
- **Em aberto:**
  - [ ] Como reordenar: arrastar, atalho de teclado (Alt + ↑/↓) ou os dois?
  - [ ] Tarefas que vieram de outros dias, que hoje ficam no topo da primeira seção, também podem ser reordenadas?
  - [ ] Vale para todas as linhas ou só para as criadas no dia?
- **Incoerências com o modelo atual:**
  - As tarefas que vieram de outros dias não pertencem a uma seção do dia: elas aparecem no topo da primeira seção geral só na leitura (`ARQUITETURA.md`, "Consultas derivadas"), e a `position` delas é a da seção de origem. Reordená-las exige guardar uma ordem própria por dia.
  - O `spec/nota-do-dia.md` ("Execução") descreve a captura como sequencial, na ordem da escrita.
  - Em dias passados, o editor não cria linhas (ADR-018); falta dizer se reordenar vale ali.
  - Mudar a posição não gera evento hoje (ADR-004 trata só de texto); falta decidir se reordenar entra no histórico.
  - Mover uma linha para outra seção (`DEBITO-TECNICO.md`, "Editor e telas") é um pedido vizinho que este não cobre.

## 3. Data de intenção em destaque e ícone de ciclo no lugar de "adiada"

Na linha da tarefa, destacar a data de intenção de execução e trocar a palavra "adiada" por um ícone de ciclo.

- **O que muda:** hoje a data aparece como uma etiqueta discreta, e "adiada N×" é um texto (na página do projeto e no checkout).
- **Em aberto:**
  - [ ] O ícone de ciclo vem com o número ao lado (por exemplo, "↻ 3")?
  - [ ] O ícone aparece a partir do primeiro adiamento ou só a partir de 3, como o aviso atual?
  - [ ] O destaque da data vale em todas as telas (nota do dia, próximos dias, projeto, tarefas ativas, checkout)?
- **Incoerências com o modelo atual:**
  - O pedido 5 cria um grupo "adiadas para hoje", que volta a pôr o adiamento em evidência como rótulo, no sentido oposto deste pedido e dos pedidos de reforço positivo.
  - O limite de 3 adiamentos aparece em três regras: o destaque no checkout (`spec/checkout.md`), a tarefa travada no projeto (`spec/projetos.md`, "Projetos") e a sugestão de "decidir na reflexão semanal". Mostrar o ícone desde o primeiro adiamento desacopla o ícone desse limite.

## 4. Título do app leva para a nota do dia

Clicar em "Best App", na barra de cima, abre a nota do dia.

- **O que muda:** hoje o título é só texto, e a nota do dia abre pelo botão "Hoje". Com "Próximos dias" no lugar da nota do dia no menu (`spec/tarefas.md`, "Próximos dias"), o título passa a ser um segundo caminho para ela.
- **Em aberto:**
  - [ ] Com o título levando para a nota do dia, o botão "Hoje" continua na barra ou sai?
- **Incoerências com o modelo atual:**
  - O pedido "Reorganização e Hierarquia do Menu Lateral" põe "Hoje" também na gaveta. Com os dois, a nota do dia teria três caminhos (título, botão "Hoje" e gaveta), e a gaveta voltaria a ter a nota do dia, que o `spec/tarefas.md` ("Próximos dias") acabou de trocar por "Próximos dias".

## 5. Tarefas agendadas organizadas em grupos

Na nota do dia e na tela "Próximos dias", organizar as tarefas já agendadas em três grupos: prazo máximo hoje, prioridades do dia e adiadas para hoje.

- **O que muda:** o `spec/nota-do-dia.md` ("Execução") diz que as tarefas com data de intenção entram no topo da primeira seção geral "sem distinção visual das tarefas criadas no dia". Este pedido muda essa regra. A tela "Próximos dias" hoje mostra uma lista simples por dia.
- **Em aberto:**
  - [ ] Os grupos substituem o bloco "Prioridades do dia" ou convivem com ele?
  - [ ] Uma tarefa que está em mais de um grupo (prioridade com prazo hoje, por exemplo) aparece onde?
  - [ ] "Adiadas para hoje" quer dizer toda tarefa agendada para hoje que não está nos outros grupos, ou só as que já foram adiadas pelo menos uma vez?
  - [ ] Na tela "Próximos dias", os grupos se repetem para cada dia? "Prazo máximo hoje" e "prioridades do dia" só fazem sentido para hoje.
  - [ ] As tarefas agendadas saem do topo da primeira seção, ou aparecem nos dois lugares?
- **Incoerências com o modelo atual:**
  - Pelo `spec/prioridades.md` ("Prioridades do dia"), toda tarefa com prazo máximo hoje já vira prioridade do dia. O grupo "prazo máximo hoje" é, então, parte do grupo "prioridades do dia", e não um grupo separado.
  - A tarefa priorizada já aparece em dois lugares (bloco de prioridades e seção). Com os grupos, ela pode aparecer em três.
  - O grupo "adiadas para hoje" contradiz o pedido 3 e os pedidos de reforço positivo, que querem tirar o peso do adiamento.

## 6. Revisar o fluxo de checkout

Redesenhar o checkout como um fluxo com menos decisões por tela, resolvendo as incoerências da spec sobre ele. O checkout é a tela que prova a hipótese do app e nunca teve um rascunho de tela.

- **O que muda:** hoje o checkout é uma tela só (`spec/checkout.md`, "Checkout"; `spec/checkout.md`), e cada fase acrescentou decisões a ela:
  - tarefas: finalizar, dia seguinte, outra data, arquivar, abandonar, vincular a um projeto (2), decidir na reflexão semanal (2), virar hábito (6);
  - notas de cada seção: wiki, descartar, recurso de objetivo ou projeto (4);
  - quadros brancos: converter em projeto, vincular ou deixar sem vínculo;
  - lembretes ignorados: manter, mudar ou largar (3);
  - compromissos: migrado, feito, descartar, vincular (5);
  - depois disso, o planejamento do dia seguinte e, a partir da seção 2, puxar uma prioridade da semana.

  O P4 da avaliação de UX (`AVALIACAO-UX.md`) já apontou 7 opções de mesmo peso por tarefa, mais o seletor de projeto.
- **Incoerências da spec que este pedido resolve** (detalhes em `INCOERENCIAS.md`):
  - Lote ou item a item: o `spec/checkout.md` diz, em "Checkout", que eu confirmo o destino de cada tarefa de seção com projeto, e, em "Checkout em lote", que "Aceitar sugestões" confirma tudo de uma vez (1.1).
  - Três nomes para o botão: "Confirmar decisões", "Aceitar sugestões" e "finalizar meu dia" (2.5).
  - Três definições de checkout completo, e se a nota do dia some ao fim dele ou só à meia-noite (2.4).
  - Se o planejamento do dia seguinte inclui escolher as prioridades do dia (2.1).
  - Lembretes no checkout sem regra no `spec/checkout.md` (2.9).
- **Em aberto:**
  - [ ] Quais são as etapas e em que ordem? Por exemplo: o que o app já resolveu, tarefas, notas e quadros brancos, lembretes, planejamento de amanhã, fim do dia.
  - [ ] Cada etapa tem o próprio "Aceitar sugestões", ou há uma confirmação só no fim?
  - [ ] Quais opções ficam visíveis em cada item, e quais vão para um "Mais"?
  - [ ] Uma etapa sem nada para decidir é pulada?
  - [ ] Atalhos de teclado para triar sem mouse (P4 em `AVALIACAO-UX.md`)?
  - [ ] Dá para sair no meio e voltar depois sem perder o que já foi escolhido? Hoje sair sem aceitar não grava nada (ADR-012).
  - [ ] "Fechar dias pendentes" usa o mesmo fluxo, ou continua aplicando tudo de uma vez?
- **Pedidos relacionados:** arquivar de qualquer tela (pedido 1) tira decisões do checkout; o vínculo granular de projetos em seções de reunião aumenta o número de decisões; as micro-celebrações no checkout entram na etapa final. Vale um rascunho de tela antes do código.


# Feature Requests: Reforços Positivos, Gamificação e Leveza

Esta seção lista as melhorias para incentivar a manutenção de tarefas e projetos com foco em reforço positivo, celebrando o progresso e evitando uma abordagem punitiva (removendo a sensação de "culpa" por atrasos).

## 1. Ressignificação do "Colocar Ordem na Casa"
* **Objetivo:** Mudar o tom de "recuperação de crise" para "pausa consciente de alinhamento e clareza".
* **Especificações:**
  * Renomear o ritual nas interfaces e textos do app de "Colocar ordem na casa" para **"Reset de Energia"** (ou **"Recalibrar Foco"**).
  * Ajustar o texto de introdução do fluxo para focar em leveza: *"Sua vida muda rápido e os planos também. Vamos simplificar o backlog e renovar os compromissos com o que realmente importa hoje?"*
* **Incoerências com o modelo atual:**
  * O nome "Colocar ordem na casa" está no `spec/navegacao.md` ("Navegação"), no `spec/assistentes.md`, na `ARQUITETURA.md` e na ADR-028. O novo nome ainda tem duas opções ("Reset de Energia" ou "Recalibrar Foco").
  * Este bloco de pedidos não segue o formato do resto do documento ("O que muda" e "Em aberto"), e está escrito em terceira pessoa ("usuário"), não na primeira pessoa da spec (`CLAUDE.md`, "Working with the owner").

## 2. Micro-Celebrações e Reforço Positivo no Checkout Diário
* **Objetivo:** Destacar o que foi feito e o ganho de clareza, recompensando a consistência do usuário.
* **Especificações:**
  * **Métrica de Intenção Cumprida:** Em vez de focar apenas no número de adiadas, exibir uma mensagem positiva ao finalizar o dia (ex: *"Você concluiu X% do que planejou para hoje!"* ou *"X tarefas executadas no dia pretendido!"*).
  * **Celebração do Descarte Consciente:** Destacar o abandono de tarefas/notas que perderam o sentido como um ato saudável de gestão de energia (ex: *"Você libertou espaço mental ao descartar itens obsoletos"*).
  * **Animação/Som de Sucesso:** Manter e enriquecer a animação de fogos de artifício e o som de "plim" ao finalizar o dia, acompanhados de uma frase de conclusão leve e encorajadora.
* **Incoerências com o modelo atual:**
  * "% do que planejou para hoje" é uma métrica nova, diferente da precisão da data de intenção da reflexão semanal (`spec/rituais.md`), e não está definida: o que conta como "planejado"? Tarefas com data de intenção para hoje? E as criadas no dia?
  * "X tarefas executadas no dia pretendido" é a precisão semanal calculada para um dia; vale usar a mesma definição para os números baterem.
  * "Descarte" de tarefas: no `spec/checkout.md`, tarefas são *abandonadas* e notas são *descartadas*.
  * O checkout pode ser feito mais de uma vez por dia (`spec/checkout.md`, "Checkout"); falta dizer se a celebração se repete a cada vez.
  * O "plim" e os fogos já estão no `spec/checkout.md`; o pedido novo é só a frase de conclusão.

## 3. Gestão Positiva e "Momentum" nos Projetos
* **Objetivo:** Evitar o efeito punitivo de itens travados e dar visibilidade ao ritmo real de evolução.
* **Especificações:**
  * **Selo de Ritmo Ativo ("Com Gás"):** Adicionar um destaque visual sutil nos cards de projetos que possuem atividade regular no mapa estilo GitHub (16/8 semanas), valorizando a consistência.
  * **Resgate Amigável de Projetos Parados:** Substituir o rótulo de alerta agressivo por uma ação convidativa de micro-passos (ex: sugerir escolher *uma* tarefa simples sem data para dar vida nova ao projeto, em vez de apenas exibir "Parado há N dias" com tom de cobrança).
* **Incoerências com o modelo atual:**
  * O `spec/projetos.md` ("Projetos") diz que "não há contagem de dias seguidos". O selo "Com Gás" precisa de uma definição de "atividade regular" que não vire uma sequência disfarçada.
  * O rótulo "Parado há N dias" e a regra dos 14 dias estão no `spec/projetos.md` ("Projetos"), inclusive na contagem do grupo recolhido.
  * O assistente "Projetos parados" (`spec/assistentes.md`) oferece "Finalizar ou manter". O resgate acrescenta uma terceira ação (dar data a uma tarefa), e falta dizer o que acontece com um projeto sem nenhuma tarefa sem data.

## 4. Destaque de Vitórias na Reflexão Semanal
* **Objetivo:** Balancear a análise de métricas trazendo o progresso e as conquistas para o topo do relatório semanal.
* **Especificações:**
  * **Bloco "Vitórias da Semana":** Inserir uma seção no início da reflexão semanal exibindo:
    * Total de tarefas executadas com sucesso.
    * O projeto que mais evoluiu na semana.
    * Mensagem amigável contextualizando a taxa de precisão de datas (reforçando que adiar intencionalmente faz parte da gestão de energia e flexibilidade).
* **Incoerências com o modelo atual:**
  * O flow da reflexão semanal (`spec/rituais.md`) começa pela triagem, e o report de métricas é o passo 4. Pôr as vitórias no início muda essa ordem, ou duplica o report.
  * "Tarefas executadas" já é uma métrica do passo 4.
  * "O projeto que mais evoluiu" não tem métrica definida. Poderia vir do mapa de atividade (ADR-034) ou das tarefas finalizadas na semana, mas são resultados diferentes.


# Feature Request: Vínculo Granular de Projetos em Seções de Reunião

## Contexto e Motivação
Atualmente, as seções de reunião em formato monolítico ou a tentativa de transformar títulos de reuniões em projetos geram rigidez. Na prática, uma única reunião (como um alinhamento geral ou uma 1:1) frequentemente aborda múltiplos assuntos e tópicos conectados a diferentes projetos. 

Para manter a captura rápida, livre e sem atritos (sem exigir que o usuário decida onde salvar cada coisa durante a conversa), o vínculo com projetos deve ser descentralizado da seção inteira e passar a pertencer aos **blocos individuais** (tarefas e notas gerais).

---

## Especificações Técnicas e de Comportamento

### 1. A Seção de Reunião como Contexto Temporal (Guarda-Chuva)
* A seção de reunião nasce sem vínculo obrigatório com nenhum projeto ("quadro branco" temporal).
* O seu propósito é servir apenas como espaço de anotação sequencial ao longo do tempo, podendo conter opcionalmente metadados leves (como links para documentos ou lista de participantes, conforme a fase 1b).
* O título da reunião é um rótulo livre e descritivo e **não** se converte em um projeto.

### 2. Atribuição de Projetos por Bloco (Granularidade)
* Como cada linha/parágrafo ou tarefa é um registro independente no banco de dados, diferentes assuntos tratados na mesma reunião podem ser direcionados a projetos distintos.
* **Na captura:** O usuário anota tudo de forma contínua e sequencial dentro da seção de reunião, sem se preocupar com categorizações prévias.
* **No checkout (ou via atalhos de hover):** O processo de triagem apresenta os blocos gerados na reunião individualmente. Cada bloco (seja uma tarefa ou uma nota geral) pode ser vinculado a um projeto diferente ou deixado sem projeto (avulso).

### 3. Integração com a Wiki Pessoal
* Ao vincular blocos específicos de uma reunião a diferentes projetos durante o checkout, as anotações e tarefas voam diretamente para as respectivas páginas dos projetos na Wiki Pessoal.
* Isso garante que, ao abrir a página de um projeto na Wiki, o usuário consiga enxergar todo o histórico de conversas e decisões daquele projeto, independentemente de em qual reunião elas tenham sido anotadas.

### Incoerências com o modelo atual

* **O vínculo hoje é da seção, não do bloco.** O `spec/nota-do-dia.md` ("Blocos e notas" e "Checkout") vincula o projeto à seção, e as tarefas e notas herdam esse vínculo. As notas de uma seção são triadas como um bloco só. O pedido inverte as duas regras.
* **O título vira projeto.** O título da seção sugere projetos e pode virar um projeto novo (`spec/nota-do-dia.md`, "Blocos e notas"). O pedido diz que o título "não se converte em um projeto". Isso afeta o quadro branco no checkout, as regras de quadro branco do `spec/checkout.md` e o assistente "Seções soltas" (`spec/assistentes.md`), que agrupa títulos repetidos para virar projeto.
* **Alcance.** O pedido fala de seções de reunião, mas o vínculo por bloco vale para tarefas e notas gerais. Falta dizer se as seções gerais também mudam.
* **Wiki.** Não existem "páginas dos projetos na Wiki". Hoje a wiki tem uma entrada por seção, e as notas de um projeto aparecem na aba Notas da página do projeto.
* **Modelo de dados.** O destino das notas (`notesDestination`) é por seção, a wiki lista seções, e os recursos de objetivos e projetos são "as notas de uma seção" (`ARQUITETURA.md`). O mapa de atividade conta notas pelas seções do projeto (ADR-034). Tudo isso precisaria passar a ser por bloco.
* **Checkout mais pesado.** Triar cada nota de uma reunião, uma a uma, vai na direção oposta à do P4 da `AVALIACAO-UX.md`, que quer menos decisões por linha.
* **Compromissos.** O `spec/compromissos.md` diz que compromissos, "como as tarefas", se vinculam a projetos, o que pressupõe que as notas não se vinculam uma a uma.
* **Métrica mensal.** Com vínculo por nota, "blocos sem projeto" passa a fazer sentido, o que responde à pergunta "blocos ou tarefas" do `spec/rituais.md`.
* **Formato.** O pedido não tem "O que muda" nem "Em aberto".

# Feature Request: Reorganização e Hierarquia do Menu Lateral (Gaveta)

## Contexto e Motivação
A estrutura atual do menu de navegação coloca listas descontextualizadas (como tarefas soltas ou todas as notas gerais da wiki) em posição de grande destaque. Na prática, visualizar tarefas ou notas sem a camada de projeto funciona apenas como um "arquivo morto" genérico e tem pouco valor no dia a dia. 

A consulta e execução de **Projetos** é o verdadeiro motor de produtividade do usuário e precisa estar no topo do menu. Além disso, ter as tarefas espalhadas em telas separadas por status (ativas, finalizadas, arquivadas) fragmenta a experiência.

---

## Especificações Técnicas e de Comportamento

### 1. Consolidação da Tela de Tarefas
* **Visão Unificada de Tarefas:** Criar uma única tela de **Tarefas** que reúne tarefas ativas, finalizadas e arquivadas.
* **Filtros/Abas Internas:** A alternância entre tarefas ativas, finalizadas e arquivadas deve ser feita via abas, seletores de status ou filtros na própria tela, eliminando a necessidade de três links separados no menu lateral.

### 2. Nova Hierarquia do Menu Lateral (Priorização de Acesso)
Reorganizar os grupos da gaveta de navegação (`☰`) para refletir a frequência e a utilidade real de uso:

1. **Topo - Hoje & Execução Rápida:**
   * **Hoje:** Volta para a nota do dia.
   * **Próximos Dias:** Visão de agenda/planejamento dos próximos dias.
   * **Rituais:** Acesso aos checkouts e reflexões pendentes.

2. **Destaque - Planejamento & Acompanhamento (Mais alto no menu):**
   * **Projetos:** Lista e páginas de projetos (elevado para o topo das consultas, permitindo acesso rápido ao que está ativo e em andamento).
   * **Objetivos:** Visão de longo prazo ligada aos projetos.
   * **Hábitos:** Acompanhamento de rotinas.

3. **Rodapé / Utilitários (Mover para a parte inferior):**
   * Mover as listas de "arquivo/consulta geral" (Tarefas unificadas e Wiki/Notas gerais sem filtro de projeto) para a seção inferior do menu, junto com:
     * **Todas as Tarefas** (Visão global consolidada)
     * **Wiki / Notas Gerais**
     * **Dados e Backup**
     * **Configurações**

---

## Resultado Esperado na Interface
O menu ganha uma estrutura lógica baseada na prioridade de uso:
* **Executar o Dia** $\rightarrow$ **Gerenciar Projetos & Objetivos** $\rightarrow$ **Consultar Arquivo Global & Configurações**.

### Incoerências com o modelo atual

* **"Hoje" na gaveta.** O `spec/tarefas.md` ("Próximos dias") acabou de decidir que a gaveta mostra "Próximos dias" no lugar da nota do dia, e que a nota do dia fica no botão "Hoje" da barra de cima. O pedido 4 deste documento ainda pergunta se o botão "Hoje" sai da barra.
* **"Rituais" na gaveta.** Pelo `spec/navegacao.md` ("Navegação"), "Rituais" fica na barra de cima, com um contador sempre visível de checkouts pendentes e reflexões disponíveis. Dentro da gaveta, o contador só aparece com ela aberta. A N1 da `AVALIACAO-UX.md` propõe uma terceira forma: uma barra lateral fixa.
* **Tarefas finalizadas.** Não existe uma lista de tarefas finalizadas na spec. Falta dizer se as abandonadas entram (pelo `spec/checkout.md`, elas "somem de todas as listas").
* **Duplicidade.** "Tarefas unificadas" e "Todas as Tarefas" aparecem como itens separados no rodapé.
* **Valor da lista de ativas.** O pedido trata as listas como "arquivo morto", mas o planejamento do dia seguinte escolhe as tarefas na lista de tarefas ativas (`spec/tarefas.md`, "Tarefas").
* **Wiki "sem filtro de projeto".** A wiki já pode ser vista por projeto (`spec/nota-do-dia.md`, "Wiki pessoal").
* **Formato.** O pedido não tem "O que muda" nem "Em aberto".


# Feature Request: Modo de Foco em Seção e Comportamento do Cursor no Editor

## Contexto e Motivação
Durante o uso contínuo da nota do dia, a tela pode acumular muitas seções e blocos de conteúdo. Para evitar distrações visuais e melhorar a experiência de escrita e captura sequencial, são necessárias duas melhorias de usabilidade no editor: a capacidade de focar em uma única seção por vez e um ajuste no comportamento intuitivo do clique do cursor.

---

## Especificações Técnicas e de Comportamento

### 1. Modo de Foco / Expansão de Seção (Focus Mode)
* **Ação do Usuário:** Adicionar um botão/atalho discreto no cabeçalho de cada seção (ex: ícone de expandir `⤢` ou opção "Focar na seção") para isolar o conteúdo.
* **Comportamento da Interface:**
  * Ao expandir a seção, o app esconde temporariamente as outras seções da nota do dia, exibindo apenas a seção selecionada em tela cheia (ou em destaque centralizado).
  * O cabeçalho da tela exibe um botão visível de **"Sair do modo foco"** (ou seta de voltar `←`) para retornar à visão completa da nota do dia com todas as seções.
  * O estado de criação e edição de blocos dentro da seção focada permanece exatamente o mesmo do editor principal.

### 2. Comportamento Intuitivo do Clique e Posição do Cursor
* **Problema Atual:** Ao clicar em um espaço vazio dentro da área de uma seção, o cursor do teclado está sendo posicionado incorretamente no final da última linha do bloco anterior.
* **Novo Comportamento Esperado:**
  * Ao clicar em qualquer área vazia abaixo do conteúdo existente dentro de uma seção, o editor deve interpretar o clique como intenção de criar um novo bloco.
  * O cursor deve ser automaticamente posicionado em uma **nova linha** (criando um novo bloco em branco no final da seção), permitindo que a escrita/captura comece imediatamente, sem a necessidade de o usuário pressionar `Enter` manualmente no fim da linha anterior.

### Incoerências com o modelo atual

* **Cabeçalho.** O `spec/navegacao.md` ("Navegação") permite no máximo uma ação principal no cabeçalho da tela, e na nota do dia ela é "Fazer checkout". "Sair do modo foco" seria uma segunda ação, ou tomaria o lugar do checkout enquanto o foco durar.
* **Seta de voltar.** No resto do app, "←" volta para outra tela, e a N3 da `AVALIACAO-UX.md` pede um padrão só. Usar "←" para sair do foco dá a ela outro sentido.
* **O que fica visível.** Falta dizer se o bloco de prioridades, as tarefas de outros dias (no topo da primeira seção geral) e os avisos da nota do dia (checkout pendente, reflexão, lembretes) continuam na tela ao focar outra seção.
* **Clique cria linha.** Em dias passados, o editor não cria linhas (ADR-018). As linhas novas só são gravadas na primeira tecla (ADR-013 e ADR-014); um clique não deveria gravar um bloco vazio.
* **Bug, não pedido.** O cursor indo para o fim da linha anterior é um defeito do editor atual e poderia ir para o `DEBITO-TECNICO.md`, separado do modo foco.
* **Formato.** O pedido não tem "O que muda" nem "Em aberto".

# Avaliação de UX: o que falta

Os itens da `AVALIACAO-UX.md` (12/10/2026) que ainda não foram decididos nem construídos. Os sete de "Fazer já" já estão no `SPEC.md`. O diagnóstico e a recomendação de cada código estão no relatório; aqui fica só o que falta e o que conflita.

| Código | Pedido | Grupo no relatório | Incoerências com o modelo atual |
| --- | --- | --- | --- |
| N1 | Barra lateral fixa a partir de 1024 px | Planejar | O `spec/navegacao.md` ("Navegação") usa uma gaveta e "Rituais" na barra de cima; o pedido de reorganização do menu propõe uma terceira forma |
| P4 | Checkout com 3 opções visíveis e "Mais" | Planejar | Faz parte do pedido 6 (revisar o fluxo de checkout) |
| P5 | "Desfazer" em todas as ações | Planejar | — |
| N6 | Busca e comandos (Ctrl+K) | Planejar | — |
| V3 | Nota sem cartões aninhados | Planejar | — |
| P3 | Menu "/" no editor (a dica na linha vazia já foi feita) | Fazer já, em parte | — |
| N3 | Um só padrão de voltar | Ajustes finos | O modo foco propõe "←" com outro sentido |
| N7 | Dropdown "Rituais" sem cortes | Ajustes finos | — |
| N8 | Seta e calendário de dias pendentes | Ajustes finos | — |
| V6 | Checkbox alinhado ao texto | Ajustes finos | — |
| V5 | Escala tipográfica | Ajustes finos | — |
| P7 | Reorganizar "Dados e backup" | Ajustes finos | — |
| V4 | Paleta calma em "Colocar ordem na casa" | Ajustes finos | A ADR-028 usa amarelo, laranja e vermelho; a V4 quer o vermelho só para erros |
| V2 | Modelo único de página | Depois | — |
| P6 | Padrão para telas de coleção | Depois | Projetos não têm botão de criar; pelo `spec/projetos.md`, um projeto nasce da conversão de um quadro branco |
| V7 | Modo escuro e transições | Depois | — |
| P8 | Layout de celular | Depois | O escopo atual é só o Chrome no computador (`spec/principios.md`, "Plataforma e dados") |
