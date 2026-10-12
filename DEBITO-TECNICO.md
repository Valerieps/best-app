# Débito técnico

Atualizado em Oct 11, 2026

O que ficou para trás, de propósito ou por falta de como verificar, da fase 0 até as seções 2 a 6. Cada item diz o risco e o que fazer. Quando um item for resolvido, ele sai daqui.

## 1. Depende de você

### Verificações no seu Chrome

Estes pontos não puderam ser testados no navegador embutido do Claude Code.

- [ ] **Modo offline.** O navegador embutido não registra service workers. Para testar: rode `npm run build` e `npm run preview`, abra o endereço no Chrome, confira em DevTools > Application > Service Workers que o `sw.js` está ativo, desligue a rede e recarregue a página.
- [ ] **Backup automático no Google Drive.** Escolha um arquivo numa pasta sincronizada do Drive, faça uma mudança e confira que o arquivo foi atualizado. Feche e reabra o Chrome para ver o pedido de autorização e o "Retomar".
- [ ] **"Permitir em todas as visitas".** Confira se o Chrome da máquina corporativa oferece essa opção ao app instalado. Sem ela, o backup automático pede um clique por sessão. Uma política da empresa pode bloqueá-la.
- [ ] **Instalação como app.** Confira se o Chrome oferece "Instalar". O ícone atual é só um SVG provisório, e o Chrome pode exigir ícones PNG de 192 e 512 px (veja a seção 5).

### Configuração e publicação

- [ ] **Commits.** O `git` não funciona no terminal do Claude Code, então todo o trabalho ainda precisa ser commitado por você, incluindo o `package-lock.json`. O `.gitignore` já impede que arquivos de backup entrem no repositório.
- [ ] **Cloudflare Pages.** Criar a conta e o projeto, conectar o repositório privado, usar `npm run build` como comando de build e `dist` como pasta de saída. Um domínio próprio é opcional.
- [ ] **Política da empresa.** O `google-safe.md` aceita hospedagem estática como o Cloudflare Pages, mas o código do app ainda é baixado de um servidor externo. Vale confirmar que isso é aceito antes de usar o app com dados reais.
### Decisões de produto

- [ ] **Nome e ícone do app.** "Best App" e o ícone de check são provisórios.
- [ ] **Página de privacidade.** Antes de outras pessoas usarem o app, uma página curta explicando que nada sai da máquina. O texto é decisão sua.
- [ ] **Revisar as lacunas que o agente decidiu.** Pequenas regras que a spec não cobria foram decididas e escritas no próprio texto de `SPEC.md`, `AUTO-TRIAGEM.md` e `ASSISTENTES.md`. Por exemplo: a quarta prioridade ocupa o lugar da terceira; a precisão da intenção conta só tarefas com data; o warm up só começa quando o checklist tem itens.

### Features esperando resposta às perguntas em aberto

Estas partes da spec não foram construídas porque dependem de uma pergunta em aberto:

- **Prioridades da semana (seção 2):** quantas são. Sem isso, faltam a etapa 6 da reflexão semanal, as prioridades da semana no dashboard, puxar uma prioridade da semana no planejamento e no checkout, metade da métrica mensal de prioridades e o assistente de prioridades encalhadas.
- **Sugestão de agregar tarefas em projetos (seção 2):** se o app propõe os grupos ou se a Valeria agrupa. A etapa 3 da reflexão semanal mostra só um aviso.
- **Mural (seção 3):** onde os lembretes do mural são criados e editados.
- **Checkout pendente no dashboard (seção 3):** a pergunta continua aberta; hoje o dashboard só avisa, sem bloquear, pelo princípio "avisa em vez de bloquear".
- **Reflexão mensal pulada (seção 4):** hoje o aviso só continua aparecendo.
- **Métricas mensais:** "blocos" ou "tarefas" sem projeto, e como medir "objetivos com pouco engajamento".
- **Nome definitivo do campo "motivação" (seção 4).**
- **Seção 5 inteira (compromissos):** os formatos que identificam cada tipo e como corrigir um tipo detectado errado.
- **"Agendar lembrete" nos hábitos (seção 6).**
- **Prazos de "parado" e "antigo" (`ASSISTENTES.md`):** sem eles, faltam os assistentes de tarefas paradas, arquivo e projetos parados.
- **Limite de 3 adiamentos (`AUTO-TRIAGEM.md`):** está em 3, como proposto; muda numa constante.

