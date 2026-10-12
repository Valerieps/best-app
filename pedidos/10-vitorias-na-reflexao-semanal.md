# 10. Destaque de Vitórias na Reflexão Semanal
* **Objetivo:** Balancear a análise de métricas trazendo o progresso e as conquistas para o topo do relatório semanal.
* **Especificações:**
  * **Bloco "Vitórias da Semana":** Inserir uma seção no início da reflexão semanal exibindo:
    * Total de tarefas executadas com sucesso.
    * O projeto que mais evoluiu na semana.
    * Mensagem amigável contextualizando a taxa de precisão de datas (reforçando que adiar intencionalmente faz parte da gestão de energia e flexibilidade).
* **Incoerências com o modelo atual:**
  * O flow da reflexão semanal (`spec/rituais.md`) começa pela triagem, e o report de métricas é o passo 4. Pôr as vitórias no início muda essa ordem, ou duplica o report.
  * "Tarefas executadas" já é uma métrica do passo 4.
  * "O projeto que mais evoluiu" não tem métrica definida. Poderia vir do mapa de atividade (ADR-034) ou das tarefas finalizadas na semana, mas são resultados diferentes.
