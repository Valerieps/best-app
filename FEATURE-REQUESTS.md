# Feature requests

12/10/2026 · Valeria

Pedidos ainda não implementados. Cada um tem uma nota com o que ele muda no `SPEC.md` e as perguntas que precisam de resposta antes do código. Quando um pedido for decidido, a regra vai para o `SPEC.md` e o item sai daqui.

Já decididos e retirados desta lista: "Próximos dias" no menu (foi para o `SPEC.md`, seção 1b) e o bloco de prioridades sempre fixado (fixar continua opcional).

## 1. Arquivar tarefas de qualquer tela

Poder arquivar uma tarefa em qualquer lugar onde ela aparece: nota do dia, página do projeto, lista de tarefas ativas, prioridades do dia, próximos dias.

- **O que muda:** hoje arquivar é só um destino do checkout e da reflexão semanal (`SPEC.md`, "Checkout").
- **Em aberto:**
  - [ ] Arquivar fora do checkout conta como a decisão daquele dia, ou a tarefa ainda passa pela triagem?
  - [ ] Abandonar também deveria estar disponível fora do checkout?

## 2. Reordenar blocos dentro de uma seção

Poder mudar a ordem das linhas (tarefas e notas) dentro de uma seção.

- **O que muda:** hoje a ordem é a da escrita. O banco já guarda uma posição por bloco, que permite inserir uma linha entre duas outras sem reescrever as vizinhas.
- **Em aberto:**
  - [ ] Como reordenar: arrastar, atalho de teclado (Alt + ↑/↓) ou os dois?
  - [ ] Tarefas que vieram de outros dias, que hoje ficam no topo da primeira seção, também podem ser reordenadas?
  - [ ] Vale para todas as linhas ou só para as criadas no dia?

## 3. Data de intenção em destaque e ícone de ciclo no lugar de "adiada"

Na linha da tarefa, destacar a data de intenção de execução e trocar a palavra "adiada" por um ícone de ciclo.

- **O que muda:** hoje a data aparece como uma etiqueta discreta, e "adiada N×" é um texto (na página do projeto e no checkout).
- **Em aberto:**
  - [ ] O ícone de ciclo vem com o número ao lado (por exemplo, "↻ 3")?
  - [ ] O ícone aparece a partir do primeiro adiamento ou só a partir de 3, como o aviso atual?
  - [ ] O destaque da data vale em todas as telas (nota do dia, próximos dias, projeto, tarefas ativas, checkout)?

## 4. Título do app leva para a nota do dia

Clicar em "Best App", na barra de cima, abre a nota do dia.

- **O que muda:** hoje o título é só texto, e a nota do dia abre pelo botão "Hoje". Com "Próximos dias" no lugar da nota do dia no menu (`SPEC.md`, seção 1b), o título passa a ser um segundo caminho para ela.
- **Em aberto:**
  - [ ] Com o título levando para a nota do dia, o botão "Hoje" continua na barra ou sai?

## 5. Tarefas agendadas organizadas em grupos

Na nota do dia e na tela "Próximos dias", organizar as tarefas já agendadas em três grupos: prazo máximo hoje, prioridades do dia e adiadas para hoje.

- **O que muda:** o `SPEC.md` ("Execução") diz que as tarefas com data de intenção entram no topo da primeira seção geral "sem distinção visual das tarefas criadas no dia". Este pedido muda essa regra. A tela "Próximos dias" hoje mostra uma lista simples por dia.
- **Em aberto:**
  - [ ] Os grupos substituem o bloco "Prioridades do dia" ou convivem com ele?
  - [ ] Uma tarefa que está em mais de um grupo (prioridade com prazo hoje, por exemplo) aparece onde?
  - [ ] "Adiadas para hoje" quer dizer toda tarefa agendada para hoje que não está nos outros grupos, ou só as que já foram adiadas pelo menos uma vez?
  - [ ] Na tela "Próximos dias", os grupos se repetem para cada dia? "Prazo máximo hoje" e "prioridades do dia" só fazem sentido para hoje.
  - [ ] As tarefas agendadas saem do topo da primeira seção, ou aparecem nos dois lugares?


# Feature Requests: Reforços Positivos, Gamificação e Leveza

Esta seção lista as melhorias para incentivar a manutenção de tarefas e projetos com foco em reforço positivo, celebrando o progresso e evitando uma abordagem punitiva (removendo a sensação de "culpa" por atrasos).

## 1. Ressignificação do "Colocar Ordem na Casa"
* **Objetivo:** Mudar o tom de "recuperação de crise" para "pausa consciente de alinhamento e clareza".
* **Especificações:**
  * Renomear o ritual nas interfaces e textos do app de "Colocar ordem na casa" para **"Reset de Energia"** (ou **"Recalibrar Foco"**).
  * Ajustar o texto de introdução do fluxo para focar em leveza: *"Sua vida muda rápido e os planos também. Vamos simplificar o backlog e renovar os compromissos com o que realmente importa hoje?"*

## 2. Micro-Celebrações e Reforço Positivo no Checkout Diário
* **Objetivo:** Destacar o que foi feito e o ganho de clareza, recompensando a consistência do usuário.
* **Especificações:**
  * **Métrica de Intenção Cumprida:** Em vez de focar apenas no número de adiadas, exibir uma mensagem positiva ao finalizar o dia (ex: *"Você concluiu X% do que planejou para hoje!"* ou *"X tarefas executadas no dia pretendido!"*).
  * **Celebração do Descarte Consciente:** Destacar o abandono de tarefas/notas que perderam o sentido como um ato saudável de gestão de energia (ex: *"Você libertou espaço mental ao descartar itens obsoletos"*).
  * **Animação/Som de Sucesso:** Manter e enriquecer a animação de fogos de artifício e o som de "plim" ao finalizar o dia, acompanhados de uma frase de conclusão leve e encorajadora.

## 3. Gestão Positiva e "Momentum" nos Projetos
* **Objetivo:** Evitar o efeito punitivo de itens travados e dar visibilidade ao ritmo real de evolução.
* **Especificações:**
  * **Selo de Ritmo Ativo ("Com Gás"):** Adicionar um destaque visual sutil nos cards de projetos que possuem atividade regular no mapa estilo GitHub (16/8 semanas), valorizando a consistência.
  * **Resgate Amigável de Projetos Parados:** Substituir o rótulo de alerta agressivo por uma ação convidativa de micro-passos (ex: sugerir escolher *uma* tarefa simples sem data para dar vida nova ao projeto, em vez de apenas exibir "Parado há N dias" com tom de cobrança).

## 4. Destaque de Vitórias na Reflexão Semanal
* **Objetivo:** Balancear a análise de métricas trazendo o progresso e as conquistas para o topo do relatório semanal.
* **Especificações:**
  * **Bloco "Vitórias da Semana":** Inserir uma seção no início da reflexão semanal exibindo:
    * Total de tarefas executadas com sucesso.
    * O projeto que mais evoluiu na semana.
    * Mensagem amigável contextualizando a taxa de precisão de datas (reforçando que adiar intencionalmente faz parte da gestão de energia e flexibilidade).


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
 
  * 
