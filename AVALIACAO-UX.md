# Best App — Avaliação de UX

12/10/2026 · Valeria

## Resumo executivo

O Best App tem uma base visual calma e coerente, mas a navegação esconde o que é central (capturar e triar) e expõe o que é secundário (backup, avisos). A paleta em tokens, a fonte do sistema e a nota do dia em formato de documento estão no caminho certo. O que mais pesa hoje é estrutura, não estética.

As cinco mudanças de maior impacto:

1. **Navegação persistente.** Trocar o menu lateral escondido + dropdown "Rituais" por uma barra lateral fixa no desktop, com o item atual destacado.
2. **Captura visível.** Tirar "+ Seção geral" e "+ Seção de reunião" do menu "⋯" e colocá-los no fim da nota, como a spec já pede.
3. **Checkout mais leve.** Reduzir as 7 opções por tarefa a 3 visíveis + "Mais", com a sugestão já marcada e atalhos de teclado.
4. **Contraste do texto secundário.** O cinza de metadados (#85817a) fica em 3,5:1 sobre o fundo, abaixo dos 4,5:1 do WCAG AA.
5. **Menos ruído no topo.** Juntar as faixas de backup e de checkout pendente num único ponto de status; hoje elas ocupam cerca de 40% da primeira dobra no celular.

Cada achado abaixo tem um código (N = navegabilidade, P = padrões, V = visual) usado no roadmap do fim.

## Escopo e método

Avaliação heurística do app rodando em `npm run dev` com os dados atuais, em 800 px (desktop) e 375 px (celular), mais leitura do código de UI (`src/ui`) e dos tokens (`tokens.css`). Telas vistas: nota do dia, menu lateral, dropdown Rituais, checkout, tarefas ativas, wiki, projetos e projeto, objetivos, hábitos, reflexão semanal, colocar ordem na casa, configurações e dados e backup. As telas "Iniciar Dia" e warm up não foram vistas, porque não há itens de warm up configurados.

Severidade: **Alta** atrapalha o ciclo diário ou a acessibilidade; **Média** gera atrito ou inconsistência perceptível; **Baixa** é acabamento. Referências: heurísticas de Nielsen, WCAG 2.2 AA e padrões de apps do mesmo gênero (Notion, Things, Todoist, Linear).

## Navegabilidade geral

A pessoa não sabe onde está nem vê o mapa do app: a navegação está dividida entre um menu lateral escondido (listas e planejamento) e um dropdown "Rituais" (checkouts, reflexões, limpeza), e nenhum dos dois marca a tela atual na barra superior.

| # | Achado | Onde | Severidade | Recomendação |
| --- | --- | --- | --- | --- |
| N1 | Duas arquiteturas paralelas: listas no menu ☰, rituais no dropdown. Fora do menu aberto, nada indica a tela atual | Barra global | Alta | Barra lateral fixa a partir de 1024 px, com grupos Hoje, Rituais (com contadores), Listas e Planejamento e o item ativo destacado. Drawer só abaixo disso |
| N2 | Criar seção, a ação central da captura, fica escondida no menu "⋯". A spec pede botões entre as seções e no fim da página | Nota do dia | Alta | Botões "+ Geral" e "+ Reunião" fixos no fim da nota e um "+" entre seções ao passar o mouse |
| N3 | Três formas de voltar: "‹" (paginar dias), "←" (checkout) e "← Projetos" (projeto). O "‹" da nota parece voltar, mas pagina | Cabeçalhos de tela | Média | Um componente de cabeçalho único: "← Destino" em texto para voltar; setas pareadas "‹ ›" com dica "Dia pendente anterior" só para paginar |
| N4 | Wiki e projeto ficam em branco por meio segundo a um segundo antes de aparecer. Parece erro | Telas com consulta | Média | Renderizar o título na hora e um esqueleto das linhas enquanto os dados chegam |
| N5 | Faixa de backup, faixa de checkout pendente e botão "Ativar backup" se empilham no topo. Em Dados e backup, "Ativar backup" aparece 3 vezes | Topo de todas as telas | Média | Backup vira um indicador de status no cabeçalho (ícone com ponto colorido). Uma única faixa de aviso por vez, com "Lembrar depois" |
| N6 | Não há busca global nem atalho para ir a uma tela; a busca existe só dentro da Wiki | App inteiro | Média | Paleta de comandos com Ctrl+K: buscar tarefas, notas e projetos, e rodar ações ("Nova seção", "Fazer checkout") |
| N7 | No dropdown Rituais, "Checkout de sábado, 10/10" quebra em duas linhas e o chip "pendente" é cortado na borda | Dropdown Rituais | Baixa | Largura mínima de 280 px, data curta ("Sáb 10/10") e chips alinhados à direita sem corte |
| N8 | A seta "›" desativada some no fundo, e o fato de ela pular só dias pendentes não está explicado | Data da nota do dia | Baixa | Estado desativado visível e dica no hover; clicar na data abre um calendário com os dias pendentes marcados |

## Padrões conhecidos

O app reinventa interações que já têm convenção: ações de linha que só aparecem com o cursor no texto, criação de tarefa por um marcador secreto e nenhum "Desfazer". Seguir o padrão de Notion, Todoist e Things reduz o que a pessoa precisa aprender.

| # | Achado | Onde | Severidade | Recomendação |
| --- | --- | --- | --- | --- |
| P1 | O cinza de metadados (#85817a) tem contraste de 3,5:1 sobre o fundo e 3,9:1 sobre o branco, abaixo dos 4,5:1 do WCAG AA. É usado em textos de 12 a 13 px: datas, "adiada 3 vezes", textos de ajuda | `--color-text-muted` | Alta | Escurecer para cerca de #6b675f (5:1 sobre o fundo). Uma linha em `tokens.css` |
| P2 | As ações da tarefa (✓, Data, Prazo, ★) só aparecem com o cursor dentro do texto, não no hover, e repetem controles: ✓ duplica o checkbox e a ★ aparece duas vezes (indicador e botão) | Linha de tarefa | Alta | Ações no hover e no foco; tirar o ✓; uma única ★ que é indicador e botão; data e prazo como chips clicáveis na própria linha |
| P3 | Uma tarefa nasce digitando "[] " no começo da linha, mas nada na tela ensina isso | Editor da nota | Média | Dica no placeholder da linha vazia ("Escreva, ou [] para tarefa") e menu "/" com Tarefa, Nota e Seção de reunião, como no Notion |
| P4 | Cada tarefa do checkout tem 7 opções de mesmo peso (Finalizar, Amanhã, Outra data, Arquivar, Abandonar, Reflexão semanal, Virar hábito) e mais um seletor de projeto. Muitas escolhas por linha atrasam a decisão | Checkout e reflexão | Média | 3 opções visíveis + "Mais ▾". Atalhos 1–4 e navegação por setas, para triar sem mouse |
| P5 | Não há "Desfazer" depois de concluir, abandonar, apagar linha ou confirmar o checkout | App inteiro | Média | Aviso temporário no rodapé com "Desfazer" por 5 a 8 s. O histórico de eventos já torna isso barato |
| P6 | Telas de coleção sem um padrão: Objetivos abre direto num formulário, Hábitos tem "Novo hábito" solto à direita, Projetos não tem botão de criar | Objetivos, Hábitos, Projetos | Média | Um modelo único: título + "+ Novo" no cabeçalho, lista, formulário sob demanda. Estado vazio com ícone, uma frase e o botão |
| P7 | Em Dados e backup, o título se repete no cartão, "Desfazer importação" aparece mesmo sem importação e os botões quebram linha sem grupo | Dados e backup | Baixa | Agrupar em "Backup automático", "Cópias manuais" e "Avançado"; mostrar "Desfazer importação" só quando houver o que desfazer |
| P8 | Em 375 px, os botões do cabeçalho quebram em duas linhas, a data ocupa três e "Fazer checkout" quebra. O Android está no roadmap | Celular | Baixa | Cabeçalho com ícones, data curta ("Seg, 12 out") e ações numa barra inferior |

## Interface clean e moderna

A paleta quente, a fonte do sistema e os tokens centralizados são uma boa fundação; o que tira o ar de "clean" é excesso de bordas, cartões dentro de cartões e cada tela com um layout diferente. A direção do prompt do Stitch ("muito espaço em branco, bordas finas, uma única cor de destaque") continua certa; falta aplicá-la com mais rigor.

| # | Achado | Onde | Severidade | Recomendação |
| --- | --- | --- | --- | --- |
| V1 | Só há dois estilos de botão (preto sólido e contorno). "Hoje", "Rituais" e "Ativar backup" têm o mesmo peso no cabeçalho | Botões | Média | Três níveis: primário (um por tela), secundário (contorno) e terciário (só texto, com fundo no hover). Cabeçalho em terciário |
| V2 | Cada tela tem um layout: nota do dia com título à esquerda, checkout dentro de um cartão com título centralizado, reflexão mais larga e centralizada, projetos mais estreitos | Todas as telas | Média | Um modelo de página: título à esquerda e ações à direita, numa largura única de leitura |
| V3 | Cartões dentro de cartões: a seção da nota é uma barra lateral dentro de um cartão; o checkout empilha cartão, grupo com borda e linhas com borda | Nota do dia, checkout | Média | Nota como documento contínuo, seções separadas por espaço e cabeçalho discreto. No checkout, divisores em vez de caixas |
| V4 | Em Colocar ordem na casa, círculos vermelhos e verdes saturados e cartões rosados fogem da paleta calma; o vermelho lê como erro para o que é só sugestão. Há ainda chips de cinco cores (bege, lilás, azul, laranja, verde) | Limpeza, chips | Média | Um acento e uma escala de cinzas; status só num ponto colorido, não no fundo; vermelho reservado a erro e ação destrutiva; contador visível em cada cartão |
| V5 | Títulos de página (22 px) pouco acima dos de seção, e muitos metadados em 12 px | Tipografia | Baixa | Escala 12/14/16/20/28 com títulos de página em 28 px; números tabulares em datas e contadores; metadados em 13 px |
| V6 | O checkbox da tarefa fica cerca de 3 px acima da linha do texto, e o texto da tarefa não alinha com o das notas | Linha de tarefa | Baixa | Coluna fixa para o marcador, centrada na primeira linha; texto de tarefas e notas no mesmo recuo |
| V7 | Sem modo escuro e sem transições: menus, conclusão de tarefa e mudança de tela acontecem de uma vez | Tema, movimento | Baixa | Tema escuro via `prefers-color-scheme` redefinindo os tokens; transições de 150 ms que respeitam `prefers-reduced-motion` |

## Roadmap priorizado

Comece pelos sete itens de "Fazer já": quase todos são mudanças de CSS ou de um componente, e juntos atacam as dores do ciclo diário. A barra lateral fixa (N1) e o checkout enxuto (P4) são as duas apostas que mais mudam a experiência e merecem um rascunho de tela antes do código.

Matriz impacto × esforço dos 23 achados:

| | Baixo esforço | Alto esforço |
| --- | --- | --- |
| **Alto impacto** | **Fazer já**<br>P1 · Contraste do texto secundário<br>N2 · Botões de nova seção visíveis<br>P3 · Dica para criar tarefa<br>P2 · Ações da linha sem duplicatas<br>N4 · Esqueleto ao carregar<br>N5 · Um aviso por vez no topo<br>V1 · Três níveis de botão | **Planejar**<br>N1 · Barra lateral fixa<br>P4 · Checkout com 3 opções + Mais<br>P5 · Desfazer em todas as ações<br>N6 · Busca e comandos (Ctrl+K)<br>V3 · Nota sem cartões aninhados |
| **Baixo impacto** | **Ajustes finos**<br>N3 · Um só padrão de voltar<br>N7 · Dropdown Rituais sem cortes<br>N8 · Seta e calendário de dias<br>V6 · Checkbox alinhado ao texto<br>V5 · Escala tipográfica<br>P7 · Reorganizar Dados e backup<br>V4 · Paleta calma na limpeza | **Depois**<br>V2 · Modelo único de página<br>P6 · Padrão para telas de coleção<br>V7 · Modo escuro e transições<br>P8 · Layout de celular |

A posição dentro de cada quadrante não indica ordem; os códigos remetem às tabelas acima. Antes de construir N1, P4 e P8, vale testar com uma semana de uso real, como o HANDOFF já recomenda para o escopo.

### Andamento

Em 12/10/2026, os sete itens de "Fazer já" foram construídos, com estas escolhas:

- **N2:** os botões ficam só no fim da nota e saem do "⋯". O "+" entre seções ficou de fora, porque as seções seguem a ordem de criação.
- **N5:** um aviso por vez, na ordem backup com erro, checkout pendente, backup não ativado. Lembretes ficam fora da fila. "Lembrar depois" esconde os dois últimos até o dia seguinte.
- **P3:** só a dica na linha vazia; o menu "/" ficou para depois.
- **N4:** o esqueleto vale para todas as telas com consulta, não só wiki e projeto.

As regras de produto foram para o `SPEC.md`, e o que ficou de fora está no `DEBITO-TECNICO.md`.

## Propostas detalhadas

- Página do projeto: brief em `rascunhos/rascunho-projeto-pagina.md` e rascunho navegável em `rascunhos/rascunho-projeto-pagina_1.html` (cabeçalho com indicadores, tarefas agrupadas, linha do tempo de notas, coluna lateral recolhível e fixável, seletor de ícones).
