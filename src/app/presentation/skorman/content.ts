export const sections = [
  { id: "searcher", label: "Find sites" },
  { id: "oversight", label: "Track changes" },
  { id: "answers", label: "Keep knowledge" },
  { id: "investors", label: "Investor updates" },
  { id: "visibility", label: "Get discovered" },
];

export const talkingPoints = [
  {
    title: "Start with Skorman",
    say: "Pontian builds software around the work a company does. For Skorman, that could mean finding promising sites, keeping development decisions clear, and helping people discover the properties.",
    show: "Start with the property image and context. Hills City Center includes both open attractions and future phases. The image is a rendering, not a claim of completion.",
  },
  {
    title: "Find sites",
    say: "Tell us the area, property type, and size you want. We can bring listings and public records into a shortlist and explain why each site appeared. Your team decides what to investigate.",
    show: "Choose a parcel on the map. All three sites are fictional. Foreclosure is one signal, and availability, value, title, and feasibility still need checking.",
  },
  {
    title: "Track changes",
    say: "An updated plan can affect several people. We could flag what changed, identify who needs to review it, and keep the supporting document close to the decision.",
    show: "Open the sample change. It follows a revised access plan to the decision needed before drawings can proceed.",
  },
  {
    title: "Keep company knowledge",
    say: "Project files contain the reasoning behind decisions. We can make that information easier to find, with answers that link to the original note and respect the team's access rules.",
    show: "Open the project question, then its source. The records are examples. Skorman's approved files would be connected in a new implementation.",
  },
  {
    title: "Make investor updates easier",
    say: "We could assemble approved project facts and supporting documents into an update for your team to review. Your people keep the relationship and decide what gets sent.",
    show: "Open the sample draft. The project and update are fictional, and nothing is sent from this page.",
  },
  {
    title: "Get properties discovered",
    say: "When someone searches Google or asks an AI tool where to live or spend the afternoon, we want the property information to be accurate and useful. We'd improve the website, then track search visibility, website visits, and inquiries.",
    show: "Choose Visit, Live, or Lease. These are prepared examples, not captured AI search results. Rankings and lead volume aren't guaranteed.",
  },
  {
    title: "Explain our experience",
    say: "Use your own experience with Pontian at Canes. We've also built reporting and document tools, with a separate engineering demo showing how a change can move through reviews.",
    show: "Stick to the features you've used and results you can support. The engineering connections are simulated. Work for Skorman would be a new implementation.",
  },
  {
    title: "Close with a working session",
    say: "We suggest starting with Hills City Center. Bring the property and marketing leads together, review the current website and inquiry process, and agree on the first changes and how we'll measure them.",
    show: "Use the final section to agree on a next conversation. The longer-term idea is to keep each property's research, decisions, and operating results useful for the next development.",
  },
];

export const properties = [
  {
    name: "Hills City Center",
    kind: "Open attractions, with more planned",
    image: "hills-city-center.png",
    stat: "96",
    unit: "acre mixed-use development",
    status: "Open attractions + future phases",
    opportunity:
      "Help visitors find out what's open before they make the trip.",
    detail:
      "The destination lists Crooked Can and Splash & Play as open. Homes and other parts of the development are still planned.",
    source: "https://www.hillscitycenter.com/about",
    credit:
      "Hills City Center rendering from Skorman, showing a planned phase.",
  },
  {
    name: "Minneola Hills",
    kind: "Apartments with an existing leasing team",
    image: "minneola-hills.png",
    stat: "297",
    unit: "apartments",
    status: "Completed in 2021, per Skorman",
    opportunity:
      "Help prospective renters find Minneola Hills and contact leasing.",
    detail:
      "The community already has a leasing website. We'd work with the property operator and the process they use.",
    source: "https://www.skormandevelopment.com/minneola-hills",
    credit: "Minneola Hills property visual, via Skorman Development.",
  },
  {
    name: "Vista Hills",
    kind: "An apartment development in progress",
    image: "vista-hills.png",
    stat: "324",
    unit: "planned apartments",
    status: "Groundbreaking reported January 2026",
    opportunity:
      "Keep the team up to date as construction moves toward opening.",
    detail:
      "Skorman reports a construction start. We haven't verified completion or current occupancy.",
    source: "https://www.skormandevelopment.com/vista-hills",
    credit:
      "Vista Hills rendering from Skorman. Completion hasn't been verified.",
  },
] as const;

export const sources = [
  {
    label: "Skorman's business and featured developments",
    detail:
      "Featured projects and property types. A project listing doesn't establish current ownership.",
    href: "https://www.skormandevelopment.com/developments",
  },
  {
    label: "Skorman's approach",
    detail: "Acquisitions, approvals, development, and community consultation.",
    href: "https://www.skormandevelopment.com/approach",
  },
  {
    label: "Hills City Center: open and planned phases",
    detail: "The destination's description of what's open and what's planned.",
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
      "A possible source for the searcher. A foreclosure notice alone doesn't establish value.",
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