## 2. Segurança e privacidade

- **O backup é um JSON sem criptografia.** Com dados confidenciais de trabalho, o arquivo fica legível para quem tiver acesso à pasta do Drive. Uma senha de backup (criptografia no próprio navegador, com Web Crypto) resolveria, mas cria o risco de perder a senha e o backup junto.
- **Não há checagem automática das dependências.** Nem `npm audit` no build, nem Dependabot. As versões estão travadas, mas ninguém avisa quando uma delas tiver uma falha conhecida.
- **O teste de segurança procura padrões no texto do código.** O `src/security.test.ts` pega os casos comuns (`fetch`, `innerHTML`, URLs externas), mas não pega uma chamada disfarçada. A barreira real é a CSP com `connect-src 'none'`.
- **O build contém URLs externas em mensagens de erro.** Textos de erro do React e do Dexie citam `react.dev`, `bit.ly` e `tinyurl.com`. Não são chamadas de rede, e a CSP bloquearia se fossem, mas aparecem numa auditoria do bundle.
- **A CSP só existe no build de produção.** O servidor de desenvolvimento roda sem ela, então um erro que a CSP pegaria só aparece no `npm run preview` ou em produção.
- **`style-src 'unsafe-inline'`.** Está no `google-safe.md` e o React usa estilos inline. Dá para remover se a interface nunca usar o atributo `style`.

## 3. Backup e dados

- **O backup regrava o arquivo inteiro a cada mudança.** O histórico de eventos só cresce, então o arquivo e o tempo de gravação crescem junto. Hoje é irrelevante; com anos de uso, vale medir e talvez gravar só o que mudou.
- **Dois computadores no mesmo arquivo não se juntam.** A proteção impede que um apague os dados do outro, mas a saída é importar e perder as mudanças locais. Juntar os dados pelo histórico de eventos fica para a fase de sincronização.
- **A proteção compara horários de computadores diferentes.** Se o relógio de uma máquina estiver errado, ela pode achar que a versão mais velha é a mais nova.
- **Várias abas abertas gravam o mesmo arquivo.** Cada aba tem o próprio backup automático. Não perde dados, mas duplica gravações. Um `BroadcastChannel` ou Web Locks (ambos locais, sem rede) coordenaria as abas.
- **A importação valida pouco.** Ela confere o formato, a versão e as chaves dos registros, mas não os campos de cada um. Um backup editado à mão com um campo errado entraria no banco.
- **Importar não entra no histórico de eventos.** Importar e desfazer substituem tudo sem registrar um evento, então o histórico não mostra que houve uma importação.
- **Só existe uma cópia para desfazer.** Uma segunda importação substitui a cópia da primeira.
- **Não há migração de versões ainda.** Quando o banco passar da versão 1, o `parseBackup` vai precisar converter backups antigos, e isso precisa de teste.
- **O armazenamento persistente pode ser negado.** Se o Chrome não garantir a persistência, o app só avisa. O backup automático é a proteção de verdade.

## 4. Testes e qualidade

- **Não há testes de interface.** O domínio, os casos de uso, as consultas e o backup têm testes (257 no total). As telas foram conferidas à mão no navegador embutido, e um erro de interface só aparece usando.
- **Não há teste ponta a ponta** (Playwright ou similar) para os fluxos inteiros, como escolher um arquivo, importar e desfazer.
- **Os testes não rodam no deploy.** O build do Cloudflare roda `tsc` e `vite build`, mas não o `vitest`. Dá para incluir os testes no `npm run build` ou configurar GitHub Actions.
- **Não há lint.** O ESLint ficou de fora para ter menos dependências.
- **Os tipos do Node valem para o app inteiro.** O `tsconfig.json` inclui `node` por causa dos testes, então o código do app poderia usar uma API do Node sem erro de tipo. Um `tsconfig` separado para os testes resolve.

## 5. PWA e modo offline

- **O service worker não foi testado num Chrome de verdade** (seção 1).
- **O cache só é limpo quando o nome dele muda.** Arquivos de versões antigas se acumulam até alguém trocar `best-app-v1` no `sw.js`.
- **O app não avisa quando há uma versão nova.** A versão nova aparece só ao recarregar a página com internet.
- **Faltam ícones PNG** de 192 e 512 px, e um ícone "maskable", para instalação e atalhos.

