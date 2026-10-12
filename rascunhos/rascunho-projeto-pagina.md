# Página do projeto: proposta de redesenho

Proposta de layout para a tela do projeto (`src/ui/projects/ProjectScreens.tsx`, `ProjectScreen`), que hoje
empilha formulário, lista, recursos e notas sem hierarquia. O rascunho navegável está em
`rascunho-projeto-pagina_1.html`, nesta pasta. A avaliação geral de UX que motivou a proposta está em
`AVALIACAO-UX.md`, na raiz do repositório.

Este documento é um brief para implementação. As regras de negócio decididas já estão no `SPEC.md`, seção
"2. Semana e projetos" > "Projetos".

## Decisões de negócio (já no SPEC.md)

| Decisão | Origem |
| --- | --- |
| Posso criar uma tarefa direto na página do projeto; ela já nasce vinculada a ele | Valeria, 12/10/2026 |
| Cada projeto tem um ícone, escolhido numa coleção de ícones estilizados do app | Valeria, 12/10/2026 |
| Tarefa travada = adiada 3 vezes ou mais, ou com data de intenção vencida e ainda ativa | Valeria, 12/10/2026 |

## Estrutura da tela, de cima para baixo

1. **Trilha de navegação**: "Projetos › Reforma da cozinha". Substitui o botão "← Projetos".
2. **Cabeçalho**
    - Ícone do projeto (44 px, quadrado arredondado com fundo tingido). Clicar abre o seletor de ícones.
    - Nome em 26 px, editável no lugar (hoje é um `<input>` com cara de formulário).
    - Linha de apoio: "Ativo desde DD/MM · última nota em DD/MM".
    - Selo "Prioridade de <mês>" com estrela, que liga e desliga (substitui o checkbox "prioridade do mês").
    - Menu "⋯" com "Finalizar projeto" / "Reabrir projeto" (hoje é o botão mais visível da tela).
3. **Três indicadores**
    - Progresso: "4 de 10" + barra (feitas / feitas + ativas).
    - Travadas: contagem pela regra do SPEC, em cor de aviso.
    - Próxima: a tarefa ativa com a data de intenção mais próxima, hoje ou no futuro.
4. **Abas**: "Tarefas N" e "Notas N". À direita, o botão que mostra e esconde a coluna lateral.
5. **Aba Tarefas**
    - Grupos com contador: Atrasadas (data de intenção vencida), Próximos dias (com data), Sem data.
      Grupos vazios não aparecem.
    - Linha: checkbox, texto, metadados (selo âmbar "adiada N×" a partir de 3 adiamentos; data relativa).
    - No hover, os metadados dão lugar às ações: data de intenção, prazo máximo, promover a prioridade do dia.
    - "Nova tarefa" no fim da lista: cria a tarefa já vinculada ao projeto.
    - "Feitas (N)" recolhido no fim, expansível.
6. **Aba Notas**: linha do tempo, da mais recente para a mais antiga. Cada entrada tem um ponto, "data ·
   hora · tipo" e as notas da seção. Seções de reunião têm ponto e rótulo na cor de reunião.

## Coluna lateral: Detalhes e Recursos

Conteúdo:

- **Detalhes**: objetivo (link "Vincular", que abre a escolha; substitui o `<select>` "sem objetivo"),
  status e número de seções.
- **Recursos**: cartões com ícone (link ou nota) e uma linha de apoio (domínio do link ou "nota · data").
  Para adicionar um link, uma área tracejada "Colar link" substitui os campos Título + Link + botão. O título
  é editável depois.
- O domínio é tirado do texto da URL. Não se baixa favicon nem nada da internet (`google-safe.md`).

Três estados:

| Estado | Como aparece | Como entra | Como sai |
| --- | --- | --- | --- |
| Recolhida (padrão) | Trilho de 48 px na borda direita, com ícones de Detalhes e Recursos; Recursos mostra um contador | Padrão; ou desafixar | Clicar num ícone do trilho ou no botão das abas |
| Espiando | Painel de 260 px por cima do conteúdo, sem empurrar nada | Clique no trilho ou no botão | Clicar fora, Esc, ou o mesmo botão |
| Fixada | Coluna encaixada; o conteúdo se estreita | Alfinete no topo do painel | Alfinete de novo |

