# Arquitetura

Atualizado em 17/10/2026

O desenho técnico que o código não mostra sozinho. A spec (`SPEC.md`) diz o que o app faz; este documento diz as regras que o código precisa manter verdadeiras.

- **Entra aqui:** as restrições que moldam tudo, as camadas e o caminho de uma gravação e de uma leitura, as invariantes, o modelo de dados, o histórico de eventos e as migrações.
- **Não entra aqui:** um passeio pelos arquivos e componentes (o código mostra), o porquê de cada decisão (ADRs em `adr/`, achadas com Grep), o que falta construir (`ROADMAP.md`), as regras de produto (`spec/`) e o débito técnico (issues `t:bug` e `t:debito-tecnico`). **Planejado** marca só o desenho do que ainda não existe no código.

## 1. Restrições que moldam tudo

- **Local-only.** Os dados ficam só no navegador (IndexedDB, pelo Dexie). Não há servidor, login, nuvem, telemetria nem chamadas de rede (`SEGURANCA.md`).
- **Só Chrome no computador nesta fase.** O modelo já está pronto para juntar dados de aparelhos diferentes: ids são UUIDs, todo registro tem `updatedAt` e toda mudança fica no histórico de eventos.
- **Arquivos estáticos** no Cloudflare Pages. Cada pessoa tem um banco próprio no próprio navegador.
- **Avisar em vez de bloquear**, também na parte técnica: backup pausado, armazenamento não persistente e checkout pendente são avisos, nunca telas que impedem o uso. Com mais de um aviso, a interface escolhe um só para o topo (ADR-029). As exceções são a pasta do backup no primeiro uso (ADR-056) e um banco mais novo que o código (ADR-059).
- **Dependências mínimas:** só React, React DOM, Dexie e a fonte Inter vão para o app (ADR-001, ADR-054).

## 2. Camadas

`ui` → `application` → `domain`; a `infrastructure` implementa as portas da `application`. O `domain` não importa nada de fora, nem React nem Dexie.

