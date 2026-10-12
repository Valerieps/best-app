# O melhor app de produtividade que você já viu

Oct 4, 2026 · @Valerie

Este é um app pessoal para eu capturar tudo ao longo do dia sem decidir onde guardar, e decidir o destino de cada coisa só no checkout, no fim do dia. Rituais diários, semanais e mensais entram aos poucos e ligam o dia a dia a projetos e objetivos, mostrando onde minha energia está indo e o quanto isso se desconecta do que eu quero. O documento segue a ordem de construção: primeiro o núcleo do ciclo diário, e cada parte seguinte acrescenta um ritual ou conceito.

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

- Nesta primeira fase, o app roda só no Chrome do computador, como um web app instalável (PWA). O Android fica para uma fase posterior.
- Os dados ficam só no navegador (IndexedDB), sem nuvem, login nem conexões externas, por causa das regras de segurança do meu trabalho. As regras estão em `google-safe.md`.
- Como não há sincronização, o app faz backup automático em arquivo: eu escolho o arquivo uma vez, por exemplo numa pasta sincronizada do Google Drive, e o app regrava esse arquivo alguns segundos depois de cada mudança. Também dá para baixar uma cópia e importar um backup a qualquer momento.
- O backup automático nunca grava por cima de um arquivo que tenha dados que o navegador não tem, como quando o Chrome apagou os dados do site ou outro computador salvou dados mais novos no mesmo arquivo. Nesse caso, ele pausa e sugere importar o arquivo.
- O Chrome pode pedir, a cada sessão, autorização para gravar no arquivo. Enquanto eu não autorizo, o backup fica pausado, com um aviso discreto e um botão para retomar.
- Importar um backup substitui todos os dados. Se a importação for apagar alguma coisa, o app mostra um aviso em destaque com o que vai se perder, e eu confirmo. Antes de substituir, o app guarda uma cópia do estado anterior, e eu posso desfazer a importação.
- O app é publicado como arquivos estáticos no Cloudflare Pages, para que outras pessoas também possam usar. Cada pessoa tem os próprios dados no próprio navegador, e nenhum dado passa pelo servidor.
- O app funciona sem internet.
- Não há servidor nem banco relacional, então as métricas são calculadas no próprio app, a partir do histórico. O volume de dados de uma pessoa só é pequeno o bastante para isso.
- O app não envia notificações: os lembretes reaparecem dentro dele.
- O app não tem compartilhamento: quem usa o app só vê os próprios dados, guardados no próprio navegador.
- O app guarda um histórico de eventos: cada mudança (criação, adiamento, finalização, vínculo) com data e hora, e não só o estado atual. Todas as métricas, inclusive as que ainda não existem, saem desse histórico.
- Cada bloco é um registro separado no banco, para evitar conflitos entre abas abertas e para permitir juntar os dados de aparelhos diferentes no futuro.
- Cada bloco existe uma vez só. Notas, projetos e wiki apontam para ele por vínculos, sem cópias.
- A arquitetura é desenhada para o escopo completo da spec, e a implementação segue as partes em ordem.

## Navegação

Toda opção do app mora num de três níveis, e cada nível tem um lugar fixo, para eu saber onde procurar.

### 1. Global: a barra de cima, igual em toda tela

- ☰ abre uma gaveta por cima da tela, só com lugares, em grupos: Hoje (próximos dias); Listas (tarefas ativas, tarefas arquivadas, wiki); Planejamento (projetos, objetivos, hábitos); e, no rodapé, Dados e backup e Configurações.
- "Hoje" volta para a nota do dia de qualquer tela.
- "Rituais" abre a lista dos rituais: checkout de hoje e checkouts pendentes, reflexão semanal, reflexão mensal e "Colocar ordem na casa". Um contador soma os checkouts pendentes e as reflexões disponíveis. Uma reflexão disponível aparece nos dois lugares: no contador e num aviso na nota do dia.
- O status do backup fica sempre visível, como um ponto colorido com um rótulo curto ("Backup 14:32", "Sem backup", "Backup pausado"). Clicar nele abre "Dados e backup". A faixa de backup aparece em todas as telas só enquanto não houver nenhum backup, ou quando o backup estiver bloqueado ou com erro.
- Só um aviso aparece por vez no topo, nesta ordem: backup bloqueado ou com erro, checkout pendente, backup ainda não ativado, reflexão disponível. Quando um some, o próximo aparece. Os lembretes que voltaram ficam fora dessa fila e aparecem sempre, porque são o único sinal deles.
- O aviso de checkout pendente e o de backup não ativado têm "Lembrar depois", que os esconde até o dia seguinte. O contador de "Rituais" continua mostrando os checkouts pendentes. O aviso de backup bloqueado ou com erro não pode ser adiado.

