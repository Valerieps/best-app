# Contexto e próximos passos

Atualizado em Oct 11, 2026

Este documento é para quem for continuar o trabalho, pessoa ou agente. O `SPEC.md` é a fonte da verdade; as antigas abas do Google Docs não valem mais. Aqui fica o que não cabe nela: onde paramos, o porquê das decisões e o que falta.

## Onde paramos

- A seção 1a (núcleo do ciclo diário) está completa, sem perguntas abertas. O próximo passo é construí-la no Claude Code.
- Em 11/10/2026, o 1a e o 1b foram construídos, e as seções 2, 3, 4 e 6 foram construídas em tudo o que não depende de pergunta em aberto. A seção 5 espera respostas. O estado de cada fase está em `ARQUITETURA.md`, e o que espera decisão está em `DEBITO-TECNICO.md`. Lacunas pequenas da spec foram decididas pelo agente e registradas no próprio texto da spec; vale a Valeria revisar.
- Em 11/10/2026, o app passou a ser local-only nesta primeira fase: só Chrome no computador, dados no IndexedDB, sem Firebase, login ou conexões externas. As regras de segurança estão em `google-safe.md`. O Android e a sincronização ficam para uma fase posterior.
- A seção 1b e as seções 2 a 6 estão decididas no que têm escrito. As seções 2 a 6 somam 14 perguntas abertas, listadas no início de cada uma.
- A spec nasceu das notas manuscritas da Valeria de 03/10/2026 (`o_melhor_app_do_mundo1.pdf`), digitalizadas e reorganizadas em 04/10/2026.
- O app é de uso pessoal da Valeria, que vai desenvolvê-lo com o Claude Code.

## Por que as decisões foram tomadas

