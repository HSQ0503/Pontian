import type { AtaItem, Meeting, Participant, Project, Segment, Speaker, Subsection } from "./types";

// Fictional demonstration data. No real MF client, project or person appears here.

const DEMO_PROJECT = "demo-1201";

const person = (name: string, company: string, role: string, present = true): Participant => ({
  id: `${company}-${name}`.toLowerCase().replace(/\s+/g, "-"),
  name,
  company,
  role,
  present,
});

const PEOPLE = {
  ricardo: person("Ricardo Almeida", "MF", "Coordenação de projetos"),
  juliana: person("Juliana Prado", "MF", "Arquitetura"),
  marcos: person("Marcos Vieira", "MF", "HVAC"),
  fernanda: person("Fernanda Lopes", "MF", "Planejamento"),
  eduardo: person("Eduardo Nunes", "MF", "Elétrica"),
  paulo: person("Paulo Henrique Souza", "Atlas", "Gerente de engenharia"),
  camila: person("Camila Rocha", "Atlas", "Meio ambiente"),
  bruno: person("Bruno Teixeira", "Terra Licenciamento", "Consultor ambiental"),
};

const SUBSECTIONS: Subsection[] = [
  { code: "1.01", section: 1, pt: "KICK-OFF", en: "KICK-OFF" },
  { code: "1.02", section: 1, pt: "DOCUMENTAÇÃO", en: "DOCUMENTATION" },
  { code: "3.01", section: 3, pt: "IMPLANTAÇÃO", en: "SITE PLAN" },
  { code: "6.01", section: 6, pt: "CÂMARAS FRIAS", en: "COLD ROOMS" },
  { code: "13.01", section: 13, pt: "LICENCIAMENTO AMBIENTAL", en: "ENVIRONMENTAL LICENSING" },
  { code: "14.01", section: 14, pt: "GERAL", en: "GENERAL" },
];

function item(
  number: string,
  origins: string[],
  firstDate: string,
  pt: string,
  en: string,
  extra: Partial<AtaItem> = {},
): AtaItem {
  const [section, sub] = number.split(".");
  return {
    id: `seed-${number}-${origins.at(-1)}`,
    number,
    section: Number(section),
    subsection: `${section}.${sub}`,
    origins,
    firstDate,
    building: "-",
    pt,
    en,
    status: "info",
    responsible: "",
    deadline: "",
    deadlineHistory: extra.deadline ? [extra.deadline] : [],
    deadlineText: "",
    risk: "low",
    isDecision: false,
    isAction: false,
    evidence: [],
    updates: null,
    note: "",
    ...extra,
  };
}

const speaker = (id: string, p: Participant, description: string): Speaker => ({
  id,
  name: p.name,
  company: p.company,
  description,
  guessed: false,
});

const segments = (lines: [string, number, string][]): Segment[] =>
  lines.map(([speakerId, start, text], index) => ({ id: `seg-${index}`, speakerId, start, text }));

function meeting(base: Partial<Meeting> & Pick<Meeting, "id" | "ar" | "date">): Meeting {
  return {
    projectId: DEMO_PROJECT,
    title: "",
    startTime: "09:30",
    endTime: "10:30",
    modality: "teams",
    location: "Microsoft Teams",
    secretary: PEOPLE.ricardo.name,
    participants: [],
    agenda: [],
    source: { kind: "recording", name: "", duration: 0, size: 0 },
    hasAudio: false,
    speakers: [],
    segments: [],
    ata: null,
    status: "approved",
    error: "",
    failedStage: "",
    approvedBy: PEOPLE.ricardo.name,
    approvedAt: `${base.date}T18:00:00.000Z`,
    createdAt: `${base.date}T12:00:00.000Z`,
    updatedAt: `${base.date}T18:00:00.000Z`,
    ...base,
  };
}

