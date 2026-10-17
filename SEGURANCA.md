# Segurança

As regras de segurança que todo código do app segue. As que podem ser testadas são conferidas pelo `src/security.test.ts`, que roda em todo `npm test` e em todo build.

- **Entra aqui:** as regras de segurança e de privacidade, curtas.
- **Não entra aqui:** como cada regra foi implementada (ADRs citadas abaixo), o que ainda falta verificar (issues `t:debito-tecnico` e `t:vulnerability`) e o contexto de onde o app é usado (fica no `google-safe.md`, fora do git, só na cópia da dona).

## 1. Local-only

- Os dados ficam só no navegador, no IndexedDB. Nada de banco externo, nuvem ou API remota de persistência (Firebase, Supabase e afins).
- O app não faz nenhuma chamada de rede de saída. A CSP do build de produção tem `connect-src 'none'`, para o navegador bloquear até uma chamada feita por engano.
- Sem analytics, telemetria, relatórios de erro ou logs enviados para fora.
- Sem login nem OAuth: o app abre direto nos dados locais.
- O app é feito só de arquivos estáticos (HTML, CSS e JavaScript), e todo processamento roda no navegador.

## 2. Backup

- O backup vai só para arquivos locais que eu escolho, pela File System Access API: a pasta do backup automático, com cópias datadas (ADR-047), e a cópia baixada pelo navegador (`Blob`).
- Nenhum backup, exportação ou importação passa por um servidor, e o app nunca fala com um serviço de nuvem, nem com a API do Google Drive. Uma pasta sincronizada é sincronizada pelo próprio cliente do Drive, não pelo app.
- O backup automático nunca grava por cima de dados que o navegador não tem (ADR-008).
- Arquivos de backup nunca entram no repositório (`.gitignore`).

## 3. No navegador

- **CSP** injetada como meta tag no build de produção (ADR-009):
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'`.
  Ela não vai nos cabeçalhos (`public/_headers`), porque lá valeria também para o service worker e o impediria de guardar os arquivos do app.
- **Texto do usuário nunca vira HTML:** `textContent` ou elementos React, nunca `innerHTML` nem `dangerouslySetInnerHTML`.
- **Links** abrem com `target="_blank" rel="noopener noreferrer"`, só `http`, `https` e `mailto`.
- Nenhum dado pessoal vai para a URL.

## 4. Dependências

- O mínimo de bibliotecas, com versões exatas, instaladas com `npm ci` (ADR-001).
- Tudo empacotado no build, nunca carregado de CDN: ícones desenhados no código, fonte empacotada (ADR-054).
- O Dependabot propõe as atualizações; cada uma é um PR que só entra com o build passando.