- **Portas** (`application/ports.ts`): `Store` (gravação), `Reader` (leitura), `Clock` e `IdGenerator`. Os casos de uso recebem um `AppContext` (`store`, `clock`, `ids`); as consultas recebem um `Reader`. Os testes controlam a data e os ids e usam um banco em memória (`test/fixtures.ts`).
- **Raiz de composição:** `ui/services.ts` cria o banco, o `DexieStore`, o `DexieReader` e o backup automático, uma vez só.
- **Desvios conhecidos:** o backup chamado pela interface direto na infraestrutura, os serviços globais e a interface lendo `new Date()` em vez do `Clock` ([#53](https://github.com/Valerieps/best-app/issues/53), [#54](https://github.com/Valerieps/best-app/issues/54), [#59](https://github.com/Valerieps/best-app/issues/59)).

### Caminho de uma gravação

1. A tela chama um caso de uso, por exemplo `postponeTask(appContext, …)`.
2. O caso de uso roda dentro de `Store.transaction`, que grava a mudança e o evento dela de forma atômica: os dois ou nenhum (ADR-003).
3. Ao fim da transação, o `DexieStore` agenda o backup automático (seção 7).
4. O `liveQuery` percebe a mudança e as telas abertas releem o que mudou.

As gravações do editor passam por uma fila (`ui/writeQueue.ts`) e rodam uma depois da outra; importar e desfazer a importação entram na mesma fila (ADR-014).

### Caminho de uma leitura

As telas chamam as funções de `application/queries.ts` dentro de `useLiveQuery`. Cada consulta lê pelo `Reader` e entrega os dados ao domínio, que calcula a visão.

- **Uma consulta só espera o que vem do `Reader`:** a reatividade depende de o Dexie rastrear as leituras feitas durante ela.
- **Uma consulta que falha não finge que carrega:** o erro vai para o error boundary da tela, e a barra lateral continua funcionando (ADR-042).

## 3. Invariantes

- **Um registro por entidade.** Um bloco existe uma vez só; a nota do dia, os projetos e os recursos apontam para ele, sem cópias (ADR-002). A seção "De outros dias" só existe na tela: as tarefas com a data do dia aparecem ali sem sair da seção onde foram escritas.
- **O que dá para calcular não é guardado.** Se um dia está pendente, a etapa do dia (ADR-023), a nota do dia, as listas de tarefas, a página do projeto, a cor dos assistentes (ADR-045) e o mapa de atividade (ADR-034) são calculados das tabelas e dos eventos. `days` guarda só o que não dá para calcular.
- **Atalhos recalculáveis.** `postponeCount` e as listas de prioridades podem ser refeitos a partir do histórico.
- **Datas** de calendário são `AAAA-MM-DD` no fuso local, e o dia vira à meia-noite (ADR-005). Semanas são ISO, como `2026-W42` (ADR-020).
- **Ordem sem reescrever vizinhos.** `position` é um índice fracionário; a ordem das partes do dia fica em `days.sectionOrder` (ADR-040).
- **O editor tem um campo de texto por bloco** (`ui/dayNote/BlockLine.tsx`), não um editor de documento único como ProseMirror, para manter um registro por bloco. Seleção de várias linhas e listas são feitas por cima disso (ADR-051).
- **O texto do bloco guarda o Markdown cru**, sem campo novo; a formatação é só na tela (ADR-048).
- **Texto do usuário nunca vira HTML**, e links abrem só `http`, `https` e `mailto`, com `rel="noopener noreferrer"` (`SEGURANCA.md`).
- **Abandonar esconde, não apaga**, para o histórico continuar íntegro.
- **Nenhuma tarefa muda de data sozinha** na triagem: `domain/triage.ts` é uma função pura que devolve decisões, e só a tela as grava (ADR-012, ADR-044).

## 4. Modelo de dados

Os tipos estão em `src/domain/entities.ts`. Todo registro tem `id` (UUID), `createdAt` e `updatedAt`. Versão 10 do banco.

**`blocks`**: tarefas e notas.

| Campo | O que significa |
| --- | --- |
| `kind` | `task` ou `note`; `appointment` entra na seção 5 |
| `sectionId` | Seção onde o bloco foi escrito |
| `projectId` | Projeto vinculado, herdado da seção ou escolhido no fechamento |
| `status` | Só tarefas: `active`, `done`, `abandoned` ou `converted` (virou hábito) |
| `intendedDate` | Dia em que a tarefa aparece na nota do dia; numa tarefa `waiting`, a data para cobrar (ADR-052) |
| `firstIntendedDate` | Primeira data de intenção, para medir a distância até a ação final |
| `lastTriagedDay` | Último dia cujo fechamento decidiu a tarefa; é o que diz se ela está pendente (ADR-011) |
| `deadline` | Prazo máximo |
| `carriedOrder` | `{ day, position }`: ordem entre as tarefas de outros dias, só enquanto `day` é a data de intenção (ADR-040) |

**`sections`**: `kind` (`general` ou `meeting`), `day`, `title`, `projectId` (`null` = quadro branco), `notesDestination` (`pending` com o dia aberto; `wiki` com o dia fechado, nome histórico, ADR-050), `whiteboardDecision`. Duas seções nunca aparecem numa nota do dia: `projectPage`, que guarda as tarefas escritas na página do projeto (ADR-031), e `projectNote`, uma por nota escrita na aba "Notas" do projeto.

**`projects`**: `name`, `status` (`active`, `finished` ou `merged`), `mergedInto`, `keepSeparateFrom`, `objectiveId`, `icon`.

**`people`**: `name` (uma palavra), `status` (`active`, `archived` ou `merged`), `mergedInto`. A menção não é gravada à parte: fica no texto do bloco; renomear e juntar reescrevem o texto (ADR-052).

**`days`**: `lastCheckoutAt`, `startedAt`, `warmup`, `executionStartedAt` e `sectionOrder`.

**`priorities`**: listas com id `escopo:período`. `day:AAAA-MM-DD` guarda as tarefas escolhidas à mão; as com prazo no dia entram na leitura (ADR-017). `focusProjects` é a lista única de até 3 projetos em foco, e cada mudança grava um evento com a lista inteira (ADR-038).

**`settings`**: um registro só, id `main`, que entra no backup.

**`reminders`** (lembretes que voltam dentro do app, sem notificação, ADR-024), **`objectives`** e **`resources`** (4), **`habits`** e **`habitLogs`** (6, id `hábito:dia`).

**Só histórico:** `reflections` (revisões e reflexões fechadas; ninguém grava nem lê desde ADR-060) e as listas `weekProjects:…` em `priorities`.

**Fora do backup:** `meta` (pasta do backup e data do último) e `snapshots` (a cópia para desfazer uma importação e a de antes de uma atualização do banco, ADR-059).

### Planejado

| Fase | Mudança |
| --- | --- |
| 3 | Tabela `muralPhrases`: texto e frequência; as frases do dia ficam em `days`. Espera a pergunta em aberto do mural |
| 5 | `blocks.kind = 'appointment'`, com `appointmentAt` e `migratedAt` |

## 5. Histórico de eventos

- Cada mudança estrutural grava um evento: `type`, `entityType`, `entityId`, `at`, `day` e `data`. A lista completa está em `src/domain/events.ts`.
- **Só acrescentar.** Os eventos nunca são editados nem apagados; a gravação usa `add`. A exceção é importar um backup ou desfazer a importação, que substituem o histórico inteiro e deixam `backup.imported` ou `backup.importUndone` no histórico novo (ADR-006).
- **Editar o texto de um bloco não gera evento** (ADR-004); criar, apagar e mudar o tipo geram.
- **Exclusões deixam rastro:** um bloco apagado ou um recurso removido sai da tabela, mas deixa `block.deleted` ou `resource.removed`. É assim que o backup automático distingue um registro apagado de um perdido (seção 7).
- **Formato dos detalhes:** cada tipo tem o seu `data` em `EventData`, e `record` só aceita esse formato. Um formato já gravado nunca muda: os antigos ficam em `LegacyEventData`, e uma mudança incompatível sobe a versão do evento (`v`, ausente = 1). Quem lê confere o valor, porque um backup importado pode trazer qualquer coisa (ADR-043).
- **Adiamento:** gera `task.postponed` e soma 1 em `postponeCount` quando a data de intenção muda para depois, ou quando "Fechar dias pendentes" devolve a tarefa sem data. A tarefa deixada sem mexer no "Fechar o dia" fica sem data e sem contar adiamento.
- **Métricas** são funções puras do domínio sobre os eventos de um período; uma métrica nova não exige migração.

## 6. Migrações

As regras completas estão na ADR-059. Em resumo:

- A versão do banco (`infrastructure/db.ts`) e a `BACKUP_SCHEMA_VERSION` andam juntas. Cada `upgrade` do Dexie tem o seu gêmeo em `upgradeTables` (`application/backup.ts`), para um backup antigo importar para o mesmo resultado, e cada um tem teste a partir da versão anterior.
- Antes de mudar qualquer linha, o `upgrade` copia as tabelas para `snapshots` (`beforeUpgrade`).
- Uma versão só acrescenta tabelas, índices ou campos opcionais. Remover ou renomear um campo leva duas versões. Um evento nunca muda de sentido; um formato novo é um tipo novo.
- Um banco mais novo que o código fecha o app com "O app foi atualizado"; nunca se volta uma versão do banco.
- Uma migração que transforma dados usa uma função pura do domínio, testada sem banco, e não grava eventos (ADR-049, ADR-060).

## 7. Backup

- **Automático,** numa pasta obrigatória escolhida pela pessoa, com cópias datadas na subpasta `copias` (ADR-047, ADR-056).
- **Nunca grava por cima de dados que o navegador não tem** (ADR-008): antes de gravar, o app lê o arquivo e para se ele tem eventos que o navegador não tem, registros numa versão mais nova, ou registros que sumiram do navegador sem um evento de exclusão.
- **Importar substitui tudo,** com aviso do que vai se perder e uma cópia para desfazer, gravada na mesma transação (ADR-006).
- **Offline** pelo service worker, que só guarda os arquivos do próprio app (ADR-010). A CSP fica no build de produção (ADR-009).
