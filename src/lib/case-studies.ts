export type CaseBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: { lead?: string; text: string }[] };

export type CaseSection = { id: string; heading: string; blocks: CaseBlock[] };

export type CaseStudy = {
  slug: string;
  client: string;
  clientDetail?: string;
  industry: string;
  title: string;
  overview: string;
  intro: string;
  engagement: string;
  location?: string;
  description: string;
  pairing: { backgroundColor: string; color: string };
  sections: CaseSection[];
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "minerbo-fuchs",
    client: "Minerbo Fuchs",
    industry: "Engineering",
    title: "Connecting project knowledge with everyday engineering work",
    overview: "An AI platform in design and development around a Brazilian engineering firm’s documents, meetings and project responsibilities.",
    intro: "Minerbo Fuchs is a Brazilian engineering firm whose projects require coordination across different technical teams. Our work focuses on making project information easier to find and turning discussions into clear, trackable responsibilities.",
    engagement: "AI platform, in ongoing design and development",
    location: "Brazil",
    description: "How Pontian is designing an AI platform for Minerbo Fuchs, a Brazilian engineering firm: searchable project knowledge with sources, reviewed meeting minutes, and trackable responsibilities.",
    pairing: { backgroundColor: "#007dfe", color: "#fed603" },
    sections: [
      {
        id: "the-business-need",
        heading: "The business need",
        blocks: [
          { type: "p", text: "Engineering teams need more than access to files. They need to understand which information is current, what was decided, and who is responsible for the next step. Knowledge from previous projects also needs to remain useful when different people take on similar work." },
        ],
      },
      {
        id: "our-work",
        heading: "Our work",
        blocks: [
          { type: "p", text: "We’re designing an AI platform around the firm’s existing documents and engineering processes. The scope brings together:" },
          {
            type: "list",
            items: [
              { text: "A searchable knowledge system that helps employees find answers in approved company and project documents, with references to the original material." },
              { text: "A meeting workflow that prepares draft minutes, decisions, and follow-up tasks for staff to review." },
              { text: "Project views that organize responsibilities and deadlines, with broader visibility for managers overseeing several projects." },
              { text: "A controlled process for adding new information while retaining its source and review status." },
            ],
          },
        ],
      },
      {
        id: "how-it-fits-the-team",
        heading: "How it fits the team",
        blocks: [
          { type: "p", text: "An employee should be able to move from a question to the relevant document, understand the decision behind it, and see the work assigned to them. Managers should be able to review outstanding work across projects." },
          { type: "p", text: "AI helps prepare and organize information. Engineering decisions and approvals remain with the firm’s professionals. The engagement is being developed in stages around these workflows." },
        ],
      },
    ],
  },
  {
    slug: "1500-blueprint",
    client: "1500 Blueprint",
    clientDetail: "Scott’s SAT Prep",
    industry: "Education",
    title: "Building a connected platform for SAT learning",
    overview: "A custom platform that brings Scott Robinson’s SAT lessons, student practice and membership management into one connected experience.",
    intro: "1500 Blueprint is Scott Robinson’s SAT preparation business. We built a custom platform that brings his teaching content, student practice, and membership management into one connected experience.",
    engagement: "Custom learning and membership platform",
    description: "How Pontian built a custom SAT learning platform for 1500 Blueprint (Scott’s SAT Prep): courses, digital SAT practice tests, a question bank, tutoring access, admin tools and memberships in one place.",
    pairing: { backgroundColor: "#fed603", color: "#007dfe" },
    sections: [
      {
        id: "the-business-need",
        heading: "The business need",
        blocks: [
          { type: "p", text: "Scott needed software he could shape around his teaching approach. Courses, practice tools, and the steps for joining the program were spread across separate systems, making it harder to develop a consistent student experience." },
        ],
      },
      {
        id: "what-we-built",
        heading: "What we built",
        blocks: [
          {
            type: "list",
            items: [
              { text: "A student workspace for courses, video lessons, practice questions, and progress." },
              { text: "Full-length digital SAT practice tests with timed sections, saved attempts, and answer review." },
              { text: "A question bank and targeted exercises so students can focus their practice on particular topics." },
              { text: "Access to group tutoring calls and recordings within the learning platform." },
              { text: "Administrative tools for publishing lessons, maintaining questions and explanations, and managing student access." },
              { text: "Membership and payment flows connected to the content included in each plan." },
            ],
          },
        ],
      },
      {
        id: "how-it-works-in-practice",
        heading: "How it works in practice",
        blocks: [
          { type: "p", text: "A student can sign in, work through a lesson, complete practice, and return to previous results without moving between separate learning sites. Scott’s team can update teaching material and manage the program through the same platform." },
          { type: "p", text: "The work gives Scott a foundation he can continue developing around his students and teaching method." },
        ],
      },
    ],
  },
  {
    slug: "canes-pressure-washing",
    client: "Canes Pressure Washing",
    industry: "Home Services",
    title: "Managing the full journey from inquiry to payment",
    overview: "One platform connecting customer inquiries, estimates, crew scheduling, field updates and payments for residential and commercial jobs.",
    intro: "Canes Pressure Washing coordinates customer requests and field crews across residential and commercial jobs. We built a platform that connects the office side of the business with the people doing the work.",
    engagement: "Operations platform, from office to field",
    description: "How Pontian built an operations platform for Canes Pressure Washing: inquiries, customer-approved estimates, crew scheduling, a mobile crew portal, invoicing and payment tracking.",
    pairing: { backgroundColor: "#f51625", color: "#fed603" },
    sections: [
      {
        id: "the-business-need",
        heading: "The business need",
        blocks: [
          { type: "p", text: "Customer details, estimates, schedules, and job instructions need to stay connected as work moves between the owner and crews. The business needed a central place to manage that process and keep track of the money associated with each job." },
        ],
      },
      {
        id: "what-we-built",
        heading: "What we built",
        blocks: [
          {
            type: "list",
            items: [
              { text: "Customer and inquiry management, with records that carry through to estimates and jobs." },
              { text: "An estimate workflow that lets customers review and approve proposed work." },
              { text: "A scheduling system for assigning jobs to crews." },
              { text: "A mobile-friendly crew portal with job details, checklists, photos, and progress updates." },
              { text: "Invoicing and payment tracking, including recorded deposits and outstanding balances." },
              { text: "Reporting for job expenses, crew payouts, and business performance." },
            ],
          },
        ],
      },
      {
        id: "how-it-works-in-practice",
        heading: "How it works in practice",
        blocks: [
          { type: "p", text: "An inquiry can become an estimate, then an approved job assigned to a crew. Workers can access the job details from their phones and record what happened on site. The owner can follow the work through completion and payment." },
          { type: "p", text: "We also refined the platform around feedback from everyday use, including how customers are selected, schedules are adjusted, and balances are displayed." },
        ],
      },
    ],
  },
  {
    slug: "woof-gang",
    client: "Woof Gang Bakery & Grooming",
    industry: "Pet Retail & Grooming",
    title: "Making store performance easier to understand",
    overview: "A shared reporting dashboard for a Woof Gang franchise owner, bringing several stores’ sales, services and customer history into one view.",
    intro: "We worked with a Woof Gang franchise owner to bring information from multiple stores into a shared reporting dashboard. The focus was helping the owner understand the business across locations and over time.",
    engagement: "Multi-store reporting dashboard, for a franchise owner",
    description: "How Pontian built a multi-store reporting dashboard for a Woof Gang Bakery & Grooming franchise owner: point-of-sale data, store comparisons, grooming and retail mix, and return-visit reporting.",
    pairing: { backgroundColor: "#007dfe", color: "#fed603" },
    sections: [
      {
        id: "the-business-need",
        heading: "The business need",
        blocks: [
          { type: "p", text: "The stores already had transaction data and reports. The challenge was turning that information into clear comparisons: which locations were growing, what customers were buying, and whether grooming customers were returning." },
        ],
      },
      {
        id: "what-we-built",
        heading: "What we built",
        blocks: [
          {
            type: "list",
            items: [
              { text: "A connection to the stores’ point-of-sale system that brings sales and customer records into the dashboard." },
              { text: "Store comparisons showing revenue trends and the mix between grooming services and retail sales." },
              { text: "Product and service views for understanding what contributes to sales." },
              { text: "Customer history and return-visit reporting, including groups of customers who may be due for follow-up." },
              { text: "Groomer performance views based on recorded service activity." },
            ],
          },
        ],
      },
      {
        id: "making-the-information-dependable",
        heading: "Making the information dependable",
        blocks: [
          { type: "p", text: "We checked dashboard calculations against source reports and accounted for items such as deposits and gift cards so the figures represented the intended activity." },
          { type: "p", text: "The resulting dashboard lets the owner move from an overall view of the stores into a specific location, product, or customer pattern without assembling the comparison manually from separate reports." },
        ],
      },
    ],
  },
  {
    slug: "skorman",
    client: "Skorman Development",
    industry: "Real Estate Development",
    title: "Helping developments attract attention and uncovering new property opportunities",
    overview: "Work that helps people discover Skorman’s destinations, and helps the team research which land and buildings deserve a closer look.",
    intro: "Our work with Skorman connects two parts of real estate development: helping people discover existing and emerging destinations, and helping the team research where to invest next.",
    engagement: "Development visibility and property research",
    description: "How Pontian supports Skorman Development: improving how people discover new development areas, AI-assisted property research, and organized public property and ownership records.",
    pairing: { backgroundColor: "#fed603", color: "#f51625" },
    sections: [
      {
        id: "the-business-need",
        heading: "The business need",
        blocks: [
          { type: "p", text: "A development needs to reach the people who might visit, live, or do business there. At the same time, finding future opportunities involves gathering property information, researching ownership, and deciding which sites deserve closer attention." },
        ],
      },
      {
        id: "our-work",
        heading: "Our work",
        blocks: [
          { type: "p", text: "We help Skorman in three areas:" },
          {
            type: "list",
            items: [
              { lead: "Development visibility.", text: "Improving how people discover new development areas and find useful information about them, with the aim of attracting relevant visitors and inquiries." },
              { lead: "AI-assisted property research.", text: "Creating tools that gather and organize property information to identify land and buildings that may be worth investigating for purchase." },
              { lead: "Buyer and seller connections.", text: "Collecting and organizing publicly available property and ownership records to support research and help identify relevant parties for potential transactions." },
            ],
          },
        ],
      },
      {
        id: "how-the-work-supports-decisions",
        heading: "How the work supports decisions",
        blocks: [
          { type: "p", text: "The aim is to give the team a clearer starting point for research and outreach. Property information can be gathered into a usable view, promising sites can be investigated further, and public-facing development information can help interested people take the next step." },
          { type: "p", text: "A research result is a candidate for review. Decisions about a site’s suitability and any purchase remain with Skorman and its advisers." },
        ],
      },
    ],
  },
  {
    slug: "safast-logistics",
    client: "Safast Logistics",
    industry: "Transport & Equipment Rental",
    title: "Bringing fleet, shipment, and rental information together",
    overview: "Software that gives an East African trucking and mining equipment rental company one place to track its fleet, shipments and rentals.",
    intro: "Safast Logistics is an East African trucking company that also provides equipment rentals to mining operations. We built software to help its team track and manage these connected parts of the business.",
    engagement: "Fleet, shipment and rental tracking",
    location: "East Africa",
    description: "How Pontian built fleet, shipment and equipment rental tracking for Safast Logistics, an East African trucking company that also rents equipment to mining operations.",
    pairing: { backgroundColor: "#f51625", color: "#fed603" },
    sections: [
      {
        id: "the-business-need",
        heading: "The business need",
        blocks: [
          { type: "p", text: "Transport and equipment rental operations require visibility across vehicles, shipments, and equipment. The team needs to understand what is being handled and keep the relevant information organized as work progresses." },
        ],
      },
      {
        id: "what-we-built",
        heading: "What we built",
        blocks: [
          { type: "p", text: "Our software brings together three core areas:" },
          {
            type: "list",
            items: [
              { text: "Fleet tracking and management, giving the team a shared view of its vehicles." },
              { text: "Shipment tracking, keeping transport activity and shipment information organized." },
              { text: "Equipment rental tracking, bringing the rental side of the business into the same system." },
            ],
          },
        ],
      },
      {
        id: "how-it-fits-the-operation",
        heading: "How it fits the operation",
        blocks: [
          { type: "p", text: "The platform provides a central place to review fleet activity alongside shipments and equipment rentals. Staff can use it to keep track of ongoing work and coordinate across the transport and rental sides of the company." },
          { type: "p", text: "The scope reflects Safast’s combination of trucking, logistics, and equipment services for mining operations." },
        ],
      },
    ],
  },
];

export function caseStudyHref(slug: string) {
  return `/case-studies/${slug}`;
}

export function findCaseStudy(slug: string) {
  const index = caseStudies.findIndex((item) => item.slug === slug);
  return index === -1 ? null : { study: caseStudies[index], index };
}
