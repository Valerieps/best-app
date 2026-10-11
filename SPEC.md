# O melhor app de produtividade que você já viu

Oct 4, 2026 · @Valerie

## Princípios

- O app sempre avisa em vez de bloquear.
- Sempre dá para criar ou editar qualquer coisa fora dos rituais. Os rituais existem apenas para garantir que isso será feito em alguma hora.
- Qualquer ritual pode ser acionado a qualquer hora, independente dos agendamentos.

## Primeiro uso

Não há onboarding: no primeiro uso eu já saio usando o ciclo diário, e os rituais e conceitos entram aos poucos.

- Primeiros dias: nota do dia, checkout e planejamento do dia seguinte, sem projetos nem objetivos.
- Primeira reflexão semanal: o app sugere agregar tarefas em projetos e definir o checklist de warm up.
- Primeira reflexão mensal: o app sugere objetivos, a partir dos projetos que já existem.

## Decisões técnicas

- O app roda na web e no Android, como um único web app instalável (PWA).
- Os dados ficam em nuvem, para manter tudo sincronizado entre os aparelhos.
- O backend é o Firebase (Firestore, login e sincronização), que eu já uso em outro app.
- O Firestore permite usar o app sem internet: o que eu escrevo sem conexão fica no aparelho e sincroniza quando ela volta.
- O Firestore não faz consultas relacionais, então as métricas são calculadas no próprio app, a partir do histórico. O volume de dados de uma pessoa só é pequeno o bastante para isso.

## 1a. Ciclo diário: núcleo

O núcleo tem só o necessário para testar a hipótese do app: capturar sem decidir e triar no checkout. São três telas (nota do dia, checkout e listas), e nesta entrega o app roda na web, com login e sincronização. O banco de dados já guarda tudo o que o 1b e as seções seguintes vão usar (datas, adiamentos, seção de origem, log de execução), mesmo sem tela para isso.

### Blocos e notas

- Blocos ∈ notas semânticas: notas são agrupamentos de blocos, e um bloco pode aparecer em mais de uma nota.
- A nota do dia é um agrupamento de blocos que só existe enquanto houver blocos vinculados a ela. Depois do checkout completo, ela desaparece.
- A nota do dia é dividida em seções, como um notebook do Colab. Há dois tipos de seção: geral e reunião.
- Ao longo do dia, se eu entrar em reunião, abro uma seção de reunião para deixar separadas as notas que tomei naquela reunião.
- Toda seção guarda o horário de criação como metadado e pode ter um título opcional.
- É possível abrir mais de uma seção geral. Separar o conteúdo em seções ao longo do dia funciona como uma pré-triagem.
- Há dois tipos de bloco: tarefa e nota geral. Uma linha que começa com `[]` seguido de um espaço é tarefa, em qualquer tipo de seção; todo o resto é nota geral.
- A wiki pessoal, para onde vão as notas gerais, é interna ao app. No núcleo, ela é uma lista em ordem cronológica.

### Tarefas

- Tarefas que ainda não foram finalizadas, arquivadas ou abandonadas moram na lista de tarefas ativas. É dela que eu escolho as tarefas no planejamento do dia seguinte.
- Toda tarefa guarda o vínculo com a seção em que foi originalmente criada, com o título e o horário da seção.
- A tarefa tem uma data de intenção de execução, definida no checkout. Definir essa data é escolher o dia em que a tarefa aparece na nota do dia. Quando a data chega, a tarefa aparece sozinha na nota daquele dia.
- Conta como adiamento toda mudança da data de intenção para depois, e também a tarefa que passa pelo checkout sem ter sido feita no dia da intenção.
- O app guarda stats de quantos adiamentos e da distância entre a primeira intenção de execução e a ação final (finalizar, arquivar, abandonar).

### Execução

- Interface: uma página parecida com uma nota do Obsidian ou Notion, ou seja, como se fosse um arquivo de texto, mas com blocos estruturados de conteúdo.
- O dia abre com uma seção geral já criada. As tarefas com data de intenção para aquele dia, incluindo as escolhidas no checkout do dia anterior, entram no topo dela, sem distinção visual das tarefas criadas no dia.
- Ao longo do dia eu vou coletando tudo em uma única nota, de forma sequencial, como um bloco de notas. A ideia é não gastar processamento mental escolhendo onde salvar cada coisa.
- Cada tarefa tem um checkbox para finalizar.
- Se eu abrir o app sem ter feito o checkout do dia anterior, a nota de hoje abre normalmente, com um aviso no topo e um botão para fazer o checkout pendente.
- Um menu lateral simples dá acesso a três listas: tarefas ativas, tarefas arquivadas e wiki pessoal.
- No final do dia, eu clico em "fazer checkout".

