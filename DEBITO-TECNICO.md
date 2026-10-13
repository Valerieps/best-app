# Débito técnico

Atualizado em Oct 12, 2026

O que ficou para trás no código, de propósito ou por falta de como verificar. Cada item diz o risco e o que fazer. Quando um item for resolvido, ele sai daqui.

- **Entra aqui:** débito técnico, verificações que faltam, bugs e limitações conhecidas.
- **Não entra aqui:** funcionalidades que faltam ou esperam pergunta em aberto, e onde o código ainda não segue o `SPEC.md` (`ROADMAP.md`); decisões de produto pendentes (`ROADMAP.md`, "Antes de outras pessoas usarem").

## 1. Depende de você

### Verificações no seu Chrome

Estes pontos não puderam ser testados no navegador embutido do Claude Code.

- [ ] **Modo offline.** O navegador embutido não registra service workers. Para testar: rode `npm run build` e `npm run preview`, abra o endereço no Chrome, confira em DevTools > Application > Service Workers que o `sw.js` está ativo, desligue a rede e recarregue a página.
- [ ] **Backup automático no Google Drive.** Escolha um arquivo numa pasta sincronizada do Drive, faça uma mudança e confira que o arquivo foi atualizado. Feche e reabra o Chrome para ver o pedido de autorização e o "Retomar".
- [ ] **"Permitir em todas as visitas".** Confira se o Chrome da máquina corporativa oferece essa opção ao app instalado. Sem ela, o backup automático pede um clique por sessão. Uma política da empresa pode bloqueá-la.
- [ ] **Instalação como app.** Confira se o Chrome oferece "Instalar". O ícone atual é só um SVG provisório, e o Chrome pode exigir ícones PNG de 192 e 512 px (veja a seção 5).
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

## 2. Segurança e privacidade

- **O backup é um JSON sem criptografia.** Com dados confidenciais de trabalho, o arquivo fica legível para quem tiver acesso à pasta do Drive. Uma senha de backup (criptografia no próprio navegador, com Web Crypto) resolveria, mas cria o risco de perder a senha e o backup junto.
- **Não há checagem automática das dependências.** Nem `npm audit` no build, nem Dependabot. As versões estão travadas, mas ninguém avisa quando uma delas tiver uma falha conhecida.
- **O teste de segurança procura padrões no texto do código.** O `src/security.test.ts` pega os casos comuns (`fetch`, `innerHTML`, URLs externas), mas não pega uma chamada disfarçada. A barreira real é a CSP com `connect-src 'none'`.
- **O build contém URLs externas em mensagens de erro.** Textos de erro do React e do Dexie citam `react.dev`, `bit.ly` e `tinyurl.com`. Não são chamadas de rede, e a CSP bloquearia se fossem, mas aparecem numa auditoria do bundle.
- **A CSP só existe no build de produção.** O servidor de desenvolvimento roda sem ela, então um erro que a CSP pegaria só aparece no `npm run preview` ou em produção.
- **`style-src 'unsafe-inline'`.** Está no `google-safe.md` e o React usa estilos inline. Dá para remover se a interface nunca usar o atributo `style`.

## 3. Backup e dados

Ordenado por prioridade: os primeiros são os mais graves ou os que têm mais chance de acontecer.

### Alta

1. **Um erro nos dados do navegador sobrescreve o único backup.** Há um arquivo só, regravado a cada mudança. A proteção olha só blocos, seções, projetos, dias e eventos, e só pega registros que sumiram ou voltaram a uma versão anterior. Uma migração com defeito (a da versão 6 apaga e regrava `priorities`) ou um bug que estrague campos chegaria ao arquivo em segundos. O histórico de versões do Drive não salva: ele guarda um número limitado de versões, e gravações a cada poucos segundos as esgotam rápido. **O que fazer:** manter cópias datadas no mesmo lugar (por exemplo, uma por dia, guardando as últimas 7 a 14) e uma cópia antes de cada migração do banco.
2. **O backup pode parar sem aviso claro.** Se o Chrome não oferecer "Permitir em todas as visitas" (seção 1), cada sessão pede um clique em "Retomar". Depois do primeiro backup, `backupNoticeLevel` (`ui/notices.ts`) não mostra mais banner nesse estado, só o indicador discreto. Dá para passar semanas sem backup sem perceber. **O que fazer:** um aviso forte quando o último backup passar de um prazo (por exemplo, 24 horas) ou de um número de eventos.

