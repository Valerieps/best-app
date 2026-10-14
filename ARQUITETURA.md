# Arquitetura

Atualizado em Oct 12, 2026

O desenho técnico do app para a spec inteira, seções 1a a 6. A spec (`SPEC.md`) diz o que o app faz; este documento diz como ele é construído. As decisões pontuais e o porquê de cada uma estão em `architecture-decision-records.md`, e o que ficou para trás está nas issues do GitHub (labels `bug` e `debito-tecnico`).

Este documento descreve o desenho, não o andamento: o que está feito e o que falta por fase fica no `ROADMAP.md`. Aqui, **planejado** marca só o desenho do que ainda não existe no código.

## 1. Restrições que moldam tudo

- **Local-only.** Os dados ficam só no navegador (IndexedDB). Não há servidor, login, nuvem, telemetria nem chamadas de rede. As regras completas estão em `google-safe.md`.
- **Só Chrome no computador nesta fase.** O Android e a sincronização ficam para depois. O modelo de dados já está preparado para juntar dados de aparelhos diferentes: ids são UUIDs, todo registro tem `updatedAt` e toda mudança fica no histórico de eventos.
- **Arquivos estáticos.** O app é HTML, CSS e JavaScript publicados no Cloudflare Pages. Cada pessoa que abre o endereço tem um banco próprio no próprio navegador.
- **Avisar em vez de bloquear.** Vale também para a parte técnica: backup pausado, armazenamento não persistente e checkout pendente aparecem como avisos, nunca como telas que impedem o uso. Quando há mais de um aviso, a interface escolhe um só para o topo (ADR-029).

## 2. Stack (implementado)

| Parte | Escolha |
| --- | --- |
| Linguagem e interface | TypeScript (estrito), React |
| Banco | IndexedDB, pela biblioteca Dexie |
| Reatividade | `liveQuery` do Dexie: uma tela se atualiza sozinha quando os dados que ela leu mudam, inclusive em outra aba |
| Rotas | Pelo hash da URL (`#/projeto/…`), sem biblioteca (`ui/hooks.ts`) |
| Build | Vite, com a CSP injetada no `index.html` de produção. O `tsc` só confere os tipos (`noEmit`) |
| Offline | Service worker próprio (`public/sw.js`) |
| Testes | Vitest, com `fake-indexeddb` |
| Hospedagem | Cloudflare Pages |

As únicas dependências que vão para o app são React, React DOM e Dexie, com versões travadas (ADR-001).

## 3. Camadas (implementado)

```
src/
  domain/          regras puras: entidades, datas, semanas e meses, tipos de evento,
                   auto-triagem, prioridades, métricas, atividade dos projetos, assistentes
  application/     casos de uso (um arquivo por área), portas, consultas, formato do backup
  infrastructure/  Dexie (banco, Store, Reader), backup automático e arquivos, APIs do navegador
  dev/             dados sintéticos, só no `npm run dev` (ADR-027)
  ui/              React, uma pasta por área; cores, fontes e espaçamentos só em ui/theme/tokens.css
```

- As dependências só apontam para dentro: `ui` → `application` → `domain`. O `domain` não importa nada de fora, nem React nem Dexie. A `infrastructure` implementa as portas da `application`.
- **Portas** (`application/ports.ts`): `Store` (gravação), `Reader` (leitura), `Clock` e `IdGenerator`. Os casos de uso recebem um `AppContext` (`store`, `clock`, `ids`); as consultas recebem um `Reader`. Assim os testes controlam a data e os ids e usam um banco em memória.
- **Raiz de composição:** `ui/services.ts` cria o banco, o `DexieStore`, o `DexieReader` e o backup automático, uma vez só para o app rodando. Os testes montam os seus em `test/fixtures.ts`.

### Caminho de uma gravação

1. A tela chama um caso de uso, por exemplo `postponeTask(appContext, …)`.
2. O caso de uso roda dentro de `Store.transaction`, que grava a mudança e o evento correspondente de forma atômica: ou os dois, ou nenhum (ADR-003).
3. Ao fim de cada transação, o `DexieStore` agenda o backup automático (seção 10).
4. O `liveQuery` percebe a mudança e as telas abertas releem o que mudou.

### Caminho de uma leitura

