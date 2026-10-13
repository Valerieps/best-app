# 13. Modo de Foco em Seção e Comportamento do Cursor no Editor

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

## Incoerências com o modelo atual

* **Cabeçalho.** O `spec/navegacao.md` ("Navegação") permite no máximo uma ação principal no cabeçalho da tela, e na nota do dia ela é "Fazer checkout". "Sair do modo foco" seria uma segunda ação, ou tomaria o lugar do checkout enquanto o foco durar.
* **Seta de voltar.** No resto do app, "←" volta para outra tela, e a N3 da `AVALIACAO-UX.md` pede um padrão só. Usar "←" para sair do foco dá a ela outro sentido.
* **O que fica visível.** Falta dizer se o bloco de prioridades, a seção "De outros dias" e os avisos da nota do dia (checkout pendente, reflexão, lembretes) continuam na tela ao focar outra seção.
* **Clique cria linha.** Em dias passados, o editor não cria linhas (ADR-018). As linhas novas só são gravadas na primeira tecla (ADR-013 e ADR-014); um clique não deveria gravar um bloco vazio.
* **Bug, não pedido.** O cursor indo para o fim da linha anterior é um defeito do editor atual e poderia ir para o `DEBITO-TECNICO.md`, separado do modo foco.
* **Formato.** O pedido não tem "O que muda" nem "Em aberto".