## 6. Arquitetura

- **Algumas leituras ainda pulam a camada de aplicação.** As telas usam as consultas de `application/queries.ts`, mas a contagem de eventos do aviso de backup e a lista de projetos do checkout leem o banco direto.
- **O dia segue o fuso do computador.** Quem viaja entre fusos pode ver uma tarefa mudar de dia. Num app pessoal, é aceitável.
- **Algumas consultas varrem a tabela inteira.** As seções pendentes, a wiki e os quadros brancos filtram todas as seções na memória. Com anos de uso, vale criar índices para esses estados.
- **O editor depende de truques para digitação rápida.** As linhas novas aparecem antes de serem salvas, e as gravações rodam em fila (ADR-014). Funciona nos testes, mas colar várias linhas de uma vez ainda vira um bloco só, com quebras de linha dentro.
- **Texto digitado em menos de 400 ms antes de fechar a aba pode se perder.** A linha salva ao perder o foco e ao sair da tela, mas fechar o Chrome no meio da digitação não dá tempo.

## Editor e telas (1a e 1b)

- **Links no editor não são clicáveis.** Na nota do dia o texto é editável; os links viram clicáveis só na wiki, nas listas e no checkout.
- **Mover uma linha para outra seção** (arrastar ou atalho) não existe.
- **Converter um quadro branco em projeto direto no cabeçalho** só funciona pelo título; não há botão separado.
- **O seletor de datas dos atalhos** usa o calendário nativo do Chrome; limpar a data depende do botão "Limpar" dele.
- **Não há botão de nova seção entre seções.** As seções seguem a ordem de criação e não têm posição própria; inserir no meio exigiria mudar o modelo (decisão de 12/10/2026, N2 em `AVALIACAO-UX.md`).
- **A estrela parece não responder quando um prazo ocupa a terceira prioridade.** A tarefa promovida entra na lista, mas a do prazo toma o lugar dela na tela, pela regra do 1b. Vale um aviso curto ou mostrar a quarta como "na fila".
- **O menu "/" do editor (P3 em `AVALIACAO-UX.md`) não existe.** Só a dica na linha vazia foi feita.
- **"Lembrar depois" vale só neste navegador.** O dia adiado fica no `localStorage`, como a escolha de fixar as prioridades.
- **Página do projeto: tarefas criadas nela não podem ser apagadas.** Como na nota do dia, uma tarefa só sai de circulação pelo checkout ou pela reflexão; não há "apagar" para um erro de digitação logo depois de criar.
- **Página do projeto: juntar projetos repetidos pode deixar duas seções escondidas no mesmo projeto** (ADR-031). Funciona, porque a nova tarefa vai para a primeira, mas o assistente poderia juntar as duas.
- **Página do projeto: abaixo de 900 px, a coluna fixada só abre pelo botão da linha das abas**, em vez de aparecer sozinha por cima do conteúdo. O brief pedia que ela "se comportasse como espiando".
- **Página do projeto: o ritmo lê todos os eventos das tarefas do projeto a cada mudança.** Com anos de uso e projetos grandes, vale guardar só os eventos de finalizar e reabrir num índice próprio (ADR-033).
- **Página do projeto: o ritmo não aparece na lista de projetos.** Um projeto parado só se revela quando eu abro a página dele; um ponto de aviso na lista ajudaria.
- **O rascunho e a página do projeto divergem no hover das tarefas.** O rascunho escondia data e "adiada" no hover; a página segue o padrão da nota do dia (etiquetas sempre visíveis), como diz o `SPEC.md` (ADR-032).
- **O resto do roadmap de `AVALIACAO-UX.md`.** Os sete itens de "Fazer já" foram feitos em 12/10/2026; "Planejar", "Ajustes finos" e "Depois" continuam abertos.

## Adiado de propósito

Estes itens não são débito, mas aparecem aqui para não serem esquecidos:

- **App no Android e sincronização entre aparelhos:** fase posterior.
- **Integração com o Google Agenda:** só numa fase que permita conexões externas.
- **Assistente de tarefas paradas:** espera a definição dos prazos de "parado" e "antigo" (`ASSISTENTES.md`).
