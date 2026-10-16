import { createBackup, type BackupFile } from '../application/backup';
import type { IdGenerator } from '../application/ports';
import type { Project } from '../domain/entities';
import { Simulation } from './simulation';

/**
 * Synthetic data for trying the app out: about five weeks of use with three projects (a
 * year-end party, a scheduling app and a kitchen remodel), written so that every checkout
 * rule and cleanup assistant has something to show, plus an English course followed for
 * about four months, so the 16-week activity maps have history. Dev only; see ADR-027.
 *
 * What it leaves behind, relative to today:
 * - Project list: the scheduling app and the remodel are the projects in focus, with one
 *   free slot. "Festa de fim-de-ano" has had no
 *   activity for 22 days, so it shows as stalled.
 * - Pending days: the last 3 days have no checkout. Day -3 has a task postponed 3 times
 *   (attention, "decidir na Revisão de Foco") and a whiteboard that cites a project (link
 *   suggestion); day -2 has a task whose deadline passed; day -1 has a whiteboard with notes.
 * - Whiteboards assistant: "Daily do App de agendamento" left unlinked 3 times (link),
 *   "Ideias de decoração" twice (convert), "Orçamentos marcenaria" twice with different
 *   spelling (convert), "Leituras sobre acessibilidade" once (keep). Untitled sections and
 *   "Lista de mercado" (already kept) stay out.
 * - Duplicates assistant: "Reforma da cozinha" / "Reforma da cosinha" (typo), "Festa de fim de
 *   ano" / "Festa de fim-de-ano" (punctuation), and "Sprint 41" / "Sprint 42", a false
 *   positive for "Manter separados". The finished "Sprint 40" stays out.
 * - Revisão de Foco: available, since there was none and dozens of checkouts were done; a task
 *   left for it and the notes of a retrospective; archived tasks from 31, 10 and 5 days ago.
 * - Active tasks without a date for weeks, for the future stale tasks assistant.
 * - Today: a task planned for today as a priority, and a task whose deadline is today.
 * - People (spec/pessoas.md): Ana, Rafael, Jorge, Paula and Marcão, cited with `@`. Rafael owes
 *   an estimate to follow up today, Jorge a schedule in 3 days, and Ana and Paula things with
 *   no follow-up date; I owe Paula the user manual.
 */

/** English classes before the main story, twice a week; the course goes on at a slower pace later. */
const COURSE_DAYS = [-110, -107, -103, -100, -96, -93, -89, -86, -82, -79, -75, -72, -68, -65, -61, -58, -54, -51, -47, -44, -40, -37];

/** Days the script plays. Days -20 and -19 have no checkout and are closed on day -17. */
const WORK_DAYS = [
  ...COURSE_DAYS,
  ...[-35, -34, -31, -28, -27, -24, -22, -20, -19, -17, -15, -14, -13, -12, -10, -8, -7, -5, -4, -3, -2, -1, 0],
];

/** What each class left: the lesson notes and the homework, done the same day. */
const LESSONS: [string, string][] = [
  ['Present perfect vs. simple past: "I have lived" x "I lived".', 'Exercícios 1 a 10 do capítulo 3'],
  ['Phrasal verbs de trabalho: follow up, set up, carry out.', 'Escrever 5 frases com os phrasal verbs'],
  ['Listening: podcast sobre trabalho remoto.', 'Ouvir o episódio de novo e anotar 10 palavras novas'],
  ['Conditionals: second e third conditional.', 'Exercícios de conditionals'],
  ['Simulação de reunião: apresentar um projeto em 3 minutos.', 'Gravar a apresentação e ouvir'],
  ['Vocabulário de reuniões: agenda, action items, wrap up.', 'Revisar o vocabulário no app de flashcards'],
];

