# Arquitetura

Atualizado em Oct 11, 2026

O desenho técnico do app para a spec inteira, seções 1a a 6. A spec (`SPEC.md`) diz o que o app faz; este documento diz como ele é construído. As decisões pontuais e o porquê de cada uma estão em `architecture-decision-records.md`, e o que ficou para trás está em `DEBITO-TECNICO.md`.

Cada parte indica o estado: **implementado** (existe no código) ou **planejado** (desenho para a fase indicada).

## 1. Restrições que moldam tudo

- **Local-only.** Os dados ficam só no navegador (IndexedDB). Não há servidor, login, nuvem, telemetria nem chamadas de rede. As regras completas estão em `google-safe.md`.
- **Só Chrome no computador nesta fase.** O Android e a sincronização ficam para depois. O modelo de dados já está preparado para juntar dados de aparelhos diferentes.
- **Arquivos estáticos.** O app é HTML, CSS e JavaScript publicados no Cloudflare Pages. Cada pessoa que abre o endereço tem um banco próprio no próprio navegador.
- **Avisar em vez de bloquear.** Vale também para a parte técnica: backup pausado, armazenamento não persistente e checkout pendente aparecem como avisos, nunca como telas que impedem o uso.

## 2. Stack (implementado)

| Parte | Escolha |
| --- | --- |
| Linguagem e interface | TypeScript, React |
| Banco | IndexedDB, pela biblioteca Dexie |
| Build | Vite, com a CSP injetada no `index.html` de produção |
| Offline | Service worker próprio (`public/sw.js`) |
| Testes | Vitest, com `fake-indexeddb` |
| Hospedagem | Cloudflare Pages |

As únicas dependências que vão para o app são React, React DOM e Dexie, com versões travadas (ADR-001).

## 3. Camadas (implementado)

```
src/
  domain/          regras puras: entidades, datas, tipos de evento, auto-triagem, métricas
  application/     casos de uso e portas (Store, Clock, IdGenerator), formato do backup
  infrastructure/  Dexie, implementação do Store, arquivos de backup, APIs do navegador
  ui/              React; cores, fontes e espaçamentos só em ui/theme/tokens.css
```

- As dependências só apontam para dentro: `ui` → `application` → `domain`. O `domain` não importa nada de fora.
- Os casos de uso recebem um `AppContext` (`store`, `clock`, `ids`). Assim os testes controlam a data e os ids e usam um banco em memória.
- Toda escrita passa por `Store.transaction`, que grava a mudança e o evento correspondente de forma atômica (ADR-003). Cada transação concluída agenda o backup automático.

## 4. Modelo de dados

Cada entidade é um registro separado. Um bloco existe uma vez só: notas, projetos, a wiki e a nota do dia apontam para ele, sem cópias. Datas de calendário são `AAAA-MM-DD` no fuso local, e o dia vira à meia-noite (ADR-005). Os ids são UUIDs.

### Tabelas implementadas (versão 1 do banco)

**`blocks`**: tarefas e notas.

| Campo | Uso |
| --- | --- |
| `id`, `kind` | `task` ou `note`; `appointment` entra na seção 5 |
| `text` | Conteúdo da linha |
| `sectionId` | Seção onde o bloco foi escrito, com o título e o horário dela |
| `position` | Índice fracionário: ordena os blocos dentro da seção sem reescrever os vizinhos |
| `projectId` | Projeto vinculado, herdado da seção ou escolhido no checkout |
| `status` | Só tarefas: `active`, `done`, `archived` ou `abandoned`. Abandonar esconde, não apaga |
| `intendedDate` | Dia em que a tarefa aparece na nota do dia |
| `firstIntendedDate` | Primeira data de intenção, para medir a distância até a ação final |
| `postponeCount` | Atalho de leitura; dá para recalcular a partir dos eventos |
| `closedAt`, `createdAt`, `updatedAt` | Datas e horários |

**`sections`**: as seções da nota do dia.

| Campo | Uso |
| --- | --- |
| `kind` | `general` ou `meeting` |
| `day`, `createdAt`, `title` | Dia, horário de criação e título opcional |
| `projectId` | Projeto vinculado; `null` quer dizer quadro branco |
| `notesDestination` | Destino de todas as notas da seção: `pending`, `wiki` ou `discarded` |
| `whiteboardDecision` | `pending` ou `leftUnlinked`, para o "deixar sem vínculo" do checkout |

