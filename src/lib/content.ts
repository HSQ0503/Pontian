export type Locale = "pt" | "en";

export type Content = {
  ui: {
    swipe: string;
    scroll: string;
    contact: string;
    back: string;
    undo: string;
    chapter: string;
    next: string;
    prev: string;
    pdf: string;
    email: string;
    whatsapp: string;
    tapHint: string;
    clickHint: string;
    dragHint: string;
    swipeCards: string;
  };
  home: {
    tagline: string;
  };
  contactPage: {
    title: string;
    body: string;
    emailLabel: string;
    whatsappLabel: string;
    whatsappPrefill: string;
    emailSubject: string;
  };
  cover: {
    title: string;
    sub: string;
  };
  horizon: {
    title: string;
    stops: { year: string; name: string; body: string }[];
    closing: string;
  };
  scatter: {
    title: string;
    body: string;
    nodes: string[];
    button: string;
    center: string;
    caption: string;
  };
  layers: {
    title: string;
    intro: string;
    items: { name: string; body: string; mock: string[] }[];
  };
  shift: {
    title: string;
    before: string;
    after: string;
    rows: { name: string; before: string; after: string }[];
    footer: string;
  };
  sectors: {
    title: string;
    intro: string;
    lostLabel: string;
    changeLabel: string;
    items: { name: string; lost: string; change: string }[];
    footer: string;
  };
  method: {
    title: string;
    steps: { name: string; body: string }[];
    facts: string[];
  };
  team: {
    title: string;
    intro: string;
    people: { name: string; role: string; line: string }[];
    footer: string;
  };
  close: {
    title: string;
    body: string;
    emailSubject: string;
    whatsappPrefill: string;
  };
};

