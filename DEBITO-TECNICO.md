# Débito técnico

Atualizado em 13/10/2026

O que depende de você para ser verificado ou configurado. Quando um item for feito, ele sai daqui.

Os bugs e o débito técnico moram nas [issues do GitHub](https://github.com/Valerieps/best-app/issues): label `bug` para comportamento errado, `debito-tecnico` para débito, limitações conhecidas e verificações que faltam, e uma prioridade em cada uma (`p:alta`, `p:media`, `p:baixa`).

- **Entra aqui:** verificações que só você pode fazer no seu Chrome, e configuração e publicação.
- **Não entra aqui:** bugs, débito técnico e limitações conhecidas (issues do GitHub); funcionalidades que faltam ou esperam pergunta em aberto, e onde o código ainda não segue o `SPEC.md` (`ROADMAP.md`); decisões de produto pendentes (`ROADMAP.md`, "Antes de outras pessoas usarem").

## 1. Depende de você

### Verificações no seu Chrome

Estes pontos não puderam ser testados no navegador embutido do Claude Code.

- [ ] **Modo offline.** O navegador embutido não registra service workers. Para testar: rode `npm run build` e `npm run preview`, abra o endereço no Chrome, confira em DevTools > Application > Service Workers que o `sw.js` está ativo, desligue a rede e recarregue a página.
- [ ] **Backup automático no Google Drive.** Escolha um arquivo numa pasta sincronizada do Drive, faça uma mudança e confira que o arquivo foi atualizado. Feche e reabra o Chrome para ver o pedido de autorização e o "Retomar".
- [ ] **"Permitir em todas as visitas".** Confira se o Chrome da máquina corporativa oferece essa opção ao app instalado. Sem ela, o backup automático pede um clique por sessão. Uma política da empresa pode bloqueá-la.
- [ ] **Instalação como app.** Confira se o Chrome oferece "Instalar". O manifest tem o ícone em SVG e em PNG de 192 e 512 px, mais uma versão "maskable" ([#50](https://github.com/Valerieps/best-app/issues/50)); confira também o ícone no atalho e na barra de tarefas.
- [ ] **Migrações das versões 6 e 7 num banco de verdade.** Os testes cobrem o `upgrade` do Dexie (com um banco de teste) e os backups das versões 5 e 6, mas não um navegador com dados reais. Vale abrir o app no Chrome com os dados atuais e conferir que os projetos em foco são os prioritários da semana atual, e que a Revisão de Foco e a de Rumo aparecem com o período certo (desde a última reflexão semanal e mensal).
- [ ] **Troca na Revisão de Foco, pela interface.** No navegador, desmarcar um projeto em foco e marcar outro em seguida deixou a lista com só 2 projetos. Provavelmente o segundo clique caiu antes de a caixa ser liberada (a tela leva cerca de 700 ms para atualizar), mas pode ser bug. Os testes do caso de uso passam.
- [ ] **Finalizar um projeto em foco pela interface** (deve liberar a vaga e mostrar o card tracejado). Só os testes do caso de uso cobrem.
- [ ] **"Nova data" das tarefas travadas.** Abre o calendário nativo com `showPicker`, que o navegador embutido não mostra; não foi conferido que a data escolhida é gravada.
- [ ] **Layout em telas estreitas** (cards empilhados abaixo de 900 px, mapa das linhas escondido abaixo de 640 px) e com nomes longos.
- [ ] **Tooltip do mapa nas bordas.** Os das 2 primeiras e das 3 últimas colunas abrem para dentro; não foi conferido em todos os tamanhos de card.

### Configuração e publicação

- [ ] **Cloudflare Pages.** Criar a conta e o projeto, conectar o repositório privado, usar `npm run build` como comando de build e `dist` como pasta de saída. Um domínio próprio é opcional.
- [ ] **Política da empresa.** O `google-safe.md` aceita hospedagem estática como o Cloudflare Pages, mas o código do app ainda é baixado de um servidor externo. Vale confirmar que isso é aceito antes de usar o app com dados reais.
- [ ] **Limite de 3 adiamentos.** Está em 3, como proposto no `spec/checkout.md`; se a resposta à pergunta em aberto for outra, muda numa constante.