export async function buildSyntheticData(now: Date, ids: IdGenerator): Promise<Simulation> {
  const sim = new Simulation(now, ids, WORK_DAYS);
  const team = 'Ana (PO), Rafael, Júlia';
  const devs = 'Rafael, Júlia';

  // Days -110 to -37: an English course, the only thing in the app for a while.
  let course: Project | null = null;
  for (const [index, offset] of COURSE_DAYS.entries()) {
    sim.on(offset);
    if (!course) {
      course = await sim.project('Curso de inglês');
      await sim.icon(course, 'book');
    }
    const [note, homework] = LESSONS[index % LESSONS.length];
    const lesson = await sim.section('general', `Inglês: aula ${index + 1}`);
    await sim.link(lesson, course);
    // Every third class has an extra note, so the map shows different intensities.
    const lines = index % 3 === 0 ? [note, 'Professora sugeriu ler um artigo por semana.', `[] ${homework}`] : [note, `[] ${homework}`];
    const written = await sim.write(lesson, ...lines);
    await sim.done(written.at(-1)!);
    await sim.checkout();
  }
  const englishClass = async (title: string, note: string) => {
    const lesson = await sim.section('general', title);
    await sim.link(lesson, course!);
    await sim.write(lesson, note);
  };

  // Day -35: the app kicks off, and the party is just an idea on a whiteboard.
  sim.on(-35);
  const kickoff = await sim.section('meeting', 'Kickoff do app de agendamento', team);
  const [, , , , repo, stories, competitors] = await sim.write(
    kickoff,
    'Objetivo: clínicas pequenas marcarem consultas pelo celular, sem precisar ligar.',
    'MVP: agenda do profissional, página pública de agendamento e lembrete por e-mail.',
    'Stack combinada: React no front, Node no back, Postgres no banco.',
    'Meta do MVP: a primeira clínica usando antes do fim do ano.',
    '[] Criar o repositório e configurar a CI',
    '[] Escrever as histórias do MVP',
    '[] Pesquisar concorrentes e anotar o que eles fazem bem',
  );
  const app = await sim.convert(kickoff, 'App de agendamento');
  await sim.icon(app, 'code');
  const partyIdea = await sim.section('general');
  const [, , partyDate] = await sim.write(
    partyIdea,
    'Pensei em fazer uma festa de fim de ano aqui em casa, para a família e os amigos do trabalho.',
    'Umas 40 pessoas? Talvez num sábado de dezembro.',
    '[] Ver com a Carla qual sábado de dezembro é melhor',
  );
  await sim.checkout({
    whiteboards: [[partyIdea, { kind: 'convert', name: 'Festa de fim de ano' }]],
    tasks: [[competitors, { kind: 'schedule', date: sim.day(-31) }]],
  });
  const party = await sim.projectNamed('Festa de fim de ano');
  await sim.icon(party, 'balloon');

  // Day -34: MVP stories, the remodel wish list and the party date.
  sim.on(-34);
  await sim.done(repo, stories, partyDate);
  const mvp = await sim.section('general', 'Histórias do MVP');
  await sim.link(mvp, app);
  const [, , , figma, dataModel] = await sim.write(
    mvp,
    'Profissional define os horários livres da semana.',
    'Paciente escolhe um horário pela página pública, sem criar conta.',
    'Cancelamento pelo link do e-mail, até 24h antes.',
    '[] Desenhar o fluxo de agendamento no Figma',
    '[] Definir o modelo de dados (profissional, horário, agendamento)',
  );
  const remodel = await sim.project('Reforma da cozinha');
  await sim.icon(remodel, 'home');
  const wishes = await sim.section('general', 'Reforma: o que eu quero');
  await sim.link(wishes, remodel);
  const [, , , , , carpenters, measure] = await sim.write(
    wishes,
    'Trocar a bancada por granito ou quartzo.',
    'Armários planejados até o teto, com nicho para o micro-ondas.',
    'Mudar a tomada do fogão de lugar e colocar mais duas na bancada.',
    'Piso: porcelanato claro, que não mostre sujeira.',
    '[] Pedir orçamento de bancada de granito',
    '[] Pesquisar marceneiros com indicação',
    '[] Medir a cozinha (paredes, janela, pontos de água)',
  );
  await sim.done(measure);
  const partyNotes = await sim.section('general', 'Festa');
  await sim.link(partyNotes, party);
  const [, guestList, barbecue] = await sim.write(
    partyNotes,
    'A Carla prefere o segundo sábado de dezembro.',
    '[] Fazer a lista de convidados',
    '[] Decidir: churrasco ou buffet?',
  );
  await sim.checkout({ tasks: [[barbecue, { kind: 'schedule', date: sim.day(-24) }]] });

  // Day -31: first daily, a grocery list on a whiteboard, an idea archived.
  sim.on(-31);
  await sim.done(dataModel, competitors, carpenters);
  const daily = await sim.section('meeting', 'Daily', devs);
  await sim.link(daily, app);
  const [, , review, firebase] = await sim.write(
    daily,
    'Rafael terminou a CI; o deploy automático no staging está funcionando.',
    'Júlia vai cuidar do layout da página pública.',
    '[] Revisar o PR do cadastro de profissionais',
    '[] Avaliar Firebase no lugar do Postgres',
  );
  const groceries = await sim.section('general', 'Lista de mercado');
  await sim.write(groceries, 'café, pão, ovos, tomate', 'detergente e esponja');
  await englishClass('Inglês: conversação', 'Conversação: contar o fim de semana sem travar.');
  await sim.checkout({
    tasks: [[firebase, { kind: 'archive' }]],
    notes: [[groceries, 'discarded']],
  });

  // Day -28: sprint 40 starts; loose notes; a task taken out of the plan.
  sim.on(-28);
  await sim.done(figma, review);
  const sprint40 = await sim.project('Sprint 40');
  const planning40 = await sim.section('meeting', 'Planejamento da sprint 40', team);
  await sim.link(planning40, sprint40);
  const [, freeSlots, availabilityApi, conflictTests] = await sim.write(
    planning40,
    'Foco: agenda do profissional de ponta a ponta.',
    '[] Tela de horários livres',
    '[] API de disponibilidade',
    '[] Testes da regra de conflito de horários',
  );
  const loose = await sim.section('general');
  await sim.write(loose, 'Lembrar de renovar a CNH em novembro.', 'Livro indicado pela Ana: Shape Up.');
  const remodelTips = await sim.section('general', 'Reforma');
  await sim.link(remodelTips, remodel);
  const [, tiles] = await sim.write(
    remodelTips,
    'Indicação de marceneiro: Seu Jorge, falar com a vizinha do 302.',
    '[] Pesquisar fornecedores de porcelanato',
  );
  await sim.checkout({ unplan: [tiles] });

  // Day -27: decoration ideas on a whiteboard; the guest list is done.
  sim.on(-27);
  await sim.done(freeSlots, guestList);
  const decoration1 = await sim.section('general', 'Ideias de decoração');
  await sim.write(
    decoration1,
    'Varal de luzes no quintal.',
    'Mesa de doces com toalha xadrez.',
    'Plaquinhas com o nome de cada família.',
  );
  const guests = await sim.section('general', 'Festa: convidados');
  await sim.link(guests, party);
  await sim.write(
    guests,
    'Lista fechada: 38 pessoas, sendo 6 crianças.',
    'A tia Lúcia não come glúten.',
    '[] Pesquisar uma tenda, caso chova',
  );
  await sim.checkout();

  // Day -24: the countertop quote was postponed 3 times and goes to the Revisão de Foco.
  sim.on(-24);
  await sim.keepWhiteboard(groceries);
  await sim.done(availabilityApi, barbecue);
  const carpentry1 = await sim.section('general', 'Orçamentos marcenaria');
  const [, , thirdQuote] = await sim.write(
    carpentry1,
    'Seu Jorge: R$ 14.500, prazo de 30 dias, MDF branco.',
    'Marcenaria Bela Casa: R$ 18.900, prazo de 45 dias, inclui puxadores.',
    '[] Pedir um terceiro orçamento',
  );
  const food = await sim.section('general', 'Festa: comida');
  await sim.link(food, party);
  const [, , griller, amounts] = await sim.write(
    food,
    'Decidido: churrasco, com opção vegetariana.',
    'O primo do Marcos faz o churrasco por R$ 600.',
    '[] Fechar com o churrasqueiro',
    '[] Calcular a quantidade de carne e bebida',
  );
  await englishClass('Inglês: e-mails formais', 'E-mails formais: "I am writing to follow up on..."');
  await sim.checkout();

  // Day -22: a second party project, created by mistake.
  sim.on(-22);
  await sim.done(conflictTests, griller);
  const partyDuplicate = await sim.project('Festa de fim-de-ano');
  const music = await sim.section('general', 'Música');
  await sim.link(music, partyDuplicate);
  await sim.write(
    music,
    'Playlist colaborativa: pedir sugestões no grupo da família.',
    '[] Alugar uma caixa de som',
    '[] Montar a playlist',
  );
  await sim.checkout({ tasks: [[thirdQuote, { kind: 'abandon' }]] });

  // Days -20 and -19: written in a hurry, without checkout.
  sim.on(-20);
  await sim.done(amounts);
  const daily1 = await sim.section('meeting', 'Daily do App de agendamento', devs);
  const [, slotsBug] = await sim.write(
    daily1,
    'Bug: o horário de verão duplica horários em alguns fusos.',
    '[] Investigar o bug dos horários duplicados',
  );
  sim.on(-19);
  const daily2 = await sim.section('meeting', 'Daily do App de agendamento', devs);
  await sim.write(daily2, 'Júlia subiu o layout da página pública no staging.', 'Rafael segue no bug dos horários.');
  const errand = await sim.section('general');
  await sim.write(errand, '[] Comprar uma trena a laser');

  // Day -17: back, closes the pending days; the dailies stay without a project.
  sim.on(-17);
  await sim.closePendingDays();
  const carpentry2 = await sim.section('general', 'Orçamentos Marcenaria');
  const [, , deposit] = await sim.write(
    carpentry2,
    'O Seu Jorge baixou para R$ 13.800 se fechar este mês.',
    'Decidido: fechar com o Seu Jorge.',
    '[] Enviar o sinal para o Seu Jorge',
  );
  const bug = await sim.section('general', 'Bug dos horários duplicados');
  await sim.link(bug, app);
  await sim.write(
    bug,
    'Causa: a conversão de fuso era feita no front, antes de salvar.',
    'Correção: salvar tudo em UTC e converter só na exibição.',
  );
  await sim.done(slotsBug);
  await englishClass('Inglês: pronúncia', 'Pronúncia: o "th" de "think" e de "this".');
  await sim.checkout();

  // Day -15: a whiteboard becomes a new project, with a typo in the name.
  sim.on(-15);
  await sim.done(deposit);
  const electrical = await sim.section('general', 'Elétrica');
  const [, , sockets, electrician] = await sim.write(
    electrical,
    'O eletricista (Marcão) vem na quinta para avaliar.',
    'Precisa de um circuito separado para o forno elétrico.',
    '[] Comprar as tomadas e o disjuntor',
    '[] Combinar o horário com o Marcão',
  );
  await sim.checkout({ whiteboards: [[electrical, { kind: 'convert', name: 'Reforma da cosinha' }]] });

  // Day -14: sprint 40 ends, sprint 41 starts.
  sim.on(-14);
  await sim.done(electrician);
  await sim.finishProject(sprint40);
  const sprint41 = await sim.project('Sprint 41');
  const planning41 = await sim.section('meeting', 'Planejamento da sprint 41', team);
  await sim.link(planning41, sprint41);
  const [, publicPage, reminderEmail, apiDocs] = await sim.write(
    planning41,
    'Foco: página pública e lembretes por e-mail.',
    '[] Página pública de agendamento',
    '[] Envio de lembrete 24h antes da consulta',
    '[] Atualizar a documentação da API',
  );
  await sim.checkout({
    tasks: [
      [reminderEmail, { kind: 'schedule', date: sim.day(-8) }],
      [apiDocs, { kind: 'schedule', date: sim.day(-10) }],
    ],
  });

  // Day -13: a daily left without a project on purpose.
  sim.on(-13);
  await sim.done(sockets);
  const daily3 = await sim.section('meeting', 'Daily do App de agendamento', devs);
  const [, pageTexts] = await sim.write(
    daily3,
    'Página pública: falta só o estado de "sem horários disponíveis".',
    '[] Revisar os textos da página pública com a Ana',
    '[a] @Ana aprovar os textos da página pública',
  );
  await sim.people('Ana');
  await sim.checkout({ whiteboards: [[daily3, { kind: 'leaveUnlinked' }]] });

  // Day -12: more decoration ideas, again on a whiteboard.
  sim.on(-12);
  await sim.done(publicPage);
  const decoration2 = await sim.section('general', 'Ideias de decoração');
  const [, , tables] = await sim.write(
    decoration2,
    'Lanternas de papel penduradas na árvore.',
    'Pedir emprestadas as mesas do salão do prédio.',
    '[] Perguntar ao síndico sobre as mesas',
  );
  await sim.checkout();

  // Day -10: accessibility reading; an idea for later is archived.
  sim.on(-10);
  await sim.done(pageTexts, tables);
  const reading = await sim.section('general', 'Leituras sobre acessibilidade');
  await sim.write(
    reading,
    'WCAG: contraste mínimo de 4,5:1 para texto normal.',
    'Testar a página pública usando só o teclado.',
  );
  const later = await sim.section('general', 'Ideias para depois');
  await sim.link(later, app);
  const [, calendarSync] = await sim.write(
    later,
    'Integração com o Google Agenda pode ser um diferencial.',
    '[] Prototipar a integração com o Google Agenda',
  );
  await englishClass('Inglês: small talk', 'Small talk antes de reunião: clima, viagem, fim de semana.');
  await sim.checkout({ tasks: [[calendarSync, { kind: 'archive' }]] });

  // Day -8: the retrospective goes to the Revisão de Foco; a review is planned for today.
  sim.on(-8);
  await sim.done(reminderEmail);
  const retro = await sim.section('meeting', 'Retrospectiva da sprint 40', team);
  await sim.link(retro, app);
  await sim.write(
    retro,
    'Bom: o deploy automático economizou muito tempo.',
    'Ruim: estimativas otimistas demais na API.',
    'Ação: quebrar histórias maiores que 3 dias.',
  );
  const codeReview = await sim.section('general', 'Code review');
  await sim.link(codeReview, app);
  const [cancellationReview] = await sim.write(codeReview, '[] Revisar o PR do fluxo de cancelamento');
  await sim.intend(cancellationReview, 0);
  await sim.checkout({
    notes: [[retro, 'weeklyReflection']],
    tasks: [[apiDocs, { kind: 'schedule', date: sim.day(-4) }]],
  });

  // Day -7: sprint 42 and the party invitations, with a deadline.
  sim.on(-7);
  const sprint42 = await sim.project('Sprint 42');
  const planning42 = await sim.section('meeting', 'Planejamento da sprint 42', team);
  await sim.link(planning42, sprint42);
  const [, monitoring, statusPage] = await sim.write(
    planning42,
    'Foco: estabilidade antes da primeira clínica.',
    '[] Monitoramento de erros em produção',
    '[] Página de status do sistema',
  );
  await sim.intend(monitoring, 3);
  const [estimate] = await sim.write(planning42, '[a] @Rafael mandar a estimativa do monitoramento');
  await sim.people('Rafael');
  await sim.intend(estimate, 0);
  const invitations = await sim.section('general', 'Festa: convites');
  await sim.link(invitations, party);
  const [, invitationDesign, sendInvitations] = await sim.write(
    invitations,
    'Convite digital pelo WhatsApp, pedindo confirmação até o fim de novembro.',
    '[] Criar o convite no Canva',
    '[] Enviar os convites',
  );
  await sim.deadline(sendInvitations, 20);
  // The projects in focus, with a free slot.
  await sim.prioritize(app);
  await sim.prioritize(remodel);
  await sim.checkout({ tasks: [[sendInvitations, { kind: 'schedule', date: sim.day(6) }]] });

  // Day -5: the remodel schedule; a payment due today.
  sim.on(-5);
  await sim.done(invitationDesign);
  const schedule = await sim.section('general', 'Reforma: cronograma');
  await sim.link(schedule, remodel);
  const [, , , secondPayment] = await sim.write(
    schedule,
    'Semana 1: demolição e elétrica. Semana 2: piso. Semana 3: armários e bancada.',
    'O Marcão confirmou a elétrica para a primeira semana.',
    '[] Comprar o porcelanato',
    '[] Pagar a segunda parcela do Seu Jorge',
  );
  await sim.intend(secondPayment, 1);
  await sim.deadline(secondPayment, 0);
  const [, writtenSchedule] = await sim.write(
    schedule,
    'O @Jorge vai mandar o cronograma por escrito, e o @Marcão começa logo depois da demolição.',
    '[a] @Jorge enviar o cronograma por escrito',
  );
  await sim.people('Jorge', 'Marcão');
  await sim.intend(writtenSchedule, 3);
  await englishClass('Inglês: revisão', 'Revisão do mês: conditionals e phrasal verbs.');
  await sim.checkout({ tasks: [[statusPage, { kind: 'archive' }]] });

  // Day -4: the last day with a checkout. The API docs reach 3 postponements.
  sim.on(-4);
  const daily4 = await sim.section('meeting', 'Daily', devs);
  await sim.link(daily4, app);
  const [, staging] = await sim.write(
    daily4,
    'A primeira clínica (Dra. Paula) começa a testar na semana que vem.',
    '[] Preparar o ambiente de homologação para a clínica',
    'A @Paula quer começar pelos horários da manhã.',
    '[a] @Paula confirmar quais médicos testam primeiro',
  );
  await sim.people('Paula');
  await sim.checkout();

  // Days -3, -2 and -1: no checkout, so they wait for "Fechar dias pendentes".
  sim.on(-3);
  await sim.done(staging);
  const daily5 = await sim.section('meeting', 'Daily do App de agendamento', devs);
  await sim.write(
    daily5,
    'Ambiente de homologação no ar.',
    'A Dra. Paula pediu para bloquear os horários de almoço.',
    '[] Criar bloqueio de horário recorrente',
  );

  sim.on(-2);
  const floor = await sim.section('general', 'Reforma: piso');
  await sim.link(floor, remodel);
  const [, , , dumpster] = await sim.write(
    floor,
    'Porcelanato escolhido: 80x80 acetinado, cor areia.',
    'A loja entrega em 5 dias úteis.',
    '[] Confirmar a data de entrega do piso',
    '[] Reservar a caçamba para o entulho',
  );
  await sim.deadline(dumpster, -1);

  sim.on(-1);
  const partyLoose = await sim.section('general');
  await sim.write(
    partyLoose,
    'O Marcos confirmou o churrasqueiro para o dia.',
    'Pensar em atividades para as crianças.',
    '[] Comprar carvão e copos descartáveis',
    '[] Alugar a tenda',
  );

  // Today: the week's plan, with the planned review as a priority.
  sim.on(0);
  const week = await sim.section('general', 'Planejamento da semana');
  const [, dishes] = await sim.write(
    week,
    'Semana pesada: homologação da clínica e começo da obra.',
    '[] Separar a louça antes da demolição',
    'Conversar com a @Ana sobre o lançamento da página pública.',
    '[] Mandar o manual de uso para a @Paula',
  );
  await sim.priority(cancellationReview);
  await sim.priority(dishes);

  return sim;
}

/** The synthetic data as a backup file, ready for the regular import flow. */
export async function buildSyntheticBackup(now: Date, ids: IdGenerator): Promise<BackupFile> {
  const sim = await buildSyntheticData(now, ids);
  return createBackup(sim.store.snapshot(), now);
}