### Checkout

- O dia só vira depois da meia-noite.
- O checkout pode ser feito antes de o dia terminar e mais de uma vez por dia. Ao fim dele, eu posso continuar o mesmo dia normalmente. Se eu adicionar itens depois do checkout, ele volta a ficar pendente.
- Em qualquer seção, geral ou de reunião, todas as notas são triadas como um bloco só, e as tarefas são triadas separadamente, como qualquer outra tarefa. O destino das notas de reunião é o mesmo das notas gerais.
- Um checkout é considerado finalizado quando o dia termina sem nenhum item pendente para triagem.

Tudo o que foi coletado naquele dia precisa de destino, e cada tipo de bloco tem os seus:

| Tipo de bloco | Destino no checkout |
| --- | --- |
| Tarefa | Finalizar; arquivar; abandonar; alterar data de intenção de execução (atalho para mover para o dia seguinte) |
| Notas de uma seção (geral ou de reunião) | Mover para a wiki pessoal; descartar |

- Finalizar significa que eu engajei com a tarefa, e gera um log de execução histórica, com os dados necessários para calcular métricas até o nível mensal. Tarefas podem ser finalizadas a qualquer momento e, depois disso, não passam mais por triagens.
- Arquivar move a tarefa para uma lista de tarefas que podem ser reativadas depois; ela deixa de aparecer entre as tarefas que podem ser escolhidas para um dia.
- Abandonar apaga a tarefa sem que ela tenha sido realizada, e não gera logs.
- Depois da triagem, eu faço o planejamento do dia seguinte: escolho, na lista de tarefas ativas, as que vão constar na próxima nota do dia.
- Quando tudo for triado, aparece o botão "finalizar meu dia" com sonzinho de "plim" e uma rápida animação de fogos de artifício.

## 1b. Ciclo diário: acabamento

Estes itens já estão decididos e entram depois de uma semana de uso do núcleo.

### Seções e tarefas

- A seção de reunião ganha dois campos opcionais: participantes e link para documentos.
- Eu posso interagir com cada tipo de bloco com atalhos que aparecem com mouse hover. Na tarefa: finalizar, definir a data de intenção e o prazo máximo, e promover a prioridade. Na nota geral: converter em tarefa.
- A tarefa ganha uma segunda data, o prazo máximo, que é opcional.
- O vínculo da tarefa com a seção de origem vira um link clicável quando as notas dela foram para a wiki pessoal; se foram descartadas, a tarefa ainda mostra de onde veio.

### Prioridades do dia

- Data de intenção é diferente de prioridade: as prioridades são um destaque dentro das tarefas do dia.
- As 3 prioridades do dia são sempre tarefas, e a qualquer momento uma tarefa pode ser promovida a prioridade do dia. A tarefa priorizada aparece nos dois lugares: no bloco de prioridades e na seção em que está. O bloco de prioridades pode ser fixado no topo, para não sumir quando eu rolar a nota.
- No dia do prazo máximo, a tarefa se torna prioridade automaticamente. Se as 3 prioridades do dia já estiverem definidas, ela ocupa o lugar da terceira, sem criar uma quarta.
- A lista pode estar vazia: no primeiro uso, quando o checkout do dia anterior não foi feito, ou quando as 3 prioridades já foram completadas.

### Navegação e plataforma

- No topo da nota do dia, onde aparece a data, um botão de setinha pagina entre os dias. Ele passa somente pelas notas que ainda têm itens pendentes.
- A wiki pessoal pode ser ordenada por linha temporal ou por ordem alfabética e tem um campo de busca textual.
- O app pode ser instalado no Android como PWA.

## 2. Semana e projetos

Esta parte acrescenta os projetos, que agrupam tarefas, e a reflexão semanal, que fecha a semana e define as prioridades da seguinte.

### Em aberto

- [ ] Como funciona a sugestão de agregar tarefas em projetos: o app propõe os grupos ou eu agrupo manualmente?
- [ ] Quantas prioridades a semana tem: 3, como o dia?
- [ ] Quais outras métricas entram no report semanal, além das três listadas?