**`projects`**: `name`, `status` (`active` ou `finished`), `finishedAt`. Existem por baixo dos panos desde o 1a.

**`days`**: `day` (chave), `lastCheckoutAt`. Se o checkout está pendente é sempre calculado a partir dos blocos; esta tabela só guarda o que não dá para calcular.

**`events`**: o histórico (seção 6 deste documento).

**`meta`** e **`snapshots`**: configurações internas (arquivo do backup, data do último backup) e a cópia para desfazer uma importação. Não entram no backup.

### Campos e tabelas planejados

| Fase | Mudança |
| --- | --- |
| 1b (feito) | `blocks.deadline` (prazo máximo). `sections.participants` e `sections.docLink`. `projects.mergedInto` e `keepSeparateFrom` (assistente de duplicados) |
| 1b (feito) | Tabela `priorities`: id `escopo:período` (por exemplo `day:2026-10-11`), lista ordenada de ids escolhidos à mão. As tarefas com prazo no dia entram na leitura (ADR-017). No dia guarda tarefas |
| 2 (feito) | Projetos prioritários da semana na mesma tabela `priorities`, id `weekProjects:2026-W42` (até 3 projetos). Uma semana sem lista própria usa a última lista anterior. Versão 6 do banco e do backup: as listas antigas `month:AAAA-MM` viram listas da semana do dia 1º daquele mês (ADR-035). O id `week:` fica livre para as tarefas prioritárias da semana |
| 2 (feito) | `settings.projectListGroups`: grupos abertos ou fechados da lista de projetos (ADR-036) |
| 2 (feito) | `blocks.awaitingReflection` e `sections.notesDestination = 'weeklyReflection'`, para o "decidir na reflexão semanal" |
| 2 (feito) | Tabela `reflections`: id `week:2026-W41` (`month:2026-10` na seção 4), textos livres (melhores momentos, o que pode melhorar) e `closedAt` |
| 2 (feito), 3 | Tabela `settings`: agendamento da reflexão semanal; os dias ativos entram na seção 3 |
| 3 (feito) | O checklist de warm up fica em `settings.warmupItems`; o andamento de cada dia em `days.warmup`, `startedAt` e `executionStartedAt` |
| 3 | Tabela `muralPhrases`: texto e frequência (`low`, `medium` ou `high`). As frases escolhidas para o dia (abertura e 13h) ficam em `days` |
| 3 (feito) | Tabela `reminders`: origem, texto, `dueAt`, `status` (`pending`, `done` ou `dropped`) |
| 4 (feito) | Tabela `objectives`: meta, motivação, `status`, `achieved`. `projects.objectiveId` |
| 4 (feito) | Tabela `resources`: dono (objetivo ou projeto) e o recurso, que pode ser uma seção cujas notas foram vinculadas ou um link |
| 5 | `blocks.kind = 'appointment'`, com `appointmentAt` e `migratedAt` |
| 6 (feito) | Tabelas `habits` (dias da semana, critério de feito, `objectiveId`) e `habitLogs` (dia, sim ou não) |

Cada mudança no esquema sobe a versão do banco no Dexie e a `BACKUP_SCHEMA_VERSION`, e o `parseBackup` aprende a converter backups antigos.

## 5. Consultas derivadas

Nada disso é guardado: é calculado a partir das tabelas.

| Visão | Como é montada |
| --- | --- |
| Nota do dia | Seções com `day` igual ao dia, mais as tarefas `active` com `intendedDate` igual ao dia, no topo da primeira seção geral. A tarefa não é copiada; ela só aparece ali |
| A nota do dia existe? | Só enquanto houver blocos ligados a ela, ou seja, até o checkout completo |
| Dia pendente | Tem tarefa ou seção sem destino, ou um item criado depois do último checkout |
| Tarefas ativas e arquivadas | Blocos `task` por `status` |
| Wiki | Seções com `notesDestination = 'wiki'`, cada entrada com as notas da seção, em ordem cronológica |
| Projeto | Seções, tarefas e notas com o `projectId` dele |