const pt: Content = {
  ui: {
    swipe: "Deslize para começar",
    scroll: "Role para começar",
    contact: "Contato",
    back: "Voltar",
    undo: "Desfazer",
    chapter: "Capítulo",
    next: "Próximo",
    prev: "Anterior",
    pdf: "Baixar em PDF",
    email: "Escrever por e-mail",
    whatsapp: "Falar no WhatsApp",
    tapHint: "Toque para abrir",
    clickHint: "Clique para abrir",
    dragHint: "Arraste",
    swipeCards: "Deslize os cartões",
  },
  home: {
    tagline: "Uma pequena empresa de tecnologia fazendo coisas grandes.",
  },
  contactPage: {
    title: "Contato",
    body: "Escreva ou chame. Respondemos no mesmo dia.",
    emailLabel: "E-mail",
    whatsappLabel: "WhatsApp",
    whatsappPrefill: "Olá, vi o site da Pontian e gostaria de conversar.",
    emailSubject: "Conversa com a Pontian",
  },
  cover: {
    title: "Inteligência que trabalha dentro da empresa.",
    sub: "Uma apresentação curta sobre o que fazemos e por que agora.",
  },
  horizon: {
    title: "Para onde a IA está indo",
    stops: [
      {
        year: "2023",
        name: "Chat",
        body: "Um modelo genérico responde perguntas genéricas. Impressiona na primeira semana. Não conhece a sua empresa e esquece tudo quando a janela fecha.",
      },
      {
        year: "2025",
        name: "Assistentes",
        body: "Cada ferramenta ganhou um copiloto. Um no e-mail, outro na planilha, outro no CAD. Cada um ajuda em uma tarefa. Nenhum enxerga o todo.",
      },
      {
        year: "Agora",
        name: "Camada operacional",
        body: "O modelo virou commodity. O que vale é o conhecimento da sua empresa, ligado ao trabalho de todo dia, sob as suas regras. É aí que a Pontian trabalha.",
      },
    ],
    closing:
      "Os modelos vão continuar melhorando e barateando. A vantagem passa a ser o que só a sua empresa sabe.",
  },
  scatter: {
    title: "O que toda empresa tem em comum",
    body: "O conhecimento existe. Está em pastas, e-mails, atas, planilhas, sistemas e na cabeça de quem está há vinte anos na casa. Cada projeto novo recomeça a procura.",
    nodes: ["Pastas", "E-mails", "Reuniões", "Planilhas", "Sistemas", "Veteranos"],
    button: "Reunir",
    center: "Um lugar só",
    caption: "Cada resposta chega com o documento de onde veio. Quem não tem permissão, não vê.",
  },
  layers: {
    title: "O que a Pontian constrói",
    intro: "Um sistema, cinco camadas. Toque em cada uma.",
    items: [
      {
        name: "Uma verdade da empresa",
        body: "Documentos, decisões e regras em um lugar só, com a versão atual e o histórico. O que foi substituído fica marcado como substituído.",
        mock: ["Norma de projeto v12", "vigente desde 03/2026", "substitui v11"],
      },
      {
        name: "Respostas com fonte",
        body: "Qualquer pessoa pergunta em linguagem comum. A resposta vem com o trecho e o documento. Quando a evidência não existe, o sistema diz que não sabe.",
        mock: ["Qual o prazo de aprovação?", "15 dias úteis", "Contrato N171, cláusula 4.2"],
      },
      {
        name: "Prazos e equipe",
        body: "Cronogramas e alocação em uma tela. Colisões de prazo por área, carga por pessoa, quem tem folga.",
        mock: ["Semana 38", "Elétrica: 3 entregas", "Ana: 46h de 40h"],
      },
      {
        name: "Automações com aprovação",
        body: "Atas de reunião, resumos de início de projeto, relatórios semanais. O sistema redige, uma pessoa aprova, tudo fica registrado.",
        mock: ["Ata AR#007 pronta", "aguardando aprovação", "Diego M."],
      },
      {
        name: "Permissões em tudo",
        body: "Cada pessoa vê o que o seu papel permite. Um cliente nunca se mistura com outro. Cada alteração tem autor, data e pode ser desfeita.",
        mock: ["Projeto A", "Projeto B", "sem acesso cruzado"],
      },
    ],
  },
  shift: {
    title: "Onde o valor aparece",
    before: "Hoje",
    after: "Com a Pontian",
    rows: [
      {
        name: "Começar um projeto novo",
        before: "Semanas procurando em pastas e perguntando a quem lembra.",
        after: "Um resumo pronto no primeiro dia, com as fontes.",
      },
      {
        name: "A mesma pergunta, de novo",
        before: "Alguém responde pela décima vez.",
        after: "Respondida uma vez. Fica registrada para a próxima pessoa.",
      },
      {
        name: "Decisão tomada em reunião",
        before: "Fica na gravação. Ninguém acha depois.",
        after: "Vira ata no seu modelo e entra no registro.",
      },
      {
        name: "Quem está sobrecarregado",
        before: "Descobre-se quando o prazo já passou.",
        after: "Aparece na semana, por pessoa e por projeto.",
      },
    ],
    footer: "Medimos contra a linha de base do primeiro mês. Nenhum número é prometido antes de medir.",
  },
  sectors: {
    title: "Onde isso se aplica",
    intro: "Qualquer empresa cujo maior ativo é o que a equipe sabe.",
    lostLabel: "O que se perde hoje",
    changeLabel: "O que muda",
    items: [
      {
        name: "Engenharia e construção",
        lost: "Quinze disciplinas, um cliente, oito projetos ao mesmo tempo. A memória da conta vive em veteranos.",
        change: "Cada projeto novo começa sabendo o que o anterior aprendeu.",
      },
      {
        name: "Infraestrutura pesada",
        lost: "Obras longas, equipes que trocam, normas que mudam no meio do caminho.",
        change: "A norma vigente e a lição da última obra chegam juntas, na hora da pergunta.",
      },
      {
        name: "Incorporação e urbanismo",
        lost: "Aprovações, contratos e fases em sistemas que não conversam. Cada empreendimento reinventa o processo.",
        change: "O processo aprovado vira padrão. O que atrasou no último fica visível no próximo.",
      },
      {
        name: "Agronegócio",
        lost: "Safra, logística, crédito e clima em planilhas separadas, cada fazenda do seu jeito.",
        change: "Uma leitura por fazenda e por semana, com a origem de cada número.",
      },
      {
        name: "Serviços de campo",
        lost: "O dono despacha do caminhão. O que ele sabe não está escrito em lugar nenhum.",
        change: "Orçamento, agenda e cobrança em um fluxo. O dono sai do caminhão.",
      },
      {
        name: "Educação",
        lost: "Conteúdo espalhado entre plataformas alugadas. O aluno não sabe onde está.",
        change: "Uma plataforma própria, do gratuito à aula particular.",
      },
    ],
    footer: "Em operação hoje: engenharia, serviços de campo, educação e saúde preventiva.",
  },
  method: {
    title: "Como trabalhamos",
    steps: [
      {
        name: "Observar",
        body: "Duas semanas dentro da operação. Reuniões por área, gravações de tela de trabalho real, uma linha de base medida.",
      },
      {
        name: "Conectar",
        body: "Acesso somente leitura aos sistemas que já existem. Nada é substituído, e ninguém digita a mesma coisa duas vezes.",
      },
      {
        name: "Implantar",
        body: "Primeira versão em uso em semanas, com um grupo pequeno. Sprints de duas semanas, demonstração ao fim de cada um.",
      },
      {
        name: "Medir",
        body: "Perguntas respondidas com fonte, tempo de início de projeto, correções feitas. Tudo contra a linha de base.",
      },
      {
        name: "Expandir",
        body: "Do grupo piloto para a área inteira e, quando o número justifica, para o resto da empresa.",
      },
      {
        name: "Compor",
        body: "Cada correção vira conhecimento permanente. O sistema melhora a cada projeto, e a empresa fica com tudo.",
      },
    ],
    facts: [
      "Seis meses até a primeira conta em produção.",
      "Um dono do lado do cliente.",
      "Depois, a gente opera e mantém.",
    ],
  },
  team: {
    title: "Quem somos",
    intro: "Um time pequeno entre Orlando e São Paulo.",
    people: [
      {
        name: "Gustavo Campos",
        role: "Relacionamento e engajamento",
        line: "Conduz a conversa com o cliente do primeiro café ao contrato.",
      },
      {
        name: "Shouqi Han",
        role: "Liderança técnica",
        line: "Desenha e constrói o sistema. Responsável pelo que entra em produção.",
      },
      {
        name: "Scott Robinson",
        role: "IA aplicada e engenharia",
        line: "Georgia Tech. Modelos, avaliação e qualidade das respostas.",
      },
      {
        name: "Eduardo Izawa Maciel",
        role: "Engenharia de software, São Paulo",
        line: "Inteli. Integrações e presença no cliente.",
      },
      {
        name: "Felipe Dreifus",
        role: "Engenharia de software, São Paulo",
        line: "Inteli. Implantação, gravação de fluxos e treinamento.",
      },
    ],
    footer: "Especialistas entram por projeto quando o trabalho pede.",
  },
  close: {
    title: "Vamos conversar.",
    body: "Trinta minutos sobre onde o conhecimento da sua empresa está hoje e o que daria para fazer com ele.",
    emailSubject: "Conversa com a Pontian",
    whatsappPrefill: "Olá, vi a apresentação da Pontian e gostaria de conversar.",
  },
};

