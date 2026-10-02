import { intakeQuestions, isIntakeAnswerValid } from "@/lib/intake";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Please submit from the Pontian website." }, { status: 403 });
  }
  const body = await request.text();
  if (body.length > 12000) return Response.json({ error: "Submission is too large." }, { status: 413 });
  let data;
  try { data = JSON.parse(body); } catch {
    return Response.json({ error: "Invalid submission." }, { status: 400 });
  }
  const answers = data?.answers;
  const otherAnswers = Array.isArray(data?.otherAnswers) ? data.otherAnswers : [];
  const contact = data?.contact;
  if (!Array.isArray(answers) || answers.length !== intakeQuestions.length ||
      !intakeQuestions.every((_, index) => isIntakeAnswerValid(index, answers[index], otherAnswers[index])) ||
      !contact || typeof contact.name !== "string" || !contact.name.trim() || contact.name.length > 120 ||
      typeof contact.company !== "string" || !contact.company.trim() || contact.company.length > 180 ||
      typeof contact.email !== "string" || contact.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
    return Response.json({ error: "Please complete all questions and enter your name, company, and a valid email." }, { status: 400 });
  }

  const token = data?.verificationToken;
  if (typeof token !== "string" || !token || token.length > 2048) {
    return Response.json({ error: "Please complete the human verification before sending." }, { status: 400 });
  }
  const testMode = process.env.NODE_ENV === "development" && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !process.env.TURNSTILE_SECRET_KEY;
  const secret = process.env.TURNSTILE_SECRET_KEY || (testMode ? "1x0000000000000000000000000000000AA" : "");
  if (!secret || (process.env.NODE_ENV === "production" && /^[123]x0{10}/.test(secret))) {
    return Response.json({ error: "Verification is not configured yet. Please contact us directly." }, { status: 503 });
  }
  try {
    const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
      signal: AbortSignal.timeout(10000),
    });
    const result = await verification.json();
    if (!verification.ok || !result.success || (!testMode && (result.action !== "intake" || result.hostname !== new URL(request.url).hostname))) {
      return Response.json({ error: "Verification failed or expired. Please verify again." }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "Verification is temporarily unavailable. Please try again." }, { status: 503 });
  }

  // Connect an approved CRM/automation endpoint before enabling live intake.
  const webhook = process.env.PONTIAN_INTAKE_WEBHOOK_URL;
  if (!webhook) {
    return Response.json({ error: "Online intake is not connected yet. Your answers have not been sent." }, { status: 503 });
  }
  try {
    const destination = new URL(webhook);
    if (destination.protocol !== "https:") throw new Error("HTTPS is required");
    const response = await fetch(destination, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.PONTIAN_INTAKE_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.PONTIAN_INTAKE_WEBHOOK_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        source: "pontian-intake",
        submittedAt: new Date().toISOString(),
        contact: { name: contact.name.trim(), company: contact.company.trim(), email: contact.email.trim() },
        responses: intakeQuestions.map((question, index) => ({ question: question.title, answer: answers[index] === "Other" ? `Other: ${otherAnswers[index].trim()}` : answers[index] })),
      }),
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    if (!response.ok) throw new Error("Delivery failed");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "We couldn’t deliver your details. Please try again or contact us directly." }, { status: 502 });
  }
}
