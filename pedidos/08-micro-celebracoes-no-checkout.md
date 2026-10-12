# 8. Micro-Celebrações e Reforço Positivo no Checkout Diário
* **Objetivo:** Destacar o que foi feito e o ganho de clareza, recompensando a consistência do usuário.
* **Especificações:**
  * **Métrica de Intenção Cumprida:** Em vez de focar apenas no número de adiadas, exibir uma mensagem positiva ao finalizar o dia (ex: *"Você concluiu X% do que planejou para hoje!"* ou *"X tarefas executadas no dia pretendido!"*).
  * **Celebração do Descarte Consciente:** Destacar o abandono de tarefas/notas que perderam o sentido como um ato saudável de gestão de energia (ex: *"Você libertou espaço mental ao descartar itens obsoletos"*).
  * **Animação/Som de Sucesso:** Manter e enriquecer a animação de fogos de artifício e o som de "plim" ao finalizar o dia, acompanhados de uma frase de conclusão leve e encorajadora.
* **Incoerências com o modelo atual:**
  * "% do que planejou para hoje" é uma métrica nova, diferente da precisão da data de intenção da reflexão semanal (`spec/rituais.md`), e não está definida: o que conta como "planejado"? Tarefas com data de intenção para hoje? E as criadas no dia?
  * "X tarefas executadas no dia pretendido" é a precisão semanal calculada para um dia; vale usar a mesma definição para os números baterem.
  * "Descarte" de tarefas: no `spec/checkout.md`, tarefas são *abandonadas* e notas são *descartadas*.
  * O checkout pode ser feito mais de uma vez por dia (`spec/checkout.md`, "Checkout"); falta dizer se a celebração se repete a cada vez.
  * O "plim" e os fogos já estão no `spec/checkout.md`; o pedido novo é só a frase de conclusão.
