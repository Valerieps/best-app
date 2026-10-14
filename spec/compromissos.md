# Compromissos e detecção de tipo

- **Entra aqui:** o compromisso como tipo de bloco e a detecção automática do tipo pelo formato do texto. *(5)*
- **Não entra aqui:** os destinos do compromisso no "Fechar o dia" (`checkout.md`, "Destinos").

## Em aberto

- [ ] Quais são os formatos pré-definidos que identificam cada tipo de bloco?
- [ ] Como eu corrijo um bloco que foi detectado com o tipo errado?

## Regras

- Os tipos de bloco passam a ser três: tarefa, compromisso e nota geral.
- O tipo do bloco é detectado de acordo com formatos pré-definidos (por exemplo, `<data: __>` é compromisso). O que não encaixar em nenhum fica como nota geral.
- Compromissos são blocos criados manualmente na nota do dia e ficam guardados no banco de dados do app. Os do dia já constam na nota do dia, junto das tarefas.
- Compromissos, como as tarefas, só se vinculam a projetos.
- A agenda externa é o Google Agenda. Como o app não tem conexões externas, eu crio o evento lá e marco o compromisso como migrado à mão, o que conta como concluído. A integração automática fica para uma fase que permita conexões externas.