### 2. Da tela: um cabeçalho logo abaixo da barra

- Título à esquerda; à direita, no máximo uma ação principal e um "⋯" com as outras.
- Na nota do dia, o título é a data com as setas entre dias pendentes, a ação principal é "Fazer checkout" daquele dia, e o "⋯" tem "Fixar prioridades". Os botões "+ Seção geral" e "+ Seção de reunião" ficam sempre visíveis no fim da nota, porque abrir seção é parte da captura. As seções seguem a ordem em que foram criadas, então não há botão entre elas. O checkout fica nos dois lugares: em "Rituais" e na nota do dia.
- Os avisos que dizem respeito só àquela tela ficam logo abaixo do cabeçalho dela, como o checkout pendente, a reflexão disponível e os lembretes que voltaram, que aparecem só na nota do dia.
- Nos fluxos (checkout e reflexões), a decisão fica no fim da página, porque eu leio de cima para baixo antes de decidir. O botão de confirmar a triagem se chama "Confirmar decisões".
- A tela "Iniciar Dia" é a única sem barra: é uma tela branca só com um desenho simples de sol e o botão.

### 3. Do item: ações no hover

- Ações de uma linha ou de um item aparecem quando passo o mouse por cima ou quando o cursor está na linha, como data, prazo e prioridade numa tarefa.
- O que já está definido fica visível na própria linha, sem hover: a data de intenção e o prazo viram etiquetas, e clicar numa delas muda a data. A estrela é uma só: cheia, ela marca a prioridade do dia e fica sempre visível; vazia, aparece no hover e promove a tarefa. Finalizar é pelo checkbox, sem botão repetido.
- Uma linha vazia mostra uma dica de como criar tarefa enquanto eu escrevo nela.

## 1a. Ciclo diário: núcleo

O núcleo tem só o necessário para testar a hipótese do app: capturar sem decidir e triar no checkout. São três telas (nota do dia, checkout e listas), e nesta entrega o app roda no Chrome do computador, com os dados no navegador e backup em arquivo. O banco de dados já guarda tudo o que o 1b e as seções seguintes vão usar (datas, adiamentos, seção de origem, log de execução), mesmo sem tela para isso.

### Blocos e notas

- Blocos ∈ notas semânticas: notas são agrupamentos de blocos, e um bloco pode aparecer em mais de uma nota.
- A nota do dia é um agrupamento de blocos que só existe enquanto houver blocos vinculados a ela. Depois do checkout completo, ela desaparece.
- A nota do dia é dividida em seções, como um notebook do Colab. Há dois tipos de seção: geral e reunião.
- Ao longo do dia, se eu entrar em reunião, abro uma seção de reunião para deixar separadas as notas que tomei naquela reunião.
- Toda seção guarda o horário de criação como metadado e pode ter um título opcional. Ao digitar o título, o app sugere os projetos que já existem, como "Data Studios"; escolher um deles vincula a seção ao projeto. Por baixo dos panos, os projetos existem desde o 1a, ainda sem funcionalidades próprias: eles só agrupam as seções, tarefas e notas vinculadas.
- Toda seção nasce como quadro branco, ou seja, sem vínculo com projeto, a menos que eu escolha um projeto ao dar o título. O quadro branco é um estado, não um tipo: uma seção geral ou de reunião pode estar em quadro branco. A qualquer momento, ele pode ser convertido em um projeto novo ou vinculado a um projeto existente.
- É possível abrir mais de uma seção geral. Separar o conteúdo em seções ao longo do dia funciona como uma pré-triagem.
- Há dois tipos de bloco: tarefa e nota geral. Uma linha que começa com `[]` seguido de um espaço é tarefa, em qualquer tipo de seção; todo o resto é nota geral.
- A wiki pessoal, para onde vão as notas gerais, é interna ao app. No núcleo, ela é uma lista em ordem cronológica, em que cada entrada reúne as notas de uma seção, com o título e o horário dela. As notas não moram num lugar só: cada nota também fica ligada ao projeto da seção de onde veio, quando a seção tem um.

