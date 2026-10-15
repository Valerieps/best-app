# O melhor app de produtividade que você já viu

Oct 4, 2026 · @Valerie

Este é um app pessoal para eu capturar tudo ao longo do dia sem decidir onde guardar, e decidir o destino de cada coisa só no fim do dia, no "Fechar o dia". O "Fechar o dia" e duas revisões sem data marcada, a de Foco e a de Rumo, entram aos poucos e ligam o dia a dia a projetos e objetivos, mostrando onde minha energia está indo e o quanto isso se desconecta do que eu quero.

A spec é a fonte da verdade do produto. Este arquivo é o índice: as regras ficam na pasta `spec/`, um arquivo por funcionalidade. Leia só o arquivo da funcionalidade em que vai mexer.

## Arquivos

| Arquivo | O que tem |
| --- | --- |
| [`spec/principios.md`](spec/principios.md) | Princípios, primeiro uso, plataforma, dados e backup |
| [`spec/navegacao.md`](spec/navegacao.md) | Barra lateral, "Rituais", cabeçalho das telas, ações no hover e fila de avisos |
| [`spec/nota-do-dia.md`](spec/nota-do-dia.md) | Nota do dia, seções, blocos, editor, paginação entre dias e onde as notas ficam depois do dia |
| [`spec/tarefas.md`](spec/tarefas.md) | Tarefas ativas, data de intenção, adiamento, prazo máximo e "Próximos dias" |
| [`spec/prioridades.md`](spec/prioridades.md) | Prioridades do dia e projetos em foco |
| [`spec/checkout.md`](spec/checkout.md) | "Fechar o dia", destinos de cada item, planejamento do dia seguinte, auto-triagem e "Fechar dias pendentes" |
| [`spec/projetos.md`](spec/projetos.md) | Projetos, lista de projetos, página do projeto, atividade, projeto parado e tarefa travada |
| [`spec/rituais.md`](spec/rituais.md) | Revisão de Foco, Revisão de Rumo com o raio-x, quando cada uma fica disponível, e rituais pulados |
| [`spec/abertura-do-dia.md`](spec/abertura-do-dia.md) | "Iniciar Dia", warm up, dashboard, mural e lembretes |
| [`spec/objetivos.md`](spec/objetivos.md) | Objetivos, meta, motivação e recursos |
| [`spec/compromissos.md`](spec/compromissos.md) | Compromissos e detecção automática do tipo de bloco |
| [`spec/habitos.md`](spec/habitos.md) | Hábitos e onde eles entram nos flows |
| [`spec/assistentes.md`](spec/assistentes.md) | A tela "Rituais": calendário dos dias sem fechamento e os "Assistentes" de limpeza |

Os termos estão definidos em `GLOSSARIO.md`, e o porquê das decisões, em `DECISOES.md`.

## Como ler

- As perguntas em aberto ficam no início de cada arquivo, em forma de checklist.
- Cada regra diz a partir de que fase vale, no título da seção ou no fim da linha, como *(1b)*. Sem marcação, vale a fase do arquivo inteiro, dita no "Entra aqui".
- Uma regra mora num arquivo só. Os outros apontam para ela, sem repetir.
- Cada arquivo começa com o que entra e o que não entra nele.

## Fases

A spec é construída em fases, e cada uma acrescenta um ritual ou conceito. O estado de cada fase está no `ROADMAP.md`.

| Fase | O que acrescenta |
| --- | --- |
| 1a. Ciclo diário: núcleo | Só o necessário para testar a hipótese do app: capturar sem decidir e triar no fim do dia. São três telas (nota do dia, "Fechar o dia" e listas), e nesta entrega o app roda no Chrome do computador, com os dados no navegador e backup em arquivo. O banco de dados já guarda tudo o que o 1b e as seções seguintes vão usar (datas, adiamentos, seção de origem, log de execução), mesmo sem tela para isso |
| 1b. Ciclo diário: acabamento | Itens já decididos, que entram depois de uma semana de uso do núcleo: prazo máximo, prioridades do dia, atalhos no hover, reunião com participantes e link, paginação entre dias, "Próximos dias" |
| 2. Projetos e Revisão de Foco | Os projetos, que agrupam tarefas, e a Revisão de Foco, que escolhe os projetos em foco |
| 3. Abertura do dia e ausências | O warm up e o dashboard, que abrem o dia, e o que acontece quando um ritual é pulado |
| 4. Objetivos e Revisão de Rumo | Os objetivos e a Revisão de Rumo, onde aparece o raio-x da desconexão entre o dia a dia e os objetivos |
| 5. Mais tipos de bloco | O compromisso como tipo de bloco e a detecção automática do tipo pelo formato do texto |
| 6. Hábitos | Hábitos ficam para a última fase e se encaixam nos flows que já existem |
