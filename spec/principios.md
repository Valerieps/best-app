# Princípios, primeiro uso e plataforma

- **Entra aqui:** os princípios que valem para o app inteiro, como o app é usado nos primeiros dias, e as decisões de plataforma e dados que a pessoa sente (onde os dados ficam, backup, offline, notificações).
- **Não entra aqui:** como isso é construído (`ARQUITETURA.md`) e as regras de segurança completas (`google-safe.md`).

## Princípios

- O app sempre avisa em vez de bloquear. A única exceção é a pasta do backup, que eu escolho antes de usar o app ("Primeiro uso").
- Sempre dá para criar ou editar qualquer coisa fora dos rituais. Os rituais existem apenas para garantir que isso será feito em alguma hora.
- Qualquer ritual pode ser acionado a qualquer hora (`abertura-do-dia.md`, "Rituais pulados").

## Primeiro uso

Antes de qualquer outra coisa, o app pede a pasta do backup, numa tela só, sem barra lateral e sem nenhum jeito de pular. A tela diz que os dados ficam só neste navegador, sem conta nem nuvem, recomenda uma pasta sincronizada com a nuvem (como o Google Drive ou o OneDrive), mostra a frequência do backup ("Backup") e tem o botão "Escolher pasta". Se a pasta já tiver um backup deste app, o app oferece importá-lo em seguida, como em qualquer escolha de pasta. A tela aparece para todo mundo que ainda não escolheu uma pasta, também para quem já tem dados no navegador. Num navegador que não deixa escolher pasta, a tela diz para usar o Chrome no computador, e o app não abre.

Depois da pasta, não há onboarding: eu já saio usando o ciclo diário, e os rituais e conceitos entram aos poucos.

- Primeiros dias: nota do dia, "Fechar o dia" e planejamento do dia seguinte, sem projetos nem objetivos.
- Depois, os projetos, o warm up e os objetivos entram quando eu quiser, pelas telas deles e pelas configurações. As sugestões que a primeira Revisão de Foco e a primeira Revisão de Rumo fariam saíram com elas.

## Plataforma e dados

- Nesta primeira fase, o app roda só no Chrome do computador, como um web app instalável (PWA). O Android fica para uma fase posterior.
- O app pode ser instalado no computador como PWA, pelas opções normais do Chrome (o ícone de instalar na barra de endereço); o app não tem botão próprio de instalar. A instalação no Android fica para a fase do Android. *(1b)*
- Os dados ficam só no navegador (IndexedDB), sem nuvem, login nem conexões externas, por causa das regras de segurança do meu trabalho. As regras estão em `google-safe.md`.
- O app é publicado como arquivos estáticos no Cloudflare Pages, para que outras pessoas também possam usar. Cada pessoa tem os próprios dados no próprio navegador, e nenhum dado passa pelo servidor.
- O app funciona sem internet.
- Não há servidor nem banco relacional, então as métricas são calculadas no próprio app, a partir do histórico. O volume de dados de uma pessoa só é pequeno o bastante para isso.
- O app não envia notificações: os lembretes reaparecem dentro dele.
- O app não tem compartilhamento: quem usa o app só vê os próprios dados, guardados no próprio navegador.
- O app guarda um histórico de eventos: cada mudança (criação, adiamento, finalização, vínculo) com data e hora, e não só o estado atual. Todas as métricas, inclusive as que ainda não existem, saem desse histórico.
- Cada bloco é um registro separado no banco, para evitar conflitos entre abas abertas e para permitir juntar os dados de aparelhos diferentes no futuro.
- Cada bloco existe uma vez só. A nota do dia, os projetos e os recursos apontam para ele por vínculos, sem cópias.
- A arquitetura é desenhada para o escopo completo da spec, e a implementação segue as partes em ordem.

## Aparência

- O app tem uma cor própria, o lilás dos projetos. Ela marca o que é ação ou lugar: o botão principal de cada tela, o item atual da barra lateral, os links, o foco do teclado, o checkbox e o contador de "Rituais". As cores de alerta (backup, prazos, assistentes) ficam só para alertas, para o contador de "Rituais" não parecer um problema. *(1b)*
- O texto usa a fonte Inter, que vem junto com o app: nada é baixado da internet. *(1b)*
- Em Configurações eu escolho a aparência: clara, escura ou igual à do sistema. Ela começa igual à do sistema, e o app lembra a escolha. *(1b)*

## Backup

- Como não há sincronização, o app faz backup automático numa pasta: eu escolho a pasta uma vez, no primeiro uso, de preferência sincronizada com a nuvem (como o Google Drive ou o OneDrive), e o app regrava nela o arquivo do backup. O backup automático já começa ligado. Também dá para baixar uma cópia e importar um backup a qualquer momento.
- Eu escolho com que frequência o backup é gravado, no primeiro uso e em "Dados e backup": "A cada mudança" (o padrão: alguns segundos depois da última mudança), "A cada 15 minutos" ou "A cada hora". Com 15 minutos ou uma hora, a primeira mudança começa a contar o tempo, e as seguintes entram na mesma gravação, para o backup sair mesmo se eu não parar de mexer. Ao fechar o app, só "A cada mudança" grava na hora; nas outras, o que faltou é gravado quando eu abro o app de novo, já que os dados continuam no navegador. As cópias datadas seguem a regra delas, abaixo.
- Como o arquivo do backup é regravado a cada mudança, um erro que estrague os dados chegaria a ele em segundos. Por isso o app também guarda cópias datadas, na subpasta "copias" da pasta do backup: do dia de hoje, uma cópia a cada 2 horas, ficando com as 5 mais recentes; de cada um dos 14 dias anteriores, só a última versão do dia. O app apaga sozinho as cópias além desse limite, e só elas: nunca mexe em outros arquivos.
- Antes de uma versão nova do app mudar o formato dos dados, a última versão no formato antigo também vira uma cópia.
- Em "Dados e backup", eu vejo as cópias por data e posso restaurar qualquer uma. Restaurar funciona como importar: mostra antes o que se perderia, e dá para desfazer.
- Quem escolheu um arquivo antes das cópias datadas continua com o backup nele, sem cópias, até escolher a pasta.
- O backup automático nunca grava por cima de um arquivo que tenha dados que o navegador não tem, como quando o Chrome apagou os dados do site ou outro computador salvou dados mais novos no mesmo arquivo. Nesse caso, ele pausa e sugere importar o arquivo. Vale também ao escolher uma pasta que já tem um backup.
- O Chrome pode pedir, a cada sessão, autorização para gravar na pasta. Enquanto eu não autorizo, o backup fica pausado, com um aviso discreto e um botão para retomar. Se o backup automático não está gravando (pausado ou sem arquivo) e o último backup foi há mais de 24 horas, o aviso fica forte: vermelho, no topo, "Seu último backup foi há N dias", com o botão "Retomar" (ou "Escolher pasta", quando não há arquivo). Só o tempo conta, não o número de mudanças.
- Importar um backup substitui todos os dados. Se a importação for apagar alguma coisa, o app mostra um aviso em destaque com o que vai se perder, e eu confirmo. Antes de substituir, o app guarda uma cópia do estado anterior, e eu posso desfazer a importação.
- Como o status e os avisos de backup aparecem na tela está em `navegacao.md`.