### Tarefas

- Tarefas que ainda não foram finalizadas, arquivadas ou abandonadas moram na lista de tarefas ativas. É dela que eu escolho as tarefas no planejamento do dia seguinte.
- Toda tarefa guarda o vínculo com a seção em que foi originalmente criada, com o título e o horário da seção. Se a seção está vinculada a um projeto, a tarefa também fica vinculada a ele.
- A tarefa tem uma data de intenção de execução, definida no checkout. Definir essa data é escolher o dia em que a tarefa aparece na nota do dia. Quando a data chega, a tarefa aparece sozinha na nota daquele dia.
- Conta como adiamento toda mudança da data de intenção para depois, e também a tarefa que passa pelo checkout sem ter sido feita no dia da intenção. Tirar a data de intenção, deixando a tarefa sem data, também conta como adiamento.
- O app guarda stats de quantos adiamentos e da distância entre a primeira intenção de execução e a ação final (finalizar, arquivar, abandonar).

### Execução

- Interface: uma página parecida com uma nota do Obsidian ou Notion, ou seja, como se fosse um arquivo de texto, mas com blocos estruturados de conteúdo.
- O dia abre com uma seção geral já criada. As tarefas com data de intenção para aquele dia, incluindo as escolhidas no checkout do dia anterior, entram no topo dela, sem distinção visual das tarefas criadas no dia.
- Ao longo do dia eu vou coletando tudo em uma única nota, de forma sequencial, como um bloco de notas. A ideia é não gastar processamento mental escolhendo onde salvar cada coisa.
- Cada tarefa tem um checkbox para finalizar.
- Enquanto escrevo, posso apagar uma linha ou tirar o `[]` do começo para mudar o tipo, como num editor de texto, mas só em blocos criados no dia e ainda não triados. Uma tarefa que veio de outro dia não some quando eu apago o texto: para tirá-la de circulação, eu arquivo ou abandono.
- Se eu abrir o app sem ter feito o checkout do dia anterior, a nota de hoje abre normalmente, com um aviso no topo e um botão para fazer o checkout pendente.
- Um menu lateral simples dá acesso a três listas: tarefas ativas, tarefas arquivadas e wiki pessoal.
- No final do dia, eu clico em "fazer checkout".

### Checkout

- O dia só vira depois da meia-noite.
- O checkout pode ser feito antes de o dia terminar e mais de uma vez por dia. Ao fim dele, eu posso continuar o mesmo dia normalmente. Se eu adicionar itens depois do checkout, ele volta a ficar pendente.
- Em qualquer seção, geral ou de reunião, todas as notas são triadas como um bloco só, e as tarefas são triadas separadamente, como qualquer outra tarefa. O destino das notas de reunião é o mesmo das notas gerais. Numa seção vinculada a um projeto, as notas continuam ligadas a ele, e as tarefas chegam à triagem vinculadas ao projeto e com "dia seguinte" pré-selecionado; eu confirmo o destino de cada uma.
- Para cada seção ainda em quadro branco, o checkout oferece uma última chance: converter em projeto, vincular a um projeto existente ou deixar sem vínculo. É um aviso, não um bloqueio: se o dia terminar com a seção em quadro branco, todo o conteúdo dela fica sem vínculo com projeto.
- Um checkout é considerado finalizado quando o dia termina sem nenhum item pendente para triagem.

Tudo o que foi coletado naquele dia precisa de destino, e cada tipo de bloco tem os seus:

| Tipo de bloco | Destino no checkout |
| --- | --- |
| Tarefa | Finalizar; arquivar; abandonar; alterar data de intenção de execução (atalho para mover para o dia seguinte) |
| Notas de uma seção (geral ou de reunião) | Mover para a wiki pessoal; descartar |

O checkout é em lote: o app chega com os destinos já aplicados ou pré-selecionados, e eu aceito as sugestões de uma vez, cuidando só das exceções. As regras estão em `AUTO-TRIAGEM.md`.

