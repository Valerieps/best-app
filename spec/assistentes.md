# Assistentes de limpeza

- **Entra aqui:** a tela "Rituais", com o calendário dos dias sem fechamento e os "Assistentes" (antes "Colocar ordem na casa"), e cada assistente: o que encontra e o que oferece. Antes, este arquivo ficava na raiz (`ASSISTENTES.md`).
- **Não entra aqui:** quais assistentes já foram construídos (`ROADMAP.md`) e as regras da auto-triagem (`checkout.md`).

Os "Assistentes" não têm data: eu escolho quando fazer e qual assistente abrir. Ele recebe tudo o que não perece de um dia para o outro e por isso saiu do "Fechar o dia" (`checkout.md`).

Os assistentes de limpeza colocam ordem na casa: cada um encontra o que está fora do lugar, sugere uma ação e eu aceito as sugestões de uma vez, como no fechamento em lote. Nenhum assistente apaga nada sozinho.

## Em aberto

- [ ] Os prazos que definem "parado" ou "antigo" (semanas, meses) ainda são chutes. Quais valem?

## A tela "Rituais"

O item "Rituais" da barra lateral abre esta tela, com duas partes, nesta ordem *(1b)*. O rascunho é o `rascunhos/rascunho-rituais_1.html`.

- **Fechar o dia:** um calendário pequeno, de um mês, com setas para os meses anteriores. Os dias sem fechamento ficam destacados, todos com a mesma cor, sem escala de idade. Hoje tem só um contorno. Os dias fechados ganham um ponto verde, e os dias sem nota ficam apagados. Clicar num dia destacado, ou em hoje, abre o "Fechar o dia" daquele dia; clicar num dia fechado não faz nada. Ao lado do título fica "Fechar dias pendentes", que fecha todos de uma vez, com as regras da auto-triagem (`checkout.md`).
- **Assistentes:** a grade de cartões descrita abaixo.
- O assistente "Dias em aberto" não tem cartão na grade, porque o calendário faz o papel dele.

## Como funcionam

- A grade "Assistentes" lista só os assistentes que têm algo a limpar, cada um com o número de itens.
- A cor de cada assistente diz há quanto tempo o item mais antigo dele está esperando, e não quantos itens são, porque o custo de limpar cresce com a idade: quanto mais tempo passa, menos eu lembro do contexto. Eu escolho o que limpar olhando as cores. A exceção é "Tarefas esquecidas", descrito abaixo.
- Cada assistente mostra os itens encontrados com uma ação pré-selecionada e o botão "Aceitar sugestões". Eu posso trocar qualquer ação antes. A exceção também é "Tarefas esquecidas".
- No 1a, só o "Fechar dias pendentes" tem tela, pelo aviso de fechamento pendente. A grade de assistentes e os outros assistentes entram a partir do 1b, para manter o núcleo enxuto.
- O mural não tem assistente, porque os lembretes dele não vencem.
- Seções soltas: seções sem título ficam de fora, porque não há como agrupá-las nem dar nome a um projeto. "Deixar como está" faz o assistente parar de sugerir aquelas seções.
- Tarefas esquecidas: entra toda tarefa aberta sem data de intenção criada há 15 dias ou mais, contados desde a criação da tarefa, e não desde que ela ficou sem data. Entram também as tarefas da página do projeto e as tarefas aguardando sem data para cobrar. As tarefas que esperavam a Revisão de Foco, que saiu do app, voltaram a ser tarefas sem data e entram como as outras. Eu mudo os 15 dias nas configurações.
- A cor de "Tarefas esquecidas" diz quantas tarefas estão em risco de abandono, e não a idade da mais antiga, porque todas já são antigas: amarelo a partir de 5, laranja a partir de 10 e vermelho a partir de 15. Eu mudo os limites nas configurações, como os dos outros assistentes.
- Em "Tarefas esquecidas", nenhuma ação vem escolhida, porque essa triagem precisa ser muito intencional. Para cada tarefa eu escolho "Colocar data", "Converter em nota" ou "Abandonar", e clicar de novo na ação escolhida desfaz a escolha. A tarefa sem escolha fica como está e continua no assistente.
- Ao clicar em "Seguir", as tarefas marcadas para abandonar e converter em nota são gravadas. A tarefa convertida em nota fica onde foi escrita, na mesma seção e no mesmo projeto; uma tarefa da página do projeto vira uma nota na página do projeto, com a data de hoje.
- As tarefas marcadas para "Colocar data" vão para uma segunda tela, com o mesmo quadro do "Fechar o dia" (`checkout.md`, "Quadros do fechamento e fim do dia"): elas ficam na coluna "Sem data", e as outras colunas são hoje e os três dias seguintes. Eu arrasto cada uma para o dia que quiser, ou para "Abandonar tarefa", e posso finalizá-la pela caixinha. A tarefa que eu deixo em "Sem data" fica como estava e continua no assistente. Colocar a data não conta como adiamento.
- Projetos repetidos: nomes parecidos são os que ficam iguais sem espaços, acentos e maiúsculas, ou que diferem por uma letra quando têm 5 letras ou mais. "Juntar" mantém o projeto mais antigo e move para ele as seções e tarefas dos outros; "Manter separados" faz o assistente parar de sugerir aquele grupo.

## Assistentes

| Assistente | O que encontra | O que oferece | A partir de |
| --- | --- | --- | --- |
| Dias em aberto | Dias sem fechamento. Sem cartão: aparece como o calendário da tela "Rituais" | "Fechar dias pendentes", com as regras da auto-triagem | 1a |
| Seções soltas | Seções que ficaram sem projeto, agrupando os títulos repetidos. Quando o texto de uma seção cita o nome de um projeto existente, a sugestão é vincular a ele | Converter em projeto, vincular a um existente ou deixar como está | 1b |
| Tarefas esquecidas | Tarefas sem data criadas há 15 dias ou mais, em risco de abandono | Colocar data de intenção, converter em nota ou abandonar | 1b |
| Projetos repetidos | Projetos com nomes parecidos, como "Data Studios" e "DataStudios" | Juntar em um projeto só | 1b |
| Projetos parados | Projetos sem nenhuma atividade há 14 dias ou mais (`projetos.md`, "Lista de projetos") | Finalizar ou manter | 2 |
| Warm up | Itens do checklist que eu quase sempre pulo | Tirar do checklist | 3 |
| Objetivos soltos | Objetivos sem projeto ativo, ou com a meta talvez atingida | Finalizar ou vincular projetos | 4 |
| Compromissos passados | Compromissos passados que não foram migrados nem marcados | Marcar como feito ou descartar | 5 |
| Hábitos sumidos | Hábitos sem registro há semanas | Manter ou remover | 6 |
