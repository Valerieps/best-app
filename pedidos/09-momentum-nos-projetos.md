# 9. Gestão Positiva e "Momentum" nos Projetos
* **Objetivo:** Evitar o efeito punitivo de itens travados e dar visibilidade ao ritmo real de evolução.
* **Especificações:**
  * **Selo de Ritmo Ativo ("Com Gás"):** Adicionar um destaque visual sutil nos cards de projetos que possuem atividade regular no mapa estilo GitHub (16/8 semanas), valorizando a consistência.
  * **Resgate Amigável de Projetos Parados:** Substituir o rótulo de alerta agressivo por uma ação convidativa de micro-passos (ex: sugerir escolher *uma* tarefa simples sem data para dar vida nova ao projeto, em vez de apenas exibir "Parado há N dias" com tom de cobrança).
* **Incoerências com o modelo atual:**
  * O `spec/projetos.md` ("Projetos") diz que "não há contagem de dias seguidos". O selo "Com Gás" precisa de uma definição de "atividade regular" que não vire uma sequência disfarçada.
  * O rótulo "Parado há N dias" e a regra dos 14 dias estão no `spec/projetos.md` ("Projetos"), inclusive na contagem do grupo recolhido.
  * O assistente "Projetos parados" (`spec/assistentes.md`) oferece "Finalizar ou manter". O resgate acrescenta uma terceira ação (dar data a uma tarefa), e falta dizer o que acontece com um projeto sem nenhuma tarefa sem data.