- Finalizar significa que eu engajei com a tarefa, e gera um log de execução histórica, com os dados necessários para calcular métricas até o nível mensal. Tarefas podem ser finalizadas a qualquer momento e, depois disso, não passam mais por triagens.
- Arquivar move a tarefa para uma lista de tarefas que podem ser reativadas depois; ela deixa de aparecer entre as tarefas que podem ser escolhidas para um dia.
- Abandonar tira a tarefa de circulação sem que ela tenha sido realizada: ela some de todas as listas e não gera log de execução, mas o histórico de eventos guarda o abandono.
- Descartar tira as notas de circulação da mesma forma: elas não vão para a wiki, e o histórico de eventos guarda o descarte.
- Num checkout atrasado, "dia seguinte" é o dia depois do dia triado, mas nunca antes de hoje.
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
- A lista pode estar vazia: no primeiro uso, quando o checkout do dia anterior não foi feito, ou quando as 3 prioridades já foram completadas. Prioridades finalizadas saem da lista.
- Promover uma tarefa quando as 3 prioridades já estão definidas não é bloqueado: a nova ocupa o lugar da terceira.
- Se mais de uma tarefa tiver o prazo máximo no mesmo dia, cada uma ocupa o lugar da última prioridade escolhida à mão, sem tirar outra que entrou pelo prazo.

### Navegação e plataforma

- No topo da nota do dia, onde aparece a data, um botão de setinha pagina entre os dias. Ele passa somente pelas notas que ainda têm itens pendentes.
- A wiki pessoal pode ser ordenada por linha temporal ou por ordem alfabética e tem um campo de busca textual. As notas também podem ser vistas por tipo ou por projeto vinculado.
- O app pode ser instalado no computador como PWA. A instalação no Android fica para a fase do Android.

### Próximos dias

- Uma tela mostra as tarefas agendadas para hoje e para os 2 próximos dias ativos, uma lista por dia, na ordem dos dias. Entram as tarefas ativas cuja data de intenção é um desses dias.
- Os dias inativos das configurações são pulados na contagem, como no "dia seguinte" do checkout: numa sexta, a tela mostra sexta, segunda e terça. Uma tarefa agendada para um dia inativo dentro desse intervalo aparece mesmo assim, no dia dela.
- Nas tarefas, eu tenho as mesmas ações da nota do dia: finalizar pelo checkbox e, no hover, mudar a data de intenção e o prazo e promover a prioridade do dia. Uma tarefa cuja data muda vai para o dia novo, ou sai da tela se o dia novo ficar fora dela.
- A tela abre pelo menu da esquerda, no grupo Hoje, no lugar da nota do dia. A nota do dia continua no botão "Hoje" da barra de cima.

## 2. Semana e projetos

Esta parte acrescenta os projetos, que agrupam tarefas, e a reflexão semanal, que fecha a semana e define as prioridades da seguinte.

### Em aberto

- [ ] Como funciona a sugestão de agregar tarefas em projetos: o app propõe os grupos ou eu agrupo manualmente?
- [ ] Quantas prioridades a semana tem: 3, como o dia?
- [ ] Quais outras métricas entram no report semanal, além das três listadas?

### Projetos

