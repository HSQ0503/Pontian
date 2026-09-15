export type Locale = "pt" | "en";

export type SectionKey = "context" | "solution" | "method" | "team";

export type Content = {
  ui: {
    swipe: string;
    scroll: string;
    contact: string;
    back: string;
    undo: string;
    page: string;
    pdf: string;
    email: string;
    whatsapp: string;
    tapHint: string;
    clickHint: string;
    dragHint: string;
    stepHint: string;
    exhibit: string;
    source: string;
    sections: Record<SectionKey, string>;
    meta: string;
    docType: string;
    cities: { orlando: string; saoPaulo: string };
  };
  home: { tagline: string };
  contactPage: {
    title: string;
    body: string;
    emailLabel: string;
    whatsappLabel: string;
    whatsappPrefill: string;
    emailSubject: string;
  };
  cover: { title: string; sub: string };
  summary: {
    title: string;
    rows: { label: string; body: string }[];
  };
  horizon: {
    title: string;
    stops: { year: string; name: string; body: string }[];
    takeaway: string;
    source: string;
  };
  adoption: {
    title: string;
    caption: string;
    bars: { label: string; value: number; display: string; note: string }[];
    takeaway: string;
    source: string;
  };
  leaders: {
    title: string;
    columns: { firm: string; profile: string; what: string };
    rows: { firm: string; profile: string; what: string; source: string }[];
    note: string;
    takeaway: string;
    source: string;
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
    items: { name: string; body: string; mock: string[] }[];
    takeaway: string;
  };
  flow: {
    title: string;
    steps: { name: string; body: string }[];
    sample: { question: string; answer: string; source: string; meta: string };
    takeaway: string;
  };
  shift: {
    title: string;
    before: string;
    after: string;
    rows: { name: string; before: string; after: string }[];
    source: string;
  };
  sectors: {
    title: string;
    lostLabel: string;
    changeLabel: string;
    items: { name: string; lost: string; change: string }[];
    source: string;
  };
  method: {
    title: string;
    steps: { name: string; body: string }[];
    facts: string[];
  };
  roadmap: {
    title: string;
    monthLabel: string;
    phases: { name: string; from: number; to: number }[];
    months: { name: string; items: string[] }[];
    source: string;
  };
  controls: {
    title: string;
    controlsLabel: string;
    controls: { name: string; body: string }[];
    kpiLabel: string;
    kpis: { value: string; label: string }[];
    source: string;
  };
  commercial: {
    title: string;
    terms: { name: string; body: string }[];
    source: string;
  };
  team: {
    title: string;
    people: { name: string; role: string; line: string; city: string }[];
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
    page: "Página",
    pdf: "Baixar em PDF",
    email: "Escrever por e-mail",
    whatsapp: "Falar no WhatsApp",
    tapHint: "Toque para abrir",
    clickHint: "Clique para abrir",
    dragHint: "Arraste",
    stepHint: "Toque para avançar",
    exhibit: "Figura",
    source: "Fonte",
    sections: { context: "Contexto", solution: "Solução", method: "Método", team: "Equipe" },
    meta: "Setembro de 2026",
    docType: "Apresentação institucional",
    cities: { orlando: "Orlando", saoPaulo: "São Paulo" },
  },
  home: { tagline: "Uma pequena empresa de tecnologia fazendo coisas grandes." },
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
    sub: "O que a Pontian faz, para quem, e por que agora.",
  },
  summary: {
    title: "A IA que faz diferença é a que conhece a sua empresa. A Pontian constrói essa camada.",
    rows: [
      {
        label: "Situação",
        body: "Os modelos de IA ficaram bons, baratos e iguais para todo mundo. Ter acesso a eles deixou de ser vantagem.",
      },
      {
        label: "Complicação",
        body: "O que diferencia uma empresa é o que só ela sabe. Esse conhecimento está em pastas, e-mails, atas e na cabeça de veteranos, sem dono e sem versão.",
      },
      {
        label: "Pergunta",
        body: "Como transformar esse conhecimento em capacidade operacional, com controle sobre quem vê o quê, mantendo os sistemas atuais no lugar?",
      },
      {
        label: "Resposta",
        body: "Uma camada própria da empresa: um lugar para a verdade, respostas com fonte, prazos e equipe em uma tela, automações que uma pessoa aprova. Primeira área em produção em seis meses, medida contra uma linha de base.",
      },
    ],
  },
  horizon: {
    title: "Em três anos, o valor da IA saiu do modelo e foi para o contexto de cada empresa.",
    stops: [
      {
        year: "2023",
        name: "Chat",
        body: "Um modelo genérico responde perguntas genéricas. Impressiona na primeira semana. Não conhece a sua empresa e esquece tudo quando a janela fecha.",
      },
      {
        year: "2025",
        name: "Assistentes",
        body: "Cada ferramenta ganhou um copiloto. Um no e-mail, outro na planilha, mais um no CAD. Cada um ajuda em uma tarefa. Nenhum enxerga o todo.",
      },
      {
        year: "2026",
        name: "Camada operacional",
        body: "O modelo virou commodity. O que vale é o conhecimento da sua empresa, ligado ao trabalho de todo dia, sob as suas regras. É aí que a Pontian trabalha.",
      },
    ],
    takeaway: "Os modelos vão continuar melhorando e barateando. A vantagem passa a ser o que só a sua empresa sabe.",
    source: "Leitura de mercado da Pontian, 2023 a 2026.",
  },
  adoption: {
    title: "A adoção ainda é rasa: quase metade das empresas do setor não usa IA e menos de 1% usa em toda a organização.",
    caption: "Empresas de construção e ambiente construído, % de respondentes por estágio de uso",
    bars: [
      { label: "Não usa IA", value: 45, display: "≈ 45%", note: "Nenhum uso declarado." },
      { label: "Pilotos isolados", value: 34, display: "34%", note: "Testes sem entrar em processo." },
      { label: "Uso regular em um processo", value: 12, display: "< 12%", note: "IA dentro de uma rotina de trabalho." },
      { label: "Uso em vários processos", value: 1.5, display: "1,5%", note: "Mais de uma área operando com IA." },
      { label: "Uso em toda a organização", value: 1, display: "< 1%", note: "Adoção corporativa." },
    ],
    takeaway: "A janela para sair na frente ainda está aberta em quase todos os setores.",
    source: "RICS, Artificial Intelligence in Construction Report, 2025. Valores aproximados.",
  },
  leaders: {
    title: "Quem lidera segue o mesmo padrão: dados controlados, um assistente focado, citações e revisão humana.",
    columns: { firm: "Empresa", profile: "Perfil", what: "O que construiu" },
    rows: [
      {
        firm: "AECOM",
        profile: "Engenharia e infraestrutura, global",
        what: "Assistente interno de conhecimento (Oscar), política de IA e categorias separadas para assistentes gerais, automação operacional, IA de engenharia e agentes.",
        source: "AECOM Annual Report 2025",
      },
      {
        firm: "Mott MacDonald",
        profile: "Engenharia, cerca de 20 mil pessoas",
        what: "Assistente EMMA aberto a toda a empresa depois de anos organizando dados atuais, consistentes e conectados. Ferramenta REALM para requisitos, com revisão de especialistas, 35% a 45% mais rápida em um piloto de 4 mil requisitos.",
        source: "Mott MacDonald Insights, 2025",
      },
      {
        firm: "Dunaway",
        profile: "Engenharia civil, Estados Unidos",
        what: "Assistente Atlas para pesquisa regulatória, com citações, nível de confiança e escalonamento a um especialista. Empresa e Microsoft reportam 90% menos tempo de pesquisa.",
        source: "Microsoft Customer Stories, 2025",
      },
    ],
    note: "Números autodeclarados pelas empresas. Não são previsão para a sua.",
    takeaway: "Nenhuma delas comprou um agente autônomo. Todas montaram uma base controlada e puseram uma pessoa no fim do fluxo.",
    source: "Relatórios anuais e publicações das próprias empresas, 2025.",
  },
  scatter: {
    title: "O conhecimento da empresa existe. Está em seis lugares que não conversam entre si.",
    body: "Pastas, e-mails, atas, planilhas, sistemas e a cabeça de quem está há vinte anos na casa. Cada projeto novo recomeça a procura.",
    nodes: ["Pastas", "E-mails", "Reuniões", "Planilhas", "Sistemas", "Veteranos"],
    button: "Reunir",
    center: "Base única",
    caption: "Cada resposta chega com o documento de onde veio. Quem não tem permissão não vê.",
  },
  layers: {
    title: "A Pontian constrói uma camada de cinco partes por cima dos sistemas que a empresa já usa.",
    items: [
      {
        name: "Uma verdade da empresa",
        body: "Documentos, decisões e regras em um lugar só, com a versão atual e o histórico. O que foi substituído fica marcado como substituído.",
        mock: ["Norma de projeto v12", "vigente desde 03/2026", "substitui v11"],
      },
      {
        name: "Respostas com fonte",
        body: "Qualquer pessoa pergunta em linguagem comum. A resposta vem com o trecho e o documento. Quando a evidência não existe, o sistema diz que não sabe.",
        mock: ["Qual o prazo de aprovação?", "15 dias úteis", "Contrato 0421, cláusula 4.2"],
      },
      {
        name: "Prazos e equipe",
        body: "Cronogramas e alocação em uma tela. Colisões de prazo por área, carga por pessoa, quem tem folga.",
        mock: ["Semana 38", "Elétrica: 3 entregas", "Ana: 46h de 40h"],
      },
      {
        name: "Automações com aprovação",
        body: "Atas de reunião, resumos de início de projeto, relatórios semanais. O sistema redige, uma pessoa aprova, tudo fica registrado.",
        mock: ["Ata 007 pronta", "aguardando aprovação", "Ana P."],
      },
      {
        name: "Permissões em tudo",
        body: "Cada pessoa vê o que o seu papel permite. Um cliente nunca se mistura com outro. Cada alteração tem autor, data e pode ser desfeita.",
        mock: ["Projeto A", "Projeto B", "sem acesso cruzado"],
      },
    ],
    takeaway: "Revit, ERP, CRM e e-mail continuam onde estão. A camada lê, organiza e responde por cima deles.",
  },
  flow: {
    title: "Cada resposta percorre cinco etapas antes de chegar a uma pessoa, e cada etapa deixa registro.",
    steps: [
      {
        name: "Fontes aprovadas",
        body: "Pastas, Autodesk Docs, SharePoint, e-mail de projeto, transcrições de reunião. Só o que a empresa autorizou.",
      },
      {
        name: "Sincronização com permissões",
        body: "Arquivos, versões e permissões entram como estão na origem. Quem não vê lá, não vê aqui.",
      },
      {
        name: "Base de conhecimento",
        body: "Versão atual e histórico. O que foi substituído fica marcado, com data e autor.",
      },
      {
        name: "Resposta, painel ou relatório",
        body: "A pessoa pergunta em linguagem comum e recebe o trecho e o documento. Sem evidência, o sistema diz que não sabe.",
      },
      {
        name: "Aprovação e registro",
        body: "Alterações materiais passam por uma pessoa nomeada. Cada mudança tem autor, data e pode ser desfeita.",
      },
    ],
    sample: {
      question: "Qual é o prazo de aprovação do projeto executivo neste contrato?",
      answer: "Quinze dias úteis a partir da entrega formal, prorrogáveis uma vez mediante aviso por escrito.",
      source: "Contrato 0421 · cláusula 4.2 · versão vigente desde 03/2026",
      meta: "2 fontes · 1,8 s · aprovado por Ana P. em 12/09",
    },
    takeaway: "O modelo é substituível. A base, as permissões e o histórico ficam com a empresa.",
  },
  shift: {
    title: "O valor aparece em quatro rotinas que hoje consomem tempo sem que ninguém meça.",
    before: "Hoje",
    after: "Com a camada",
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
        after: "Vira ata no modelo da empresa e entra no registro.",
      },
      {
        name: "Quem está sobrecarregado",
        before: "Descobre-se quando o prazo já passou.",
        after: "Aparece na semana, por pessoa e por projeto.",
      },
    ],
    source: "Medido contra a linha de base do primeiro mês. Nenhum número é prometido antes de medir.",
  },
  sectors: {
    title: "O mesmo desenho serve a qualquer setor onde o que a equipe sabe vale mais que o software que ela usa.",
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
    source: "Em operação hoje: engenharia, serviços de campo, educação e saúde preventiva.",
  },
  method: {
    title: "Seis etapas, sempre na mesma ordem: observar antes de conectar, medir antes de expandir.",
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
    facts: ["Seis meses até a primeira conta em produção.", "Um dono do lado do cliente.", "Depois, a Pontian opera e mantém."],
  },
  roadmap: {
    title: "Em seis meses, a primeira área está em produção e a base corporativa pronta para expandir.",
    monthLabel: "Mês",
    phases: [
      { name: "Piloto", from: 1, to: 2 },
      { name: "Área", from: 3, to: 4 },
      { name: "Empresa", from: 5, to: 6 },
    ],
    months: [
      {
        name: "Levantamento",
        items: ["Reuniões por área e gravações de trabalho real", "Mapa de fontes e permissões", "Arquitetura e linha de base medida"],
      },
      {
        name: "Primeira versão",
        items: ["Grupo piloto usando o sistema", "Respostas com fonte", "Fluxo de aprovação de conhecimento"],
      },
      {
        name: "Conexões",
        items: ["Fontes conectadas em modo leitura", "Sincronização automática", "Espaço do colaborador"],
      },
      {
        name: "Equipes",
        items: ["Implantação nas equipes da área", "Painel de liderança: prazos e equipe", "Primeiros relatórios automáticos"],
      },
      {
        name: "Empresa",
        items: ["Base corporativa: normas, manuais, lições", "Automações com aprovação", "Estrutura para as demais áreas"],
      },
      {
        name: "Produção",
        items: ["Segurança e testes de vazamento", "Treinamento e runbooks", "Aceite de produção"],
      },
    ],
    source: "Sequência de referência. Datas exatas saem do levantamento do mês 1.",
  },
  controls: {
    title: "Cinco controles mantêm a autoridade com as pessoas e tornam o sistema auditável.",
    controlsLabel: "Controles",
    controls: [
      { name: "Permissões por conta, projeto e papel", body: "Um cliente nunca se mistura com outro." },
      { name: "Resposta com fonte ou abstenção", body: "Sem evidência, o sistema diz que não sabe." },
      { name: "Aprovação humana para mudanças materiais", body: "O sistema propõe. Uma pessoa nomeada aprova." },
      { name: "Autoridade técnica com os profissionais", body: "Engenharia, jurídico, segurança e cliente decidem. A IA redige." },
      { name: "Testes permanentes", body: "Vazamento, precisão de citação e disponibilidade, medidos todo mês." },
    ],
    kpiLabel: "Metas de aceite",
    kpis: [
      { value: "100%", label: "das respostas materiais com fonte, escopo e versão" },
      { value: "≥ 95%", label: "de precisão entre citação e documento" },
      { value: "≥ 90%", label: "das afirmações sustentadas pela evidência" },
      { value: "0", label: "vazamentos entre projetos ou clientes" },
      { value: "0", label: "ações externas sem aprovação" },
      { value: "99%", label: "de disponibilidade mensal" },
      { value: "≤ 15 min", label: "para uma mudança na fonte aparecer" },
    ],
    source: "Metas usadas nos programas da Pontian. Limites finais definidos com o cliente após a linha de base.",
  },
  commercial: {
    title: "Contrata-se por resultado medido: preço fixo do programa, liberado etapa a etapa.",
    terms: [
      { name: "Preço fixo do programa", body: "Definido antes de começar, com o escopo por escrito." },
      { name: "Medição mensal", body: "Cada mês tem um resultado nomeado. O pagamento acompanha o aceite." },
      { name: "Custos de terceiros à parte", body: "Modelos, hospedagem e licenças pagos ao custo, com estimativa prévia." },
      { name: "Operação depois do programa", body: "Mensalidade para operar, monitorar e melhorar. Cancela com 30 dias." },
      { name: "Dados e conhecimento são do cliente", body: "Exportação completa a qualquer momento, em formato aberto." },
      { name: "Continuidade garantida", body: "Opção de licença da instância e pacote de continuidade em custódia." },
    ],
    source: "Estrutura padrão. Valores dependem do escopo definido no levantamento.",
  },
  team: {
    title: "Um time pequeno entre Orlando e São Paulo, com especialistas por projeto.",
    people: [
      {
        name: "Gustavo Campos",
        role: "Relacionamento e engajamento",
        line: "Conduz a conversa com o cliente do primeiro café ao contrato.",
        city: "Orlando",
      },
      {
        name: "Shouqi Han",
        role: "Liderança técnica",
        line: "Desenha e constrói o sistema. Responsável pelo que entra em produção.",
        city: "Orlando",
      },
      {
        name: "Scott Robinson",
        role: "IA aplicada e engenharia",
        line: "Georgia Tech. Modelos, avaliação e qualidade das respostas.",
        city: "Atlanta",
      },
      {
        name: "Eduardo Izawa Maciel",
        role: "Engenharia de software",
        line: "Inteli. Integrações e presença no cliente.",
        city: "São Paulo",
      },
      {
        name: "Felipe Dreifus",
        role: "Engenharia de software",
        line: "Inteli. Implantação, gravação de fluxos e treinamento.",
        city: "São Paulo",
      },
    ],
    footer: "Especialistas em BIM, dados e segurança entram por projeto quando o trabalho pede.",
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
    page: "Page",
    pdf: "Download PDF",
    email: "Email us",
    whatsapp: "WhatsApp",
    tapHint: "Tap to open",
    clickHint: "Click to open",
    dragHint: "Drag",
    stepHint: "Tap to advance",
    exhibit: "Exhibit",
    source: "Source",
    sections: { context: "Context", solution: "Solution", method: "Method", team: "Team" },
    meta: "September 2026",
    docType: "Company overview",
    cities: { orlando: "Orlando", saoPaulo: "São Paulo" },
  },
  home: { tagline: "A small technology company doing big things." },
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
    sub: "What Pontian does, for whom, and why now.",
  },
  summary: {
    title: "The AI that makes a difference is the one that knows your company. Pontian builds that layer.",
    rows: [
      {
        label: "Situation",
        body: "AI models became good, cheap and identical for everyone. Having access to them stopped being an advantage.",
      },
      {
        label: "Complication",
        body: "What sets a company apart is what only it knows. That knowledge sits in folders, email, meeting minutes and the heads of veterans, with no owner and no version.",
      },
      {
        label: "Question",
        body: "How do you turn that knowledge into operating capability, with control over who sees what, while the current systems stay in place?",
      },
      {
        label: "Answer",
        body: "A layer the company owns: one place for the truth, answers with sources, deadlines and team on one screen, automations a person approves. First department in production within six months, measured against a baseline.",
      },
    ],
  },
  horizon: {
    title: "In three years the value of AI moved out of the model and into each company's own context.",
    stops: [
      {
        year: "2023",
        name: "Chat",
        body: "A general model answers general questions. Impressive for a week. It knows nothing about your company and forgets everything when the tab closes.",
      },
      {
        year: "2025",
        name: "Copilots",
        body: "Every tool got an assistant. One in email, one in the spreadsheet, one more in CAD. Each helps with one task. None of them sees the whole.",
      },
      {
        year: "2026",
        name: "Operating layer",
        body: "The model became a commodity. What counts is your company's own knowledge, tied to daily work, under your rules. That is where Pontian works.",
      },
    ],
    takeaway: "Models will keep getting better and cheaper. The edge becomes what only your company knows.",
    source: "Pontian market reading, 2023 to 2026.",
  },
  adoption: {
    title: "Adoption is still shallow: almost half the sector's firms use no AI, and under 1% use it across the organization.",
    caption: "Construction and built-environment firms, % of respondents by stage of use",
    bars: [
      { label: "No AI use", value: 45, display: "≈ 45%", note: "No use reported." },
      { label: "Isolated pilots", value: 34, display: "34%", note: "Tests that never enter a process." },
      { label: "Regular use in one process", value: 12, display: "< 12%", note: "AI inside a working routine." },
      { label: "Use across several processes", value: 1.5, display: "1.5%", note: "More than one area operating with AI." },
      { label: "Organization-wide use", value: 1, display: "< 1%", note: "Company-level adoption." },
    ],
    takeaway: "The window to get ahead is still open in almost every sector.",
    source: "RICS, Artificial Intelligence in Construction Report, 2025. Approximate values.",
  },
  leaders: {
    title: "The leaders follow one pattern: controlled data, a focused assistant, citations and human review.",
    columns: { firm: "Firm", profile: "Profile", what: "What they built" },
    rows: [
      {
        firm: "AECOM",
        profile: "Engineering and infrastructure, global",
        what: "Internal knowledge assistant (Oscar), an AI policy, and separate categories for general assistants, operational automation, engineering AI and agents.",
        source: "AECOM Annual Report 2025",
      },
      {
        firm: "Mott MacDonald",
        profile: "Engineering, about 20,000 people",
        what: "EMMA assistant opened to the whole firm after years of work on current, consistent, connected data. REALM requirements tool with expert review, 35% to 45% faster in a pilot of 4,000 requirements.",
        source: "Mott MacDonald Insights, 2025",
      },
      {
        firm: "Dunaway",
        profile: "Civil engineering, United States",
        what: "Atlas assistant for regulatory research, with citations, confidence levels and escalation to an expert. Firm and Microsoft report 90% less research time.",
        source: "Microsoft Customer Stories, 2025",
      },
    ],
    note: "Figures are self-reported by the firms. They are no forecast for yours.",
    takeaway: "None of them bought an autonomous agent. All of them built a controlled base and put a person at the end of the flow.",
    source: "Annual reports and publications by the firms themselves, 2025.",
  },
  scatter: {
    title: "The company's knowledge exists. It sits in six places that do not talk to each other.",
    body: "Folders, email, meeting minutes, spreadsheets, systems, and the head of whoever has been there twenty years. Every new project starts the search over.",
    nodes: ["Folders", "Email", "Meetings", "Spreadsheets", "Systems", "Veterans"],
    button: "Bring together",
    center: "Single base",
    caption: "Every answer arrives with the document it came from. No permission, no view.",
  },
  layers: {
    title: "Pontian builds a five-part layer on top of the systems the company already uses.",
    items: [
      {
        name: "One company truth",
        body: "Documents, decisions and rules in one place, with the current version and its history. What got replaced is marked as replaced.",
        mock: ["Design standard v12", "in force since 03/2026", "replaces v11"],
      },
      {
        name: "Answers with sources",
        body: "Anyone asks in plain language. The answer comes with the passage and the document. When the evidence does not exist, the system says it does not know.",
        mock: ["What is the approval lead time?", "15 business days", "Contract 0421, clause 4.2"],
      },
      {
        name: "Deadlines and team",
        body: "Schedules and allocation on one screen. Deadline collisions by area, load per person, who has room.",
        mock: ["Week 38", "Electrical: 3 deliveries", "Ana: 46h of 40h"],
      },
      {
        name: "Automations with approval",
        body: "Meeting minutes, project kickoff summaries, weekly reports. The system drafts, a person approves, everything is logged.",
        mock: ["Minutes 007 ready", "awaiting approval", "Ana P."],
      },
      {
        name: "Permissions everywhere",
        body: "Each person sees what their role allows. One client never mixes with another. Every change has an author, a date, and can be undone.",
        mock: ["Project A", "Project B", "no cross access"],
      },
    ],
    takeaway: "Revit, ERP, CRM and email stay where they are. The layer reads, organizes and answers on top of them.",
  },
  flow: {
    title: "Every answer passes through five stages before it reaches a person, and every stage leaves a record.",
    steps: [
      {
        name: "Approved sources",
        body: "Folders, Autodesk Docs, SharePoint, project mailboxes, meeting transcripts. Only what the company authorized.",
      },
      {
        name: "Sync with permissions",
        body: "Files, versions and permissions come in as they are at the source. Whoever cannot see it there cannot see it here.",
      },
      {
        name: "Knowledge base",
        body: "Current version and history. What got replaced is marked, with date and author.",
      },
      {
        name: "Answer, dashboard or report",
        body: "The person asks in plain language and receives the passage and the document. Without evidence, the system says it does not know.",
      },
      {
        name: "Approval and record",
        body: "Material changes go through a named person. Every change has an author, a date, and can be undone.",
      },
    ],
    sample: {
      question: "What is the approval lead time for the executive design under this contract?",
      answer: "Fifteen business days from formal delivery, extendable once with written notice.",
      source: "Contract 0421 · clause 4.2 · version in force since 03/2026",
      meta: "2 sources · 1.8 s · approved by Ana P. on 09/12",
    },
    takeaway: "The model is replaceable. The base, the permissions and the history stay with the company.",
  },
  shift: {
    title: "The value shows up in four routines that eat time today without anyone measuring them.",
    before: "Today",
    after: "With the layer",
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
        after: "Becomes minutes in the company's template and enters the record.",
      },
      {
        name: "Who is overloaded",
        before: "Found out after the deadline passed.",
        after: "Visible that week, per person and per project.",
      },
    ],
    source: "Measured against a baseline taken in the first month. No number is promised before measuring.",
  },
  sectors: {
    title: "The same design serves any sector where what the team knows is worth more than the software it uses.",
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
    source: "Running today: engineering, field services, education and preventive health.",
  },
  method: {
    title: "Six steps, always in the same order: observe before connecting, measure before expanding.",
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
    facts: ["Six months to the first account in production.", "One owner on the client side.", "After that, Pontian runs and maintains it."],
  },
  roadmap: {
    title: "Within six months the first department is in production and the corporate base is ready to expand.",
    monthLabel: "Month",
    phases: [
      { name: "Pilot", from: 1, to: 2 },
      { name: "Department", from: 3, to: 4 },
      { name: "Company", from: 5, to: 6 },
    ],
    months: [
      {
        name: "Discovery",
        items: ["Meetings by area and recordings of real work", "Map of sources and permissions", "Architecture and measured baseline"],
      },
      {
        name: "First version",
        items: ["Pilot group using the system", "Answers with sources", "Knowledge approval flow"],
      },
      {
        name: "Connections",
        items: ["Sources connected read-only", "Automatic sync", "Employee workspace"],
      },
      {
        name: "Teams",
        items: ["Rollout to the department's teams", "Leadership view: deadlines and team", "First automatic reports"],
      },
      {
        name: "Company",
        items: ["Corporate base: standards, manuals, lessons", "Automations with approval", "Structure for the other departments"],
      },
      {
        name: "Production",
        items: ["Security and leakage tests", "Training and runbooks", "Production acceptance"],
      },
    ],
    source: "Reference sequence. Exact dates come out of month 1 discovery.",
  },
  controls: {
    title: "Five controls keep authority with people and make the system auditable.",
    controlsLabel: "Controls",
    controls: [
      { name: "Permissions by account, project and role", body: "One client never mixes with another." },
      { name: "Answer with source, or abstain", body: "Without evidence, the system says it does not know." },
      { name: "Human approval for material changes", body: "The system proposes. A named person approves." },
      { name: "Technical authority stays with professionals", body: "Engineering, legal, safety and the client decide. The AI drafts." },
      { name: "Permanent testing", body: "Leakage, citation accuracy and availability, measured every month." },
    ],
    kpiLabel: "Acceptance targets",
    kpis: [
      { value: "100%", label: "of material answers with source, scope and version" },
      { value: "≥ 95%", label: "citation-to-document accuracy" },
      { value: "≥ 90%", label: "of claims supported by the evidence" },
      { value: "0", label: "leaks between projects or clients" },
      { value: "0", label: "external actions without approval" },
      { value: "99%", label: "monthly availability" },
      { value: "≤ 15 min", label: "for a source change to show up" },
    ],
    source: "Targets used in Pontian programs. Final thresholds set with the client after the baseline.",
  },
  commercial: {
    title: "Engagements are priced on measured outcomes: a fixed program price, released stage by stage.",
    terms: [
      { name: "Fixed program price", body: "Set before the start, with the scope in writing." },
      { name: "Monthly measurement", body: "Each month has a named outcome. Payment follows acceptance." },
      { name: "Third-party costs separate", body: "Models, hosting and licenses paid at cost, with an estimate up front." },
      { name: "Operation after the program", body: "A monthly fee to run, monitor and improve. Cancel with 30 days' notice." },
      { name: "Data and knowledge belong to the client", body: "Full export at any time, in open formats." },
      { name: "Continuity guaranteed", body: "Option to license the instance, plus a continuity package in escrow." },
    ],
    source: "Standard structure. Amounts depend on the scope defined in discovery.",
  },
  team: {
    title: "A small team between Orlando and São Paulo, with specialists per project.",
    people: [
      {
        name: "Gustavo Campos",
        role: "Relationships and engagement",
        line: "Runs the client conversation from the first coffee to the contract.",
        city: "Orlando",
      },
      {
        name: "Shouqi Han",
        role: "Technical lead",
        line: "Designs and builds the system. Accountable for what goes to production.",
        city: "Orlando",
      },
      {
        name: "Scott Robinson",
        role: "Applied AI and engineering",
        line: "Georgia Tech. Models, evaluation and answer quality.",
        city: "Atlanta",
      },
      {
        name: "Eduardo Izawa Maciel",
        role: "Software engineering",
        line: "Inteli. Integrations and on-site presence.",
        city: "São Paulo",
      },
      {
        name: "Felipe Dreifus",
        role: "Software engineering",
        line: "Inteli. Rollout, workflow recording and training.",
        city: "São Paulo",
      },
    ],
    footer: "BIM, data and security specialists join per project when the work calls for it.",
  },
  close: {
    title: "Let's talk.",
    body: "Thirty minutes on where your company's knowledge sits today and what could be done with it.",
    emailSubject: "A conversation with Pontian",
    whatsappPrefill: "Hi, I saw the Pontian presentation and would like to talk.",
  },
};

export const content: Record<Locale, Content> = { pt, en };

// Page order and which section of the deck each page belongs to. The
// tracker in the frame reads from this.
export const pageSections: SectionKey[] = [
  "context", // 1 cover
  "context", // 2 summary
  "context", // 3 horizon
  "context", // 4 adoption
  "context", // 5 leaders
  "solution", // 6 scatter
  "solution", // 7 layers
  "solution", // 8 flow
  "solution", // 9 shift
  "solution", // 10 sectors
  "method", // 11 method
  "method", // 12 roadmap
  "method", // 13 controls
  "method", // 14 commercial
  "team", // 15 team
  "team", // 16 close
];
