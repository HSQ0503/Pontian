import type { Metadata } from "next";
import { ArrowDown } from "lucide-react";
import { FrontierHeader } from "@/components/landing/frontier-header";
import { Industries } from "@/components/landing/industries";
import styles from "./frontier.module.css";

export const metadata: Metadata = {
  title: { absolute: "Pontian | Frontier Technology Partner" },
  description: "Frontier Technology Partner For Industrial Operations.",
};

export default function PontianPage() {
  return (
    <div className={styles.home}>
      <a className={styles.skip} href="#content">Skip to content</a>
      <FrontierHeader />
      <main id="content">
        <section className={styles.hero} aria-label="Introduction">
        <h1 className={styles.headline}>
          <span>Frontier Technology Partner</span>
          <span>For Industrial Operations</span>
        </h1>
        <a href="#industries" className={styles.explore}>
          <ArrowDown aria-hidden="true" size={22} strokeWidth={1.5} />
          <span>Scroll to Explore</span>
        </a>
        </section>
        <Industries />
      </main>
    </div>
  );
}
