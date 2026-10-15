# Roadmap

Atualizado em Oct 14, 2026

A ordem das fases e o estado de cada funcionalidade. É o único lugar que diz o que está feito e o que falta.

- **Entra aqui:** o que está construído, o que falta e por quê, onde o código ainda não segue o `SPEC.md`, e o que foi adiado de propósito.
- **Não entra aqui:** as regras (`SPEC.md`), o texto das perguntas em aberto (fica no topo de cada arquivo de `spec/`; aqui só se aponta para elas), o desenho técnico (`ARQUITETURA.md`) e o débito técnico (issues do GitHub com as labels `t:bug` e `t:debito-tecnico`).

## Fases

As fases seguem as seções do `SPEC.md`.

| Fase | Estado | Feito | O que falta |
| --- | --- | --- | --- |
| 0. Fundação | Feita | Projeto, banco, histórico de eventos, backup automático numa pasta com cópias datadas (ADR-047), importação, CSP, offline, tokens de tema | — |
| 1a. Núcleo | Feita | Editor de blocos, nota do dia, "Fechar o dia" em etapas com auto-triagem (ADR-044), tarefas que vão sozinhas para o dia seguinte, notas direto para a wiki com descartar na wiki, planejamento com datas e edição em lote, listas, "Fechar dias pendentes" | — |
| 1b. Acabamento | Feita em parte | Prazo máximo, prioridades do dia, atalhos no hover, reunião com participantes e link, paginação entre dias, busca e filtros na wiki, "Colocar ordem na casa" com cores configuráveis (ADR-028) e os assistentes "Seções soltas" e "Projetos repetidos"; barra lateral recolhível no lugar da barra de cima e da gaveta, com "Rituais" aberto na própria barra e o status do backup na linha de "Dados e backup" (ADR-037); reordenar as linhas de uma seção, as tarefas de outros dias (agora na seção "De outros dias") e as seções do dia, com alça e atalhos, seguido pelo checkout (ADR-040); modo foco numa parte da nota do dia, com Ctrl + Shift + Enter, que sobrevive a recarregar e nunca sai sozinho (ADR-046); a nota do dia ocupando a área principal toda, com cada parte marcada pela barra colorida e uma linha fina; a área central branca em toda tela; a barra lateral com largura ajustável pelo mouse | A tela "Próximos dias" e o lugar dela na barra lateral (decididas em 12/10/2026, ainda sem código); o assistente "Tarefas esquecidas" (veja "Assistentes") |
| 2. Projetos e Revisão de Foco | Feita em parte | Lista de projetos (cards dos projetos em foco com mapa de atividade de 16 semanas, outros ativos com mapa de 8 semanas e "Parado há N dias", finalizados, grupos lembrados; ADR-034, ADR-036); página do projeto (ícone, estrela de em foco, "Nova tarefa", tarefas em travadas, próximos dias, sem data e feitas, coluna lateral; ADR-031, ADR-032); projetos em foco, uma lista só (ADR-038); "decidir na Revisão de Foco"; Revisão de Foco com triagem, arquivadas, passada pelos projetos ativos, métricas do período, textos, projetos em foco e "Fechar revisão"; disponibilidade por cadência configurável e por sinais, com aviso na nota do dia (ADR-039); tarefas dos projetos em foco primeiro no planejamento do dia seguinte | Sugestão de agregar tarefas em projetos; assistentes "Arquivo antigo" e "Projetos parados" |
| 3. Abertura do dia | Feita em parte | "Iniciar Dia", warm up com "pular hoje" e "perguntar de novo", dashboard com "Iniciar o Flow de Execução", projetos em foco, "registrar pensamentos" e checkout pendente, lembretes (faixa, contador na aba, ponto no ícone, pergunta no checkout), dias ativos | Mural; assistente "Warm up"; um ajuste do `SPEC.md` (veja "O SPEC mudou e o código ainda não") |
| 4. Objetivos e Revisão de Rumo | Feita em parte | Objetivos (meta, motivação, projetos, recursos, finalizar dizendo se atingiu), recursos pelo checkout e por link, Revisão de Rumo com sugestão de objetivos, revisita de meta e motivação, duas visões, finalizar projetos, raio-x parcial do período (projetos e hábitos sem objetivo, prioridades do dia em projetos em foco), disponibilidade por cadência e por sinais (ADR-039) | Métricas de blocos sem projeto e de engajamento; nome do campo "motivação"; assistente "Objetivos soltos" |
| 5. Tipos de bloco | Bloqueada | — | Tudo: compromissos e detecção de tipo |
| 6. Hábitos | Feita em parte | Hábitos com dias da semana, critério e objetivo, registro sim ou não no dashboard e na tela de hábitos, converter tarefa em hábito no checkout, sequência e completude na Revisão de Foco, hábitos na Revisão de Rumo | "Agendar lembrete"; assistente "Hábitos sumidos" |