### Média

3. **Dois computadores no mesmo arquivo não se juntam.** A proteção impede que um apague os dados do outro, mas a saída é importar e perder as mudanças locais. Juntar os dados pelo histórico de eventos fica para a fase de sincronização.
4. **A proteção compara horários de computadores diferentes.** Se o relógio de uma máquina estiver errado, ela pode achar que a versão mais velha é a mais nova. O impacto é limitado: afeta só a contagem de registros "revertidos", porque os eventos são comparados pelo id.
5. **A importação valida pouco.** Ela confere o formato, a versão e as chaves dos registros, mas não os campos de cada um. Um backup editado à mão com um campo errado entraria no banco. O mesmo vale para o arquivo lido pelo backup automático.
6. **Só existe uma cópia para desfazer.** Uma segunda importação substitui a cópia da primeira. O item 1 (cópias datadas) também resolveria isso.
7. **Migrações de versão sem teste com dados reais.** O banco já está na versão 6 e `parseBackup` converte backups antigos (`upgradeTables`), com testes. Falta conferir num navegador com dados reais (veja "Não verificado" mais abaixo), e cada nova versão precisa do seu passo em `upgradeTables` e do seu teste.
8. **Uma exclusão nova precisa entrar na lista da proteção.** A proteção só aceita que um registro sumiu do navegador se o histórico tiver um evento de exclusão para ele (`DELETION_EVENTS` em `application/backup.ts`, hoje `block.deleted` e `resource.removed`). Um caso de uso novo que apague um registro de vez sem entrar nessa lista vai pausar o backup automático com um aviso falso.

### Baixa

9. **O backup regrava o arquivo inteiro a cada mudança.** E antes de cada gravação lê e interpreta o arquivo inteiro e lê o banco inteiro, tudo na thread da interface e com o JSON indentado. O histórico de eventos só cresce, então isso cresce junto. Hoje é irrelevante; com anos de uso, vale medir e talvez gravar sem indentação, num worker, ou só o que mudou.
10. **Importar não entra no histórico de eventos.** Importar e desfazer substituem tudo sem registrar um evento, então o histórico não mostra que houve uma importação.
11. **Várias abas abertas gravam o mesmo arquivo.** Cada aba tem o próprio backup automático. Não perde dados, porque todas leem o mesmo banco, mas duplica gravações. Um `BroadcastChannel` ou Web Locks (ambos locais, sem rede) coordenaria as abas.
12. **O armazenamento persistente pode ser negado.** Se o Chrome não garantir a persistência, o app só avisa. O backup automático é a proteção de verdade, o que torna os itens 1 e 2 mais importantes.

## 4. Testes e qualidade

- **Não há testes de interface.** O domínio, os casos de uso, as consultas e o backup têm testes (300 no total). As telas foram conferidas à mão no navegador embutido, e um erro de interface só aparece usando.
- **Não há teste ponta a ponta** (Playwright ou similar) para os fluxos inteiros, como escolher um arquivo, importar e desfazer.
- **Os testes não rodam no deploy.** O build do Cloudflare roda `tsc` e `vite build`, mas não o `vitest`. Dá para incluir os testes no `npm run build` ou configurar GitHub Actions.
- **Não há lint.** O ESLint ficou de fora para ter menos dependências.
- **Os tipos do Node valem para o app inteiro.** O `tsconfig.json` inclui `node` por causa dos testes, então o código do app poderia usar uma API do Node sem erro de tipo. Um `tsconfig` separado para os testes resolve.
- **Os dados sintéticos ganharam um "Curso de inglês"** de cerca de 4 meses antes da história principal, para os mapas de 16 semanas terem histórico. Isso muda a narrativa de "primeiros dias sem projetos".
- **O `.claude/launch.json` ganhou uma configuração temporária `dev-verify`** (porta 65021), criada para testar sem apagar os dados da porta 5173. Pode ser removida.