- A escolha "fixada" vale para todos os projetos e persiste entre sessões. É uma preferência de interface:
  guardar no IndexedDB, junto das configurações, e não no `localStorage` (o rascunho usa `localStorage` só
  por ser um HTML solto).
- Abaixo de cerca de 900 px de largura, "fixada" se comporta como "espiando".
- O que pesa na decisão não fica escondido na coluna: progresso, travadas e prioridade do mês ficam no
  cabeçalho.

## Seletor de ícones

- Popover com uma grade 4 × 2 (ou maior) de ícones estilizados: traço fino, fundo tingido, cantos
  arredondados. O ícone selecionado tem borda.
- Os tons vêm dos tokens que já existem: projeto (lilás), reunião (azul), quadro branco (âmbar), sucesso
  (verde), perigo (rosa). A coleção do rascunho é um exemplo: panela, casa, maleta, livro, coração, viagem,
  código, festa.
- Projeto sem ícone escolhido: o app usa um padrão (por exemplo, a inicial do nome sobre o lilás de projeto).
- Os ícones são SVG embutidos no bundle. Nada é baixado.

## Pontos técnicos em aberto (decidir na implementação e registrar como ADR)

- **Tarefa criada no projeto.** Hoje todo bloco pertence a uma seção de uma nota do dia. É preciso decidir
  onde a tarefa nova mora (por exemplo, uma seção técnica do projeto ou uma seção na nota de hoje já
  vinculada) e como isso aparece no histórico de eventos e no checkout.
- **Ícone do projeto.** É um campo novo na entidade `Project` e um evento novo, e o formato de backup e a
  importação precisam aceitá-lo.
- **Contagem de travadas e "próxima".** São funções de domínio puras, a partir de `postponeCount`,
  `intendedDate` e `today`. Precisam de teste unitário.
- **Aba ativa e estado da coluna.** A aba pode ir na rota (`#/projeto/<id>/notas`), para o link voltar ao
  mesmo lugar.

## Andamento

Implementado em 12/10/2026. Os pontos técnicos em aberto foram decididos assim:

- **Tarefa criada no projeto:** a Valeria decidiu que ela fica só no projeto, sem entrar na nota de hoje nem no checkout (`SPEC.md`). Ela mora numa seção escondida do projeto (ADR-031).
- **Ícone do projeto:** campo `icon` no `Project` e evento `project.iconChanged`; o backup aceita sem mudar de versão (ADR-032). A coleção tem 12 ícones, numa grade 4 × 3.
- **Travadas e "próxima":** funções puras em `src/domain/projectPage.ts`, com testes.
- **Aba e coluna:** a aba Notas vai na rota (`#/projeto/<id>/notas`); "fixada" fica nas configurações.
- **Uma diferença do rascunho:** no hover, as tarefas seguem o padrão da nota do dia (data e prazo continuam visíveis como etiquetas), em vez de esconder os metadados.

Ajustes de 12/10/2026, pedidos pela Valeria (regras no `SPEC.md`, "Projetos"):

- **"Ritmo" no lugar de "Progresso":** o card não mostra mais "4 de 10", porque o total de tarefas de um projeto nunca é conhecido. Ele mostra as tarefas finalizadas nas últimas 2 semanas, 4 barras (uma por semana, a última em azul) e a data da última finalização. Um projeto ativo sem finalização nem nota nova há 14 dias mostra "Parado há N dias" em cor de aviso. Tudo vem do histórico de eventos; uma tarefa reaberta deixa de contar (ADR-033).
- **Um único botão para a coluna lateral:** o trilho da direita, com "Detalhes" e "Recursos", saiu. O botão na linha das abas é a única entrada e mostra o número de recursos como selo. Com a coluna recolhida, o conteúdo ocupa a largura toda. "Espiando" e "fixada" continuam iguais.

O rascunho HTML não foi atualizado com esses ajustes; este brief e o `SPEC.md` valem mais que ele.

## Fora do escopo desta proposta

A navegação global (barra lateral fixa, item N1 do `AVALIACAO-UX.md`) e o layout de celular (P8) afetam
esta tela, mas são mudanças do app inteiro.