- Um projeto é uma coleção de tarefas que fazem sentido juntas. Os projetos já existem por baixo dos panos desde o 1a, criados a partir de seções em quadro branco convertidas; esta parte dá a eles funcionalidades próprias.
- Uma tarefa pode existir sem projeto e se vincula a no máximo um projeto.
- Projetos só são finalizados manualmente: eu abro o projeto e finalizo.
- Posso criar uma tarefa direto na página do projeto; ela já nasce vinculada a ele. Ela nasce ativa e sem data, e fica só no projeto: não entra na nota do dia de hoje nem no checkout. Ela só aparece numa nota do dia quando eu der a ela uma data de intenção, como qualquer tarefa. Assim eu monto o backlog do projeto sem precisar triar cada item no fim do dia.
- Cada projeto tem um ícone, que eu escolho numa coleção de ícones estilizados do app. Enquanto eu não escolho, o projeto mostra a inicial do nome.
- A lista de projetos é onde eu acompanho os projetos; a página do projeto é onde eu executo. Métricas e visualizações de acompanhamento ficam na lista, e a página do projeto fica focada nas tarefas.
- A lista de projetos mostra os projetos prioritários em cards, lado a lado, e os outros projetos ativos numa lista com contador, que eu posso recolher. Os projetos finalizados ficam num grupo recolhido. O app lembra se deixei cada grupo aberto ou fechado.
- Cada projeto ativo mostra na lista um mapa de atividade por dia, no estilo do GitHub: 16 semanas nos cards dos prioritários e 8 semanas nas linhas dos outros. A intensidade da cor indica quanto aconteceu no dia. Não há contagem de dias seguidos.
- Atividade num projeto é qualquer uma destas coisas: tarefa criada, tarefa finalizada, nota escrita ou seção aberta vinculada a ele.
- Junto do mapa, a lista mostra quantas tarefas estão ativas e travadas, quantas eu finalizei nas últimas 2 semanas, o objetivo e quando foi a última atividade.
- A lista não mostra progresso em fração do total ("4 de 10"), porque eu nem sempre sei todas as tarefas que vão compor o projeto. O mapa de atividade mostra o ritmo no lugar.
- Um projeto ativo está parado quando passa 14 dias sem nenhuma atividade. A lista mostra "Parado há N dias", e o grupo dos outros ativos mostra quantos estão parados mesmo quando está recolhido.
- Uma tarefa de projeto está travada quando foi adiada 3 vezes ou mais, ou quando a data de intenção já passou e ela continua ativa.
- Na página do projeto, as tarefas aparecem em quatro grupos, do mais para o menos destacado: travadas, com o motivo e a ação de dar uma nova data à vista; próximos dias, como uma pequena agenda; sem data, mais discretas e num grupo que eu posso recolher; e feitas, recolhidas.
- Na página do projeto, o objetivo, o status, o número de seções e os recursos ficam numa coluna lateral, que eu posso deixar recolhida ou fixada. A escolha vale para todos os projetos.
- Posso vincular o objetivo, adicionar o projeto aos prioritários da semana (enquanto houver vaga) e finalizar o projeto tanto pela lista quanto pela página do projeto.
- Para dar uma data de intenção a uma tarefa do projeto, uso o calendário, como em qualquer tarefa. Não há arrastar e soltar.

### O que muda no checkout

- Tarefas ganham o destino "vincular a um projeto (opcional)". Esse vínculo serve de cold start para os projetos e objetivos da reflexão mensal.
- Se eu estiver indecisa sobre algum bloco, eu posso escolher "decidir na reflexão semanal". Não há limite para isso.
- No planejamento do dia seguinte, eu posso puxar uma prioridade da semana.

### Flow de Reflexão Semanal

A reflexão semanal é disparada por um agendamento pré-definido por mim ou manualmente. A semana vai de segunda a domingo. No horário agendado, um aviso aparece na nota do dia até a semana ser fechada. Uma reflexão feita de segunda a quarta avalia a semana que acabou; de quinta em diante, a semana atual.

1. Triagem do que foi movido para cá, com a mesma rotina do checkout diário
2. Revisita das tarefas arquivadas, que podem ser reativadas
3. Sugestão de agregar tarefas em projetos, apresentada pela primeira vez na primeira reflexão semanal
4. Report de métricas:
   - quantas tarefas adiadas: cada tarefa conta uma vez, mesmo que tenha sido adiada várias vezes na semana
   - precisão da data de intenção de execução: realizar a tarefa no dia da intenção, independente de quantos adiamentos. O objetivo é estimular adiamentos e abandonos intencionais. Entram na conta só as tarefas finalizadas que tinham data de intenção
   - tarefas executadas
5. Melhores momentos e o que pode melhorar: textos livres vinculados à semana avaliada
6. Definição dos projetos prioritários e das tarefas prioritárias da próxima semana
7. Clicar em "Fechar Semana"

### Prioridades da semana

- As prioridades da semana são sempre tarefas e formam uma lista separada das prioridades do dia.
- Na reflexão semanal ou no checkout, eu posso puxar uma prioridade da semana para o dia seguinte.

### Projetos prioritários da semana

- Os projetos prioritários da semana são até 3 projetos e formam uma lista separada das tarefas prioritárias da semana e do dia.
- Eu os defino na reflexão semanal. Fora dela, posso adicionar um projeto à lista a qualquer momento, enquanto houver vaga, pela lista de projetos ou pela página do projeto. Trocar ou tirar um projeto da lista só é possível na reflexão semanal.
- Se a reflexão já definiu os prioritários da semana seguinte e eu adiciono um projeto numa vaga da semana atual, ele também entra na lista da semana seguinte, se lá houver vaga.
- Finalizar um projeto prioritário tira o projeto da lista e libera a vaga. Reabrir o projeto não o devolve à lista; se eu quiser, adiciono de novo enquanto houver vaga.
- Ao fechar a semana, os projetos prioritários continuam na semana seguinte, a menos que eu os troque na reflexão.
- Na reflexão semanal, eu posso puxar uma tarefa de um projeto prioritário como prioridade da semana seguinte.
- Exemplo: tenho 3 projetos prioritários. Na reflexão semanal, puxo uma tarefa de um deles como prioridade da semana seguinte, mas só a puxo como prioridade do dia no checkout da quarta-feira.

