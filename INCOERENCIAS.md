# Incoerências entre os documentos

12/10/2026

Regras que se contradizem ou ficaram ambíguas entre `SPEC.md`, `spec/checkout.md`, `spec/assistentes.md`, `DECISOES.md`, `ARQUITETURA.md`, `DEBITO-TECNICO.md`, `AVALIACAO-UX.md`, `google-safe.md` e as ADRs. As incoerências dos feature requests estão na issue de cada pedido, no GitHub.

- **Entra aqui:** contradições e ambiguidades entre os documentos, com a pergunta que resolve cada uma.
- **Não entra aqui:** incoerências de um pedido (ficam na issue do pedido, no GitHub), bugs (`DEBITO-TECNICO.md`) e perguntas em aberto que não vêm de uma contradição (`SPEC.md`, "Em aberto").

Quando um item for decidido, a regra vai para o `SPEC.md` e o item sai daqui.

Já resolvidos e retirados desta lista: a fonte da verdade (o `SPEC.md`; o `prompt.md` foi apagado), o aviso de reflexão (contador e nota do dia), quando o dashboard aparece, o `HANDOFF.md` (dividido entre `CLAUDE.md` e `DECISOES.md`), a lista de documentos do `CLAUDE.md`, os nomes dos assistentes no `DEBITO-TECNICO.md` a fase 1b da `ARQUITETURA.md` (o estado das fases foi para o `ROADMAP.md`) as seções 6 e 7 do `google-safe.md`, que citavam Firebase, Vercel e funções que o app não usa, e quantas são as prioridades da semana (elas deixaram de existir).

## 1. Em decisão

### 1.1 Checkout em lote ou item a item