| Decisão | Motivo |
| --- | --- |
| As seções seguem a ordem de construção: dia, semana, abertura do dia, mês, tipos de bloco, hábitos | Cada fase precisa ser usável sozinha, e cada ritual apresenta o conceito seguinte |
| A seção 1 foi cortada em 1a (núcleo) e 1b (acabamento) | O MVP tinha engordado. Entra no 1a só o necessário para testar a hipótese: capturar sem decidir e triar no checkout |
| O corte do 1a é na interface, não nos dados | Datas, adiamentos, seção de origem e log de execução são baratos de gravar agora e impossíveis de recuperar depois |
| Sem onboarding; os rituais entram aos poucos | A carga de ritual era o maior risco de abandono |
| O app avisa em vez de bloquear; vínculos com projeto e objetivo são opcionais | Vínculos obrigatórios criavam atrito no começo. A falta de vínculo vira métrica de desconexão |
| A nota do dia tem seções (geral e reunião); "nota de reunião" deixou de ser um tipo de bloco | A hierarquia nota, seção, bloco é mais simples de modelar, e o checkout tria as notas por seção |
| Os projetos prioritários (até 3) são da semana; as prioridades da semana e do dia são tarefas | Cada horizonte fica com a granularidade certa, e o projeto continua prioritário enquanto as tarefas descem. Em 12/10/2026 eles deixaram de ser do mês: a Valeria quer revisá-los na reflexão semanal, e fora dela só pode acrescentar até o limite, sem trocar |
| "Planejamento do dia seguinte" é diferente de "prioridade" | Planejar é escolher as tarefas de amanhã; prioridade é o destaque de até 3 delas, que só entra no 1b |
| Local-only (IndexedDB), no lugar do Firebase | O app vai ser usado no computador do trabalho, com dados confidenciais, e a empresa não permite apps com conexões externas (`google-safe.md`). Antes, o Firebase tinha sido escolhido no lugar do Supabase porque a Valeria já o conhecia. As métricas continuam calculadas no app |
| Um único web app instalável (PWA), primeiro só no Chrome do computador | Um código só para manter. O Android volta quando houver uma forma de sincronizar que respeite o `google-safe.md` |
| Backup automático em arquivo, numa pasta escolhida pela Valeria | Sem nuvem, o navegador é o único lugar dos dados. Uma pasta sincronizada do Google Drive serve para trocar de máquina sem OAuth. A Valeria não queria ter que lembrar de salvar, então o app regrava o arquivo a cada mudança, mas nunca por cima de dados que o navegador não tem: um navegador limpo apagaria o único backup bom |
| Hospedagem no Cloudflare Pages, a partir do repositório privado | A Valeria quer que outras pessoas possam usar o app. Como ele é local-only, basta publicar os arquivos: cada pessoa ganha um banco próprio no navegador, sem contas. O plano gratuito permite uso comercial (o Hobby da Vercel não), e o código-fonte continua privado. O JavaScript compilado é visível para quem abre o app |
| Importar substitui tudo, com aviso em destaque e cópia do estado anterior | Basta para trocar de máquina. O aviso mostra o que vai se perder, e a cópia permite desfazer |
| Abandonar e descartar escondem, sem apagar | O histórico de eventos precisa continuar íntegro para as métricas |
| Hábitos ficam por último | Decisão da Valeria para reduzir o escopo |
| Projetos existem por baixo dos panos desde o 1a; toda seção nasce em quadro branco e só se vincula a um projeto por escolha | Leva a pré-triagem adiante: o vínculo já diz o destino. O quadro branco é um estado, não um tipo, para que uma reunião também possa ficar sem projeto, e o checkout oferece a última chance de vincular. As notas podem ser vistas por tipo ou por projeto, sem um lugar único. As tarefas chegam ao checkout com "dia seguinte" pré-selecionado, mas a Valeria confirma cada uma, para não virar adiamento automático |
| Checkout em lote, com auto-triagem (`AUTO-TRIAGEM.md`) | Reduz o checkout a confirmar sugestões e cuidar das exceções. O app decide o óbvio e reversível, sugere o provável e nunca decide o que só a Valeria sabe ou o que tira coisas de circulação |
| "Fechar dias pendentes" no lugar do "botão de pânico" | Nome descritivo, a pedido da Valeria. Aplica a auto-triagem a todos os dias pendentes; as tarefas voltam à lista de ativas sem data, para não virar uma pilha no dia do retorno |
| Google Agenda com integração só de ida, numa fase futura | Migrar marca o compromisso como migrado, que conta como concluído. Basta guardar o status e o identificador do evento; o app continua sendo a fonte da verdade. Enquanto o app for local-only, a migração é só manual |
| Assistentes de limpeza (`ASSISTENTES.md`) | Mesma mecânica do checkout em lote, para colocar ordem na casa sem esforço. Viram um componente genérico no código. O mural ficou de fora porque os lembretes dele não vencem |
| Sem notificações: lembretes reaparecem dentro do app (contador na aba e faixa discreta na nota do dia) | A Valeria tem receio de que lembretes virem paisagem e sejam ignorados. Avisos passivos, no momento em que ela já está no app, e lembretes ignorados viram pergunta no checkout |

## Pendências

- [ ] Fazer o rascunho da tela de checkout do 1a. É a tela que prova a hipótese do app e ainda não tem desenho.
- [ ] Fazer uma versão enxuta do rascunho da nota do dia e do prompt do Stitch, só com o 1a. Os atuais mostram itens do 1b.
- [x] Escrever um parágrafo de abertura para a spec. A introdução foi removida, e o texto começa direto em "Princípios".
- [ ] Responder às perguntas que restam no "Em aberto" de cada seção e de `AUTO-TRIAGEM.md` e `ASSISTENTES.md`.
- [ ] Decidir se a métrica mensal conta "blocos" ou "tarefas" sem projeto. Só tarefas e compromissos se vinculam a projetos.
- [ ] Escolher o nome definitivo do campo "motivação".