## 3. Abertura do dia e ausências

Esta parte acrescenta o warm up e o dashboard, que abrem o dia, e define o que acontece quando um ritual é pulado.

### Em aberto

- [ ] Onde eu crio e edito os lembretes do mural?
- [ ] Checkout pendente do dia anterior bloqueia o "Iniciar o Flow de Execução" ou é só um botão a mais? E se houver vários dias pendentes?

### Warm up

- O app abre em uma tela branca com o botão "Iniciar Dia", que triga a rotina de warm up. Enquanto o checklist de warm up estiver vazio, o app pula essa tela e o warm up.
- O checklist de warm up é definido manualmente por mim. Isso pode ser feito a qualquer momento ou sugerido na primeira reflexão semanal.
- O que eu não quero realizar agora, eu posso "pular hoje" ou "perguntar de novo às XXh".
- Ao terminar o warm up, o app segue para o dashboard, se ele tiver o que mostrar (veja "Dashboard"); senão, segue para a nota do dia.
- Se eu reabrir o app depois de já ter iniciado o dia, caio na nota do dia.

### Dashboard

O dashboard aparece na abertura do dia quando há pelo menos um destes: checklist de warm up, frases no mural ou prioridades da semana. Sem nenhum deles, o app abre direto na nota do dia, como nas primeiras semanas de uso: o dashboard não aparece só para oferecer "registrar pensamentos", "registrar hábitos" ou o checkout pendente.

A tela de boas-vindas mostra:

- a lista das 3 prioridades da semana
- um mural com lembretes de mim para mim mesma (tipo frases mesmo). Ele mostra uma frase por vez, em rodízio. Aparecem no máximo 2 frases diferentes por dia: uma ao abrir o app, que é trocada às 13h. Cada frase tem uma frequência, baixa, média ou alta, em proporção: para cada vez que uma frase de frequência baixa aparece, uma média aparece 2 vezes e uma alta, 4. O rodízio segue uma ordem que respeita essas proporções, em vez de sorteio, para evitar que a mesma frase se repita seguidamente
- o botão "Iniciar o Flow de Execução", o mais proeminente
- botão de ação opcional: registrar pensamentos (entram em uma seção geral nova da nota do dia, com o título "Pensamentos", uma nota por linha)
- o botão de checkout, caso ele não tenha sido feito no dia anterior

### Lembretes

- Lembretes tendem a virar paisagem, então o app não envia notificações. Um lembrete é um item que reaparece dentro do app depois do horário pedido, como no "perguntar de novo às XXh" do warm up.
- No desktop, com a aba do app aberta em segundo plano, o título da aba ganha um contador e o ícone ganha um ponto, sem som nem pop-up. Se o app estiver instalado no computador (Windows ou macOS), o mesmo contador pode aparecer no ícone da barra de tarefas.
- Ao voltar para o app, uma faixa discreta no topo da nota do dia mostra o que voltou, com três ações: feito, mais tarde e largar. Ela não cobre o texto. No Android, essa faixa é o único sinal: lá, o ícone de um app instalado pelo navegador só ganha um ponto quando há notificações, e o app não envia notificações.
- Se eu ignorar a faixa, ela continua ali até o checkout, onde o item vira pergunta: manter, mudar ou largar. "Manter" vem pré-selecionado, porque largar tira o item de circulação.
- Um lembrete de warm up marcado como feito marca o item como feito naquele dia.

### Rituais pulados

Pular um ritual não bloqueia o app, e qualquer ritual pode ser acionado depois, a qualquer hora.

| O que foi pulado | O que acontece |
| --- | --- |
| Item do warm up | Posso "pular hoje" ou pedir para "perguntar de novo às XXh" |
| Checkout do dia anterior | O dashboard mostra o botão de checkout, e o dia pode começar sem prioridades |
| Dias não ativos | Não contam como pulados: eu configuro os dias ativos e, na sexta-feira, por exemplo, o dia seguinte é a segunda |
| Vários dias úteis sem abrir o app | Aparece a sugestão de "Fechar dias pendentes", que aplica a auto-triagem a todos os dias pendentes de uma vez |
| Reflexão semanal | Os itens não triados acumulam, e o contador de adiamento aumenta de acordo |
| Reflexão mensal | A definir |

