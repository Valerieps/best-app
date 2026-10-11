# Diretrizes de Desenvolvimento Seguro: Aplicativo de Produtividade Local-Only para Ambiente Corporativo Google

## 1. Contexto e Objetivo
Este documento define as regras arquiteturais, de segurança e de compliance para o desenvolvimento do aplicativo de produtividade pessoal baseado no arquivo `SPEC.md`.
O aplicativo será utilizado no Google Chrome dentro de uma máquina corporativa (gLinux/Macbook) com dados reais e confidenciais de trabalho.
O código-fonte é mantido em um repositório pessoal externo com objetivo de retenção de propriedade intelectual (IP) e eventual comercialização futura.

---

## 2. Princípio Fundamental: Zero-Cloud / Local-First Estrito

Para cumprir as diretrizes de segurança da informação (prevenção de exfiltração de dados confidenciais e conformidade com políticas de segurança da empresa), o aplicativo deve operar com isolamento total de rede:

1. **Sem Banco de Dados Externo / Sem Nuvem:**
   - É expressamente proibido o uso de Firebase (Firestore/Realtime Database), Supabase, AWS DynamoDB, REST APIs externas ou qualquer serviço de persistência remoto.
   - Todo o armazenamento deve residir 100% no cliente utilizando **IndexedDB** (preferencialmente encapsulado com bibliotecas leves como `Dexie.js` ou `idb`) ou `LocalStorage`.

2. **Isolamento de Rede e Ausência de Telemetria:**
   - O aplicativo **não deve fazer nenhuma chamada de rede de saída (outbound)** contendo dados digitados pelo usuário.
   - Proibido qualquer serviço de Analytics ou Telemetria de terceiros (ex: Google Analytics, Mixpanel, Sentry, Datadog, Hotjar).
   - Sem envio de relatórios de crash ou logs para servidores externos.

3. **Arquitetura Estática / Client-Side Only:**
   - O código deve ser composto exclusivamente por assets estáticos compilados (HTML, CSS e JavaScript).
   - O processamento de dados, ordenação de blocos, triagem de tarefas e cálculo de métricas devem ser executados unicamente no thread do navegador (Client-Side).

---

## 3. Diretrizes de Armazenamento e Persistência Local (IndexedDB)

1. **Modelo de Dados Orientado a Eventos:**
   - Implementar o histórico de eventos de produtividade (conforme especificado na seção de métricas do `SPEC.md`) diretamente em uma tabela do `IndexedDB`.
2. **Rotina de Backup / Portabilidade Segura:**
   - Como os dados no navegador podem ser apagados por limpeza de cache ou políticas de retenção de perfil, o app **deve** incluir:
     - Botão de **Exportar Dados**: gera e baixa um arquivo local `.json` diretamente no disco do usuário via `Blob` e link de download client-side.
     - Botão de **Importar Dados**: carrega e valida um arquivo `.json` local, restaurando o estado no `IndexedDB`.
   - Nenhuma dessas ações de exportação/importação deve trafegar por nenhum servidor intermediário.

---

## 4. Segurança do Navegador e Prevenção de Vulnerabilidades

1. **Content Security Policy (CSP) Estrita:**
   - Configurar tags meta de CSP proibindo conexões externas:
     ```html
     <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'self' data:;">
     ```
   - O parâmetro `connect-src 'none'` garante que mesmo em caso de erro no código, nenhuma requisição `fetch` ou `XMLHttpRequest` para servidores externos seja autorizada pelo navegador.

2. **Sanitização de Entradas (Anti-XSS):**
   - Usuários podem colar trechos de código, comandos de terminal ou links corporativos internos nos blocos de tarefas.
   - Todas as strings renderizadas no DOM devem ser sanitizadas contra injeção de script (usar `textContent` em vez de `innerHTML`, ou sanitizar rigorosamente com `DOMPurify` caso haja suporte a Markdown).

3. **Links e Acesso a Recursos:**
   - Quaisquer links inseridos nas tarefas para sistemas internos (ex: links `go/...` ou docs internos) devem ser abertos com atributos de segurança adequados:
     ```html
     target="_blank" rel="noopener noreferrer"
     ```

---

## 5. Dependências e Gerenciamento de Pacotes

1. **Minimização de Dependências:**
   - Reduzir ao máximo bibliotecas externas (`npm packages`) para mitigar riscos de supply chain attacks.
   - Se bibliotecas de terceiros forem necessárias (ex: biblioteca de ícones ou manipulação do IndexedDB), elas devem ser instaladas e empacotadas no build local estático, nunca carregadas via CDNs públicas dinâmicas (ex: `cdnjs`, `unpkg`).

2. **Sem Autenticação Remota:**
   - Proibido qualquer fluxo de OAuth, Firebase Auth ou solicitação de login de conta Google. O aplicativo abre diretamente para o ambiente de trabalho local do usuário.

---

## 6. Instruções para o Assistente (Claude)
Ao projetar e gerar código para este projeto:
- **Adapte o `SPEC.md` original:** Onde houver menção ao Firebase/Firestore, substitua automaticamente por chamadas assíncronas ao **IndexedDB**.
- **Garanta código limpo, performático e independente de infraestrutura de backend.**
- **Priorize arquitetura PWA estática** que possa ser servida via GitHub Pages/Vercel ou aberta localmente como arquivo local / extensão descompactada.

- ### 7. Backup e Portabilidade via File System (Sem OAuth)
- NÃO utilizar a Google Drive REST API nem autenticação OAuth (proibido por políticas de segurança).
- Implementar integração com armazenamento em nuvem de forma indireta utilizando a **File System Access API** do navegador (`showSaveFilePicker` e `showOpenFilePicker`):
  - Criar função `exportToDriveFile()`: permite que o usuário selecione diretamente um diretório local (incluindo pastas sincronizadas do Google Drive corporativo) para salvar o arquivo `backup.json`.
  - Criar função `importFromDriveFile()`: carrega o arquivo de backup selecionado pelo usuário e atualiza as tabelas do `IndexedDB`.
- Adicionar opção de "Auto-Save Prompt" ou botão de atalho rápido na barra superior para facilitar o backup antes de trocar de estação de trabalho.

