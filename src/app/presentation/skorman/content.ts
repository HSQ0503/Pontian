export const chapters = [
  {
    id: "begin",
    label: "The opportunity",
    time: "45 sec",
    say: "Pontian builds useful systems around the way a business works. For Skorman, we see a connected opportunity: help people find your properties, help you find the next site, and make every project easier to oversee.",
    do: "Start the experience. The three links on the image let you jump directly to an offer.",
  },
  {
    id: "skorman",
    label: "Your world",
    time: "45 sec",
    say: "Your portfolio has different jobs at different stages. A destination needs visitors. An apartment community needs qualified prospects. A development needs clear decisions. The technology should follow those differences.",
    do: "Select each property. Mention that the images are developer visuals and project stages come from public sources, checked October 1, 2026.",
  },
  {
    id: "visibility",
    label: "Get discovered",
    time: "90 sec",
    say: "SEO helps people find your properties in Google. GEO helps AI answers describe them accurately. We improve the information people need, then make the next step obvious. We would measure useful visits and inquiries, alongside search visibility.",
    do: "Pick Visit, Live, or Lease, then click through the three steps. These are illustrative journeys, not captured Google or ChatGPT results. There is no ranking or lead guarantee.",
  },
  {
    id: "searcher",
    label: "Find the next site",
    time: "90 sec",
    say: "Tell us what a good site looks like. We bring relevant public and licensed information into a shortlist, explain why each site matches, and show what still needs checking. Foreclosure is one signal. Your team decides what deserves a closer look.",
    do: "Filter by land, apartments, or commercial. Select a map marker, open the evidence, and save a site. All sites, acreage, and signals in this demo are invented. A real system would be a new build.",
  },
  {
    id: "oversight",
    label: "Know what needs you",
    time: "60 sec",
    say: "Imagine opening one brief on Monday and seeing what changed, what needs a decision, and who owns the next step. We can build that around the reports and documents your teams already use.",
    do: "Bring the updates together, then select a decision. This is a proposed workflow with fictional project updates, not an audit of Skorman's operations.",
  },
  {
    id: "answers",
    label: "Ask your projects",
    time: "60 sec",
    say: "Ask a normal question about a project. Get a short answer and the document behind it. If the latest information is missing, the system should say so. Each person only sees information they are allowed to access.",
    do: "Try the suggested questions, then open a supporting note. These are prepared example responses. Skorman's documents and integrations would be configured together.",
  },
  {
    id: "experience",
    label: "A foundation to build on",
    time: "60 sec",
    say: "Use your own words about working with Pontian on Canes. The concrete capabilities are lead intake, conversations, scheduling, and invoices in a connected workflow. Other work gives us foundations for reporting across locations and answering questions from company documents.",
    do: "Choose a capability. Describe what you have personally used; do not invent a testimonial or a quantified result. The project-change example is a demonstration, not a delivered construction integration.",
  },
  {
    id: "horizon",
    label: "The longer view",
    time: "60 sec",
    say: "Over time, the same property record can follow a site from first review to planning, construction, and operations. Compare what you expected with what happened. Keep that knowledge for the next project. Pontian stays involved to maintain and improve the systems.",
    do: "Move through the three horizons. These describe a possible direction, not a committed schedule or existing Skorman integration.",
  },
  {
    id: "next",
    label: "Start the conversation",
    time: "45 sec",
    say: "Let's bring the right people together for one working session. Pick a property, walk through the current process, and agree on one useful first result. We suggest starting with search visibility at Hills City Center, then growing from there.",
    do: "Choose the starting focus to show a suggested session agenda. This only changes the presentation; it does not book a meeting or send information.",
  },
] as const;

export const properties = [
  {
    name: "Hills City Center",
    kind: "A destination taking shape",
    image: "hills-city-center.png",
    stat: "96",
    unit: "acre mixed-use program",
    status: "Open attractions + future phases",
    opportunity: "Help visitors understand what's open and plan a visit.",
    detail:
      "Crooked Can and Splash & Play are described as open. Homes and additional uses remain future phases.",
    source: "https://www.hillscitycenter.com/about",
    credit:
      "Hills City Center development visual, via Skorman. Shown as a vision, not completed inventory.",
  },
  {
    name: "Minneola Hills",
    kind: "An established apartment community",
    image: "minneola-hills.png",
    stat: "297",
    unit: "apartments",
    status: "Completed in 2021, per Skorman",
    opportunity:
      "Help the right renters discover the community and reach leasing.",
    detail:
      "A dedicated property website already supports leasing. Work with its operator and existing process.",
    source: "https://www.skormandevelopment.com/minneola-hills",
    credit: "Minneola Hills property visual, via Skorman Development.",
  },
  {
    name: "Vista Hills",
    kind: "The next phase of growth",
    image: "vista-hills.png",
    stat: "324",
    unit: "planned apartments",
    status: "Groundbreaking reported January 2026",
    opportunity:
      "Keep development decisions and future opening information aligned.",
    detail:
      "Skorman reports a construction start. Completion and current occupancy have not been established.",
    source: "https://www.skormandevelopment.com/vista-hills",
    credit:
      "Vista Hills development rendering, via Skorman. Not a claim of completion.",
  },
] as const;

export const sources = [
  {
    label: "Skorman's business and featured developments",
    detail:
      "Portfolio and asset types. Inclusion does not establish current ownership.",
    href: "https://www.skormandevelopment.com/developments",
  },
  {
    label: "Skorman's approach",
    detail: "Acquisitions, approvals, development, and community consultation.",
    href: "https://www.skormandevelopment.com/approach",
  },
  {
    label: "Hills City Center: open and planned phases",
    detail:
      "Current attractions and future plans, as described by the destination.",
    href: "https://www.hillscitycenter.com/about",
  },
  {
    label: "Minneola Hills",
    detail: "297 apartments and the company's reported completion date.",
    href: "https://www.skormandevelopment.com/minneola-hills",
  },
  {
    label: "Vista Hills",
    detail: "324 apartments and the company's reported groundbreaking.",
    href: "https://www.skormandevelopment.com/vista-hills",
  },
  {
    label: "Windermere Village",
    detail:
      "Retail tenant mix. Skorman describes the development as fully leased.",
    href: "https://www.skormandevelopment.com/windermere-village",
  },
  {
    label: "Google's guidance on AI search",
    detail:
      "Useful content and normal SEO foundations. No guaranteed visibility.",
    href: "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide",
  },
  {
    label: "Lake County foreclosure sales",
    detail:
      "A potential research input. A notice does not establish investment value.",
    href: "https://www.lakecountyclerkfl.gov/departments/courts-management/civil/real-property-mortgage-foreclosure/foreclosure-sales-calendar/",
  },
  {
    label: "Lake County recorded sales",
    detail: "Sales records and downloadable files for comparison research.",
    href: "https://lakecopropappr.com/sales-search.aspx",
  },
  {
    label: "Lake County GIS",
    detail:
      "Public mapping layers including zoning, flood zones, and wetlands.",
    href: "https://gis.lakecountyfl.gov/lakegis/rest/services/OpenData/OpenData3/MapServer",
  },
];
