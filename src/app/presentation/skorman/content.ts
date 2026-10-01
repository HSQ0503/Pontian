export const chapters = [
  {
    id: "begin",
    label: "The opportunity",
    time: "45 sec",
    say: "Pontian builds software around the work a team does every day. For Skorman, that could start with helping people find your properties, then extend to finding new sites and keeping track of development decisions.",
    do: "Begin here, or use the links on the image to jump to the part they want to discuss.",
  },
  {
    id: "skorman",
    label: "Skorman's properties",
    time: "45 sec",
    say: "Someone planning a trip to Hills City Center needs different information from a renter considering Minneola Hills. We'd start by understanding who each property needs to reach and where it is in development.",
    do: "Click through the properties. The images come from Skorman, and the project descriptions reflect public sources checked October 1, 2026.",
  },
  {
    id: "visibility",
    label: "Get discovered",
    time: "90 sec",
    say: "If someone asks Google or an AI tool where to live or spend the afternoon, we'd like them to find your property. We'd improve the information on its website and make the contact or visit details easy to find. Then we'd track search visibility, website visits, and inquiries.",
    do: "Use Visit, Live, or Lease to follow a sample search from the question through to the property page. The answers are written for this demo. Rankings and lead volume aren't guaranteed.",
  },
  {
    id: "searcher",
    label: "Find the next site",
    time: "90 sec",
    say: "Tell us the area, size, and type of property you're looking for. We'd combine listings and public records into a shortlist, with an explanation for each match. A foreclosure notice might flag a site for review, but your team would still check its value and suitability.",
    do: "Click a site to show why it matched, then save it or try a different property type. The sites, acreage, and signals are fictional. We'd build the real searcher with Skorman's criteria and agreed data sources.",
  },
  {
    id: "oversight",
    label: "This week's decisions",
    time: "60 sec",
    say: "On Monday, you could open a brief with the decisions still waiting on someone, the person responsible, and the update behind each one. We'd put it together from the reports your teams already produce.",
    do: "Build the sample brief, select a decision, and open the note behind it. These updates are fictional. We'd need to review Skorman's reporting process before building its version.",
  },
  {
    id: "answers",
    label: "Ask about a project",
    time: "60 sec",
    say: "Ask which drawing is current. The tool would answer from the project files, link to the source, and say when the information is missing or conflicting. Your team's access rules still apply.",
    do: "Choose a question and open its source. The answers are prepared examples. We'd connect Skorman's approved files and set up access with the team.",
  },
  {
    id: "experience",
    label: "Work we've built",
    time: "60 sec",
    say: "Tell them about your own experience with Pontian at Canes. You can point to the tools for leads, customer messages, scheduling, and invoices. The other examples show our work on reports across locations and answers drawn from company files.",
    do: "Use an example you know personally and stick to results you can support. The project-change demo uses simulated connections to other systems.",
  },
  {
    id: "horizon",
    label: "The longer view",
    time: "60 sec",
    say: "Over time, we'd like a project's original site research to stay connected to its approvals, construction records, and operating reports. When you're considering the next site, you could look back at what you expected and how similar projects turned out. Pontian would maintain the systems as they grow.",
    do: "Click through the three stages. They're a proposed direction. The scope, data access, and timing would be agreed with Skorman.",
  },
  {
    id: "next",
    label: "Start the conversation",
    time: "45 sec",
    say: "We suggest starting with Hills City Center. Bring the property and marketing leads into a working session, walk through the current website and inquiry process, and agree on the first changes and how we'll measure them.",
    do: "Choose a topic to show the suggested agenda. This is a planning example. Selecting it doesn't book a meeting or send anything.",
  },
] as const;

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
