type Opportunity = { title: string; today: string; build: string; result: string };

type WorkflowStep = { label: string; text: string };

export type IndustryPage = {
  promise: string;
  intro: string;
  summary: string;
  perspective: string;
  situations: string[];
  opportunities: Opportunity[];
  workflow: { title: string; steps: WorkflowStep[] };
  engagement: { start: string; information: string; firstWorkflow: string; measures: string[] };
  trust: string;
  experience?: string;
  invitation: { prompt: string; detail: string };
};

export const engagementSteps = [
  { title: "Learn the work", text: "Spend time with the people who do it and see how it happens today." },
  { title: "Map the records", text: "Identify the systems, records, owners, and gaps around the problem." },
  { title: "Set a baseline", text: "Establish how things perform now, from figures the team trusts." },
  { title: "Choose one problem", text: "Pick a bounded problem that is worth solving first." },
  { title: "Build with the users", text: "Introduce the workflow alongside the people who will run it." },
  { title: "Review and continue", text: "Check whether it helped, keep it running, and move to the next problem." },
];

export const industryPages: Record<string, IndustryPage> = {
  "design-engineering": {
    promise: "Keep decisions, deliverables, and disciplines working from the same context.",
    intro:
      "We help design and engineering teams keep requirements, revisions, reviews, and assignments connected across disciplines. When an input changes, the team can see which deliverables depend on it, which version is current, and who needs to review the consequences.",
    summary: "Connected requirements, revisions, reviews, and assignments for design and engineering teams working across disciplines.",
    perspective:
      "Engineering work depends on shared assumptions and coordinated handoffs between disciplines. When a requirement changes, the difficult part is knowing which deliverables depend on it, which version everyone should be working from, and who has to review the effect. We build around that question so the answer comes from project records rather than from whoever remembers.",
    situations: [
      "Two disciplines are working from different revisions of the same premise.",
      "Actions from the coordination meeting live in one person's notes.",
      "A deliverable comes back with comments, and nobody is sure who owns them.",
    ],
    opportunities: [
      {
        title: "Project knowledge",
        today:
          "Requirements, approved premises, standards, and earlier decisions are spread across folders, email, and meeting notes. Finding the current version takes time, and an outdated one is easy to use by mistake.",
        build:
          "We make project knowledge searchable with its source, revision, and approval status, visible only to the people who should see it.",
        result:
          "An engineer can ask for the current requirement and get an answer that points to the approved document, along with any later change.",
      },
      {
        title: "Meeting to work coordination",
        today:
          "Coordination meetings produce decisions and actions that are recorded loosely. Follow-up depends on whoever took notes and how quickly they circulated them.",
        build:
          "We turn reviewed meeting records into actions tied to a project, a deliverable, an owner, and a deadline.",
        result:
          "Leads open the next meeting knowing which actions are done, which are late, and which decisions still need confirmation.",
      },
      {
        title: "Deliverable and review tracking",
        today:
          "Files, submissions, reviewer comments, and acceptance status are tracked in different places. A package can go out again while earlier comments are still open.",
        build:
          "We connect each file to its revision, submission, reviewer, acceptance state, and outstanding comments.",
        result:
          "The team can see what was submitted, what was accepted, and what still needs a response before the next issue.",
      },
      {
        title: "Capacity and deadline visibility",
        today:
          "Each project has its own schedule, but the same people work across several of them. Competing commitments tend to surface when a deadline is already at risk.",
        build:
          "We combine approved schedules with declared staff allocations across projects and disciplines.",
        result:
          "Managers can spot overlapping deadlines and stretched disciplines early enough to rebalance the work.",
      },
    ],
    workflow: {
      title: "A supplier revises equipment information.",
      steps: [
        { label: "What starts it", text: "A supplier issues a new revision of an equipment data sheet used on an active project." },
        { label: "What comes together", text: "The system compares the two revisions, identifies deliverables that may depend on the changed values, and prepares a review summary that links to both versions." },
        { label: "Who decides", text: "Discipline leads confirm the actual impact and approve the resulting assignments. Work is reassigned only after their sign-off." },
        { label: "What is recorded", text: "Completed work and review outcomes are recorded against each affected deliverable, so the next person can see how the change was handled." },
      ],
    },
    engagement: {
      start: "One project, a defined set of source documents, and one meeting or deliverable review workflow your team already runs.",
      information: "The document register, current revisions, meeting records, the review process, and who holds technical authority in each discipline.",
      firstWorkflow: "Usually meeting follow-up or deliverable review, whichever is where actions and comments most often go unresolved.",
      measures: ["Time spent locating current information", "Age of unresolved actions", "Review turnaround", "Overdue deliverables"],
    },
    trust:
      "Your document management and design tools remain the source of record. Answers point to the document and revision they rely on, access follows project and discipline responsibilities, and technical decisions stay with your engineers.",
    invitation: {
      prompt: "Tell us where a changed requirement gets lost between disciplines.",
      detail: "Bring one project and one handoff: meeting actions, review comments, or a revision that reached one team before another.",
    },
  },

  logistics: {
    promise: "Keep dispatch, delivery status, and customer follow-through connected.",
    intro:
      "We help logistics teams keep the order, the dispatch plan, driver updates, customer conversations, and delivery records attached to the same job. When something goes wrong, the people handling it see the problem and the next action together.",
    summary: "Dispatch, exceptions, delivery records, and customer follow-through kept on the same job record.",
    perspective:
      "An exception gets harder to resolve when the order, the dispatch plan, the driver's update, the customer conversation, and the delivery record each live somewhere different. Our approach is to keep the exception and its next action in one place, with the context dispatch needs to decide and the record billing needs afterward.",
    situations: [
      "A customer calls about a late delivery before dispatch knows it is late.",
      "A driver's update sits in a text thread nobody else can see.",
      "An invoice waits because the proof of delivery is in another system.",
    ],
    opportunities: [
      {
        title: "Dispatch coordination",
        today:
          "Jobs, assignments, delivery windows, driver and vehicle availability, and operating constraints are tracked across boards, spreadsheets, and phone calls.",
        build:
          "We connect jobs to their assignments, timing, availability, and constraints in one dispatch view, fed by the systems you already use.",
        result:
          "Dispatchers can see conflicts before they commit a plan, and adjust it without calling around to confirm details.",
      },
      {
        title: "Exception handling",
        today:
          "Delays, missed handoffs, and incomplete deliveries surface through calls and messages. It is often unclear who owns each one or whether the customer has been told.",
        build:
          "We bring exceptions into a single queue, each with the affected job, the latest recorded update, and a responsible person.",
        result:
          "The team works through exceptions in order, and none of them wait because everyone assumed someone else had it.",
      },
      {
        title: "Delivery to billing records",
        today:
          "Proof of delivery, signatures, and supporting documents arrive separately from the job. Missing paperwork holds up invoicing and is often found late.",
        build:
          "We attach proof of delivery and supporting documents to the job record and flag the jobs where something is missing.",
        result:
          "Billing can invoice from complete records, and the office can chase a missing document while the delivery is still recent.",
      },
      {
        title: "Operating visibility",
        today:
          "Planned and actual activity are hard to compare when cost, timing, and service records are captured in different formats.",
        build:
          "We compare planned and recorded activity using the cost, timing, and service data your business already captures, under consistent definitions.",
        result:
          "Managers can see where plans and results diverge, and ask sharper questions about customers, routes, or recurring delays.",
      },
    ],
    workflow: {
      title: "A delivery is running late.",
      steps: [
        { label: "What starts it", text: "A driver reports a delay on a scheduled delivery." },
        { label: "What comes together", text: "The update is attached to the affected job, alongside the order, the customer's delivery window, and the other stops the delay may affect." },
        { label: "Who decides", text: "Dispatch reviews the impact, adjusts the plan, and approves the customer update before it is sent." },
        { label: "What is recorded", text: "When the delivery is complete, the proof of delivery and supporting documents attach to the same record billing works from." },
      ],
    },
    engagement: {
      start: "One dispatch workflow, or one recurring kind of delivery exception such as late arrivals or missing paperwork.",
      information: "Where orders, assignments, driver updates, customer messages, and delivery documents are recorded today, and who acts on each.",
      firstWorkflow: "A shared exception queue or a delivery to invoice check, built with your dispatchers and billing team.",
      measures: ["Manual status checks", "Exception resolution time", "Missing delivery records", "Time from delivery to invoice"],
    },
    trust:
      "Your order, dispatch, and accounting systems can stay where they are. Customer messages the system drafts are approved by dispatch before they go out, and every status points back to the update it came from.",
    invitation: {
      prompt: "Tell us which delivery exception keeps landing on your desk.",
      detail: "Bring a recent example and walk us through how the team found out, who fixed it, and what the customer heard.",
    },
  },

  manufacturing: {
    promise: "Connect production issues to the information needed to resolve them.",
    intro:
      "We help manufacturers link production problems to the work orders, materials, maintenance history, quality records, and instructions behind them. Teams can see what is blocked, who is responding, and what resolved it last time.",
    summary: "Production issues linked to the work orders, maintenance history, quality records, and procedures needed to resolve them.",
    perspective:
      "A production problem rarely belongs to a single record. It may involve a work order, a material shortage, a maintenance history, a quality finding, or an instruction that changed last month. We connect those records so the people responding can see what is blocked and coordinate the response, rather than reconstructing it at the line.",
    situations: [
      "The same stoppage happens again, and last time's fix lives in one person's memory.",
      "Purchasing knows about a shortage that the floor finds out about at the machine.",
      "Operators follow a printed instruction that has since been revised.",
    ],
    opportunities: [
      {
        title: "Production visibility",
        today:
          "Planned work, recorded progress, shortages, and blockers are reported in different places and at different times. The shift meeting starts by reconciling them.",
        build:
          "We bring planned work, recorded progress, shortages, and blockers into a shared view built from the records your team already keeps.",
        result:
          "Supervisors can see which orders are blocked and why, and use the meeting to decide what to do next.",
      },
      {
        title: "Maintenance coordination",
        today:
          "Equipment issues are reported verbally or on paper. Work history, assigned follow-up, and return to service status are hard to see in one place.",
        build:
          "We connect each reported equipment issue to the machine's work history, the assigned follow-up, and its return to service status.",
        result:
          "Production knows when a machine is expected back, and maintenance sees the history before starting the job.",
      },
      {
        title: "Quality follow-through",
        today:
          "A quality finding is recorded, but the investigation, corrective action, and review drift away from the job or batch where it started.",
        build:
          "We link each recorded issue to the relevant job or batch, its investigation, the corrective action, and the review.",
        result:
          "Quality leads can see which findings are open, who owns them, and whether each corrective action was checked.",
      },
      {
        title: "Operating knowledge",
        today:
          "Approved procedures, work instructions, and past resolutions exist, but finding the current version from the floor takes too long.",
        build:
          "We make procedures, instructions, and previous resolutions easy to find, with the version, its approval, and the source document shown alongside.",
        result:
          "An operator or lead can find the approved way to handle a problem, and confirm it is current, while standing at the machine.",
      },
    ],
    workflow: {
      title: "A recurring production issue is reported.",
      steps: [
        { label: "What starts it", text: "An operator records a production issue that has happened before on the same equipment." },
        { label: "What comes together", text: "The system brings together the affected job, the approved procedure, and earlier maintenance notes for that machine." },
        { label: "Who decides", text: "The responsible lead reviews the information, decides on the response, and assigns follow-up." },
        { label: "What is recorded", text: "Once reviewed, the resolution is saved with the issue, so the next person who meets it can find what worked." },
      ],
    },
    engagement: {
      start: "One production area and one recurring reporting or handoff problem, such as downtime logging or shift handover.",
      information: "Which records exist for that area, how they are captured, and how reliable they are. We establish a baseline from them before changing anything.",
      firstWorkflow: "A single path for reporting an issue and following it up that operators, maintenance, and supervisors agree on.",
      measures: ["Issue resolution time", "Completeness of downtime records", "Effort spent on reporting", "Repeat issues left unresolved"],
    },
    trust:
      "Your planning and maintenance systems stay authoritative. Procedures shown in an answer carry their version and source, and the lead responsible for the area approves a resolution before it is shared as guidance.",
    invitation: {
      prompt: "Tell us which production problem keeps coming back.",
      detail: "Bring the issue and the records around it, and we will map what the team would need to see the next time it happens.",
    },
  },

  retail: {
    promise: "Understand what drives each location, and what to do next.",
    intro:
      "We help retailers with more than one location turn the reports they already have into comparable figures and clear next steps. Owners and managers can see how locations differ, which products contribute margin, how customers return, and which action deserves attention first.",
    summary: "Comparable location figures, product economics, and customer retention for retailers with more than one location.",
    perspective:
      "Most retailers are not short of reports. The difficulty is making them comparable and useful: understanding why two locations differ, which products contribute margin, how often customers come back, and which of many possible actions is worth taking. We start by defining each figure once, reconciling it to the source, and tying it to a decision someone owns.",
    situations: [
      "Two stores count sales differently, so nobody trusts the comparison.",
      "A category sells well, but no one is sure how much it contributes.",
      "Regular customers stop coming, and it shows up months later.",
    ],
    opportunities: [
      {
        title: "Location comparisons",
        today:
          "Each location's reports may count sales, transactions, and returns differently. Comparing stores turns into a debate about whose numbers are right.",
        build:
          "We apply one set of definitions to sales, transactions, customer behavior, and product mix at every location, reconciled to your point of sale.",
        result:
          "An owner can compare locations side by side and trust that a difference reflects the business rather than the reporting.",
      },
      {
        title: "Product economics",
        today:
          "Category and product performance is buried in long reports, and differences between stores are hard to see.",
        build:
          "We help you investigate category performance, product contribution, and store differences using the sales and cost data you have.",
        result:
          "Buyers and managers can see which products earn their shelf space, and where one store's mix differs from the rest.",
      },
      {
        title: "Customer retention",
        today:
          "The point of sale holds years of purchase history, but repeat patterns and lapsing customers rarely show up in a report.",
        build:
          "We turn purchase history into repeat purchase patterns and lists of customers who may be due to return.",
        result:
          "Managers can reach out before regular customers drift away, then check whether the outreach brought them back.",
      },
      {
        title: "Management follow-through",
        today:
          "A question comes up in the owner's meeting, someone pulls a report, and the follow-up gets lost.",
        build:
          "We connect a business question to its supporting records and a specific action assigned to the right manager.",
        result:
          "Each action has an owner and a date, and its result is reviewed the next period against the same figures.",
      },
    ],
    workflow: {
      title: "Two locations earn differently on similar revenue.",
      steps: [
        { label: "What starts it", text: "An owner notices two locations with similar revenue and different product margins." },
        { label: "What comes together", text: "The system lays out product mix and recorded costs for both locations side by side, under the same definitions." },
        { label: "Who decides", text: "The location manager investigates the difference and chooses an action, such as a change to ordering or merchandising." },
        { label: "What is recorded", text: "The action is recorded with its owner, and the following period is reviewed with the same definitions so the comparison stays fair." },
      ],
    },
    engagement: {
      start: "A defined set of location data from your point of sale and accounting tools.",
      information: "Access to those sources and your current definitions for key figures. We reconcile the important ones to your source reports before anyone relies on them.",
      firstWorkflow: "One commercial question to answer first, such as why two stores differ or which regular customers are lapsing.",
      measures: ["Reporting effort", "Repeat purchase rate", "Product gross margin, where costs are recorded", "Results of a defined intervention"],
    },
    trust:
      "Your point of sale stays the system of record. Every figure traces back to the report it came from, and product gross margin is kept separate from overall profitability unless the full cost picture is connected.",
    experience:
      "We have done this work for a group of four franchise locations: historical point of sale data brought into one place, checked against the source reports, and compared across stores.",
    invitation: {
      prompt: "Tell us which question your reports still can't answer.",
      detail: "Bring the comparison you keep meaning to make, between stores, products, or customers, and we will start there.",
    },
  },

  "property-services": {
    promise: "Keep every job connected, from the first inquiry to payment.",
    intro:
      "We build operating software for crew-based property services such as pressure washing, cleaning, and landscaping. Inquiries, estimates, schedules, crew instructions, completion photos, invoices, and payments stay on one job record, so the office and crews can handle their part without calling the owner.",
    summary: "One job record from inquiry to payment for pressure washing, cleaning, landscaping, and other crew-based services.",
    perspective:
      "A service business becomes hard to grow when the owner personally carries every job detail, dispatch decision, customer update, and payment reminder. The software should hold that information, so office staff and crews can handle their own responsibilities and the owner steps in only when a decision needs them.",
    situations: [
      "A website request goes unanswered because it landed in an inbox nobody checks.",
      "The crew calls the owner to ask whether the patio was in the quote.",
      "Work finished last week still hasn't been invoiced.",
    ],
    opportunities: [
      {
        title: "Inquiry and estimate follow-up",
        today:
          "Requests arrive by phone, text, web form, and referral. Estimates go out, and follow-up depends on the owner remembering.",
        build:
          "We keep each conversation, the requested work, the estimate, and the next action together on one customer record.",
        result:
          "The office can answer new requests promptly and follow up on open estimates before the customer books someone else.",
      },
      {
        title: "Scheduling and crew execution",
        today:
          "Job details live in the owner's head, a shared document, or a text thread. Crews call in for addresses, gate codes, and scope questions.",
        build:
          "We give each assigned crew the location, approved scope, access instructions, checklist, and job notes on their phone.",
        result:
          "Crews can start and finish the job with what they need in hand, and their questions go to the job record first.",
      },
      {
        title: "Completion and payment",
        today:
          "Finished work, photos, invoices, deposits, and payment status are tracked in different tools, and unpaid jobs slip through.",
        build:
          "We connect completed work and its photos to the invoice, any deposit, and the payment status.",
        result:
          "The office can invoice the day a job is completed and see what is still owed without checking several systems.",
      },
      {
        title: "Repeat service and visibility",
        today:
          "Recurring customers are rebooked from memory. Revenue and costs by job or by crew are hard to see.",
        build:
          "We organize recurring visits and show recorded revenue and costs by job, crew, and service, where those inputs exist.",
        result:
          "The owner can see which work is worth growing, and repeat customers stay on schedule without the owner tracking them.",
      },
    ],
    workflow: {
      title: "A customer accepts an estimate.",
      steps: [
        { label: "What starts it", text: "A customer approves an estimate." },
        { label: "What comes together", text: "The approved work becomes a job ready to schedule, carrying the scope, address, access instructions, and customer notes." },
        { label: "Who acts", text: "The office schedules the job. The assigned crew follows the approved scope, records completion, and adds photos." },
        { label: "What is recorded", text: "Invoicing and payment follow-up continue from the same job record, with the photos attached if the customer has questions." },
      ],
    },
    engagement: {
      start: "A map of your journey from first inquiry to payment, built with you and the people who handle each step.",
      information: "Where inquiries arrive, how estimates are sent, how crews receive jobs, and how invoices and payments are tracked today.",
      firstWorkflow: "The handoff that most often pulls the owner in, rebuilt so the office or crew can handle it.",
      measures: ["Estimate response time", "Work left unscheduled", "Time from completion to invoice", "Owner interventions per job"],
    },
    trust:
      "We can connect your existing payment, phone, and accounting tools rather than replacing what already works. Crew questions are answered from the job's own notes and approved scope, and anything outside that goes to a person.",
    experience:
      "We have built this kind of platform for a residential pressure washing company, covering lead intake, estimates, scheduling, crew job sheets, invoicing, and payments.",
    invitation: {
      prompt: "Tell us which part of the job still runs through you.",
      detail: "The follow-up call, the schedule, the gate code, the payment reminder. Pick the one you handle most often, and we will start there.",
    },
  },

  "equipment-rental": {
    promise: "Keep availability, readiness, and rental records connected.",
    intro:
      "We help rental businesses follow each asset through reservation, delivery, return, inspection, maintenance, and back to ready. The rental desk can confirm what is actually available, and the shop sees what needs attention before a unit goes out again.",
    summary: "Asset availability, returns, inspections, and maintenance connected around each piece of rental equipment.",
    perspective:
      "Knowing that a machine exists is different from knowing it is ready to rent. Availability depends on reservations, returns, transport, inspections, and maintenance, and those events are often recorded by different people in different places. Our approach connects them around the individual asset, so the status the desk sees matches what happened in the yard and the shop.",
    situations: [
      "A unit shows as available but is still waiting on inspection.",
      "A rental was extended by phone, and the extra days were never billed.",
      "Damage noted at return didn't reach the shop before the next reservation.",
    ],
    opportunities: [
      {
        title: "Asset availability",
        today:
          "The rental system shows a unit as in or out, but not whether it has been inspected, repaired, or cleaned since its last return.",
        build:
          "We track each asset through clear states: reserved, on rent, returned, awaiting inspection, under maintenance, and ready.",
        result:
          "The desk can promise equipment that is actually ready, and the yard knows which units to work on first.",
      },
      {
        title: "Rental coordination",
        today:
          "Quotes, reservations, delivery and pickup, extensions, and customer messages are handled by different people in different tools.",
        build:
          "We connect the quote or reservation to delivery, pickup, extensions, and customer communication on one rental record.",
        result:
          "Anyone on the team can see where a rental stands and what the customer was told, including changes agreed by phone.",
      },
      {
        title: "Return and maintenance handoffs",
        today:
          "Condition notes and damage reports are taken at return but often stay on paper or in someone's camera roll.",
        build:
          "We attach condition records, damage photos, and service requirements to the asset when it comes back.",
        result:
          "The shop starts work with the full picture, and the desk can see when the asset is expected to be ready.",
      },
      {
        title: "Asset economics",
        today:
          "Rental revenue, idle time, and maintenance costs sit in separate records, so fleet decisions lean on impressions.",
        build:
          "We connect rental activity, idle periods, and recorded maintenance costs for each asset and category, under definitions you agree to.",
        result:
          "Managers can compare assets on the same terms when deciding what to repair, move, add, or retire.",
      },
    ],
    workflow: {
      title: "A machine comes back damaged.",
      steps: [
        { label: "What starts it", text: "A machine is returned with reported damage." },
        { label: "What comes together", text: "The asset is marked unavailable pending review, and its condition record and return photos attach to a maintenance task." },
        { label: "Who decides", text: "The rental team sees that the unit is booked for an upcoming reservation and resolves the conflict, with a substitute or a new date, before confirming availability." },
        { label: "What is recorded", text: "The repair, the inspection, and the asset's return to ready are recorded in its history." },
      ],
    },
    engagement: {
      start: "One asset category or one location, traced from reservation through return and back to ready.",
      information: "How reservations, transport, returns, inspections, and maintenance are recorded today, and where those records disagree.",
      firstWorkflow: "Usually the return and inspection handoff, since that is where availability most often goes wrong.",
      measures: ["Return to ready time", "Availability conflicts", "Unbilled extensions", "Utilization, under a definition you agree to"],
    },
    trust:
      "Your rental management software can remain the system of record. We connect what happens around it, and a person confirms an asset is ready before it is promised to a customer.",
    invitation: {
      prompt: "Tell us where an asset's status goes out of date.",
      detail: "Pick one category of equipment and we will trace it with you, from the reservation to the moment it is ready again.",
    },
  },
};
