# Decisões de produto

O porquê das decisões de produto, a origem da spec e os riscos levantados.

- **Entra aqui:** o motivo de uma decisão de produto, quando ele não cabe na própria regra.
- **Não entra aqui:** a regra em si (vai para o `SPEC.md`), decisões técnicas (`architecture-decision-records.md`) e o estado da construção (`ROADMAP.md`).

## Origem

- A spec nasceu das notas manuscritas da Valeria de 03/10/2026 (`o_melhor_app_do_mundo1.pdf`), digitalizadas e reorganizadas em 04/10/2026.
- O app é da Valeria, que o desenvolve com o Claude Code.
- O rascunho da nota do dia (`nota-do-dia-rascunho.png` e `.html`) foi entregue numa conversa e não está no repositório; a Valeria tem as cópias. Ele mostra o 1a e o 1b juntos, e os ícones são marcadores de posição.

## Por que as decisões foram tomadas

| Decisão | Motivo |
| --- | --- |
| As seções seguem a ordem de construção: dia, projetos e Revisão de Foco, abertura do dia, objetivos e Revisão de Rumo, tipos de bloco, hábitos | Cada fase precisa ser usável sozinha, e cada ritual apresenta o conceito seguinte |
| A seção 1 foi cortada em 1a (núcleo) e 1b (acabamento) | O MVP tinha engordado. Entra no 1a só o necessário para testar a hipótese: capturar sem decidir e triar no checkout |
| O corte do 1a é na interface, não nos dados | Datas, adiamentos, seção de origem e log de execução são baratos de gravar agora e impossíveis de recuperar depois |
| Sem onboarding; os rituais entram aos poucos | A carga de ritual era o maior risco de abandono |
| O app avisa em vez de bloquear; vínculos com projeto e objetivo são opcionais | Vínculos obrigatórios criavam atrito no começo. A falta de vínculo vira métrica de desconexão |
| A nota do dia tem seções (geral e reunião); "nota de reunião" deixou de ser um tipo de bloco | A hierarquia nota, seção, bloco é mais simples de modelar, e o checkout tria as notas por seção |
| Os projetos em foco (até 3) são escolhidos na Revisão de Foco; as prioridades do dia são tarefas; não há prioridades de tarefas da semana | Cada horizonte fica com a granularidade certa: a revisão escolhe projetos e o checkout escolhe tarefas. Em 12/10/2026 os projetos deixaram de ser do mês e passaram para a reflexão semanal; no mesmo dia, as prioridades da semana (tarefas) saíram, porque eram uma terceira lista de prioridade entre o projeto e o dia, e a pergunta "quantas são" nunca se fechou. Fora da revisão, só posso acrescentar projetos até o limite, sem trocar |
| Duas revisões sem calendário, Foco e Rumo, no lugar das reflexões semanal e mensal (12/10/2026) | A Valeria quer menos camadas de tempo: só o checkout tem data, o dia. As revisões seguem os horizontes do GTD (projetos e objetivos), e não semana e mês. Elas ficam disponíveis por cadência contada em checkouts, por sinais de que algo saiu do lugar, ou na mão. Risco: sem data, revisões tendem a não acontecer; os sinais e a cadência existem para puxá-las |
| "Planejamento do dia seguinte" é diferente de "prioridade" | Planejar é escolher as tarefas de amanhã; prioridade é o destaque de até 3 delas, que só entra no 1b |
| Local-only (IndexedDB), no lugar do Firebase | O app vai ser usado no computador do trabalho, com dados confidenciais, e a empresa não permite apps com conexões externas (`google-safe.md`). Antes, o Firebase tinha sido escolhido no lugar do Supabase porque a Valeria já o conhecia. As métricas continuam calculadas no app |
| Barra lateral fixa no lugar da barra de cima e da gaveta (12/10/2026) | A Valeria prefere tudo o que é global numa única barra à esquerda, para deixar o centro limpo e focar no trabalho. Como o app é só para o computador, há largura para isso |
| Um único web app instalável (PWA), primeiro só no Chrome do computador | Um código só para manter. O Android volta quando houver uma forma de sincronizar que respeite o `google-safe.md` |
| Backup automático em arquivo, numa pasta escolhida pela Valeria | Sem nuvem, o navegador é o único lugar dos dados. Uma pasta sincronizada do Google Drive serve para trocar de máquina sem OAuth. A Valeria não queria ter que lembrar de salvar, então o app regrava o arquivo a cada mudança, mas nunca por cima de dados que o navegador não tem: um navegador limpo apagaria o único backup bom |
| Hospedagem no Cloudflare Pages, a partir do repositório privado | A Valeria quer que outras pessoas possam usar o app. Como ele é local-only, basta publicar os arquivos: cada pessoa ganha um banco próprio no navegador, sem contas. O plano gratuito permite uso comercial (o Hobby da Vercel não), e o código-fonte continua privado. O JavaScript compilado é visível para quem abre o app |
| Importar substitui tudo, com aviso em destaque e cópia do estado anterior | Basta para trocar de máquina. O aviso mostra o que vai se perder, e a cópia permite desfazer |
| Abandonar e descartar escondem, sem apagar | O histórico de eventos precisa continuar íntegro para as métricas |
| Hábitos ficam por último | Decisão da Valeria para reduzir o escopo |
| Projetos existem por baixo dos panos desde o 1a; toda seção nasce em quadro branco e só se vincula a um projeto por escolha | Leva a pré-triagem adiante: o vínculo já diz o destino. O quadro branco é um estado, não um tipo, para que uma reunião também possa ficar sem projeto, e o checkout oferece a última chance de vincular. As notas podem ser vistas por tipo ou por projeto, sem um lugar único. As tarefas chegavam ao checkout com "dia seguinte" pré-selecionado e a Valeria confirmava cada uma, para não virar adiamento automático; isso mudou em 14/10/2026 (veja "Fechar o dia") |
| Checkout em lote, com auto-triagem (`spec/checkout.md`) | Reduz o checkout a confirmar sugestões e cuidar das exceções. O app decide o óbvio e reversível, sugere o provável e nunca decide o que só a Valeria sabe ou o que tira coisas de circulação |
| O checkout encolheu e virou "Fechar o dia"; o resto foi para o "Colocar ordem na casa", sem data (14/10/2026) | O checkout diário pesava demais nos dias de muita coleta e corria o risco de virar "aceitar tudo para amanhã" com cerimônia (`relatorios/2026-10-14-efetividade.md`). A Valeria pensou em acabar com o vínculo diário, mas a parte que mais funciona é fechar o dia: o custo de triar cresce com a idade do item, porque o contexto se perde. Por isso ficou um fechamento diário de cerca de um minuto, só com o que perece (tarefas, lembretes, planejamento), e o resto vai para os assistentes, que ela faz quando quiser, guiada pela idade dos itens. As notas vão sozinhas para a wiki, porque é reversível. As tarefas não feitas vão sozinhas para o dia seguinte até o limite de adiamentos e só então pedem decisão, revendo a decisão de confirmar cada uma. Os dois nomes são separados a pedido da Valeria |
| "Fechar o dia" em etapas, uma decisão por tela (14/10/2026; `spec/checkout.md`) | A tela única pesava porque misturava tipos de decisão. Cada etapa trata de um tipo só, e o que já vem decidido fica numa confirmação agrupada pelo destino. Um card por item foi descartado: aumentaria o esforço total num ritual diário e esconderia a visão do conjunto. Risco: mais telas por fechamento; por isso as etapas vazias são puladas |
| "Fechar dias pendentes" no lugar do "botão de pânico" | Nome descritivo, a pedido da Valeria. Aplica a auto-triagem a todos os dias pendentes; as tarefas voltam à lista de ativas sem data, para não virar uma pilha no dia do retorno |
| Google Agenda com integração só de ida, numa fase futura | Migrar marca o compromisso como migrado, que conta como concluído. Basta guardar o status e o identificador do evento; o app continua sendo a fonte da verdade. Enquanto o app for local-only, a migração é só manual |
| Assistentes de limpeza (`spec/assistentes.md`) | Mesma mecânica do checkout em lote, para colocar ordem na casa sem esforço. Viram um componente genérico no código. O mural ficou de fora porque os lembretes dele não vencem |
| Sem notificações: lembretes reaparecem dentro do app (contador na aba e faixa discreta na nota do dia) | A Valeria tem receio de que lembretes virem paisagem e sejam ignorados. Avisos passivos, no momento em que ela já está no app, e lembretes ignorados viram pergunta no fechamento do dia |
| O `SPEC.md` é a fonte da verdade, e as abas do Google Docs foram aposentadas (12/10/2026) | Reexportar as abas apagaria as emendas feitas direto no repositório |

## Riscos levantados

- O retorno depois de uma ausência. Itens acumulam e os contadores de adiamento sobem, então quem some por duas semanas volta para uma pilha. A resposta é o "Fechar dias pendentes".
- As métricas medem só falha: adiamentos, precisão e desconexão. Falta ao menos uma de progresso em destaque, como tarefas executadas.
- O editor de blocos é a parte mais cara de construir. A detecção automática de tipo ficou para a seção 5 por isso.
- O escopo tende a crescer a cada rodada de especificação. Uma semana de uso do 1a ensina mais sobre as seções 2 a 6 do que novas perguntas.
