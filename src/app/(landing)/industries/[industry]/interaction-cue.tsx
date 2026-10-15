import styles from "./interaction-cue.module.css";

export function InteractionCue({ line, steps }: { line: string; steps: readonly string[] }) {
  return (
    <div className={styles.cue} data-interaction-cue="">
      <p className={styles.line}>{line}</p>
      <ol className={styles.steps}>
        {steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
    </div>
  );
}