- O `spec/checkout.md` ("Checkout") diz que, numa seção vinculada a um projeto, as tarefas chegam com "dia seguinte" pré-selecionado e "eu confirmo o destino de cada uma". O `DECISOES.md` repete: "para não virar adiamento automático".
- O mesmo arquivo, em "Checkout em lote", diz que "Aceitar sugestões" confirma tudo de uma vez.
- **Encaminhado:** vai ser decidido na revisão do fluxo de checkout ([issue #11](https://github.com/Valerieps/best-app/issues/11)), junto com os itens 2.1, 2.4, 2.5 e a parte de lembretes do 2.9.

### 1.2 O princípio "sempre dá para criar ou editar qualquer coisa fora dos rituais"

Remover a frase tira a contradição do texto, mas não resolve os casos concretos, e ela sustenta outras regras.

- **Onde a frase é contrariada hoje:**
  - Arquivar e abandonar só aparecem como destinos do checkout e da Revisão de Foco.
  - Trocar ou tirar um projeto em foco só é possível na Revisão de Foco (`spec/prioridades.md`, "Projetos em foco").
  - Tarefas criadas na página do projeto não entram no checkout e, por isso, não têm como sair de circulação (`DEBITO-TECNICO.md`, "Projetos e projetos em foco").
- **Onde a frase sustenta regras:** finalizar uma tarefa a qualquer momento, promover uma prioridade a qualquer momento, converter um quadro branco a qualquer momento, criar tarefas na página do projeto.
- **Ambiguidade que continua sem ela:** o `spec/nota-do-dia.md` ("Execução") diz que, para tirar de circulação uma tarefa que veio de outro dia, "eu arquivo ou abandono", sem dizer se isso é possível durante o dia.
- **Alternativa a remover:** trocar a frase por uma regra precisa. Por exemplo: "Criar, editar, agendar e finalizar é livre a qualquer hora. Tirar coisas de circulação (arquivar, abandonar, descartar) e trocar prioritários são decisões dos rituais." Ou o contrário, se a [issue #7](https://github.com/Valerieps/best-app/issues/7) (arquivar de qualquer tela) for aceita.
- **Pergunta:** qual das duas regras vale? E como uma tarefa do backlog do projeto, criada por engano, sai de circulação?

## 2. Regras de produto

### 2.1 Prioridades do dia: a regra das vagas

- Promover uma tarefa com as 3 prioridades definidas "ocupa o lugar da terceira" (`spec/prioridades.md`). Mas uma tarefa que entrou pelo prazo tem precedência, e a estrela parece não responder (`DEBITO-TECNICO.md`, "Editor e telas").
- Não está definido o que acontece com 4 ou mais tarefas com prazo no mesmo dia.
- O `spec/prioridades.md` diz que a lista fica vazia "quando o checkout do dia anterior não foi feito", o que sugere que o checkout define prioridades. Mas o planejamento do dia seguinte (`spec/checkout.md`) só escolhe tarefas, e o `DECISOES.md` separa "planejar" de "priorizar".
- **Pergunta:** quem ganha a vaga, a escolha manual ou o prazo? O planejamento do dia seguinte inclui escolher as prioridades?

### 2.3 Pergunta em aberto que o princípio já responde

- "O checkout pendente bloqueia o 'Iniciar o Flow de Execução'?" (`spec/abertura-do-dia.md`, "Em aberto") já é respondido por "o app sempre avisa em vez de bloquear" e pela tabela "Rituais pulados" (`spec/rituais.md`). Sobra a segunda metade: o que mostrar quando há vários dias pendentes.

### 2.4 Três definições de "checkout completo"

- A nota do dia desaparece depois do checkout completo (`spec/nota-do-dia.md`, "Blocos e notas").
- Depois do checkout, posso continuar o mesmo dia normalmente (`spec/checkout.md`, "Checkout").
- Um checkout só é finalizado quando o dia termina sem item pendente (mesmo trecho).
- **Pergunta:** a nota some ao fim do checkout ou só depois da meia-noite?

### 2.5 Três nomes para o botão do checkout

- "Confirmar decisões" (`spec/navegacao.md`), "Aceitar sugestões" (`spec/checkout.md`) e "finalizar meu dia" (`spec/checkout.md`). Falta dizer se são passos diferentes ou o mesmo botão.

### 2.6 Termos do backup

- O status usa "Backup pausado" (`spec/principios.md`, "Backup", e `spec/navegacao.md`); a fila de avisos fala em "backup bloqueado ou com erro".
- A pausa da proteção contra sobrescrita ("pausa e sugere importar") é a mais grave, mas não está claro se ela entra como "bloqueado".
- A pausa por falta de autorização tem só "um aviso discreto", e o `DEBITO-TECNICO.md` (seção 3, item 2) mostra que dá para passar semanas sem backup sem perceber.
- **Pergunta:** "pausado" e "bloqueado" são a mesma coisa? A pausa por autorização deveria subir para a fila de avisos depois de um prazo?

### 2.7 A ordem de construção é quebrada

As fases do `SPEC.md` deveriam poder ser construídas em ordem, mas:

- O 1b ("Próximos dias") usa os dias ativos, que só existem na seção 3.
- A seção 2 ("Projetos") usa objetivo e recursos, que são da seção 4.
- A primeira Revisão de Foco (seção 2) sugere o checklist de warm up, que é da seção 3 ("Primeiro uso").

### 2.8 "Primeiros dias sem projetos"

- O "Primeiro uso" (`spec/principios.md`) diz "sem projetos nem objetivos" nos primeiros dias. Mas desde o 1a o título da seção sugere projetos e o checkout oferece converter o quadro branco em projeto, e o `spec/checkout.md` sugere vincular a um projeto citado.

### 2.9 Duas coisas chamadas "lembrete"

- As frases do mural são "lembretes de mim para mim mesma" (`spec/abertura-do-dia.md`, "Dashboard"; `spec/assistentes.md`).
- Os lembretes da seção 3 são itens que voltam num horário.
- Só o warm up cria lembretes de horário. Não há um "criar lembrete" geral, e as perguntas "onde crio os lembretes do mural" e "o que 'agendar lembrete' faz" (hábitos) continuam abertas.
- A faixa oferece "feito, mais tarde, largar"; no checkout, o lembrete vira "manter, mudar, largar". O `spec/checkout.md` não tem regra para lembretes.

### 2.10 Termos para coisas paradas

- A pergunta em aberto do `spec/assistentes.md` ("os prazos que definem 'parado' ou 'antigo'") parece valer para todos os assistentes, mas os 14 dias de "Projetos parados" já estão definidos. Ela vale só para "Tarefas esquecidas", "Arquivo antigo" e "Hábitos sumidos" (`ROADMAP.md`, "Assistentes").

### 2.11 Projetos em foco ao juntar projetos

- Juntar projetos repetidos com um projeto em foco: o destino não herda a vaga, e não há regra para isso (`DEBITO-TECNICO.md`, "Projetos e projetos em foco").

### 2.12 Sugestão de projetos na Revisão de Foco

- Uma das opções da pergunta em aberto do `spec/rituais.md` é sugerir "com IA", o que contradiz o local-only (`spec/principios.md`, "Plataforma e dados"; `google-safe.md`).
- A terceira opção (converter títulos de quadro branco repetidos) já existe como o assistente "Seções soltas" (`spec/assistentes.md`).

### 2.13 Pessoal ou para outras pessoas

- O `SPEC.md` abre dizendo que este é "um app pessoal", escrito para o uso da Valeria.
- O `spec/principios.md` ("Plataforma e dados") e o `DECISOES.md` (Cloudflare) dizem que ele é publicado para outras pessoas usarem.
- O `google-safe.md` fala em proteger a propriedade intelectual para comercializar, mas o JavaScript compilado é público.

### 2.14 Lacunas de negócio decididas pelo agente

- O `CLAUDE.md` pede para perguntar antes de decidir regras de negócio. O `ROADMAP.md` ("Revisar as lacunas que o agente decidiu") mostra regras decididas pelo agente e escritas no `SPEC.md` sem marcação, então não dá para saber quais são. Daqui em diante, o `CLAUDE.md` pede que cada nova lacuna decidida pelo agente entre nessa lista; as antigas continuam sem marcação.

### 2.15 Troca da frase do mural às 13h

- O dashboard só aparece na abertura do dia, e a barra lateral não tem um caminho para voltar a ele. A frase trocada às 13h nunca é vista, a menos que o dashboard possa ser reaberto.

### 2.16 Detalhes

- "Vários dias úteis sem abrir o app" (`spec/rituais.md`, "Rituais pulados") contra "mais de um dia com checkout pendente" (`spec/checkout.md`) para sugerir "Fechar dias pendentes".
- O objetivo é "meta, motivação, projetos e recursos" (`spec/objetivos.md`), mas o `spec/habitos.md` diz que um hábito faz parte de um objetivo.
- A revisita da Revisão de Foco mostra todas as arquivadas, mas o assistente que ela reaproveita ("Arquivo antigo") só encontra as arquivadas "há meses" (`spec/assistentes.md`).

## 3. Produto contra técnica

- **localStorage ou IndexedDB.** A ADR-036 diz que você pediu IndexedDB, não localStorage. Mesmo assim, "Lembrar depois" e "fixar prioridades" usam localStorage (ADR-029).
- **Cores do "Colocar ordem na casa".** A V4 da `AVALIACAO-UX.md` quer o vermelho só para erros. A ADR-028 usa os níveis amarelo, laranja e vermelho.
- **Plataforma da avaliação de UX.** A `AVALIACAO-UX.md` dá peso a problemas medidos no celular, em 375 px (N5, P8). O escopo atual é só o Chrome no computador.
- **Dois "dashboards".** A ADR-028 e o código (`domain/cleanupStatus.ts`) chamam o "Colocar ordem na casa" de dashboard, o mesmo nome da tela de boas-vindas da seção 3.

## 4. Documentos desatualizados

- **`spec/`:**
  - Os lembretes (`abertura-do-dia.md`) citam o Android, que está fora do escopo.
