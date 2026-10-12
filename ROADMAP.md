# Roadmap

Atualizado em Oct 12, 2026

A ordem das fases e o estado de cada funcionalidade. É o único lugar que diz o que está feito e o que falta.

- **Entra aqui:** o que está construído, o que falta e por quê, onde o código ainda não segue o `SPEC.md`, e o que foi adiado de propósito.
- **Não entra aqui:** as regras (`SPEC.md`), o texto das perguntas em aberto (fica no topo de cada arquivo de `spec/`; aqui só se aponta para elas), o desenho técnico (`ARQUITETURA.md`) e o débito técnico (`DEBITO-TECNICO.md`).

## Fases

As fases seguem as seções do `SPEC.md`.

| Fase | Estado | Feito | O que falta |
| --- | --- | --- | --- |
| 0. Fundação | Feita | Projeto, banco, histórico de eventos, backup automático, importação, CSP, offline, tokens de tema | — |
| 1a. Núcleo | Feita | Editor de blocos, nota do dia, checkout com auto-triagem, listas, "Fechar dias pendentes" | — |
| 1b. Acabamento | Feita em parte | Prazo máximo, prioridades do dia, atalhos no hover, reunião com participantes e link, paginação entre dias, busca e filtros na wiki, "Colocar ordem na casa" com cores configuráveis (ADR-028) e os assistentes "Seções soltas" e "Projetos repetidos"; barra lateral recolhível no lugar da barra de cima e da gaveta, com "Rituais" aberto na própria barra e o status do backup na linha de "Dados e backup" (ADR-037) | A tela "Próximos dias" e o lugar dela na barra lateral (decididas em 12/10/2026, ainda sem código); o assistente "Tarefas esquecidas" (veja "Assistentes") |
| 2. Semana e projetos | Feita em parte | Lista de projetos (cards dos prioritários com mapa de atividade de 16 semanas, outros ativos com mapa de 8 semanas e "Parado há N dias", finalizados, grupos lembrados; ADR-034, ADR-036); página do projeto (ícone, estrela de prioritário, "Nova tarefa", tarefas em travadas, próximos dias, sem data e feitas, coluna lateral; ADR-031, ADR-032); projetos prioritários da semana (ADR-035); "decidir na reflexão semanal"; reflexão semanal com triagem, arquivadas, métricas, textos, passo 6 e "Fechar semana"; agendamento | Tarefas prioritárias da semana; sugestão de agregar tarefas em projetos; assistentes "Arquivo antigo", "Projetos parados" e "Prioridades travadas" |
| 3. Abertura do dia | Feita em parte | "Iniciar Dia", warm up com "pular hoje" e "perguntar de novo", dashboard com "Iniciar o Flow de Execução", "registrar pensamentos" e checkout pendente, lembretes (faixa, contador na aba, ponto no ícone, pergunta no checkout), dias ativos | Mural; prioridades da semana no dashboard; assistente "Warm up"; dois ajustes do `SPEC.md` (veja "O SPEC mudou e o código ainda não") |
| 4. Mês e objetivos | Feita em parte | Objetivos (meta, motivação, projetos, recursos, finalizar dizendo se atingiu), recursos pelo checkout e por link, reflexão mensal com sugestão de objetivos, duas visões, finalizar projetos, raio-x parcial (projetos e hábitos sem objetivo, prioridades do dia em projetos prioritários da semana) | Métricas de blocos sem projeto e de engajamento; metade "prioridades da semana" do raio-x; reflexão mensal pulada; nome do campo "motivação"; assistente "Objetivos soltos" |
| 5. Tipos de bloco | Bloqueada | — | Tudo: compromissos e detecção de tipo |
| 6. Hábitos | Feita em parte | Hábitos com dias da semana, critério e objetivo, registro sim ou não no dashboard e na tela de hábitos, converter tarefa em hábito no checkout, sequência e completude na reflexão semanal, hábitos na reflexão mensal | "Agendar lembrete"; assistente "Hábitos sumidos" |

## Esperando resposta a uma pergunta em aberto

