# Plano: Revisões de Foco e de Rumo no código

Brief de implementação da troca das reflexões semanal e mensal pelas Revisões de Foco e de Rumo (`spec/rituais.md`) e dos projetos prioritários da semana pelos projetos em foco (`spec/prioridades.md`).

- **Entra aqui:** o que muda no código, em que ordem, e as perguntas que travam alguma etapa.
- **Não entra aqui:** as regras (`spec/`), o estado da construção (`ROADMAP.md`, "O SPEC mudou e o código ainda não") e as decisões técnicas, que viram ADRs quando cada etapa for feita.

## Decisões tomadas antes de começar

Respondidas pela Valeria em 12/10/2026 e escritas em `spec/rituais.md` e `spec/habitos.md`: o sinal de Rumo sobre tarefas sem objetivo só vale com 10 tarefas finalizadas ou mais; objetivo sem projeto não conta como parado; a tela mostra só a revisão em andamento, sem reabrir; a tela de hábitos continua com semana e mês do calendário.

## O que existe hoje

| Área | Arquivos | Amarrado a semana ou mês |
| --- | --- | --- |
| Reflexão semanal | `application/reflection.ts`, `ui/reflection/ReflectionScreen.tsx`, `ReflectionBanner.tsx` | Id `week:AAAA-Www` (ADR-019), semana padrão por dia da semana (`domain/week.ts`) |
| Disponibilidade | `domain/reflectionSchedule.ts`, `loadDueReflection`, `loadDueMonthlyReflection` (`application/queries.ts`) | Agendamento por dia e hora; virada do mês |
| Métricas | `domain/metrics.ts` (`weeklyMetrics`, ADR-021), `domain/monthMetrics.ts` | Filtram eventos pela semana ou pelo mês |
| Prioritários | `domain/priorityProjects.ts`, `application/priorityProjects.ts` (ADR-035) | Uma lista por semana (`weekProjects:AAAA-Www`), com herança entre semanas |
| Reflexão mensal | `application/objectives.ts` (`closeMonth`), `ui/reflection/MonthlyReflectionScreen.tsx` | Id `month:AAAA-MM` |
| Configuração | `Settings.weeklyReflection`, `ui/settings/SettingsScreen.tsx` | Dia e hora da semana |
| Navegação | `ui/hooks.ts` (rotas `#/reflexao`, `#/mes`), `ui/Sidebar.tsx`, `ui/sidebarPlace.ts` | Rótulos "Reflexão semanal" e "Reflexão mensal" |
| Avisos | `ui/notices.ts` (`pickTopNotice`) | O aviso de reflexão não está na fila (`ROADMAP.md`) |
| Triagem | `ui/checkout/TriageRows.tsx`, `domain/triage.ts` | Rótulo "Reflexão semanal" |
| Projetos | `ui/projects/ProjectListScreen.tsx`, `ProjectActions.tsx`, `ProjectScreens.tsx` | "Prioritários da semana" |
| Banco e backup | `infrastructure/db.ts` (versão 6), `application/backup.ts` | Migração mês → semana |
| Dados sintéticos | `dev/syntheticData.ts`, `dev/simulation.ts` | Agendamento, prioritários da semana |

Nomes gravados que **não** mudam, para não migrar dados à toa: o campo `awaitingReflection`, o destino `weeklyReflection` das notas, os eventos `task.deferredToReflection`, `section.notesDeferredToReflection` e `reflection.closed`. Só a interface muda de nome. Isso vai para a ADR da etapa 3.

## Etapas

Cada etapa é um commit (ou PR) com testes, e deixa o app funcionando.

### 1. Domínio: período e disponibilidade

- `domain/reviews.ts` (novo): `ReviewKind = 'focus' | 'direction'`; o período de uma revisão (desde o `closedAt` da última do mesmo tipo, ou desde o primeiro evento); quantos checkouts (dias distintos com `day.checkoutCompleted`) e quantas Revisões de Foco houve desde a última; e `reviewAvailability`, que devolve a revisão disponível com o motivo (cadência ou qual sinal).
- Sinais de Foco: itens esperando a revisão (tarefas com `awaitingReflection` e seções com destino `weeklyReflection`) ≥ 10; projeto em foco parado (reaproveita `domain/projectActivity.ts`); lista em foco que ficou vazia porque o último projeto foi finalizado (eventos `priority.removed` desde a última revisão).
- Sinais de Rumo, só depois da primeira Revisão de Rumo: a proporção de tarefas finalizadas sem projeto com objetivo; objetivo ativo sem atividade em seus projetos há 30 dias.
- `domain/metrics.ts`: `weeklyMetrics(events, week)` vira `periodMetrics(events, desde, até)`, por timestamp, com os mesmos números.
- Testes de cada sinal, da cadência e dos limites (primeiro uso, dias fechados por "Fechar dias pendentes").

