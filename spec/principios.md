# Princípios, primeiro uso e plataforma

- **Entra aqui:** os princípios que valem para o app inteiro, como o app é usado nos primeiros dias, e as decisões de plataforma e dados que a pessoa sente (onde os dados ficam, backup, offline, notificações).
- **Não entra aqui:** como isso é construído (`ARQUITETURA.md`) e as regras de segurança completas (`google-safe.md`).

## Princípios

- O app sempre avisa em vez de bloquear.
- Sempre dá para criar ou editar qualquer coisa fora dos rituais. Os rituais existem apenas para garantir que isso será feito em alguma hora.
- Qualquer ritual pode ser acionado a qualquer hora, independente da cadência e dos sinais que deixam uma revisão disponível (`rituais.md`, "Quando uma revisão fica disponível").

## Primeiro uso

Não há onboarding: no primeiro uso eu já saio usando o ciclo diário, e os rituais e conceitos entram aos poucos.

- Primeiros dias: nota do dia, "Fechar o dia" e planejamento do dia seguinte, sem projetos nem objetivos.
- Primeira Revisão de Foco: o app sugere agregar tarefas em projetos e definir o checklist de warm up.
- Primeira Revisão de Rumo: o app sugere objetivos, a partir dos projetos que já existem.

## Plataforma e dados

- Nesta primeira fase, o app roda só no Chrome do computador, como um web app instalável (PWA). O Android fica para uma fase posterior.
- O app pode ser instalado no computador como PWA. A instalação no Android fica para a fase do Android. *(1b)*
- Os dados ficam só no navegador (IndexedDB), sem nuvem, login nem conexões externas, por causa das regras de segurança do meu trabalho. As regras estão em `google-safe.md`.
- O app é publicado como arquivos estáticos no Cloudflare Pages, para que outras pessoas também possam usar. Cada pessoa tem os próprios dados no próprio navegador, e nenhum dado passa pelo servidor.
- O app funciona sem internet.
- Não há servidor nem banco relacional, então as métricas são calculadas no próprio app, a partir do histórico. O volume de dados de uma pessoa só é pequeno o bastante para isso.
- O app não envia notificações: os lembretes reaparecem dentro dele.
- O app não tem compartilhamento: quem usa o app só vê os próprios dados, guardados no próprio navegador.
- O app guarda um histórico de eventos: cada mudança (criação, adiamento, finalização, vínculo) com data e hora, e não só o estado atual. Todas as métricas, inclusive as que ainda não existem, saem desse histórico.
- Cada bloco é um registro separado no banco, para evitar conflitos entre abas abertas e para permitir juntar os dados de aparelhos diferentes no futuro.
- Cada bloco existe uma vez só. Notas, projetos e wiki apontam para ele por vínculos, sem cópias.
- A arquitetura é desenhada para o escopo completo da spec, e a implementação segue as partes em ordem.

## Backup

- Como não há sincronização, o app faz backup automático em arquivo: eu escolho o arquivo uma vez, por exemplo numa pasta sincronizada do Google Drive, e o app regrava esse arquivo alguns segundos depois de cada mudança. Também dá para baixar uma cópia e importar um backup a qualquer momento.
- O backup automático nunca grava por cima de um arquivo que tenha dados que o navegador não tem, como quando o Chrome apagou os dados do site ou outro computador salvou dados mais novos no mesmo arquivo. Nesse caso, ele pausa e sugere importar o arquivo.
- O Chrome pode pedir, a cada sessão, autorização para gravar no arquivo. Enquanto eu não autorizo, o backup fica pausado, com um aviso discreto e um botão para retomar.
- Importar um backup substitui todos os dados. Se a importação for apagar alguma coisa, o app mostra um aviso em destaque com o que vai se perder, e eu confirmo. Antes de substituir, o app guarda uma cópia do estado anterior, e eu posso desfazer a importação.
- Como o status e os avisos de backup aparecem na tela está em `navegacao.md`.
