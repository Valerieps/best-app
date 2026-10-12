# 12. Reorganização e Hierarquia do Menu Lateral

## Contexto e Motivação
A estrutura atual do menu de navegação coloca listas descontextualizadas (como tarefas soltas ou todas as notas gerais da wiki) em posição de grande destaque. Na prática, visualizar tarefas ou notas sem a camada de projeto funciona apenas como um "arquivo morto" genérico e tem pouco valor no dia a dia. 

A consulta e execução de **Projetos** é o verdadeiro motor de produtividade do usuário e precisa estar no topo do menu. Além disso, ter as tarefas espalhadas em telas separadas por status (ativas, finalizadas, arquivadas) fragmenta a experiência.

---

## Especificações Técnicas e de Comportamento

### 1. Consolidação da Tela de Tarefas
* **Visão Unificada de Tarefas:** Criar uma única tela de **Tarefas** que reúne tarefas ativas, finalizadas e arquivadas.
* **Filtros/Abas Internas:** A alternância entre tarefas ativas, finalizadas e arquivadas deve ser feita via abas, seletores de status ou filtros na própria tela, eliminando a necessidade de três links separados no menu lateral.

### 2. Nova Hierarquia do Menu Lateral (Priorização de Acesso)
Reorganizar os grupos da barra lateral para refletir a frequência e a utilidade real de uso:

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

## Incoerências com o modelo atual

* **Barra lateral fixa.** Desde 12/10/2026, a gaveta virou uma barra lateral fixa, e "Hoje", os próximos dias e "Rituais" já ficam juntos no topo dela (`spec/navegacao.md`, "Navegação"). Deste pedido, falta decidir a tela única de tarefas e a nova ordem dos outros grupos. O pedido 4 ainda pergunta se o item "Hoje" sai da barra.
* **Tarefas finalizadas.** Não existe uma lista de tarefas finalizadas na spec. Falta dizer se as abandonadas entram (pelo `spec/checkout.md`, elas "somem de todas as listas").
* **Duplicidade.** "Tarefas unificadas" e "Todas as Tarefas" aparecem como itens separados no rodapé.
* **Valor da lista de ativas.** O pedido trata as listas como "arquivo morto", mas o planejamento do dia seguinte escolhe as tarefas na lista de tarefas ativas (`spec/tarefas.md`, "Tarefas").
* **Wiki "sem filtro de projeto".** A wiki já pode ser vista por projeto (`spec/nota-do-dia.md`, "Wiki pessoal").
* **Formato.** O pedido não tem "O que muda" nem "Em aberto".
