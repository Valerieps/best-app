# Avaliação de efetividade: o app resolve a dor da coleta?

Oct 14, 2026 · análise feita com o Claude Code

Avaliação do app considerando só a efetividade em resolver o problema que ele ataca, para trabalhadoras de escritório com alta carga de coleta. Não considera potencial comercial.

- **Entra aqui:** a avaliação de 14/10/2026, do jeito que foi feita, com base na spec e no `ROADMAP.md` dessa data.
- **Não entra aqui:** regras (`spec/`), progresso (`ROADMAP.md`) e pedidos de funcionalidade (issues com `t:enhancement`). Este relatório é uma fotografia: não é atualizado. O que for decidido a partir dele vai para a casa certa.

## Resumo

O app resolve muito bem metade da dor: capturar sem atrito e fechar o dia sem pontas soltas. A outra metade fica descoberta: dar conta do que foi capturado e reencontrar depois. Para quem coleta muito no escritório, essa segunda metade é onde as coisas de fato se perdem.

## O que é a dor, de verdade

Para quem tem alta carga de coleta, a dor tem cinco partes:

1. **Capturar no meio da interrupção** (reunião, mensagem, pedido de corredor) sem perder o fio.
2. **Não decidir onde guardar** na hora, porque isso gasta energia e atrapalha a captura.
3. **Não deixar nada cair**, principalmente o que foi prometido em reunião.
4. **Fechar o dia com a cabeça vazia**, sem a sensação de que algo ficou solto.
5. **Reencontrar depois** ("onde anotei aquilo que o fulano disse?").

## Onde o app é forte

| Parte da dor | Como o app resolve | Avaliação |
| --- | --- | --- |
| 2. Não decidir onde guardar | Uma única nota do dia; `[] ` vira tarefa; uma seção por reunião serve de pré-triagem leve | **Excelente.** É o núcleo da tese e está bem executado |
| 4. Fechar o dia | Checkout com destino para tudo e "finalizar meu dia" | **Muito bom.** Há boa base em pesquisa: fazer um plano concreto para o que ficou pendente reduz os pensamentos intrusivos sobre isso. O checkout faz exatamente esse plano |
| Custo do ritual | Checkout em lote, auto-triagem, "Aceitar sugestões" | **Muito bom.** Um checkout sem isso morreria na primeira semana pesada |
| Voltar depois de faltar | "Fechar dias pendentes", com as tarefas voltando sem data em vez de virarem uma pilha | **Bom.** É raro e importante: a maioria dos sistemas morre na volta das férias |
| Confiança | Avisa em vez de bloquear, nada some sozinho, backup automático | **Bom.** Sem confiança, a pessoa volta para o papel |

## Onde ele deixa a dor sem resposta

1. **Não há lista de "aguardando" (o que os outros me devem).** Para quem sai de reunião em reunião, boa parte da coleta é "fulano vai me mandar X" ou "pedi Y para a equipe Z". O app só tem os destinos tarefa (minha) e nota (referência). O compromisso de outra pessoa vira uma nota que vai para a wiki e é esquecida, ou uma tarefa falsa que é adiada todo dia e infla o contador de adiamentos. A spec não trata disso. É a maior lacuna para esse público.

2. **O planejamento do dia seguinte ignora o tempo disponível.** Escolho as tarefas de amanhã sem ver que amanhã tenho 6 horas de reunião. Os compromissos (fase 5) estão bloqueados e não há estimativa de esforço. O resultado previsível é planejar demais, adiar sempre e sentir culpa. O app *mede* isso (adiamentos, precisão da intenção), mas não *previne*. Um simples "quantas horas livres eu tenho amanhã?" no planejamento já ajudaria.

3. **A captura só acontece dentro da aba do app.** Muita coleta chega por e-mail, Teams/Slack, telefone e corredor. Sem atalho global nem captura rápida, e sem ponte com o celular, o atrito volta no exato momento em que a interrupção acontece. Para quem já vive com o app aberto num monitor, o problema é pequeno. Para quem alterna muito entre telas, é grande.

4. **Reencontrar o que foi guardado é o elo fraco.** No checkout, o destino padrão das notas é "mover para a wiki", e eu só aceito. Com o tempo, a wiki vira um depósito cronológico. Busca textual e visão por projeto ajudam, mas a pergunta típica é por *pessoa* ("o que combinei com a Ana?"), e os participantes de reunião existem como campo sem ser um eixo de busca. Se reencontrar falhar, a confiança na captura cai, e a pessoa volta a anotar em outro lugar "por garantia".

5. **O custo do checkout cresce com o volume.** Num dia com 40 a 60 itens, às 18h e cansada, mesmo em lote o checkout pode virar "aceitar tudo para amanhã". A auto-triagem empurra justamente para isso, porque "dia seguinte" vem pré-selecionado. O checkout corre o risco de virar um adiamento com cerimônia. O destaque depois de 3 adiamentos é a defesa certa, mas chega tarde.

6. **Os rituais de cima competem com a dor de baixo.** As revisões de Foco e Rumo, os objetivos, os hábitos e o raio-x são interessantes, mas não atacam a dor da coleta. Para esse público, cada camada a mais é risco de abandono. Esconder objetivos e hábitos (ADR-041) foi a decisão certa; vale manter essa disciplina.

## Como saber se está funcionando

O app já grava tudo o que é preciso para medir a própria efetividade, sem telemetria. Quatro números para acompanhar:

- **% de dias com checkout finalizado.** É a métrica principal: se cair, o resto não importa.
- **Taxa de rolagem:** quantas tarefas vão para "dia seguinte" em cada checkout, e se isso cresce com o tempo.
- **Idade das tarefas ativas:** uma lista que só cresce indica que o sistema virou um depósito.
- **Quantas vezes a wiki é aberta ou buscada.** Se ninguém nunca volta às notas, o destino "wiki" é só um lixo bonito.

Com 3 a 5 colegas de perfil parecido usando por 2 semanas, esses números respondem a pergunta melhor que qualquer análise.

## Veredito

| Parte da dor | Nota |
| --- | --- |
| Capturar sem decidir | 9/10 |
| Fechar o dia | 8/10 |
| Não deixar nada cair | 5/10, por causa do "aguardando" e da falta de captura fora da aba |
| Planejar de forma realista | 4/10, porque o tempo disponível não aparece |
| Reencontrar depois | 5/10 |

O núcleo está certo, e é melhor que o da maioria dos apps do mercado para esse problema específico. O caminho de maior impacto não está nas fases 4 a 6. Está em três adições pequenas no ciclo diário:

1. Um destino "aguardando" no checkout.
2. As horas livres no planejamento do dia seguinte.
3. A busca por pessoa na wiki.
