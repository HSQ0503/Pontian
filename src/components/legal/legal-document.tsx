import Link from "next/link";
import { FrontierHeader } from "@/components/landing/frontier-header";
import { legalDetails, type LegalDocument as Document } from "@/lib/legal";
import { LegalLinks } from "./legal-links";
import styles from "./legal.module.css";

export function LegalDocument({ document }: { document: Document }) {
  const contents = (
    <ol>
      {document.sections.map((section, index) => (
        <li key={section.id}><a href={`#${section.id}`}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</a></li>
      ))}
    </ol>
  );

  return (
    <div className={styles.page}>
      <a href="#legal-content" className={styles.skip}>Skip to policy</a>
      <FrontierHeader />
      <main id="legal-content" className={styles.main}>
        <header className={styles.heading}>
          <p className={styles.eyebrow}>Pontian / Legal</p>
          <h1>{document.title}</h1>
          <p className={styles.description}>{document.description}</p>
          <p className={styles.updated}>{legalDetails.status === "draft" ? "Draft prepared" : "Last updated"} {legalDetails.updated}</p>
          {legalDetails.status === "draft" && (
            <aside className={styles.draft} aria-label="Draft status">
              <strong>Draft for review</strong>
              <p>Company identity, contact details, and processing arrangements must be confirmed before publication. This draft is not yet in effect.</p>
            </aside>
          )}
        </header>
        <div className={styles.layout}>
          <aside className={styles.contents}>
            <nav className={styles.contentsNav} aria-label={`${document.title} contents`}>
              <p>On this page</p>
              {contents}
            </nav>
          </aside>
          <details className={styles.mobileContents}>
            <summary>On this page</summary>
            <nav className={styles.contentsNav} aria-label={`${document.title} contents`}>{contents}</nav>
          </details>
          <article className={styles.article} aria-label={document.title}>
            {document.sections.map((section, index) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
                <h2 id={`${section.id}-title`}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</h2>
                {section.content}
              </section>
            ))}
          </article>
        </div>
      </main>
      <footer className={styles.footer}>
        <Link href="/" className={styles.home}>Pontian</Link>
        <LegalLinks />
      </footer>
    </div>
  );
}