const en: Content = {
  ui: {
    swipe: "Swipe to begin",
    scroll: "Scroll to begin",
    contact: "Contact",
    back: "Back",
    undo: "Undo",
    chapter: "Chapter",
    next: "Next",
    prev: "Previous",
    pdf: "Download PDF",
    email: "Email us",
    whatsapp: "WhatsApp",
    tapHint: "Tap to open",
    clickHint: "Click to open",
    dragHint: "Drag",
    swipeCards: "Swipe the cards",
  },
  home: {
    tagline: "A small technology company doing big things.",
  },
  contactPage: {
    title: "Contact",
    body: "Write or call. We answer the same day.",
    emailLabel: "Email",
    whatsappLabel: "WhatsApp",
    whatsappPrefill: "Hi, I saw the Pontian site and would like to talk.",
    emailSubject: "A conversation with Pontian",
  },
  cover: {
    title: "Intelligence that works inside the company.",
    sub: "A short walk through what we do and why now.",
  },
  horizon: {
    title: "Where AI is going",
    stops: [
      {
        year: "2023",
        name: "Chat",
        body: "A general model answers general questions. Impressive for a week. It knows nothing about your company and forgets everything when the tab closes.",
      },
      {
        year: "2025",
        name: "Copilots",
        body: "Every tool got an assistant. One in email, one in the spreadsheet, one in CAD. Each helps with one task. None of them sees the whole.",
      },
      {
        year: "Now",
        name: "Operating layer",
        body: "The model became a commodity. What counts is your company's own knowledge, tied to daily work, under your rules. That is where Pontian works.",
      },
    ],
    closing:
      "Models will keep getting better and cheaper. The edge becomes what only your company knows.",
  },
  scatter: {
    title: "What every company has in common",
    body: "The knowledge exists. It sits in folders, email, meeting minutes, spreadsheets, systems, and in the head of whoever has been there twenty years. Every new project starts the search over.",
    nodes: ["Folders", "Email", "Meetings", "Spreadsheets", "Systems", "Veterans"],
    button: "Bring together",
    center: "One place",
    caption: "Every answer arrives with the document it came from. No permission, no view.",
  },
  layers: {
    title: "What Pontian builds",
    intro: "One system, five layers. Tap each one.",
    items: [
      {
        name: "One company truth",
        body: "Documents, decisions and rules in one place, with the current version and its history. What got replaced is marked as replaced.",
        mock: ["Design standard v12", "in force since 03/2026", "replaces v11"],
      },
      {
        name: "Answers with sources",
        body: "Anyone asks in plain language. The answer comes with the passage and the document. When the evidence does not exist, the system says it does not know.",
        mock: ["What is the approval lead time?", "15 business days", "Contract N171, clause 4.2"],
      },
      {
        name: "Deadlines and team",
        body: "Schedules and allocation on one screen. Deadline collisions by area, load per person, who has room.",
        mock: ["Week 38", "Electrical: 3 deliveries", "Ana: 46h of 40h"],
      },
      {
        name: "Automations with approval",
        body: "Meeting minutes, project kickoff summaries, weekly reports. The system drafts, a person approves, everything is logged.",
        mock: ["Minutes AR#007 ready", "awaiting approval", "Diego M."],
      },
      {
        name: "Permissions everywhere",
        body: "Each person sees what their role allows. One client never mixes with another. Every change has an author, a date, and can be undone.",
        mock: ["Project A", "Project B", "no cross access"],
      },
    ],
  },
  shift: {
    title: "Where the value shows up",
    before: "Today",
    after: "With Pontian",
    rows: [
      {
        name: "Starting a new project",
        before: "Weeks of digging through folders and asking whoever remembers.",
        after: "A summary ready on day one, with sources.",
      },
      {
        name: "The same question, again",
        before: "Someone answers it for the tenth time.",
        after: "Answered once. Kept for the next person.",
      },
      {
        name: "A decision made in a meeting",
        before: "Stays in the recording. Nobody finds it later.",
        after: "Becomes minutes in your template and enters the record.",
      },
      {
        name: "Who is overloaded",
        before: "Found out after the deadline passed.",
        after: "Visible that week, per person and per project.",
      },
    ],
    footer: "We measure against a baseline taken in the first month. No number is promised before measuring.",
  },
  sectors: {
    title: "Where this applies",
    intro: "Any company whose biggest asset is what its people know.",
    lostLabel: "What gets lost today",
    changeLabel: "What changes",
    items: [
      {
        name: "Engineering and construction",
        lost: "Fifteen disciplines, one client, eight projects at once. The account's memory lives in veterans.",
        change: "Each new project starts knowing what the last one learned.",
      },
      {
        name: "Heavy infrastructure",
        lost: "Long jobs, rotating crews, standards that change midway.",
        change: "The current standard and the lesson from the last job arrive together, when the question is asked.",
      },
      {
        name: "Real estate development",
        lost: "Approvals, contracts and phases in systems that do not talk. Every development reinvents the process.",
        change: "The approved process becomes the standard. What ran late last time is visible next time.",
      },
      {
        name: "Agribusiness",
        lost: "Harvest, logistics, credit and weather in separate spreadsheets, each farm its own way.",
        change: "One read per farm per week, with the origin of every number.",
      },
      {
        name: "Field services",
        lost: "The owner dispatches from the truck. What he knows is written nowhere.",
        change: "Quote, schedule and billing in one flow. The owner gets out of the truck.",
      },
      {
        name: "Education",
        lost: "Content scattered across rented platforms. The student does not know where they stand.",
        change: "One platform of their own, from free to private lessons.",
      },
    ],
    footer: "Running today: engineering, field services, education and preventive health.",
  },
  method: {
    title: "How we work",
    steps: [
      {
        name: "Observe",
        body: "Two weeks inside the operation. Meetings by area, screen recordings of real work, a measured baseline.",
      },
      {
        name: "Connect",
        body: "Read-only access to the systems already in place. Nothing gets replaced, and nobody types the same thing twice.",
      },
      {
        name: "Deploy",
        body: "A first version in use within weeks, with a small group. Two-week sprints, a demo at the end of each.",
      },
      {
        name: "Measure",
        body: "Questions answered with sources, time to start a project, corrections made. All against the baseline.",
      },
      {
        name: "Expand",
        body: "From the pilot group to the whole department, then to the rest of the company once the numbers justify it.",
      },
      {
        name: "Compound",
        body: "Every correction becomes permanent knowledge. The system improves with each project, and the company keeps all of it.",
      },
    ],
    facts: [
      "Six months to the first account in production.",
      "One owner on the client side.",
      "After that, we run and maintain it.",
    ],
  },
  team: {
    title: "Who we are",
    intro: "A small team between Orlando and São Paulo.",
    people: [
      {
        name: "Gustavo Campos",
        role: "Relationships and engagement",
        line: "Runs the client conversation from the first coffee to the contract.",
      },
      {
        name: "Shouqi Han",
        role: "Technical lead",
        line: "Designs and builds the system. Accountable for what goes to production.",
      },
      {
        name: "Scott Robinson",
        role: "Applied AI and engineering",
        line: "Georgia Tech. Models, evaluation and answer quality.",
      },
      {
        name: "Eduardo Izawa Maciel",
        role: "Software engineering, São Paulo",
        line: "Inteli. Integrations and on-site presence.",
      },
      {
        name: "Felipe Dreifus",
        role: "Software engineering, São Paulo",
        line: "Inteli. Rollout, workflow recording and training.",
      },
    ],
    footer: "Specialists join per project when the work calls for it.",
  },
  close: {
    title: "Let's talk.",
    body: "Thirty minutes on where your company's knowledge sits today and what could be done with it.",
    emailSubject: "A conversation with Pontian",
    whatsappPrefill: "Hi, I saw the Pontian presentation and would like to talk.",
  },
};

export const content: Record<Locale, Content> = { pt, en };