### Projetos

- Um projeto é uma coleção de tarefas que fazem sentido juntas.
- Uma tarefa pode existir sem projeto e se vincula a no máximo um projeto.
- Projetos só são finalizados manualmente: eu abro o projeto e finalizo.

### O que muda no checkout

- Tarefas ganham o destino "vincular a um projeto (opcional)". Esse vínculo serve de cold start para os projetos e objetivos da reflexão mensal.
- Se eu estiver indecisa sobre algum bloco, eu posso escolher "decidir na reflexão semanal". Não há limite para isso.
- No planejamento do dia seguinte, eu posso puxar uma prioridade da semana.

### Flow de Reflexão Semanal

A reflexão semanal é disparada por um agendamento pré-definido por mim ou manualmente.

1. Triagem do que foi movido para cá, com a mesma rotina do checkout diário
2. Revisita das tarefas arquivadas, que podem ser reativadas
3. Sugestão de agregar tarefas em projetos, apresentada pela primeira vez na primeira reflexão semanal
4. Report de métricas:
   - quantas tarefas adiadas
   - precisão da data de intenção de execução: realizar a tarefa no dia da intenção, independente de quantos adiamentos. O objetivo é estimular adiamentos e abandonos intencionais
   - tarefas executadas
5. Melhores momentos e o que pode melhorar: textos livres vinculados à semana avaliada
6. Definição de prioridades da próxima semana
7. Clicar em "Fechar Semana"

### Prioridades da semana

- As prioridades da semana são sempre tarefas e formam uma lista separada das prioridades do dia.
- Na reflexão semanal ou no checkout, eu posso puxar uma prioridade da semana para o dia seguinte.

## 3. Abertura do dia e ausências

Esta parte acrescenta o warm up e o dashboard, que abrem o dia, e define o que acontece quando um ritual é pulado.

### Em aberto

- [ ] Como chega o "perguntar de novo às XXh" (notificação, aviso dentro do app) e o que acontece se o dia acabar sem resposta?
- [ ] Onde eu crio e edito os lembretes do mural?
- [ ] Checkout pendente do dia anterior bloqueia o "Iniciar o Flow de Execução" ou é só um botão a mais? E se houver vários dias pendentes?
- [ ] O que o "botão de pânico" faz, e qual será o nome definitivo dele?

### Warm up

- O app abre em uma tela branca com o botão "Iniciar Dia", que triga a rotina de warm up.
- O checklist de warm up é definido manualmente por mim. Isso pode ser feito a qualquer momento ou sugerido na primeira reflexão semanal.
- O que eu não quero realizar agora, eu posso "pular hoje" ou "perguntar de novo às XXh".
- Ao terminar o warm up, o app segue para o dashboard.
- Se eu reabrir o app depois de já ter iniciado o dia, caio na nota do dia.

### Dashboard

A tela de boas-vindas mostra:

- a lista das 3 prioridades da semana
- um mural com lembretes de mim para mim mesma (tipo frases mesmo)
- o botão "Iniciar o Flow de Execução", o mais proeminente
- botão de ação opcional: registrar pensamentos (entram em uma seção geral da nota do dia)
- o botão de checkout, caso ele não tenha sido feito no dia anterior

### Rituais pulados

Pular um ritual não bloqueia o app, e qualquer ritual pode ser acionado depois, a qualquer hora.

| O que foi pulado | O que acontece |
| --- | --- |
| Item do warm up | Posso "pular hoje" ou pedir para "perguntar de novo às XXh" |
| Checkout do dia anterior | O dashboard mostra o botão de checkout, e o dia pode começar sem prioridades |
| Dias não ativos | Não contam como pulados: eu configuro os dias ativos e, na sexta-feira, por exemplo, o dia seguinte é a segunda |
| Vários dias úteis sem abrir o app | Aparece a sugestão do "botão de pânico" (nome provisório: a feature precisa de um nome mais gentil). O comportamento dele ainda será definido |
| Reflexão semanal | Os itens não triados acumulam, e o contador de adiamento aumenta de acordo |
| Reflexão mensal | A definir |

## 4. Mês e objetivos

Esta parte acrescenta os objetivos, as prioridades do mês e a reflexão mensal, onde aparece o raio-x da desconexão entre o dia a dia e os objetivos.

### Em aberto

- [ ] O que acontece se eu pular a reflexão de um mês?
- [ ] Como se mede "objetivos com pouco engajamento"?
- [ ] Qual será o nome definitivo do campo "motivação"?

