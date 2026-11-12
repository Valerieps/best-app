# Ideias

- **Entra aqui:** a ideia: como eu a capturo, o vínculo com projeto, o que eu penso sobre ela e os destinos que ela pode ter. *(7)*
- **Não entra aqui:** a sintaxe das linhas da nota do dia (`nota-do-dia.md`), as tarefas (`tarefas.md`) e os projetos (`projetos.md`).

Por quê: muitas coisas que eu coleto são ideias incompletas, que talvez algum dia eu pare para pensar. Antes elas viravam tarefas sem data e se perdiam no meio das tarefas que eu vou mesmo fazer.

## Em aberto

- [ ] Como eu reviso as ideias para elas não virarem um cemitério? A proposta: separar a triagem (dar destino rápido, as mais antigas primeiro, no máximo umas 7 por vez) da incubação (pensar com calma em 1 a 3 ideias). A triagem seria um assistente da tela "Rituais" (`assistentes.md`), com um aviso no "Iniciar Dia" quando passar de N ideias sem revisão ou de N dias; a incubação seria a própria página da ideia. Ou um ritual "Revisar ideias" com data?

## Ideia

- Uma linha que começa com `[?] ` é uma ideia, em qualquer seção (`nota-do-dia.md`, "Blocos e notas"). A ideia não é tarefa: não tem data, não entra na lista de tarefas nem nas prioridades.
- A ideia escrita numa seção vinculada a um projeto, ou com a tag `#Projeto` na linha, nasce ligada a esse projeto, como uma tarefa. Ela aparece no grupo "Ideias" da página do projeto (`projetos.md`, "Página do projeto") e na lista de todas as ideias, com a cápsula do projeto.
- Uma ideia passa por três momentos: capturada; pensada, quando eu escrevo o que penso sobre ela; e decidida, quando ganha um destino.
- A ideia não passa pelo "Fechar o dia": ela não perece de um dia para o outro. Fica onde foi escrita, na lista de ideias e no grupo do projeto, até ganhar um destino.
- Enquanto eu não escrevi nada sobre ela nem lhe dei um destino, a linha da ideia é texto como outro qualquer: no dia em que a escrevi, posso apagá-la ou voltá-la a nota. *(decidido pelo agente; veja a issue #164)*
- Depois do destino, a linha continua na nota do dia em que foi escrita: a que virou tarefa aparece como tarefa, e as outras com "virou projeto" ou "largada". *(decidido pelo agente; veja a issue #164)*

## Lista de ideias

- "Ideias" é um lugar próprio da barra lateral, logo abaixo de Pessoas, com a contagem das ideias sem destino (`navegacao.md`).
- A lista mostra todas as ideias sem destino, as mais antigas primeiro, cada uma com a cápsula do projeto, o dia em que foi escrita e quantas vezes eu disse "ainda não". Clicar numa ideia abre a página dela. *(a ordem foi decidida pelo agente; veja a issue #164)*

## Página da ideia

- Cada ideia tem uma página. No topo fica o texto da própria linha `[?]`, que é o título: editar ali muda a linha na nota do dia, porque é a mesma linha.
- Embaixo, eu escrevo o que penso sobre a ideia num texto longo, no mesmo editor da nota do dia: formatação, `@Pessoa`, `#Projeto`, Enter para quebrar a linha.
- Uma linha que começa com `[] ` ali é uma tarefa de verdade, sem data, do projeto da ideia, e aparece na lista de tarefas e na página do projeto. Uma linha com `[?] ` é outra ideia, também do projeto da ideia. *(a ideia dentro da ideia foi decidida pelo agente; veja a issue #164)*
- Os destinos ficam como botões na página: "Virar tarefa", "Virar projeto", "Largar" e "Ainda não".

## Destinos

- **Virar tarefa:** a ideia vira uma tarefa sem data, do mesmo projeto, quando tem um. Dali eu posso pô-la na fila de execução (`prioridades.md`, "Fila de execução"). Ela conta como decidida no dia, então não entra no "Fechar o dia". O que eu escrevi sobre ela fica guardado, mas sem tela. *(decidido pelo agente; veja a issue #164)*
- **Virar projeto:** a ideia cresceu e vira um projeto próprio, que já nasce ativo. O projeto novo leva o que eu escrevi sobre a ideia, como notas, e guarda de qual projeto ela veio, quando veio de um. O nome do projeto é o texto da ideia sem a tag de projeto, e as tarefas que eu escrevi na página da ideia passam para o projeto novo. *(decidido pelo agente; veja a issue #164)*
- **Largar:** a ideia sai de circulação, como a tarefa abandonada. Só o histórico de eventos guarda.
- **Ainda não:** a ideia volta para a fila. O app conta quantas vezes eu disse "ainda não", como conta os adiamentos de uma tarefa. Depois de 3 vezes sem nenhuma nota nova sobre a ideia, a revisão sugere largar.
