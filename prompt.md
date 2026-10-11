# Prompt para o Claude Code

Exporte as abas SPEC, AUTO-TRIAGEM, ASSISTENTES e HANDOFF como Markdown e salve os arquivos na pasta do projeto, junto com `nota-do-dia-rascunho.png` e `nota-do-dia-rascunho.html`. Depois abra o Claude Code nessa pasta e cole o texto abaixo.

```
Leia SPEC.md, AUTO-TRIAGEM.md, ASSISTENTES.md e HANDOFF.md antes de qualquer coisa. O SPEC.md é a especificação; os dois arquivos seguintes detalham o checkout em lote e os assistentes de limpeza; o HANDOFF.md explica o porquê das decisões e como eu gosto de trabalhar.

Primeiro, me apresente um plano de arquitetura para a spec inteira, seções 1a a 6: modelo de dados no Firestore com todas as entidades, histórico de eventos, um registro por bloco, editor de blocos já preparado para os tipos da seção 5 e cálculo das métricas no app. Respeite "Princípios" e "Decisões técnicas". Espere eu aprovar.

Depois, implemente só a seção "1a. Ciclo diário: núcleo", com as regras do 1a no AUTO-TRIAGEM.md. Ainda não há telas desenhadas: faça uma interface simples e limpa, com cores, fontes e espaçamentos centralizados num lugar só, para eu trocar o visual depois sem mexer no resto. Use nota-do-dia-rascunho.html como referência de layout, lembrando que ele mostra itens do 1b.

Crie também um CLAUDE.md na raiz com um resumo do projeto e das convenções, para as próximas sessões.
```

Se a spec mudar depois, exporte as abas de novo e substitua os arquivos na pasta.
