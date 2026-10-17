# Abertura do dia e lembretes

- **Entra aqui:** "Iniciar Dia", warm up, dashboard, mural, lembretes e o que acontece quando um ritual é pulado. *(3)* Os rituais pulados ficavam em `rituais.md`, que saiu junto com as revisões.
- **Não entra aqui:** as perguntas que um lembrete ignorado vira no "Fechar o dia" (`checkout.md`).

## Em aberto

- [ ] Onde eu crio e edito os lembretes do mural?
- [ ] Fechamento pendente do dia anterior bloqueia o "Iniciar o Flow de Execução" ou é só um botão a mais? E se houver vários dias pendentes?

## Warm up

- O app abre em uma tela branca com o botão "Iniciar Dia", que triga a rotina de warm up. Enquanto o checklist de warm up estiver vazio, o app pula essa tela e o warm up.
- O checklist de warm up é definido manualmente por mim, a qualquer momento, nas configurações.
- O que eu não quero realizar agora, eu posso "pular hoje" ou "perguntar de novo às XXh".
- Ao terminar o warm up, o app segue para o dashboard (veja "Dashboard").
- Se eu reabrir o app depois de já ter iniciado o dia, caio na nota do dia.

## Dashboard

O dashboard só aparece depois do warm up. Sem checklist de warm up, o app abre direto na nota do dia, mesmo com projetos em foco ou frases no mural: o dashboard não aparece só para mostrá-los nem para oferecer "registrar pensamentos", "registrar hábitos" ou o fechamento pendente.

A tela de boas-vindas mostra:

- os projetos em foco (`prioridades.md`)
- um mural com lembretes de mim para mim mesma (tipo frases mesmo). Ele mostra uma frase por vez, em rodízio. Aparecem no máximo 2 frases diferentes por dia: uma ao abrir o app, que é trocada às 13h. Cada frase tem uma frequência, baixa, média ou alta, em proporção: para cada vez que uma frase de frequência baixa aparece, uma média aparece 2 vezes e uma alta, 4. O rodízio segue uma ordem que respeita essas proporções, em vez de sorteio, para evitar que a mesma frase se repita seguidamente
- o botão "Iniciar o Flow de Execução", o mais proeminente
- botão de ação opcional: registrar pensamentos (entram em uma seção geral nova da nota do dia, com o título "Pensamentos", uma nota por linha)
- o botão "Fechar o dia", caso o dia anterior não tenha sido fechado
- a partir da seção 6, um botão para os hábitos (`habitos.md`, "Onde entram nos flows")

## Lembretes

- Lembretes tendem a virar paisagem, então o app não envia notificações. Um lembrete é um item que reaparece dentro do app depois do horário pedido, como no "perguntar de novo às XXh" do warm up.
- No desktop, com a aba do app aberta em segundo plano, o título da aba ganha um contador e o ícone ganha um ponto, sem som nem pop-up. Se o app estiver instalado no computador (Windows ou macOS), o mesmo contador pode aparecer no ícone da barra de tarefas.
- Ao voltar para o app, uma faixa discreta no topo da nota do dia mostra o que voltou, com três ações: feito, mais tarde e largar. Ela não cobre o texto. No Android, essa faixa é o único sinal: lá, o ícone de um app instalado pelo navegador só ganha um ponto quando há notificações, e o app não envia notificações.
- Se eu ignorar a faixa, ela continua ali até o fechamento, onde o item vira uma pergunta (`checkout.md`, "Destinos").
- Um lembrete de warm up marcado como feito marca o item como feito naquele dia.

## Rituais pulados

Pular um ritual não bloqueia o app, e qualquer ritual pode ser acionado depois, a qualquer hora.

| O que foi pulado | O que acontece |
| --- | --- |
| Item do warm up | Posso "pular hoje" ou pedir para "perguntar de novo às XXh" |
| Fechamento do dia anterior | O dashboard mostra o botão "Fechar o dia", e o dia pode começar sem prioridades |
| Dias não ativos | Não contam como pulados: eu configuro os dias ativos e, na sexta-feira, por exemplo, o dia seguinte é a segunda |
| Vários dias úteis sem abrir o app | Aparece a sugestão de "Fechar dias pendentes", que aplica a auto-triagem a todos os dias pendentes de uma vez (`checkout.md`) |