No 1a, essas consultas viram funções da camada de aplicação, para a interface não ler o Dexie direto.

## 6. Histórico de eventos

- Cada mudança estrutural grava um evento: `id`, `type`, `entityType`, `entityId`, `at` (horário), `day` (dia a que pertence) e `data` (detalhes, como `{ from, to }`).
- Os eventos são só acrescentados, nunca editados nem apagados. A gravação usa `add`, então um evento existente não pode ser sobrescrito.
- Editar o texto de um bloco não gera evento (ADR-004).
- Campos como `postponeCount` são atalhos que dá para recalcular a partir do histórico.

**Tipos implementados** (`src/domain/events.ts`), usados a partir do 1a: `block.created`, `block.kindChanged`, `block.linkedToProject`, `task.intendedDateChanged`, `task.postponed`, `task.finished`, `task.reopened`, `task.archived`, `task.reactivated`, `task.abandoned`, `section.created`, `section.titleChanged`, `section.linkedToProject`, `section.leftUnlinked`, `section.notesMovedToWiki`, `section.notesDiscarded`, `project.created`, `project.finished`, `day.checkoutCompleted`.

**Tipos planejados:** prioridades definidas e retiradas (1b, 2, 4), reflexão fechada (2, 4), passos do warm up feitos, pulados ou adiados e lembretes respondidos (3), objetivos criados e finalizados (4), compromisso migrado (5), registro de hábito (6).

### Adiamento

Um adiamento gera `task.postponed` e soma 1 em `postponeCount`. Ele acontece em dois casos:

1. A data de intenção muda para depois.
2. A tarefa passa pelo checkout sem ter sido feita no dia da intenção. Isso inclui as tarefas que o "Fechar dias pendentes" devolve sem data.

## 7. Editor de blocos (planejado para o 1a)

- É um editor próprio, com um campo de texto por bloco, e não um editor de documento único como TipTap ou ProseMirror. Ele precisa respeitar a regra de um registro por bloco.
- **Enter** cria um bloco logo abaixo, com uma `position` entre os vizinhos. **Backspace** numa linha vazia junta com o bloco anterior.
- O tipo do bloco é detectado por uma lista de detectores no domínio, testados em ordem. O primeiro que reconhece o texto decide o tipo, e o que nenhum reconhece vira nota. No 1a há um detector só (`[] ` vira tarefa). A seção 5 acrescenta o de compromisso, sem mexer no editor. Uma correção manual do tipo, que é pergunta em aberto da seção 5, vira um campo que tem prioridade sobre os detectores.
- O texto é salvo enquanto se digita, com um pequeno atraso, sem gerar evento. A criação do bloco e a mudança de tipo geram evento.
- Links no texto viram `<a target="_blank" rel="noopener noreferrer">`, só para `http` e `https`, e o texto nunca é inserido como HTML (`google-safe.md`).

## 8. Checkout e auto-triagem (planejado para o 1a)

- A auto-triagem é uma função pura no domínio. Ela recebe um dia (seções, blocos e projetos) e devolve três listas: decisões automáticas, sugestões pré-selecionadas e itens manuais, seguindo `AUTO-TRIAGEM.md`.
- A tela de checkout aplica as decisões automáticas, mostra as sugestões, permite trocar qualquer uma e desfazer o que foi automático. "Aceitar sugestões" grava tudo numa transação só.
- "Fechar dias pendentes" usa a mesma função para vários dias. A diferença é que as tarefas não feitas voltam sem data.
- O mesmo mecanismo vira um componente genérico de lote, que os assistentes de limpeza reaproveitam a partir do 1b (`ASSISTENTES.md`). Cada assistente só fornece a busca e as ações.
- "Dia seguinte" num checkout atrasado é o dia depois do dia triado, mas nunca antes de hoje. A partir da seção 3, é o próximo dia ativo.

## 9. Métricas (planejado)

- São funções puras no domínio que recebem os eventos de um período. Ficam testáveis sem banco, e uma métrica nova não exige migração.
- O volume de dados de uma pessoa é pequeno o bastante para calcular tudo no navegador.