* [x] Confirmar as recomendações de arquitetura que ainda não foram respondidas: guardar um histórico de eventos (cada mudança com data e hora), e não só o estado atual; um registro por bloco no Firestore, para evitar conflitos entre celular e web; cada bloco existe uma vez só, com vínculos, e não cópias. Confirmar também que o app é só para uma pessoa.
* [ ] Decidir como a reflexão semanal sugere projetos: o app propõe grupos (com IA), eu agrupo as tarefas soltas, ou o app sugere converter os títulos de quadro branco que se repetiram na semana.

## Riscos levantados

- O retorno depois de uma ausência. Itens acumulam e os contadores de adiamento sobem, então quem some por duas semanas volta para uma pilha. A resposta é o "Fechar dias pendentes", que aplica a auto-triagem a todos os dias pendentes e devolve as tarefas não feitas à lista de ativas, sem data.
- As métricas medem só falha: adiamentos, precisão e desconexão. Falta ao menos uma de progresso em destaque, como tarefas executadas.
- O editor de blocos é a parte mais cara de construir. A detecção automática de tipo ficou para a seção 5 por isso.
- O escopo tende a crescer a cada rodada de especificação. Uma semana de uso do 1a ensina mais sobre as seções 2 a 6 do que novas perguntas.

## Materiais fora do documento

- `nota-do-dia-rascunho.png` e `nota-do-dia-rascunho.html`: rascunho da tela da nota do dia, entregue na conversa. A Valeria tem as cópias baixadas. Ele mostra o 1a e o 1b juntos, e os ícones são marcadores de posição.
- A Valeria vai continuar o design no Stitch (stitch.withgoogle.com), com a imagem e o prompt abaixo.

```
App web de produtividade pessoal, para uso individual no navegador (desktop) e no Android. A tela é a "nota do dia": onde a usuária captura tudo ao longo do dia, sem decidir onde guardar, e faz a triagem só no fim do dia.

Use a imagem anexa como referência de layout. Todo o texto da interface é em português do Brasil.

Estrutura da tela, de cima para baixo:
1. Barra superior: ícone de menu lateral à esquerda; data do dia ao centro, com setas para paginar entre dias que ainda têm itens pendentes; botão "Fazer checkout" à direita.
2. Faixa de aviso discreta, que só aparece quando o checkout de um dia anterior está pendente, com a ação "Fazer agora". Ela avisa, não bloqueia.
3. Bloco "Prioridades do dia", fixado no topo ao rolar: até 3 tarefas. Uma tarefa no dia do prazo máximo ganha uma etiqueta "prazo máximo hoje". Tarefas concluídas aparecem riscadas.
4. Corpo da nota: seções empilhadas, como células de um notebook do Colab. Cada seção tem uma linha de cabeçalho discreta com tipo (Geral ou Reunião), horário de criação e título opcional. A seção de reunião tem ainda participantes e link para documentos, opcionais, e uma barra lateral de cor diferente.
5. Dentro de cada seção: parágrafos de texto livre e tarefas misturados, na ordem em que foram escritos. A tarefa é uma linha com checkbox. No hover, a tarefa mostra três ações: definir data de intenção, definir prazo máximo, promover a prioridade.
6. Entre as seções e no fim da página: botões para abrir uma nova "Seção geral" ou "Seção de reunião".

Estilo: minimalista e calmo, parecido com um editor de texto (Notion, Obsidian). Muito espaço em branco, fundo claro, bordas finas, sem sombras nem gradientes, uma única cor de destaque. A escrita é o centro da tela; os controles são discretos.
```

## Como trabalhamos

- A Valeria responde às perguntas em lista numerada no chat, ou como itens aninhados sob cada pergunta do "Em aberto". O agente acopla a resposta no texto da seção e remove a pergunta respondida.
- As perguntas abertas ficam no início de cada seção, em forma de checklist.
- Ela edita o documento diretamente entre uma mensagem e outra. Releia antes de editar e preserve o que ela escreveu.
- A spec é escrita em primeira pessoa ("eu posso..."), em português do Brasil, e mantém a voz dela, como em "triga" e "plim".
- Quando ela pergunta o que o agente acha do app, quer uma avaliação franca, com os riscos.
