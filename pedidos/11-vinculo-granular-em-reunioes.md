# 11. Vínculo Granular de Projetos em Seções de Reunião

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

## Incoerências com o modelo atual

* **O vínculo hoje é da seção, não do bloco.** O `spec/nota-do-dia.md` ("Blocos e notas") e o `spec/checkout.md` ("Checkout") vinculam o projeto à seção, e as tarefas e notas herdam esse vínculo. As notas de uma seção são triadas como um bloco só. O pedido inverte as duas regras.
* **O título vira projeto.** O título da seção sugere projetos e pode virar um projeto novo (`spec/nota-do-dia.md`, "Blocos e notas"). O pedido diz que o título "não se converte em um projeto". Isso afeta o quadro branco no checkout, as regras de quadro branco do `spec/checkout.md` e o assistente "Seções soltas" (`spec/assistentes.md`), que agrupa títulos repetidos para virar projeto.
* **Alcance.** O pedido fala de seções de reunião, mas o vínculo por bloco vale para tarefas e notas gerais. Falta dizer se as seções gerais também mudam.
* **Wiki.** Não existem "páginas dos projetos na Wiki". Hoje a wiki tem uma entrada por seção, e as notas de um projeto aparecem na aba Notas da página do projeto.
* **Modelo de dados.** O destino das notas (`notesDestination`) é por seção, a wiki lista seções, e os recursos de objetivos e projetos são "as notas de uma seção" (`ARQUITETURA.md`). O mapa de atividade conta notas pelas seções do projeto (ADR-034). Tudo isso precisaria passar a ser por bloco.
* **Checkout mais pesado.** Triar cada nota de uma reunião, uma a uma, vai na direção oposta à do P4 da `AVALIACAO-UX.md`, que quer menos decisões por linha.
* **Compromissos.** O `spec/compromissos.md` diz que compromissos, "como as tarefas", se vinculam a projetos, o que pressupõe que as notas não se vinculam uma a uma.
* **Métrica mensal.** Com vínculo por nota, "blocos sem projeto" passa a fazer sentido, o que responde à pergunta "blocos ou tarefas" do `spec/rituais.md`.
* **Formato.** O pedido não tem "O que muda" nem "Em aberto".