| Fase | Métricas |
| --- | --- |
| 2 | Tarefas adiadas, precisão da data de intenção (feita no dia da intenção, com ou sem adiamentos), tarefas executadas |
| 4 | Blocos sem projeto, projetos sem objetivo, objetivos com pouco engajamento, prioridades da semana e do dia ligadas a projetos prioritários da semana em que caíram |
| 6 | Maior sequência de um hábito, percentual de completude, hábitos sem objetivo |

## 10. Backup e segurança (implementado)

- **Backup automático** num arquivo escolhido pela pessoa, regravado 3 segundos depois da última mudança. Antes de cada gravação, o app confere o arquivo e não grava por cima de dados que o navegador não tem (ADR-008).
- **Importar** substitui tudo, com aviso em destaque do que vai se perder e uma cópia para desfazer (ADR-006).
- **CSP** com `connect-src 'none'` no build de produção (ADR-009). Um teste procura no código chamadas de rede e inserção de HTML.
- **Offline** pelo service worker, que só guarda os arquivos do próprio app (ADR-010).

## 11. Fases

| Fase | Estado | Conteúdo técnico |
| --- | --- | --- |
| 0. Fundação | Feita | Projeto, banco, histórico de eventos, backup automático, importação, CSP, offline, tokens de tema |
| 1a. Núcleo | Feita | Editor de blocos, nota do dia, checkout com auto-triagem, listas, "Fechar dias pendentes" |
| 1b. Acabamento | Feita, menos a instalação no Android e o assistente de tarefas paradas | Prazo máximo, prioridades do dia, atalhos no hover, reunião com participantes e link, paginação entre dias, busca e filtros na wiki, assistentes de seções soltas e projetos repetidos, no dashboard "Colocar ordem na casa" com cores configuráveis (ADR-028) |
| 2. Semana e projetos | Feita em parte | Feito: lista de projetos para acompanhar (cards dos prioritários com mapa de atividade de 16 semanas, outros ativos com mapa de 8 semanas e "Parado há N dias", finalizados, grupos lembrados nas configurações; ADR-034, ADR-036), página do projeto para executar (ícone, estrela de prioritário, "⋯" com as mesmas ações da lista, "Nova tarefa" acima das abas, tarefas em travadas, próximos dias, sem data e feitas, coluna lateral; ADR-031, ADR-032), projetos prioritários da semana (até 3, carregados de uma semana para a outra, passo 6 da reflexão semanal; ADR-035), "decidir na reflexão semanal", reflexão semanal com triagem, arquivadas, métricas, textos e "Fechar semana", agendamento. Falta o que tem pergunta em aberto: sugestão de projetos e tarefas prioritárias da semana (inclusive puxar uma tarefa de projeto prioritário) |
| 3. Abertura do dia | Feita em parte | Feito: "Iniciar Dia", warm up com "pular hoje" e "perguntar de novo", dashboard com "Iniciar o Flow de Execução", "registrar pensamentos" e checkout pendente, lembretes (faixa, contador na aba, ponto no ícone, pergunta no checkout), dias ativos. Falta o que tem pergunta em aberto: mural e prioridades da semana no dashboard |
| 4. Mês e objetivos | Feita em parte | Feito: objetivos (meta, motivação, projetos, recursos, finalizar dizendo se atingiu), recursos pelo checkout e por link, reflexão mensal com sugestão de objetivos, duas visões, finalizar projetos e raio-x parcial (prioridades do dia em projetos prioritários da semana). A definição de prioritários saiu da reflexão mensal e foi para o passo 6 da semanal. Falta o que tem pergunta em aberto: métricas de blocos sem projeto e de engajamento, a metade "prioridades da semana" do raio-x |
| 5. Tipos de bloco | Bloqueada | Espera a definição dos formatos que identificam cada tipo e de como corrigir um tipo detectado errado |
| 6. Hábitos | Feita em parte | Feito: hábitos com dias da semana, critério e objetivo, registro sim ou não no dashboard e na tela de hábitos, converter tarefa em hábito no checkout, sequência e completude na reflexão semanal, hábitos na reflexão mensal. Falta o que tem pergunta em aberto: "agendar lembrete" |
| Depois | Futura | Android e sincronização (juntando aparelhos pelo histórico de eventos) |