## Esperando resposta a uma pergunta em aberto

| O que falta | Pergunta que trava |
| --- | --- |
| Sugestão de agregar tarefas em projetos (o passo da Revisão de Foco mostra só um aviso) | `spec/rituais.md`: como funciona a sugestão |
| Mural no dashboard | `spec/abertura-do-dia.md`: onde crio e edito as frases |
| Métricas da Revisão de Rumo de blocos sem projeto e de objetivos com pouco engajamento | `spec/rituais.md`: "blocos" ou "tarefas", e como medir engajamento |
| Nome definitivo do campo "motivação" | `spec/objetivos.md` |
| Seção 5 inteira | `spec/compromissos.md`: formatos de cada tipo e como corrigir um tipo errado |
| "Agendar lembrete" nos hábitos | `spec/habitos.md` |
| Assistentes "Tarefas esquecidas", "Arquivo antigo" e "Hábitos sumidos" | `spec/assistentes.md`: os prazos de "parado" e "antigo" |

## Assistentes

Feitos: "Dias em aberto", "Seções soltas" e "Projetos repetidos" (`domain/cleanupStatus.ts`). Os outros, pela tabela do `spec/assistentes.md`:

| Assistente | Estado |
| --- | --- |
| Tarefas esquecidas, Arquivo antigo, Hábitos sumidos | Esperam os prazos de "parado" e "antigo" |
| Projetos parados | Pode ser construído: os 14 dias já estão definidos no `spec/projetos.md` ("Projetos") |
| Warm up | Pode ser construído, mas "itens que eu quase sempre pulo" não tem um número definido |
| Objetivos soltos | Pode ser construído, mas "meta talvez atingida" não tem critério definido |
| Compromissos passados | Espera a seção 5 |

## O SPEC mudou e o código ainda não

- **Quando o dashboard aparece** (12/10/2026). O `spec/abertura-do-dia.md` ("Dashboard") pede o dashboard quando há checklist de warm up, frases no mural ou projetos em foco. `dayStage` (`domain/dayFlow.ts`) já considera o checklist e os projetos em foco; falta o mural, que espera uma pergunta em aberto.

## Antes de outras pessoas usarem

Decisões de produto que dependem da Valeria:

