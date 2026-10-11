# Débito técnico

Atualizado em Oct 11, 2026

O que ficou para trás na fase 0 (fundação e backup automático), de propósito ou por falta de como verificar. Cada item diz o risco e o que fazer. Quando um item for resolvido, ele sai daqui.

## 1. Depende de você

### Verificações no seu Chrome

Estes pontos não puderam ser testados no navegador embutido do Claude Code.

- [ ] **Modo offline.** O navegador embutido não registra service workers. Para testar: rode `npm run build` e `npm run preview`, abra o endereço no Chrome, confira em DevTools > Application > Service Workers que o `sw.js` está ativo, desligue a rede e recarregue a página.
- [ ] **Backup automático no Google Drive.** Escolha um arquivo numa pasta sincronizada do Drive, faça uma mudança e confira que o arquivo foi atualizado. Feche e reabra o Chrome para ver o pedido de autorização e o "Retomar".
- [ ] **"Permitir em todas as visitas".** Confira se o Chrome da máquina corporativa oferece essa opção ao app instalado. Sem ela, o backup automático pede um clique por sessão. Uma política da empresa pode bloqueá-la.
- [ ] **Instalação como app.** Confira se o Chrome oferece "Instalar". O ícone atual é só um SVG provisório, e o Chrome pode exigir ícones PNG de 192 e 512 px (veja a seção 5).

### Configuração e publicação

- [ ] **Commits.** O `git` não funciona no terminal do Claude Code, então todo o trabalho da fase 0 ainda precisa ser commitado por você, incluindo o `package-lock.json`. O `.gitignore` já impede que arquivos de backup entrem no repositório.
- [ ] **Cloudflare Pages.** Criar a conta e o projeto, conectar o repositório privado, usar `npm run build` como comando de build e `dist` como pasta de saída. Um domínio próprio é opcional.
- [ ] **Política da empresa.** O `google-safe.md` aceita hospedagem estática como o Cloudflare Pages, mas o código do app ainda é baixado de um servidor externo. Vale confirmar que isso é aceito antes de usar o app com dados reais.
- [ ] **Rascunhos de tela.** Copiar o conteúdo de `C:\Users\valer\Desktop\best app` para a pasta do projeto, como o `prompt.md` pede.

### Decisões de produto

- [ ] **Nome e ícone do app.** "Best App" e o ícone de check são provisórios.
- [ ] **Perguntas em aberto da spec.** São 14 nas seções 2 a 6, mais as de `AUTO-TRIAGEM.md` e `ASSISTENTES.md`. Nenhuma bloqueia o 1a.
- [ ] **Métrica mensal.** Decidir se ela conta "blocos" ou "tarefas" sem projeto (pendência no `HANDOFF.md`).
- [ ] **Página de privacidade.** Antes de outras pessoas usarem o app, uma página curta explicando que nada sai da máquina. O texto é decisão sua.

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

- **Não há testes de interface.** Só o domínio, o banco e o backup têm testes. As telas foram conferidas à mão no navegador embutido.
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

- **A interface lê o banco direto.** O `useLiveQuery` consulta o Dexie, pulando a camada de aplicação. No 1a, as consultas da nota do dia, da wiki e das listas devem virar funções da camada de aplicação.
- **Peças declaradas e ainda sem uso.** O campo `position` (ordem dos blocos) ainda não tem gerador, e a tabela `days` ainda não é usada. As duas entram no 1a.
- **O dia segue o fuso do computador.** Quem viaja entre fusos pode ver uma tarefa mudar de dia. Num app pessoal, é aceitável.

## Adiado de propósito

Estes itens não são débito, mas aparecem aqui para não serem esquecidos:

- **App no Android e sincronização entre aparelhos:** fase posterior.
- **Integração com o Google Agenda:** só numa fase que permita conexões externas.
- **Tela "Colocar ordem na casa" e os outros assistentes:** a partir do 1b.