As telas montam o que mostram com as funções de `application/queries.ts` (`loadDayNote`, `loadProjectList`, …), chamadas dentro de `useLiveQuery` (`ui/useLiveQuery.ts`). Cada consulta lê pelo `Reader` e entrega os dados ao domínio, que calcula a visão. A reatividade funciona porque o Dexie rastreia as leituras feitas durante a consulta; por isso uma consulta não deve esperar nada que não venha do `Reader`.

Uma consulta que falha não finge que está carregando: `useLiveQuery` registra o erro no console e o lança, e o error boundary da tela mostra "Algo deu errado nesta tela" no lugar dela, com a barra lateral funcionando. O que fica em volta das telas (barra lateral, avisos, "Dados e backup") usa `useLiveQueryState`, que registra o erro e segue sem o dado (ADR-042).

### Desvios conhecidos

Alguns pontos ainda não seguem essas regras: o fluxo de backup é chamado pela interface direto na infraestrutura, os serviços são globais em vez de entregues por contexto, e a interface lê o relógio com `new Date()` em vez do `Clock`. Estão nas issues [#53](https://github.com/Valerieps/best-app/issues/53), [#54](https://github.com/Valerieps/best-app/issues/54) e [#59](https://github.com/Valerieps/best-app/issues/59).

## 4. Modelo de dados

Cada entidade é um registro separado. Um bloco existe uma vez só: notas, projetos, a wiki e a nota do dia apontam para ele, sem cópias. Datas de calendário são `AAAA-MM-DD` no fuso local, e o dia vira à meia-noite (ADR-005). Semanas são semanas ISO, como `2026-W42` (ADR-020). Os ids são UUIDs, e todo registro tem `createdAt` e `updatedAt`. Os tipos estão em `src/domain/entities.ts`.

### Tabelas implementadas (versão 7 do banco)

**`blocks`**: tarefas e notas.

| Campo | Uso |
| --- | --- |
| `id`, `kind` | `task` ou `note`; `appointment` entra na seção 5 |
| `text` | Conteúdo da linha |
| `sectionId` | Seção onde o bloco foi escrito, com o título e o horário dela |
| `position` | Índice fracionário: ordena os blocos dentro da seção sem reescrever os vizinhos |
| `projectId` | Projeto vinculado, herdado da seção ou escolhido no checkout |
| `status` | Só tarefas: `active`, `done`, `archived`, `abandoned` ou `converted` (virou hábito). Abandonar esconde, não apaga |
| `intendedDate` | Dia em que a tarefa aparece na nota do dia |
| `firstIntendedDate` | Primeira data de intenção, para medir a distância até a ação final |
| `postponeCount` | Atalho de leitura; dá para recalcular a partir dos eventos |
| `lastTriagedDay` | Último dia cujo checkout decidiu a tarefa; é o que diz se ela está pendente (ADR-011) |
| `deadline` | Prazo máximo (1b) |
| `awaitingReflection` | Deixada para "decidir na Revisão de Foco" (2; o nome gravado é antigo, ADR-039) |
| `carriedOrder` | `{ day, position }`: ordem entre as tarefas de outros dias, só enquanto `day` é a data de intenção (ADR-040) |
| `closedAt`, `createdAt`, `updatedAt` | Datas e horários |

**`sections`**: as seções da nota do dia.

| Campo | Uso |
| --- | --- |
| `kind` | `general` ou `meeting` |
| `day`, `createdAt`, `title` | Dia, horário de criação e título opcional |
| `projectId` | Projeto vinculado; `null` quer dizer quadro branco |
| `notesDestination` | Destino de todas as notas da seção: `pending`, `wiki`, `discarded` ou `weeklyReflection` |
| `whiteboardDecision` | `pending`, `leftUnlinked` (checkout) ou `keptUnlinked` (assistente de seções soltas) |
| `participants`, `docLink` | Só reuniões (1b) |
| `projectPage` | Seção escondida que guarda as tarefas escritas na página do projeto; não aparece em nenhuma nota do dia (ADR-031) |

**`projects`**: `name`, `status` (`active`, `finished` ou `merged`), `finishedAt`, `mergedInto` e `keepSeparateFrom` (assistente de projetos repetidos), `objectiveId` (4) e `icon` (2).

**`days`**: `day` (chave), `lastCheckoutAt` e, a partir da seção 3, `startedAt`, `warmup` (resultado de cada item do dia) e `executionStartedAt`; `sectionOrder`, a ordem das partes da nota do dia quando eu a mudo (ADR-040). Se o checkout está pendente é sempre calculado a partir dos blocos; esta tabela só guarda o que não dá para calcular. A etapa do dia também é calculada (ADR-023).

**`priorities`**: listas ordenadas, com id `escopo:período`. `day:2026-10-11` guarda as tarefas escolhidas à mão para o dia; as tarefas com prazo no dia entram na leitura (ADR-017). `focusProjects` guarda a lista única de até 3 projetos em foco; cada mudança grava um evento com a lista inteira, que é o histórico lido pelo raio-x (ADR-038). As listas `weekProjects:2026-W42`, de antes das revisões, ficam como histórico dos dias anteriores à primeira mudança.

**`reflections`**: as revisões, `kind` `focus` ou `direction`. A revisão em andamento tem id fixo (`focus:open`, `direction:open`); ao fechar, vira `kind:id` com `start`, `end` e `closedAt`, e não reabre (ADR-039). Textos livres (melhores momentos, o que pode melhorar). Os registros `week:2026-W41` e `month:2026-10`, das reflexões antigas, contam como a última revisão de cada tipo.

**`settings`**: um registro só, id `main`: cadência das revisões (`reviewCadence`, ADR-039), dias ativos, checklist do warm up, limites das cores de "Colocar ordem na casa" (ADR-028), coluna fixada da página do projeto e grupos abertos da lista de projetos (ADR-036). Entra no backup.

**`reminders`**: lembretes que voltam dentro do app (3): origem, texto, `dueAt` e `status` (`pending`, `done` ou `dropped`). O app nunca manda notificação (ADR-024).

**`objectives`** e **`resources`** (4): meta, motivação, `status` e `achieved`; recursos de um objetivo ou projeto, que são as notas de uma seção ou um link.

**`habits`** e **`habitLogs`** (6): dias da semana, critério de feito e `objectiveId`; um registro por hábito e dia, com id `hábito:dia`, sim ou não.

**`events`**: o histórico (seção 6 deste documento).

**`meta`** e **`snapshots`**: configurações internas (arquivo do backup, data do último backup) e a cópia para desfazer uma importação. Não entram no backup.

### Planejado

| Fase | Mudança |
| --- | --- |
| 3 | Tabela `muralPhrases`: texto e frequência (`low`, `medium` ou `high`). As frases escolhidas para o dia (abertura e 13h) ficam em `days`. Espera a pergunta em aberto do mural |
| 5 | `blocks.kind = 'appointment'`, com `appointmentAt` e `migratedAt` |

### Mudanças de esquema

Cada mudança no esquema sobe a versão do banco no Dexie (`infrastructure/db.ts`) e a `BACKUP_SCHEMA_VERSION`, que andam juntas, e o `parseBackup` aprende a converter backups antigos (`upgradeTables`). Uma migração que transforma dados, como a da versão 6, usa uma função pura do domínio, testada sem banco. Cada versão tem a sua ADR (016, 019, 022, 025, 035 e 038).

## 5. Consultas derivadas (implementado)

Nada disso é guardado: é calculado a partir das tabelas, por funções de `application/queries.ts` que leem pelo `Reader` e passam os dados ao domínio.

| Visão | Como é montada |
| --- | --- |
| Nota do dia | Seções com `day` igual ao dia, mais as tarefas `active` com `intendedDate` igual ao dia, na seção "De outros dias", que só existe na tela. A tarefa não é copiada; ela só aparece ali. As partes (seções, "De outros dias" e prioridades) seguem `days.sectionOrder` por `orderDayParts` (`domain/order.ts`, ADR-040) |
| Dia pendente | Tem tarefa com `lastTriagedDay` anterior ao dia, ou seção sem destino |
| Tarefas ativas e arquivadas | Blocos `task` por `status` |
| Wiki | Seções com `notesDestination = 'wiki'`, cada entrada com as notas da seção, em ordem cronológica |
| Projeto | Seções, tarefas e notas com o `projectId` dele, agrupadas em travadas, próximos dias, sem data e feitas |
| Lista de projetos | Projetos por status, projetos em foco e mapa de atividade calculado dos eventos (ADR-034) |
| "Colocar ordem na casa" | Contagens de cada assistente e a cor pelos limites das configurações (ADR-028) |
| Abertura do dia | Etapa do dia (iniciar, warm up, dashboard, execução) e lembretes vencidos (ADR-023) |
| Revisões e métricas | Eventos desde a última revisão de cada tipo passados às funções de métricas (seção 9); disponibilidade de cada revisão por cadência e sinais (`application/reviewQueries.ts`, ADR-039) |

## 6. Histórico de eventos (implementado)

- Cada mudança estrutural grava um evento: `id`, `type`, `entityType`, `entityId`, `at` (horário), `day` (dia a que pertence) e `data` (detalhes, como `{ from, to }`).
- Os eventos são só acrescentados, nunca editados nem apagados. A gravação usa `add`, então um evento existente não pode ser sobrescrito. A exceção é importar um backup ou desfazer a importação, que substituem o histórico inteiro. Cada uma deixa um evento no histórico que põe no lugar, `backup.imported` ou `backup.importUndone`, para o histórico mostrar que os dados vieram de um arquivo (ADR-006).
- Editar o texto de um bloco não gera evento (ADR-004).
- Campos como `postponeCount` são atalhos que dá para recalcular a partir do histórico.
- **Exclusões.** Um bloco apagado (linha esvaziada ou juntada com a de cima) e um recurso removido saem da tabela, mas deixam `block.deleted` e `resource.removed` no histórico. É por esses eventos que o backup automático sabe que um registro ausente foi apagado de propósito e não perdido (seção 10).

**Tipos** (a lista completa está em `src/domain/events.ts`):

| Área | Eventos |
| --- | --- |
| Blocos e tarefas | criado, apagado, tipo trocado, vinculado a projeto; data de intenção e prazo trocados, adiada, feita, reaberta, arquivada, reativada, abandonada, deixada para a Revisão de Foco, convertida em hábito |
| Seções | criada, título e detalhes trocados, vinculada a projeto, deixada ou mantida sem vínculo, notas para a wiki, descartadas, reabertas ou deixadas para a Revisão de Foco |
| Projetos | criado, renomeado, ícone trocado, finalizado, reaberto, juntado, vinculado a objetivo |
| Dia e rituais | dia iniciado, execução iniciada, item do warm up respondido, checkout concluído, prioridade adicionada e retirada (com o motivo, nos projetos em foco), revisão fechada, configuração trocada |
| Lembretes | criado, respondido, adiado |
| Objetivos e recursos | objetivo criado, atualizado, finalizado e reaberto; recurso adicionado, renomeado e removido |
| Hábitos | criado, atualizado, arquivado, registrado |

**Planejado:** compromisso migrado (5).

O campo `data` ainda não tem um tipo por evento; quem grava e quem lê combinam os campos por convenção (issue [#52](https://github.com/Valerieps/best-app/issues/52)).

### Adiamento

Um adiamento gera `task.postponed` e soma 1 em `postponeCount`. Ele acontece em dois casos:

1. A data de intenção muda para depois.
2. A tarefa passa pelo checkout sem ter sido feita no dia da intenção. Isso inclui as tarefas que o "Fechar dias pendentes" devolve sem data.

Reativar uma tarefa arquivada limpa a data sem contar adiamento (ADR-015).

## 7. Editor de blocos (implementado)

- É um editor próprio, com um campo de texto por bloco (`ui/dayNote/BlockLine.tsx`), e não um editor de documento único como TipTap ou ProseMirror. Ele precisa respeitar a regra de um registro por bloco.
- **Enter** cria um bloco logo abaixo, com uma `position` entre os vizinhos. **Backspace** no começo de uma linha transforma uma tarefa em nota; numa nota, junta com a linha de cima da mesma seção, ou apaga o bloco se ele estiver vazio e for o primeiro da seção.
- A primeira seção do dia existe só na tela até alguém escrever nela (ADR-013).
- O tipo do bloco é detectado por uma lista de detectores no domínio (`domain/blockKind.ts`), testados em ordem. O primeiro que reconhece o texto decide o tipo, e o que nenhum reconhece vira nota. Hoje há um detector só (`[] ` vira tarefa). A seção 5 acrescenta o de compromisso, sem mexer no editor. Uma correção manual do tipo, que é pergunta em aberto da seção 5, vira um campo que tem prioridade sobre os detectores.
- **Reordenar** (ADR-040): a alça de cada linha e de cada parte usa eventos de ponteiro (`ui/dayNote/lineDrag.ts`), para funcionar também com o dedo. Alt + ↑/↓ move a linha e Ctrl + Shift + ↑/↓ move a parte. Mover uma linha grava só a `position` dela entre as vizinhas; mover uma parte grava a lista do dia em `days.sectionOrder`. A nova ordem aparece antes de ser gravada e sai da fila de escrita depois das gravações já pedidas.
- **Digitação rápida** (ADR-014): uma linha nova aparece na tela antes de ser gravada, e as gravações do editor rodam uma depois da outra numa fila (`ui/writeQueue.ts`), para que salvar o texto nunca procure um bloco que ainda está sendo criado.
- O texto é salvo 400 ms depois da última tecla, ao perder o foco e ao sair da tela, sem gerar evento. A criação, a exclusão e a mudança de tipo geram evento.
- Fora do editor (wiki, listas, checkout), links no texto viram `<a target="_blank" rel="noopener noreferrer">`, só para `http` e `https`, e o texto nunca é inserido como HTML (`google-safe.md`). No editor, o texto continua editável e os links não são clicáveis.

## 8. Checkout e auto-triagem (implementado)

- A auto-triagem é uma função pura no domínio (`domain/triage.ts`). Ela recebe um dia (seções, blocos e projetos) e devolve três listas: decisões automáticas, sugestões pré-selecionadas e itens manuais, seguindo `spec/checkout.md`.
- A tela de checkout carrega a triagem uma vez, como uma foto, para que nada mude enquanto a pessoa escolhe. Ela mostra as decisões automáticas e as sugestões, permite trocar qualquer uma e desfazer o que foi automático. "Aceitar sugestões" grava tudo, inclusive as decisões automáticas, numa transação só (ADR-012).
- "Fechar dias pendentes" usa a mesma função para vários dias. A diferença é que as tarefas não feitas voltam sem data.
- O mesmo mecanismo de lote serve aos assistentes de limpeza (`spec/assistentes.md`): cada assistente só fornece a busca (`domain/assistants.ts`) e as ações (`application/assistants.ts`).
- "Dia seguinte" num checkout atrasado é o próximo dia ativo depois do dia triado, mas nunca antes de hoje.
- A triagem segue a ordem da nota do dia: as partes por `days.sectionOrder` e as tarefas de outros dias por `carriedOrder` (ADR-040).

## 9. Métricas (implementado em parte)

- São funções puras no domínio que recebem os eventos de um período (`domain/metrics.ts`, `directionMetrics.ts`, `projectActivity.ts`, `habits.ts`, `reviews.ts`). Ficam testáveis sem banco, e uma métrica nova não exige migração.
- As métricas da Revisão de Foco vêm só dos eventos, desde a última revisão, pelo momento do evento (ADR-021, ADR-039). As do raio-x que dependem de pergunta em aberto ficaram de fora (ADR-026).
- O volume de dados de uma pessoa é pequeno o bastante para calcular tudo no navegador. A lista de projetos é o primeiro ponto onde isso já pesa (issue [#81](https://github.com/Valerieps/best-app/issues/81)).

| Fase | Métricas | Função |
| --- | --- | --- |
| 2 | Tarefas adiadas, precisão da data de intenção (feita no dia da intenção, com ou sem adiamentos), tarefas executadas | `metrics.ts` |
| 2 | Atividade por dia de cada projeto (ADR-033, ADR-034) | `projectActivity.ts` |
| 2 e 4 | Checkouts e revisões desde a última, sinais de cada revisão (ADR-039) | `reviews.ts` |
| 4 | Prioridades do dia ligadas aos projetos em foco no dia em que caíram, projetos sem objetivo | `directionMetrics.ts` |
| 4 | Blocos sem projeto, objetivos com pouco engajamento | Planejado |
| 6 | Maior sequência de um hábito, percentual de completude, hábitos sem objetivo | `habits.ts` |

## 10. Backup e segurança (implementado)

- **Backup automático** num arquivo escolhido pela pessoa (ADR-007), regravado 3 segundos depois da última mudança e ao esconder ou fechar a aba. Antes de cada gravação, o app lê o arquivo e não grava por cima de dados que o navegador não tem (ADR-008): eventos que só o arquivo tem, registros em versão mais nova no arquivo, ou registros que sumiram do navegador sem um evento de exclusão.
- **Importar** substitui tudo, com aviso em destaque do que vai se perder e uma cópia para desfazer, gravada na mesma transação (ADR-006).
- **CSP** com `connect-src 'none'` no build de produção (ADR-009). O `src/security.test.ts` procura no código chamadas de rede e inserção de HTML.
- **Offline** pelo service worker, que só guarda os arquivos do próprio app (ADR-010).
- **Armazenamento persistente** é pedido ao Chrome ao abrir o app; se ele negar, o app só avisa.