| O que falta | Pergunta que trava |
| --- | --- |
| Tarefas prioritárias da semana: a metade de tarefas do passo 6 da reflexão semanal, puxar uma tarefa de projeto prioritário, as prioridades da semana no dashboard, puxá-las no planejamento e no checkout, a metade "prioridades da semana" do raio-x mensal e o assistente "Prioridades travadas" | `spec/prioridades.md`: quantas prioridades a semana tem |
| Sugestão de agregar tarefas em projetos (passo 3 da reflexão semanal mostra só um aviso) | `spec/rituais.md`: como funciona a sugestão |
| Mural no dashboard | `spec/abertura-do-dia.md`: onde crio e edito as frases |
| Reflexão mensal pulada (hoje o aviso só continua aparecendo) | `spec/rituais.md`: o que acontece se eu pular |
| Métricas mensais de blocos sem projeto e de objetivos com pouco engajamento | `spec/rituais.md`: "blocos" ou "tarefas", e como medir engajamento |
| Nome definitivo do campo "motivação" | `spec/objetivos.md` |
| Seção 5 inteira | `spec/compromissos.md`: formatos de cada tipo e como corrigir um tipo errado |
| "Agendar lembrete" nos hábitos | `spec/habitos.md` |
| Assistentes "Tarefas esquecidas", "Arquivo antigo" e "Hábitos sumidos" | `spec/assistentes.md`: os prazos de "parado" e "antigo" |

## Assistentes

Feitos: "Dias em aberto", "Seções soltas" e "Projetos repetidos" (`domain/cleanupStatus.ts`). Os outros, pela tabela do `spec/assistentes.md`:

| Assistente | Estado |
| --- | --- |
| Tarefas esquecidas, Arquivo antigo, Hábitos sumidos | Esperam os prazos de "parado" e "antigo" |
| Prioridades travadas | Espera as tarefas prioritárias da semana |
| Projetos parados | Pode ser construído: os 14 dias já estão definidos no `spec/projetos.md` ("Projetos") |
| Warm up | Pode ser construído, mas "itens que eu quase sempre pulo" não tem um número definido |
| Objetivos soltos | Pode ser construído, mas "meta talvez atingida" não tem critério definido |
| Compromissos passados | Espera a seção 5 |

## O SPEC mudou e o código ainda não

- **Aviso de reflexão na nota do dia** (12/10/2026). O `spec/navegacao.md` ("Navegação") pede o aviso de reflexão disponível no contador de "Rituais" e na nota do dia, em último lugar na fila de avisos. Hoje ele só aparece no contador: `ReflectionBanner` e `MonthlyReflectionBanner` (`ui/reflection/`) existem, mas nenhuma tela os usa, e `pickTopNotice` (`ui/notices.ts`) não conhece esse aviso.
- **Quando o dashboard aparece** (12/10/2026). O `spec/abertura-do-dia.md` ("Dashboard") pede o dashboard só quando há checklist de warm up, frases no mural ou prioridades da semana. `dayStage` (`domain/dayFlow.ts`) olha só o checklist: com itens no warm up, o dashboard aparece mesmo vazio; sem itens, nunca aparece. Mural e prioridades da semana ainda esperam perguntas em aberto, então a diferença hoje é só o dashboard vazio depois do warm up.

## Antes de outras pessoas usarem

Decisões de produto que dependem da Valeria:

- [ ] **Nome e ícone do app.** "Best App" e o ícone de check são provisórios.
- [ ] **Página de privacidade.** Uma página curta explicando que nada sai da máquina. O texto é decisão da Valeria.
- [ ] **Revisar as lacunas que o agente decidiu.** Pequenas regras que a spec não cobria foram decididas e escritas no próprio texto dos arquivos de `spec/`, sem marcação (`INCOERENCIAS.md`, 2.14). Exemplos: a quarta prioridade ocupa o lugar da terceira; a precisão da intenção conta só tarefas com data; o warm up só começa quando o checklist tem itens; na barra lateral, "Hoje" e "Rituais" entram no grupo Hoje, junto com os próximos dias; recolhida, a barra mostra só o botão de abrir e o contador de "Rituais"; a lista de "Rituais" começa fechada, exceto numa tela de ritual.

## Adiado de propósito

- **App no Android e sincronização entre aparelhos:** fase posterior, quando houver uma forma de sincronizar que respeite o `google-safe.md`.
- **Integração com o Google Agenda:** só numa fase que permita conexões externas.