- [ ] **Nome e ícone do app.** "Best App" e o ícone de check são provisórios.
- [ ] **Página de privacidade.** Uma página curta explicando que nada sai da máquina. O texto é decisão da Valeria.
- [ ] **Revisar as lacunas que o agente decidiu.** Pequenas regras que a spec não cobria foram decididas e escritas no próprio texto dos arquivos de `spec/`, sem marcação (`INCOERENCIAS.md`, 2.14). Exemplos: a quarta prioridade ocupa o lugar da terceira; a precisão da intenção conta só tarefas com data; o warm up só começa quando o checklist tem itens; na barra lateral, "Hoje" e "Rituais" entram no grupo Hoje, junto com os próximos dias; recolhida, a barra mostra só o botão de abrir e o contador de "Rituais"; a lista de "Rituais" começa fechada, exceto numa tela de ritual. Das revisões de Foco e Rumo (12/10/2026; a Valeria escolheu os nomes, a cadência de 5 checkouts e 4 Revisões de Foco, e acabar com as prioridades da semana): os sinais que disparam cada revisão e os seus números (10 itens esperando, projeto em foco parado, último projeto em foco finalizado; mais da metade das tarefas sem projeto com objetivo, objetivo 30 dias sem atividade); a cadência contar dias fechados pelo "Fechar dias pendentes"; o "Lembrar depois" do aviso de revisão esconder o aviso até o próximo checkout; os sinais de Rumo só valerem depois da primeira Revisão de Rumo, e o de Foco sobre a lista vazia só valer quando o último projeto em foco é finalizado, para nenhum dos dois disparar no primeiro uso; pular a Revisão de Rumo não ter consequência além do aviso; a passada pelos projetos ativos na Revisão de Foco; a revisita de meta e motivação na Revisão de Rumo; os projetos em foco no dashboard e primeiro no planejamento do dia seguinte; e o assistente "Prioridades travadas" ter saído. Da reordenação de linhas e seções (13/10/2026; a Valeria escolheu arrastar e atalhos, Ctrl + Shift + ↑/↓ para seções, ordem por dia, dias passados e o checkout seguindo a ordem): as tarefas de outros dias virarem a seção própria "De outros dias", com esse nome também no checkout (a pergunta ficou sem resposta); uma tarefa que chega depois de reordenar entrar no fim delas; Enter numa delas criar a linha nova no topo da primeira seção geral, como antes; Backspace no começo da primeira linha de uma seção não juntar mais com uma tarefa de outro dia; e as prioridades fixadas saírem da ordem. Na implementação: na Revisão de Rumo, um objetivo que não continua é finalizado ali mesmo, dizendo se a meta foi atingida; antes da primeira revisão, o período começa no primeiro registro do app; o dia em que uma Revisão de Rumo fecha conta nos dois períodos do raio-x, porque as prioridades do dia são guardadas por dia. Da correção dos bugs pequenos (13/10/2026): o aviso de mudança não salva no rodapé, fora da fila do topo, com o texto e o "Fechar" (`spec/navegacao.md`; issue #66); e clicar no vazio abaixo das linhas de uma seção, até a próxima parte do dia, abrir uma linha nova no fim dessa seção (`spec/nota-do-dia.md`, "Execução"; issue #21). Do "Fechar o dia" (14/10/2026; a Valeria escolheu encolher o checkout em vez de acabar com ele, as notas irem sozinhas para a wiki, as tarefas rolarem sozinhas e nomes separados): o limite para uma tarefa parar de rolar sozinha ser o mesmo dos 3 adiamentos; descartar e vincular como recurso irem para a wiki; "decidir na Revisão de Foco" valer só para tarefas; a sugestão de vincular quadro branco que cita um projeto ir para o assistente "Seções soltas"; e a cor dos assistentes medir a idade do item mais antigo, e não a quantidade (`spec/checkout.md`, `spec/assistentes.md`; issue #96). Na implementação do "Fechar o dia" em etapas (14/10/2026; a Valeria escolheu as etapas, os 3 dias de agendadas no planejamento, a edição em lote, salvar cada etapa ao avançar e os lembretes numa etapa própria): as tarefas com prazo antes do dia seguinte entrarem na mesma etapa das adiadas 3 vezes ou mais, "Pedem atenção"; "Fez e não marcou?" incluir as tarefas que vão sozinhas para o dia seguinte e aparecer de novo ao reabrir o fechamento; uma tarefa com data que já passou aparecer no planejamento como "Data passada"; a primeira ida de uma tarefa sem data para o dia seguinte não contar como adiamento, como já era; o aviso de um só dia pendente, quando é ontem, sair sem o sinal de alerta, e o texto virar "Falta fechar ontem"; e os limites padrão das cores por idade: 2, 4 e 7 dias para "Dias em aberto" e 7, 30 e 60 para os outros (ADR-045). Das cópias datadas do backup (14/10/2026; a Valeria escolheu a regra das cópias, a subpasta, a limpeza automática e restaurar pela tela): escolher uma pasta que já tem um backup passar pela mesma proteção da gravação automática, em vez de gravar por cima; a cópia de antes de uma migração entrar no rodízio das cópias de hoje; e quem já tinha escolhido um arquivo continuar com ele, sem cópias, até escolher a pasta. Do modo foco (14/10/2026; a Valeria escolheu o ícone, o que fica visível, focar qualquer parte, sobreviver a recarregar e nunca sair sozinho; aceitou o atalho Ctrl + Shift + Enter): o mesmo atalho também sair do foco; "Hoje" voltar para a parte em foco; uma parte aberta na nota de hoje continuar aceitando linhas novas depois da meia-noite; a faixa de backup também sumir no foco, já que o status continua na barra lateral; e uma parte que deixou de existir mostrar "Esta parte da nota não existe mais", com o botão de sair. Da barra lateral ajustável (14/10/2026): a largura ir de 200 a 480 pixels, o clique duplo na borda voltar aos 260, as setas do teclado na borda mudarem a largura, e a largura ficar guardada nas configurações, como o recolher (`spec/navegacao.md`, "Global").

## Adiado de propósito

- **Objetivos, hábitos e a Revisão de Rumo escondidos até a spec ficar pronta** (decisão de 13/10/2026): o código das fases 4 e 6 continua, mas a interface esconde tudo que depende deles: os itens da barra lateral, as telas, o objetivo do projeto, os recursos de objetivo e "Virar hábito" no checkout, os hábitos no dashboard e na Revisão de Foco, e a Revisão de Rumo inteira, que sai de "Rituais", do contador, dos avisos e das configurações. Os dados ficam guardados. Para voltar, basta ligar a chave em `src/ui/features.ts` (ADR-041) e conferir a spec.
- **App no Android e sincronização entre aparelhos:** fase posterior, quando houver uma forma de sincronizar que respeite o `google-safe.md`.
- **Integração com o Google Agenda:** só numa fase que permita conexões externas.