## 5. PWA e modo offline

- **O service worker não foi testado num Chrome de verdade** (seção 1).
- **O cache só é limpo quando o nome dele muda.** Arquivos de versões antigas se acumulam até alguém trocar `best-app-v1` no `sw.js`.
- **O app não avisa quando há uma versão nova.** A versão nova aparece só ao recarregar a página com internet.
- **Faltam ícones PNG** de 192 e 512 px, e um ícone "maskable", para instalação e atalhos.
- **O pacote principal passa de 500 kB.** O `npm run build` avisa desde 12/10/2026. Num app offline, pesa só na primeira carga; dividir com `import()` dinâmico resolveria.

## 6. Arquitetura

Revisada em 12/10/2026. Ordenado por prioridade.

### Alta

1. **Um erro numa tela deixa o app inteiro em branco.** Não há error boundary no React. Uma exceção ao desenhar qualquer tela derruba tudo, inclusive "Dados e backup", e num app sem servidor nem telemetria a única saída é recarregar. Além disso, `useLiveQuery` (`ui/useLiveQuery.ts`) troca qualquer erro de consulta por `undefined`, que as telas leem como "carregando": a tela fica no esqueleto para sempre, sem nada no console. **O que fazer:** um error boundary por tela, com uma mensagem e um atalho para "Dados e backup"; e `useLiveQuery` devolver o erro (ou ao menos registrá-lo) em vez de fingir que está carregando.
2. **Os detalhes dos eventos não têm tipo.** `DomainEvent.data` é `Record<string, unknown>` (`domain/events.ts`), e quem grava e quem lê (métricas, atividade dos projetos, raio-x) combinam os nomes dos campos só por convenção. Como os eventos nunca são editados, um campo com nome errado ou um formato que muda grava um histórico que as métricas futuras não conseguem ler, e nenhum teste de tipo avisa. **O que fazer:** uma união discriminada por `type` (`{ type: 'task.postponed'; data: { from; to } }`), usada por `record` e pelas leituras; e uma versão no formato do evento para quando ele precisar mudar.

### Média

3. **Leituras e gravações que pulam a camada de aplicação.** O fluxo de backup inteiro (`ui/backup/useBackup.ts`, `BackupPanel.tsx`, `App.tsx`) chama `infrastructure/backupRepository` e `backupFiles` direto com o `db`, e `AutoBackupState`, que a interface e `ui/notices.ts` usam, mora na infraestrutura. O `App` conta eventos com `db.events.count()`. Correção do texto anterior: a lista de projetos do checkout passa pelo `Reader`, não pelo banco; o problema dela é outro (item 8). **O que fazer:** casos de uso de backup em `application/` com uma porta `BackupStorage`, e o tipo do estado do backup automático em `application/autoBackup.ts`.
4. **Os serviços são globais criados na importação.** `ui/services.ts` abre o banco e monta o backup automático assim que é importado, e cada tela importa `appContext`, `reader` e `db` direto. Não há como dar a uma tela um banco de teste, o que explica em parte a falta de testes de interface (seção 4). **O que fazer:** montar os serviços em `main.tsx` e entregá-los por um contexto do React (`useServices()`).
5. **A reatividade depende do Dexie por baixo da porta `Reader`.** As consultas de `application/queries.ts` recebem um `Reader` genérico, mas só se atualizam sozinhas porque o `liveQuery` do Dexie rastreia o que é lido durante a execução. Uma outra implementação do `Reader` (por exemplo, na sincronização) ou uma consulta que espere algo fora do Dexie perde a atualização sem erro. A interface também importa `dexie` em `useLiveQuery.ts`. **O que fazer:** documentar a regra numa ADR, ou expor a assinatura de mudanças como uma porta (`observe(query)`) implementada na infraestrutura.
6. **A importação corre em paralelo com o editor.** Importar e desfazer gravam fora do `Store` e da fila do editor (`ui/writeQueue.ts`). Uma linha ainda na fila (por exemplo, salva ao perder o foco ao clicar em "Importar") pode ser gravada depois da importação, misturando os dois estados. A fila também só cobre o editor e a página do projeto. **O que fazer:** passar importar e desfazer pela mesma fila, ou esvaziá-la antes de importar.
7. **A lista de tabelas está repetida em seis lugares.** `db.ts`, `DexieStore.transaction`, `StoreTransaction`, `userTables` e `readAllTables` em `backupRepository.ts`, e `BACKUP_TABLES`. O compilador pega só parte dos esquecimentos: uma tabela nova fora da lista de `DexieStore` só falha ao gravar, e fora de `userTables` faz importar e desfazer falharem. **O que fazer:** derivar as listas de `BACKUP_TABLES` e um teste que confira que toda tabela do banco, menos `meta` e `snapshots`, está no backup.