### 2. Projetos em foco: uma lista só

- `domain/priorityProjects.ts` vira uma lista única (`focusProjects`), sem semana nem herança: somem `listInEffect`, `nextWeek`, `priorityProjectsRange/From`.
- `application/priorityProjects.ts`: adicionar enquanto houver vaga, trocar na revisão, liberar ao finalizar; some a cópia para a "semana seguinte".
- Histórico para o raio-x ("prioridades do dia em projetos em foco"): reconstruir dos eventos `priority.added` e `priority.removed`, que já guardam `itemIds`, qual era a lista em cada dia.
- Banco versão 7 e backup versão 7: a lista em vigor na semana atual vira a lista única; as listas por semana saem. Testes do `upgrade` e do backup antigo, como na versão 6.
- ADR nova que substitui a ADR-035.

### 3. Revisões: registro, fechamento e configuração

- `Reflection` ganha `kind: 'focus' | 'direction'` (os antigos `week` e `month` ficam como histórico e contam como a última revisão de cada tipo). Id gerado; existe no máximo uma revisão aberta por tipo, com `start` no início do período.
- `application/reflection.ts`: `closeFocusReview` e `closeDirectionReview` (no lugar de `closeWeek` e `closeMonth`), guardando as métricas no evento `reflection.closed` com `kind`. Some `reopenWeek`.
- `Settings`: `weeklyReflection` sai; entra `reviewCadence: { focusCheckouts: 5, directionFocusReviews: 4 }`. O campo antigo é ignorado nos registros e backups velhos.
- Some `domain/reflectionSchedule.ts`; `domain/week.ts` fica só no que ainda usa semana (tela de hábitos, mapas de atividade).
- ADR nova que atualiza as ADR-019 e ADR-021.

### 4. Telas das revisões e navegação

- `ReflectionScreen` vira a tela da Revisão de Foco, sem setas de semana: triagem, arquivadas, **passada pelos projetos ativos (nova, parados primeiro, continuar ou finalizar)**, sugestão de agregar (continua só aviso), métricas do período, textos, projetos em foco e "Fechar revisão".
- `MonthlyReflectionScreen` vira a tela da Revisão de Rumo: raio-x do período, sugestão de objetivos, as duas visões, **revisita de meta e motivação de cada objetivo (nova)** e "Fechar revisão".
- Rotas `#/foco` e `#/rumo`; `#/reflexao` e `#/mes` levam para as novas. `sidebarPlace.ts` e `Sidebar.tsx` com "Revisão de Foco" e "Revisão de Rumo" e o contador de revisões disponíveis.
- Aviso na nota do dia: `pickTopNotice` ganha `reviewAvailable`, em último lugar, com o motivo e "Lembrar depois" até o próximo checkout. Isso também resolve o item "Aviso de reflexão na nota do dia" do `ROADMAP.md`. Sai o `ReflectionBanner` com o relógio de agendamento.
- Configurações: os dois números da cadência no lugar do dia e hora.
- Triagem: "Revisão de Foco" no lugar de "Reflexão semanal". Projetos: "Em foco" no lugar de "Prioritários da semana", inclusive no menu "⋯" e na estrela da página do projeto.

### 5. Projetos em foco no dia a dia

- Planejamento do dia seguinte (`loadPlanning`, `CheckoutScreen.tsx`): as tarefas dos projetos em foco primeiro.
- Dashboard (`OpeningScreens.tsx`, `domain/dayFlow.ts`): mostra os projetos em foco, e eles também fazem o dashboard aparecer.

### 6. Dados sintéticos e docs

- `dev/syntheticData.ts`: cadência no lugar do agendamento, projetos em foco, e um cenário com a Revisão de Foco disponível (5 checkouts e um projeto em foco parado).
- `ARQUITETURA.md` (modelo de dados, consultas, métricas), `DEBITO-TECNICO.md` (os itens de prioritários da semana que deixam de existir), `INCOERENCIAS.md` 2.11, `ROADMAP.md` (fases 2 e 4 e a lista do que falta) e o status deste brief no `rascunhos/README.md`.

## Riscos

- **Migração de dados reais.** As etapas 2 e 3 mexem em banco e backup. O backup automático guarda o estado anterior, mas a migração da versão 6 ainda não foi verificada num banco de verdade (`DEBITO-TECNICO.md`); vale verificar as duas juntas.
- **Etapas 2 a 4 se tocam.** Entre elas, o app pode mostrar nomes novos com regras velhas por um commit. Por isso a ordem é domínio, dados, telas.
