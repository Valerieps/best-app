# Roadmap

Atualizado em 17/10/2026

O que ainda não está pronto. É o único lugar que acompanha o progresso.

- **Entra aqui:** o que falta construir e por quê, onde o código ainda não segue o `SPEC.md`, o que foi adiado de propósito e o lembrete de revisar as lacunas do spec que o agente decidiu sozinho (a lista fica na issue #164).
- **Não entra aqui:** o que já está pronto (quando algo fica pronto, sai daqui; o git, os PRs e as issues fechadas guardam o histórico), as regras (`SPEC.md`), o texto das perguntas em aberto (fica no topo de cada arquivo de `spec/`; aqui só se aponta para elas), o desenho técnico (`ARQUITETURA.md`) e o débito técnico (issues do GitHub com as labels `t:bug` e `t:debito-tecnico`).

## Fases

As fases seguem as seções do `SPEC.md`.

| Fase | Estado | O que falta |
| --- | --- | --- |
| 0. Fundação | Feita | — |
| 1a. Núcleo | Feita | — |
| 1b. Acabamento | Feita em parte | A tela "Próximos dias" e o lugar dela na barra lateral (decididas em 12/10/2026, ainda sem código) |
| 2. Projetos | Feita em parte | Sugestão de agregar tarefas em projetos; assistente "Projetos parados" |
| 3. Abertura do dia | Feita em parte | Mural; assistente "Warm up"; um ajuste do `SPEC.md` (veja "O SPEC mudou e o código ainda não") |
| 4. Objetivos | Feita em parte | Nome do campo "motivação"; assistente "Objetivos soltos" |
| 5. Tipos de bloco | Bloqueada | Tudo: compromissos e detecção de tipo |
| 6. Hábitos | Feita em parte | "Agendar lembrete"; assistente "Hábitos sumidos" |

## Esperando resposta a uma pergunta em aberto

| O que falta | Pergunta que trava |
| --- | --- |
| Mural no dashboard | `spec/abertura-do-dia.md`: onde crio e edito as frases |
| Nome definitivo do campo "motivação" | `spec/objetivos.md` |
| Seção 5 inteira | `spec/compromissos.md`: formatos de cada tipo e como corrigir um tipo errado |
| "Agendar lembrete" nos hábitos | `spec/habitos.md` |
| Assistente "Hábitos sumidos" | `spec/assistentes.md`: os prazos de "parado" e "antigo" |

## Assistentes

Os que faltam, pela tabela do `spec/assistentes.md`:

| Assistente | Estado |
| --- | --- |
| Hábitos sumidos | Espera os prazos de "parado" e "antigo" |
| Projetos parados | Pode ser construído: os 14 dias já estão definidos no `spec/projetos.md` ("Projetos") |
| Warm up | Pode ser construído, mas "itens que eu quase sempre pulo" não tem um número definido |
| Objetivos soltos | Pode ser construído, mas "meta talvez atingida" não tem critério definido |
| Compromissos passados | Espera a seção 5 |

## O SPEC mudou e o código ainda não

- **Converter em hábito no "Fechar o dia"** (fase 6, `spec/checkout.md`, "Destinos"): saiu do código junto com a etapa "Pedem atenção" (16/10/2026). Volta como uma ação da etapa "Tarefas" quando os hábitos voltarem a aparecer (veja "Adiado de propósito").

## Antes de outras pessoas usarem

Decisões de produto que dependem da Valeria:

- [ ] **Ícone do app.** O nome virou "Vesper Tasks" (15/10/2026) na interface, na aba e no manifesto; o ícone de check ainda é provisório. O nome interno do banco, das chaves locais e dos arquivos de backup continua "best-app", para não perder os dados já salvos.
- [ ] **Página de privacidade.** Uma página curta explicando que nada sai da máquina. O texto é decisão da Valeria.
- [ ] **Revisar as lacunas que o agente decidiu.** A lista, em lotes, está na issue [#164](https://github.com/Valerieps/best-app/issues/164).

## Adiado de propósito

- **Objetivos e hábitos escondidos até a spec ficar pronta** (decisão de 13/10/2026): o código das fases 4 e 6 continua, mas a interface esconde tudo que depende deles: os itens da barra lateral, as telas, o objetivo do projeto, os recursos de objetivo e "Virar hábito" no checkout e os hábitos no dashboard. A Revisão de Rumo, que também ficava escondida, saiu do app em 17/10/2026 (ADR-060). Os dados ficam guardados. Para voltar, basta ligar a chave em `src/ui/features.ts` (ADR-041) e conferir a spec.
- **App no Android e sincronização entre aparelhos:** fase posterior, quando houver uma forma de sincronizar que respeite o `SEGURANCA.md`.
- **Integração com o Google Agenda:** só numa fase que permita conexões externas.