### Baixa

8. **O checkout carrega sem cancelar.** `CheckoutScreen` lê triagem, projetos e objetivos com `.then` num `useEffect` sem cancelamento. Trocar de dia rápido pode mostrar a resposta do dia anterior, e sair da tela antes da resposta gera um `setState` perdido. A foto fixa é proposital (a triagem não muda sob a mão), mas precisa ignorar respostas velhas.
9. **A interface usa `new Date()` em vez do `Clock`.** `useToday`, lembretes, o "Lembrar depois" do aviso de revisão, a linha nova do editor (`draftBlock`) e o backup leem o relógio direto. Os casos de uso recebem o `Clock`, mas a interface decide "agora" sozinha, então não dá para testar a virada do dia nem um lembrete vencendo.
10. **Toda gravação trava as 13 tabelas e espera com `Dexie.waitFor`.** Simples e seguro hoje (ADR-003), mas serializa tudo e o `waitFor` desiste depois de 60 segundos. Só importa se um caso de uso ficar longo, como juntar muitos projetos.
11. **O dia segue o fuso do computador.** Quem viaja entre fusos pode ver uma tarefa mudar de dia. Num app pessoal, é aceitável.
12. **Algumas consultas varrem a tabela inteira.** As seções pendentes, a wiki e os quadros brancos filtram todas as seções na memória (`infrastructure/dexieReader.ts`). Com anos de uso, vale criar índices para esses estados. `projectId === null` não pode ser indexado no IndexedDB, então "quadro branco pendente" precisa de um campo próprio.
13. **O editor depende de truques para digitação rápida.** As linhas novas aparecem antes de serem salvas, e as gravações rodam em fila (ADR-014). Funciona nos testes, mas colar várias linhas de uma vez ainda vira um bloco só, com quebras de linha dentro.
14. **Texto digitado em menos de 400 ms antes de fechar a aba pode se perder.** A linha salva ao perder o foco e ao sair da tela, mas fechar o Chrome no meio da digitação não dá tempo.
15. **`application/queries.ts` concentra todas as leituras** (cerca de 630 linhas, de nota do dia a hábitos). Ainda é fácil de seguir, mas vale dividir por área quando crescer.

## 7. Editor e telas

