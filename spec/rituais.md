# Revisões e rituais pulados

- **Entra aqui:** a Revisão de Foco, a Revisão de Rumo com o raio-x, quando cada revisão fica disponível, e o que acontece quando um ritual é pulado.
- **Não entra aqui:** o checkout diário (`checkout.md`), a abertura do dia (`abertura-do-dia.md`), os projetos em foco que a Revisão de Foco define (`prioridades.md`) e os objetivos (`objetivos.md`).

## Em aberto

- [ ] Como funciona a sugestão de agregar tarefas em projetos: o app propõe os grupos (com IA), eu agrupo as tarefas soltas, ou o app sugere converter os títulos de quadro branco que se repetiram desde a última Revisão de Foco?
- [ ] Quais outras métricas entram no report da Revisão de Foco, além das três listadas?
- [ ] Como se mede "objetivos com pouco engajamento"?
- [ ] A métrica de desconexão conta "blocos" ou "tarefas" sem projeto? Só tarefas e compromissos se vinculam a projetos.

## Duas revisões, sem calendário

Só o checkout tem tempo definido: o dia. As duas revisões não fecham semana nem mês. Cada uma olha para uma altura diferente e cobre o período desde a última vez que eu a fiz.

| | Revisão de Foco *(2)* | Revisão de Rumo *(4)* |
| --- | --- | --- |
| Pergunta | No que eu estou trabalhando agora? | Estou indo para onde eu quero ir? |
| Horizonte | Projetos | Objetivos |
| O que muda | Quais projetos estão em foco | Quais objetivos e projetos existem e como se ligam |
| Período avaliado | Desde a última Revisão de Foco | Desde a última Revisão de Rumo |

Na primeira vez, o período começa no primeiro dia de uso do app.

## Quando uma revisão fica disponível

Eu posso fazer qualquer revisão na mão, a qualquer hora, pelo menu "Rituais". Fora isso, uma revisão fica disponível por cadência ou por sinal, o que vier primeiro:

| | Revisão de Foco | Revisão de Rumo |
| --- | --- | --- |
| Cadência (configurável) | A cada 5 checkouts | A cada 4 Revisões de Foco |
| Sinais | 10 itens ou mais esperando a Revisão de Foco; um projeto em foco ficou parado (`projetos.md`, "Lista de projetos"); o último projeto em foco foi finalizado e a lista ficou vazia | Depois da primeira Revisão de Rumo: com 10 tarefas finalizadas ou mais no período, mais da metade delas não pertence a projeto com objetivo; um objetivo ativo com projetos ficou 30 dias sem atividade em nenhum deles. Um objetivo sem projeto não conta: quem cuida dele é o assistente "Objetivos soltos" (`assistentes.md`) |

- A cadência conta checkouts e revisões, não dias, para não amarrar as revisões ao calendário. Eu mudo os números nas configurações.
- Conta como checkout todo dia fechado, inclusive pelo "Fechar dias pendentes". Depois de uma ausência, a Revisão de Foco costuma ficar disponível, e é a hora certa para ela.
- O aviso diz por que a revisão ficou disponível, como "5 checkouts desde a última Revisão de Foco" ou "o projeto X está parado".
- Uma revisão disponível aparece no contador de "Rituais" e num aviso na nota do dia (`navegacao.md`, "Navegação"). O aviso tem "Lembrar depois", que o esconde até o próximo checkout; o contador continua mostrando a revisão.
- Fazer a revisão, disponível ou não, zera a contagem dela.
- A tela de cada revisão mostra só a revisão em andamento. Uma revisão fechada não se reabre; as passadas ficam no histórico (métricas e textos guardados), sem tela por enquanto.

## Flow da Revisão de Foco *(2)*

1. Triagem do que foi movido para cá, com a mesma rotina do checkout diário
2. Revisita das tarefas arquivadas, que podem ser reativadas
3. Passada pelos projetos ativos, com os parados primeiro: cada um continua ou é finalizado
4. Sugestão de agregar tarefas em projetos, apresentada pela primeira vez na primeira Revisão de Foco
5. Report de métricas do período:
   - quantas tarefas adiadas: cada tarefa conta uma vez, mesmo que tenha sido adiada várias vezes no período
   - precisão da data de intenção de execução: realizar a tarefa no dia da intenção, independente de quantos adiamentos. O objetivo é estimular adiamentos e abandonos intencionais. Entram na conta só as tarefas finalizadas que tinham data de intenção
   - tarefas executadas
   - a partir da seção 6, as métricas de hábitos (`habitos.md`, "Onde entram nos flows")
6. Melhores momentos e o que pode melhorar: textos livres vinculados ao período avaliado
7. Escolha dos projetos em foco (`prioridades.md`)
8. Clicar em "Fechar revisão"

## Flow da Revisão de Rumo *(4)*

A Revisão de Rumo é um dashboard de objetivos e projetos.

- O app só sugere objetivos aqui: propõe criá-los a partir dos projetos que já existem.
- Projetos ativos e o objetivo associado, em duas visões: objetivo como root, expandindo os projetos; ou projeto como root, expandindo o objetivo associado.
- Para cada objetivo, eu revisito a meta e a motivação, e decido se ele continua.
- Posso abrir o projeto para atualizar o andamento dele (milestones talvez).
- Posso finalizar aqui os projetos ativos, se desejar.
- Posso atualizar a lista de projetos e objetivos associados. Projetos podem ficar sem objetivo.
- Métricas possíveis: quantos blocos não estão relacionados a nenhum projeto e quantos projetos não têm objetivo, revelando uma desconexão entre o dia a dia e o futuro desejado; objetivos com pouco engajamento; e quantas prioridades do dia pertenciam a um projeto em foco.
- A partir da seção 6, os hábitos também entram na Revisão de Rumo (`habitos.md`, "Onde entram nos flows").
- Clicar em "Fechar revisão".

## Rituais pulados *(3)*

Pular um ritual não bloqueia o app, e qualquer ritual pode ser acionado depois, a qualquer hora.

| O que foi pulado | O que acontece |
| --- | --- |
| Item do warm up | Posso "pular hoje" ou pedir para "perguntar de novo às XXh" |
| Checkout do dia anterior | O dashboard mostra o botão de checkout, e o dia pode começar sem prioridades |
| Dias não ativos | Não contam como pulados: eu configuro os dias ativos e, na sexta-feira, por exemplo, o dia seguinte é a segunda |
| Vários dias úteis sem abrir o app | Aparece a sugestão de "Fechar dias pendentes", que aplica a auto-triagem a todos os dias pendentes de uma vez (`checkout.md`) |
| Revisão de Foco | Os itens não triados acumulam, e o contador de adiamento aumenta de acordo. Os projetos em foco continuam os mesmos |
| Revisão de Rumo | Nada se perde: o aviso continua disponível, e a próxima Revisão de Rumo cobre o período inteiro desde a última |