export function buildSeed(): { projects: Project[]; meetings: Meeting[] } {
  const projects: Project[] = [
    {
      id: DEMO_PROJECT,
      on: "1201",
      name: "Centro de Distribuição Refrigerado",
      client: "Atlas Alimentos",
      city: "Cajamar - SP",
      createdAt: "2026-10-01T12:00:00.000Z",
      demo: true,
    },
    {
      id: "demo-1188",
      on: "1188",
      name: "Fábrica de Embalagens Flexíveis",
      client: "Vértice Embalagens",
      city: "Indaiatuba - SP",
      createdAt: "2026-09-15T12:00:00.000Z",
      demo: true,
    },
  ];

  const kickoff = meeting({
    id: "demo-ar-001",
    ar: 1,
    date: "2026-10-06",
    startTime: "09:00",
    endTime: "10:40",
    modality: "hibrida",
    location: "Escritório MF, Alphaville + Microsoft Teams",
    title: "Reunião de kick-off",
    participants: [PEOPLE.ricardo, PEOPLE.juliana, PEOPLE.marcos, PEOPLE.fernanda, PEOPLE.paulo, PEOPLE.camila, PEOPLE.bruno],
    agenda: ["Apresentação das equipes", "Documentação e numeração", "Estudo de implantação", "Licenciamento", "Cronograma"],
    source: { kind: "recording", name: "kick-off.webm", duration: 5940, size: 0 },
    speakers: [
      speaker("S1", PEOPLE.ricardo, "Conduz a reunião"),
      speaker("S2", PEOPLE.paulo, "Representa o cliente"),
      speaker("S3", PEOPLE.bruno, "Consultor de licenciamento"),
    ],
    segments: segments([
      ["S1", 12, "Bom dia a todos. Vamos começar o kick-off do ON 1201, o centro de distribuição refrigerado da Atlas em Cajamar."],
      ["S2", 41, "Bom dia. Só para registrar: nós já temos o levantamento topográfico e a sondagem, vamos subir tudo no DOCS esta semana."],
      ["S1", 63, "Perfeito. A nossa proposta é fazer as reuniões de coordenação quinzenais, às terças, pelo Teams. Todo mundo de acordo?"],
      ["S2", 75, "De acordo."],
      ["S1", 410, "A MF vai emitir a lista geral de desenhos com a numeração para vocês validarem, até o dia dezesseis."],
      ["S3", 1830, "A Terra conduz o pedido de licença prévia na CETESB. Vamos precisar do memorial descritivo da MF."],
    ]),
    ata: {
      title: { pt: "Reunião de kick-off", en: "Kick-off meeting" },
      summary: {
        pt: "Reunião de abertura do projeto do centro de distribuição refrigerado. Foram apresentadas as equipes, definida a rotina de reuniões, alinhada a documentação e iniciado o planejamento do licenciamento ambiental.",
        en: "Project kick-off for the refrigerated distribution center. Teams were introduced, the meeting routine was defined, documentation was aligned and environmental licensing planning started.",
      },
      agenda: [
        { pt: "Apresentação das equipes", en: "Team introductions" },
        { pt: "Documentação e numeração", en: "Documentation and numbering" },
        { pt: "Estudo de implantação", en: "Site plan study" },
        { pt: "Licenciamento ambiental", en: "Environmental licensing" },
        { pt: "Cronograma", en: "Schedule" },
      ],
      subsections: SUBSECTIONS,
      items: [
        item("1.01.01", ["AR#001"], "2026-10-06",
          "Atlas informou que já possui o levantamento topográfico e a sondagem do terreno, que serão disponibilizados no DOCS.",
          "Atlas informed that it already has the topographic survey and the soil investigation, which will be made available on DOCS.",
          { evidence: [{ time: 41, quote: "nós já temos o levantamento topográfico e a sondagem" }] }),
        item("1.01.02", ["AR#001"], "2026-10-06",
          "Ficou acordado que as reuniões de coordenação serão quinzenais, às terças-feiras, via Microsoft Teams.",
          "It was agreed that coordination meetings will be held every two weeks, on Tuesdays, via Microsoft Teams.",
          { isDecision: true, evidence: [{ time: 63, quote: "reuniões de coordenação quinzenais, às terças, pelo Teams" }] }),
        item("1.02.01", ["AR#001"], "2026-10-06",
          "MF irá emitir a lista geral de desenhos com a numeração adotada para validação da Atlas.",
          "MF will issue the general drawing list with the adopted numbering for Atlas's validation.",
          { status: "progress", isAction: true, responsible: "MF - Coordenação", deadline: "2026-10-16", deadlineText: "até o dia dezesseis", evidence: [{ time: 410, quote: "A MF vai emitir a lista geral de desenhos" }] }),
        item("3.01.01", ["AR#001"], "2026-10-06",
          "MF apresentou o estudo preliminar de implantação, com doca de 24 posições e pátio de manobras dimensionado para carretas de 30 m.",
          "MF presented the preliminary site plan study, with a 24-position dock and a maneuvering yard sized for 30 m trailers."),
        item("6.01.01", ["AR#001"], "2026-10-06",
          "Atlas enviará as temperaturas de operação e os produtos estocados em cada câmara fria.",
          "Atlas will send the operating temperatures and the products stored in each cold room.",
          { status: "progress", isAction: true, responsible: "Atlas", deadline: "2026-10-15", risk: "medium" }),
        item("13.01.01", ["AR#001"], "2026-10-06",
          "Terra Licenciamento, contratada pela Atlas, conduzirá o pedido de Licença Prévia na CETESB. MF fornecerá o memorial descritivo do empreendimento.",
          "Terra Licenciamento, hired by Atlas, will handle the Preliminary License application at CETESB. MF will provide the project's descriptive memorandum.",
          { status: "progress", isAction: true, responsible: "Terra / MF", deadline: "2026-11-07", risk: "high", evidence: [{ time: 1830, quote: "A Terra conduz o pedido de licença prévia na CETESB" }] }),
        item("14.01.01", ["AR#001"], "2026-10-06",
          "Atlas informou a previsão de início da terraplenagem em março de 2027.",
          "Atlas informed that earthworks are expected to start in March 2027."),
      ],
      nextMeeting: { pt: "20/10/2026, 09:30, via Microsoft Teams.", en: "10/20/2026, 9:30 a.m., via Microsoft Teams." },
      reviewFlags: [],
      generatedAt: "2026-10-06T14:00:00.000Z",
      model: "demo",
    },
  });

  const coordination = meeting({
    id: "demo-ar-002",
    ar: 2,
    date: "2026-10-20",
    startTime: "09:30",
    endTime: "10:35",
    title: "Reunião quinzenal de coordenação",
    participants: [PEOPLE.ricardo, PEOPLE.juliana, PEOPLE.fernanda, PEOPLE.eduardo, PEOPLE.paulo, PEOPLE.camila, { ...PEOPLE.marcos, present: false }],
    agenda: ["Lista de desenhos", "Câmaras frias", "Implantação", "Energia", "Cronograma"],
    source: { kind: "recording", name: "coordenacao-20-10.webm", duration: 3900, size: 0 },
    speakers: [
      speaker("S1", PEOPLE.ricardo, "Conduz a reunião"),
      speaker("S2", PEOPLE.paulo, "Representa o cliente"),
      speaker("S3", PEOPLE.juliana, "Arquitetura MF"),
      speaker("S4", PEOPLE.fernanda, "Planejamento MF"),
    ],
    segments: segments([
      ["S1", 8, "Bom dia. Segunda reunião de coordenação. Primeiro ponto: a lista de desenhos foi emitida, a 1201-LD-G-001."],
      ["S2", 30, "Validamos a numeração, está tudo certo."],
      ["S1", 95, "Sobre as câmaras frias, Paulo, ainda estamos sem as temperaturas de operação."],
      ["S2", 110, "A área comercial ainda não fechou o mix de produtos. Conseguimos mandar até o dia vinte e sete."],
      ["S3", 640, "Propomos deslocar a portaria de caminhões para a via lateral, para separar pedestres das carretas."],
      ["S2", 675, "Concordamos. E pedimos que vocês reservem área para ampliar a doca para trinta e duas posições no futuro."],
      ["S4", 1980, "Importante registrar: sem as temperaturas, o projeto básico de HVAC atrasa. Vamos apresentar um cronograma revisado até o dia cinco."],
    ]),
    ata: {
      title: { pt: "Reunião quinzenal de coordenação", en: "Biweekly coordination meeting" },
      summary: {
        pt: "A lista de desenhos foi validada. A definição das câmaras frias segue pendente e ameaça o marco do projeto básico de HVAC. A nova posição da portaria foi aprovada e a Atlas pediu reserva de área para ampliação da doca.",
        en: "The drawing list was validated. The cold room definition is still pending and threatens the basic HVAC design milestone. The new gatehouse position was approved and Atlas requested area for a future dock expansion.",
      },
      agenda: [
        { pt: "Lista de desenhos", en: "Drawing list" },
        { pt: "Câmaras frias", en: "Cold rooms" },
        { pt: "Implantação", en: "Site plan" },
        { pt: "Entrada de energia", en: "Power supply" },
        { pt: "Cronograma", en: "Schedule" },
      ],
      subsections: [{ code: "7.01", section: 7, pt: "ENTRADA DE ENERGIA", en: "POWER SUPPLY" }],
      items: [
        item("1.02.01", ["AR#001", "AR#002"], "2026-10-06",
          "MF emitiu a lista geral de desenhos (1201-LD-G-001-00). Atlas validou a numeração adotada.",
          "MF issued the general drawing list (1201-LD-G-001-00). Atlas validated the adopted numbering.",
          { status: "closed", updates: "1.02.01", responsible: "MF - Coordenação", deadline: "2026-10-16", evidence: [{ time: 30, quote: "Validamos a numeração, está tudo certo." }] }),
        item("6.01.01", ["AR#001", "AR#002"], "2026-10-06",
          "Atlas informou que as temperaturas das câmaras frias dependem da definição do mix de produtos pela área comercial. Novo prazo acordado.",
          "Atlas informed that the cold room temperatures depend on the product mix definition by its commercial area. A new deadline was agreed.",
          { status: "progress", isAction: true, updates: "6.01.01", responsible: "Atlas", deadline: "2026-10-27", deadlineHistory: ["2026-10-15", "2026-10-27"], deadlineText: "até o dia vinte e sete", risk: "high", evidence: [{ time: 110, quote: "Conseguimos mandar até o dia vinte e sete." }] }),
        item("3.01.02", ["AR#002"], "2026-10-20",
          "Ficou acordado que a portaria de caminhões será deslocada para a via lateral, segregando o fluxo de pedestres do fluxo de carretas.",
          "It was agreed that the truck gatehouse will be moved to the side road, separating pedestrian flow from trailer traffic.",
          { isDecision: true, risk: "medium", evidence: [{ time: 640, quote: "deslocar a portaria de caminhões para a via lateral" }] }),
        item("3.01.03", ["AR#002"], "2026-10-20",
          "Atlas solicita que MF reserve área na implantação para a ampliação futura da doca para 32 posições.",
          "Atlas requests that MF reserve area in the site plan for a future dock expansion to 32 positions.",
          { status: "progress", isAction: true, responsible: "MF - Arquitetura", deadline: "2026-11-03", risk: "medium", evidence: [{ time: 675, quote: "reservem área para ampliar a doca para trinta e duas posições" }] }),
        item("7.01.01", ["AR#002"], "2026-10-20",
          "Atlas informou que a concessionária confirmou a disponibilidade de 2,5 MVA na rede de média tensão.",
          "Atlas informed that the utility confirmed the availability of 2.5 MVA on the medium-voltage network."),
        item("14.01.02", ["AR#002"], "2026-10-20",
          "MF alertou que o atraso na definição das câmaras frias impacta o marco de entrega do projeto básico de HVAC. MF apresentará o cronograma revisado.",
          "MF warned that the delay in defining the cold rooms affects the delivery milestone of the basic HVAC design. MF will present the revised schedule.",
          { status: "progress", isAction: true, responsible: "MF - Planejamento", deadline: "2026-11-05", deadlineText: "até o dia cinco", risk: "high", evidence: [{ time: 1980, quote: "sem as temperaturas, o projeto básico de HVAC atrasa" }] }),
      ],
      nextMeeting: { pt: "03/11/2026, 09:30, via Microsoft Teams.", en: "11/03/2026, 9:30 a.m., via Microsoft Teams." },
      reviewFlags: [],
      generatedAt: "2026-10-20T14:00:00.000Z",
      model: "demo",
    },
  });

  return { projects, meetings: [kickoff, coordination] };
}