- **Links no editor não são clicáveis.** Na nota do dia o texto é editável; os links viram clicáveis só na wiki, nas listas e no checkout.
- **Mover uma linha para outra seção** (arrastar ou atalho) não existe.
- **Converter um quadro branco em projeto direto no cabeçalho** só funciona pelo título; não há botão separado.
- **O seletor de datas dos atalhos** usa o calendário nativo do Chrome; limpar a data depende do botão "Limpar" dele.
- **Não há botão de nova seção entre seções.** Uma seção nova entra no fim e depois pode ser movida (ADR-040); inserir direto no meio continua sem botão (decisão de 12/10/2026, N2 em `AVALIACAO-UX.md`).
- **Alças de reordenar no toque.** As alças das linhas e das seções só aparecem com o mouse em cima ou com o foco dentro; num celular, é preciso tocar na linha antes. Não foi testado em tela de toque de verdade (ADR-040).
- **Digitação muito rápida logo depois de Enter perde a detecção de tarefa.** Se o `[] ` chega antes de a linha nova (ou a troca de tarefa para nota) ser gravada, o texto fica como nota com `[] ` no começo. Só apareceu com digitação automatizada, ao verificar a reordenação; também acontece sem ela.
- **A estrela parece não responder quando um prazo ocupa a terceira prioridade.** A tarefa promovida entra na lista, mas a do prazo toma o lugar dela na tela, pela regra do 1b. Vale um aviso curto ou mostrar a quarta como "na fila".
- **"Lembrar depois" vale só neste navegador.** O dia adiado fica no `localStorage`, como a escolha de fixar as prioridades.

## 8. Projetos e projetos em foco

- **Página do projeto: tarefas criadas nela não podem ser apagadas.** Como na nota do dia, uma tarefa só sai de circulação pelo checkout ou pela Revisão de Foco; não há "apagar" para um erro de digitação logo depois de criar.
- **Página do projeto: juntar projetos repetidos pode deixar duas seções escondidas no mesmo projeto** (ADR-031). Funciona, porque a nova tarefa vai para a primeira, mas o assistente poderia juntar as duas.
- **Página do projeto: abaixo de 900 px, a coluna fixada só abre pelo botão da linha das abas**, em vez de aparecer sozinha por cima do conteúdo. O brief pedia que ela "se comportasse como espiando".
- **O rascunho e a página do projeto divergem no hover das tarefas.** O rascunho escondia data e "adiada" no hover; a página segue o padrão da nota do dia (etiquetas sempre visíveis), como diz o `spec/navegacao.md` (ADR-032).
- **Acessibilidade do mapa.** Cada mapa tem só um resumo para leitor de tela ("N dias com atividade"); o detalhe de cada dia só aparece com o mouse e não é alcançável pelo teclado.
- **A lista de projetos demora a atualizar.** Ela relê os eventos de todos os projetos a cada mudança (cerca de 700 ms no modo de desenvolvimento, com os dados sintéticos). Os grupos já abrem na hora, mas colocar um projeto em foco ou finalizar um projeto só aparece depois. Com anos de uso vale um índice ou cache da atividade por dia.
- **A disponibilidade das revisões relê o histórico inteiro.** `loadReviewAvailability` (`application/reviewQueries.ts`) lê todos os eventos e a atividade dos projetos em foco e dos objetivos a cada mudança, porque roda numa consulta ao vivo do app. Com anos de uso, vale guardar a contagem ou ler só os eventos depois da última revisão.
- **Juntar projetos repetidos** com um projeto em foco: o projeto juntado sai da lista (fica `merged`), mas o projeto de destino não herda a vaga.
- **Migração corta em 3.** Um mês com mais de 3 projetos prioritários vira uma semana com só os 3 primeiros, sem aviso. A semana do dia 1º pode começar no mês anterior (por exemplo, 28/09 para outubro), então os últimos dias de setembro passam a usar a lista de outubro no raio-x.
- **A atividade segue o vínculo atual.** Uma tarefa vinculada ao projeto no checkout conta como atividade no dia em que foi escrita, mesmo que naquele dia ela não fosse do projeto. Notas apagadas ou esvaziadas deixam de contar.
- **Projeto em foco sem atividade:** o card mostra "Nenhuma atividade ainda" ou "Parado há N dias" contados desde a criação, não desde que entrou em foco.
- **"desde" nas tarefas travadas** usa a primeira data de intenção (ou o dia em que a tarefa foi escrita), não o dia do primeiro adiamento.