### Objetivos

- Um objetivo é composto de uma meta, uma motivação, projetos e recursos.
- Uma meta é apenas uma frase que eu decido se eu atingi ou não.
- Motivação é um campo descritivo do objetivo: o que me faz querer engajar com aquilo tudo (nome provisório).
- Recursos são pensamentos, anotações e links que dão suporte a um objetivo ou projeto.
- Um projeto pode existir sem objetivo e se vincula a no máximo um objetivo.
- Projetos sem objetivo não são proibidos: viram métrica na reflexão mensal.
- Objetivos só são finalizados manualmente: eu abro o objetivo e finalizo.
- No checkout, as notas de uma seção ganham o destino "vincular a um objetivo ou projeto como recurso".

### Prioridades do mês

- As prioridades do mês são sempre projetos e formam uma terceira lista, separada das prioridades da semana e do dia.
- Elas são definidas na reflexão mensal ou sempre que necessário.
- Na reflexão semanal, eu posso puxar uma tarefa de um projeto prioritário do mês como prioridade da semana seguinte.
- Exemplo: tenho 3 projetos como prioridades do mês. Na reflexão semanal, puxo uma tarefa de um deles como prioridade da semana seguinte, mas só a puxo como prioridade do dia no checkout da quarta-feira.

### Flow de Reflexão Mensal

Quando um mês termina, aparece a opção de reflexão mensal: um dashboard de objetivos e projetos.

- O app só sugere objetivos aqui: propõe criá-los a partir dos projetos que já existem.
- Projetos ativos e o objetivo associado, em duas visões: objetivo como root, expandindo os projetos; ou projeto como root, expandindo o objetivo associado.
- Posso abrir o projeto para atualizar o andamento dele (milestones talvez).
- Posso finalizar aqui os projetos ativos, se desejar.
- Defino os projetos que serão as prioridades do mês.
- Posso atualizar a lista de projetos e objetivos associados. Projetos podem ficar sem objetivo.
- Métricas possíveis: quantos blocos não estão relacionados a nenhum projeto e quantos projetos não têm objetivo, revelando uma desconexão entre o dia a dia e o futuro desejado; objetivos com pouco engajamento; e quantas prioridades da semana e do dia pertenciam a um projeto prioritário do mês.

## 5. Mais tipos de bloco

Esta parte acrescenta o compromisso como tipo de bloco e a detecção automática do tipo pelo formato do texto.

### Em aberto

- [ ] Quais são os formatos pré-definidos que identificam cada tipo de bloco?
- [ ] Como eu corrijo um bloco que foi detectado com o tipo errado?
- [ ] Com qual agenda externa o app se integra, e o que "mover para a agenda" faz na prática?

### Regras

- Os tipos de bloco passam a ser três: tarefa, compromisso e nota geral.
- O tipo do bloco é detectado de acordo com formatos pré-definidos (por exemplo, `<data: __>` é compromisso). O que não encaixar em nenhum fica como nota geral.
- Compromissos são blocos criados manualmente na nota do dia e ficam guardados no banco de dados do app. Os do dia já constam na nota do dia, junto das tarefas.
- Compromissos, como as tarefas, só se vinculam a projetos.
- A agenda é um app externo.

No checkout, um compromisso pode ser movido para a agenda, marcado como feito, descartado ou vinculado a um projeto (opcional).

## 6. Hábitos

Hábitos ficam para a última fase e se encaixam nos flows que já existem.

### Em aberto

- [ ] O que "agendar lembrete" faz?

### Regras

- Hábitos são ações com recorrência e critério de "feito"; por enquanto, o registro é só sim ou não.
- Um hábito faz parte de um objetivo, mas também pode existir sem objetivo. Hábitos sem objetivo não são proibidos: viram métrica na reflexão mensal.

### Onde entram nos flows

- Dashboard: botão de ação opcional "registrar hábitos (ou agendar lembrete)".
- Checkout: uma tarefa pode ser convertida em hábito.
- Reflexão semanal: o report de métricas mostra a corrente mais longa sem quebrar e o percentual de completude na semana/mês.
- Reflexão mensal: os hábitos aparecem no dashboard junto de objetivos e projetos, expandidos a partir do objetivo ou do projeto associado; posso atualizar a lista de hábitos; e a métrica de desconexão conta quantos hábitos não têm objetivo.