## 4. Mês e objetivos

Esta parte acrescenta os objetivos e a reflexão mensal, onde aparece o raio-x da desconexão entre o dia a dia e os objetivos.

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
- Objetivos só são finalizados manualmente: eu abro o objetivo e finalizo, dizendo se atingi a meta ou não. Um objetivo finalizado pode ser reaberto.
- No checkout, as notas de uma seção ganham o destino "vincular a um objetivo ou projeto como recurso". As notas vinculadas como recurso também vão para a wiki, porque as notas não moram num lugar só.
- Links entram como recurso direto na página do objetivo ou do projeto.

### Flow de Reflexão Mensal

Quando um mês termina, aparece a opção de reflexão mensal: um dashboard de objetivos e projetos. O aviso aparece na nota do dia a partir do primeiro dia do mês seguinte, se houve atividade no mês, até a reflexão ser fechada.

- O app só sugere objetivos aqui: propõe criá-los a partir dos projetos que já existem.
- Projetos ativos e o objetivo associado, em duas visões: objetivo como root, expandindo os projetos; ou projeto como root, expandindo o objetivo associado.
- Posso abrir o projeto para atualizar o andamento dele (milestones talvez).
- Posso finalizar aqui os projetos ativos, se desejar.
- Posso atualizar a lista de projetos e objetivos associados. Projetos podem ficar sem objetivo.
- Métricas possíveis: quantos blocos não estão relacionados a nenhum projeto e quantos projetos não têm objetivo, revelando uma desconexão entre o dia a dia e o futuro desejado; objetivos com pouco engajamento; e quantas prioridades da semana e do dia pertenciam a um projeto prioritário da semana.

## 5. Mais tipos de bloco

Esta parte acrescenta o compromisso como tipo de bloco e a detecção automática do tipo pelo formato do texto.

### Em aberto

- [ ] Quais são os formatos pré-definidos que identificam cada tipo de bloco?
- [ ] Como eu corrijo um bloco que foi detectado com o tipo errado?

### Regras

- Os tipos de bloco passam a ser três: tarefa, compromisso e nota geral.
- O tipo do bloco é detectado de acordo com formatos pré-definidos (por exemplo, `<data: __>` é compromisso). O que não encaixar em nenhum fica como nota geral.
- Compromissos são blocos criados manualmente na nota do dia e ficam guardados no banco de dados do app. Os do dia já constam na nota do dia, junto das tarefas.
- Compromissos, como as tarefas, só se vinculam a projetos.
- A agenda externa é o Google Agenda. Como o app não tem conexões externas, eu crio o evento lá e marco o compromisso como migrado à mão, o que conta como concluído. A integração automática fica para uma fase que permita conexões externas.

No checkout, um compromisso pode ser marcado como migrado, marcado como feito, descartado ou vinculado a um projeto (opcional).

## 6. Hábitos

Hábitos ficam para a última fase e se encaixam nos flows que já existem.

### Em aberto

- [ ] O que "agendar lembrete" faz?

### Regras

- Hábitos são ações com recorrência e critério de "feito"; por enquanto, o registro é só sim ou não.
- A recorrência é a escolha dos dias da semana. O percentual de completude conta só os dias esperados desde que o hábito existe; dias anteriores contam se eu os registrei.
- Um hábito pode ser arquivado: ele para de ser perguntado, e os registros continuam nas métricas.
- Uma tarefa convertida em hábito no checkout sai de circulação e vira um hábito com o mesmo texto, esperado todos os dias até eu editar.
- Um hábito faz parte de um objetivo, mas também pode existir sem objetivo. Hábitos sem objetivo não são proibidos: viram métrica na reflexão mensal.

### Onde entram nos flows

- Dashboard: botão de ação opcional "registrar hábitos (ou agendar lembrete)".
- Checkout: uma tarefa pode ser convertida em hábito.
- Reflexão semanal: o report de métricas mostra a corrente mais longa sem quebrar e o percentual de completude na semana/mês.
- Reflexão mensal: os hábitos aparecem no dashboard junto de objetivos e projetos, expandidos a partir do objetivo ou do projeto associado; posso atualizar a lista de hábitos; e a métrica de desconexão conta quantos hábitos não têm objetivo.
