"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, X } from "lucide-react";
import { intakeQuestions, isIntakeAnswerValid } from "@/lib/intake";
import styles from "./intake-quiz.module.css";
import { HumanVerification } from "./human-verification";

const colors = ["#f51625", "#fed603", "#007dfe"];

export function IntakeQuiz({ contactOnly = false }: { contactOnly?: boolean }) {
  const [step, setStep] = useState(contactOnly ? intakeQuestions.length : 0);
  const [answers, setAnswers] = useState<string[]>(Array(intakeQuestions.length).fill(""));
  const [otherAnswers, setOtherAnswers] = useState<string[]>(Array(intakeQuestions.length).fill(""));
  const [contact, setContact] = useState({ name: "", company: "", email: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "success">("idle");
  const [error, setError] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [verificationAttempt, setVerificationAttempt] = useState(0);
  const title = useRef<HTMLHeadingElement>(null);
  const inFlight = useRef(false);
  const contactStep = step === intakeQuestions.length;
  const question = intakeQuestions[step];
  const completed = answers.filter((answer, index) => isIntakeAnswerValid(index, answer, otherAnswers[index])).length;

  useEffect(() => {
    title.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step, status]);

  function next(event: FormEvent) {
    event.preventDefault();
    if (isIntakeAnswerValid(step, answers[step], otherAnswers[step])) setStep(step + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    if (!verificationToken) { setError("Please complete the human verification before sending."); return; }
    inFlight.current = true;
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: contactOnly ? "skorman-contact" : "quiz", answers: contactOnly ? [] : answers, otherAnswers: contactOnly ? [] : otherAnswers.map((value, index) => answers[index] === "Other" ? value.trim() : ""), contact, verificationToken }),
        signal: AbortSignal.timeout(25000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We couldn’t send your details. Please try again.");
      setStatus("success");
    } catch (cause) {
      setVerificationToken("");
      setVerificationAttempt((value) => value + 1);
      setError(cause instanceof Error && cause.name !== "TimeoutError" ? cause.message : "The connection timed out. Your answers are still here. Please try again.");
      setStatus("idle");
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Pontian home">
          <svg viewBox="200 380 1600 1180" aria-hidden="true">
            <defs><filter id="intake-logo" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  255 255 255 0 0" /></filter></defs>
            <image href="/pontian/frontier-logo.png" width="2000" height="2000" filter="url(#intake-logo)" />
          </svg>
          Pontian
        </Link>
        <span className={styles.headerLabel}>A better first conversation.</span>
        <Link href={contactOnly ? "/presentation/skorman" : "/"} className={styles.close} aria-label={contactOnly ? "Return to Skorman presentation" : "Exit quiz and return home"}><X size={21} strokeWidth={1.4} /></Link>
      </header>

      <main className={styles.main}>
        {status === "success" ? (
          <section className={styles.success}>
            <span className={styles.successIcon}><Check size={28} /></span>
            <p className={styles.eyebrow}>{contactOnly ? "DETAILS RECEIVED" : "CONTEXT RECEIVED"}</p>
            <h1 ref={title} tabIndex={-1}>Let’s see what’s next.</h1>
            <p>Thanks, {contact.name.split(" ")[0]}. {contactOnly ? "We have your contact details for a conversation about Skorman." : "We have your company’s context and contact details for the first conversation."}</p>
            <Link href="/" className={styles.continue}>Back to Pontian <ArrowUpRight size={19} /></Link>
          </section>
        ) : (
          <>
            {!contactOnly && <div className={styles.progressHeader}>
              <span>{contactOnly ? "PONTIAN / SKORMAN" : contactStep ? "YOUR COMPANY, IN CONTEXT" : "LET’S UNDERSTAND YOUR COMPANY"}</span>
              <span aria-live="polite">{contactOnly ? "Contact details" : contactStep ? "10 of 10 complete · Final details" : `${String(step + 1).padStart(2, "0")} / 10`}</span>
            </div>}
            {!contactOnly && <div className={styles.progress} role="progressbar" aria-label="Questions completed" aria-valuemin={0} aria-valuemax={10} aria-valuenow={completed}>
              {intakeQuestions.map((item, index) => <span key={item.title} className={isIntakeAnswerValid(index, answers[index], otherAnswers[index]) ? styles.filled : index === step ? styles.current : ""} />)}
            </div>}

            <section key={step} className={styles.stage}>
              <p className={styles.eyebrow}>{contactOnly ? "PONTIAN / SKORMAN" : contactStep ? "ONE LAST INTRODUCTION" : `QUESTION ${String(step + 1).padStart(2, "0")}`}</p>
              <h1 ref={title} tabIndex={-1} id="intake-question">{contactOnly ? "Contact Pontian." : contactStep ? "Where can we reach you?" : question.title}</h1>
              <p className={styles.hint}>{contactOnly ? "Leave your details to start a conversation about Skorman." : contactStep ? "Your context is ready. Add your details to start the conversation." : question.hint || "Choose the option that fits best."}</p>

              {contactStep ? (
                <form onSubmit={submit} className={styles.contactForm}>
                  <div className={styles.fields}>
                    <label>Your name<input required autoComplete="name" name="name" maxLength={120} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} placeholder="Full name" /></label>
                    <label>Company<input required autoComplete="organization" name="company" maxLength={180} value={contact.company} onChange={(e) => setContact({ ...contact, company: e.target.value })} placeholder="Company name" /></label>
                    <label className={styles.email}>Work email<input required type="email" autoComplete="email" name="email" maxLength={254} value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} placeholder="you@company.com" /></label>
                  </div>
                  <p className={styles.note}>We’ll use these details to follow up about your company.</p>
                  <HumanVerification key={verificationAttempt} token={verificationToken} onToken={setVerificationToken} />
                  {error && <p className={styles.error} role="alert">{error} <Link href="/contact">Contact Pontian directly <ArrowUpRight size={14} /></Link></p>}
                  <div className={styles.controls}>
                    {contactOnly ? <Link className={styles.back} href="/presentation/skorman"><ArrowLeft size={17} /> Back</Link> : <button className={styles.back} type="button" disabled={status === "sending"} onClick={() => setStep(step - 1)}><ArrowLeft size={17} /> Back</button>}
                    <button className={styles.continue} disabled={status === "sending" || !verificationToken} type="submit">{status === "sending" ? "Sending…" : contactOnly ? "Send details" : "Start the conversation"}<ArrowRight size={18} /></button>
                  </div>
                </form>
              ) : (
                <form onSubmit={next}>
                  <fieldset className={`${styles.choices} ${question.options.length > 5 ? styles.threeColumns : ""}`} aria-labelledby="intake-question">
                    {question.options.map((option, index) => (
                      <label key={option} className={styles.choice} style={{ "--accent": colors[index % colors.length] } as CSSProperties}>
                        <input type="radio" name={`question-${step}`} value={option} checked={answers[step] === option} onChange={() => setAnswers(answers.map((answer, i) => i === step ? option : answer))} required />
                        <span className={styles.choiceSurface}>
                          <span className={styles.choiceNumber}>{String(index + 1).padStart(2, "0")}</span>
                          <span className={styles.motif} aria-hidden="true"><i /><i /><i /></span>
                          <span className={styles.choiceText}>{option}</span>
                          <span className={styles.check} aria-hidden="true"><Check size={15} /></span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  {answers[step] === "Other" && (
                    <div className={styles.writeIn}>
                      <label htmlFor={`other-${step}`}>Tell us in your own words</label>
                      <textarea id={`other-${step}`} name={`other-${step}`} autoFocus required maxLength={500} rows={2} placeholder="Write your response…" value={otherAnswers[step]} onChange={(event) => setOtherAnswers(otherAnswers.map((answer, index) => index === step ? event.target.value : answer))} aria-describedby={`other-count-${step}`} />
                      <span id={`other-count-${step}`}>{otherAnswers[step].length} / 500</span>
                    </div>
                  )}
                  <div className={styles.controls}>
                    <button className={styles.back} type="button" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={17} /> Back</button>
                    <span className={styles.remaining}>{10 - step - 1} {10 - step - 1 === 1 ? "question" : "questions"} after this</span>
                    <button type="submit" className={styles.continue} disabled={!isIntakeAnswerValid(step, answers[step], otherAnswers[step])}>{step === 9 ? "Your details" : "Continue"}<ArrowRight size={18} /></button>
                  </div>
                </form>
              )}
            </section>
          </>
        )}
      </main>
      <footer className={styles.footer}><span className={styles.brandBars} aria-hidden="true"><i /><i /><i /></span><span>Built around your business.</span></footer>
    </div>
  );
}
