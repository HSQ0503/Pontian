"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import { industries } from "@/lib/industries";
import styles from "./industries.module.css";

const count = industries.length;
// Adjacent backgrounds differ; avoid red/blue text-background combinations.
const brandPairings = [
  { backgroundColor: "#007dfe", color: "#fed603" },
  { backgroundColor: "#fed603", color: "#007dfe" },
  { backgroundColor: "#f51625", color: "#fed603" },
  { backgroundColor: "#007dfe", color: "#fed603" },
  { backgroundColor: "#f51625", color: "#fed603" },
  { backgroundColor: "#007dfe", color: "#fed603" },
  { backgroundColor: "#fed603", color: "#f51625" },
];
const slides = [...industries, ...industries, ...industries];
const SLIDE_DURATION = 6000;
function subscribeToMotionPreference(update: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}

export function Industries() {
  const rail = useRef<HTMLDivElement>(null);
  const categories = useRef<HTMLDivElement>(null);
  const position = useRef(count);
  const drag = useRef({ start: 0, scroll: 0, moved: false, down: false });
  const [active, setActive] = useState(0);
  const elapsed = useRef(0);
  const interacting = useRef(false);
  const wheelActive = useRef(false);
  const [pauseOverride, setPauseOverride] = useState<boolean | null>(null);
  const reducedMotion = useSyncExternalStore(subscribeToMotionPreference, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
  const paused = pauseOverride ?? reducedMotion;

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    let visible = false;
    let frame = 0;
    let previous = performance.now();
    const observer = new IntersectionObserver(([entry]) => { visible = entry.intersectionRatio >= 0.25; }, { threshold: 0.25 });
    const releasePointer = () => { interacting.current = false; };
    window.addEventListener("pointerup", releasePointer);
    window.addEventListener("pointercancel", releasePointer);
    observer.observe(element);
    const tick = (now: number) => {
      const delta = Math.min(now - previous, 100);
      previous = now;
      if (!paused && visible && !document.hidden && !interacting.current && !wheelActive.current && !drag.current.down) {
        elapsed.current += delta;
        if (elapsed.current >= SLIDE_DURATION) {
          elapsed.current = 0;
          goTo(position.current + 1);
        }
      }
      categories.current?.style.setProperty("--industry-progress", String(elapsed.current / SLIDE_DURATION));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointerup", releasePointer);
      window.removeEventListener("pointercancel", releasePointer);
    };
  }, [paused]);

  useEffect(() => {
    const list = categories.current;
    const selected = list?.children[active] as HTMLElement | undefined;
    if (list && selected) list.scrollTo({ left: selected.offsetLeft - list.offsetLeft - (list.clientWidth - selected.offsetWidth) / 2, behavior: "instant" });
  }, [active]);

  function goTo(index: number, instant = false) {
    const element = rail.current;
    const card = element?.children[index] as HTMLElement | undefined;
    if (!element || !card) return;
    if (!instant) elapsed.current = 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollTo({ left: card.offsetLeft - (element.clientWidth - card.offsetWidth) / 2, behavior: instant || reduceMotion ? "instant" : "smooth" });
  }

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    let total = 0;
    let advanced = false;
    let started = 0;
    let release: ReturnType<typeof setTimeout>;
    const onWheel = (event: WheelEvent) => {
      // Leave vertical page scrolling and pinch-to-zoom to the browser.
      if (event.ctrlKey) return;
      const horizontal = event.shiftKey && event.deltaX === 0 ? event.deltaY : event.deltaX;
      if (!horizontal || (!event.shiftKey && Math.abs(horizontal) <= Math.abs(event.deltaY))) return;
      event.preventDefault();
      elapsed.current = 0;
      wheelActive.current = true;
      const now = performance.now();
      if (!started) started = now;
      clearTimeout(release);
      // Treat the gesture and its momentum as one move, not many slides.
      release = setTimeout(() => {
        total = 0;
        advanced = false;
        started = 0;
        wheelActive.current = false;
      }, Math.max(220, 650 - (now - started)));
      if (advanced) return;
      total += horizontal * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientWidth : 1);
      if (Math.abs(total) >= 35) {
        advanced = true;
        goTo(position.current + Math.sign(total));
      }
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      clearTimeout(release);
      wheelActive.current = false;
      element.removeEventListener("wheel", onWheel);
    };
  }, []);

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      elapsed.current = 0;
      const first = element.children[0] as HTMLElement;
      const second = element.children[1] as HTMLElement;
      const step = second.offsetLeft - first.offsetLeft;
      // A hidden/resizing preview can briefly report zero-width cards.
      if (!Number.isFinite(step) || step <= 0 || element.clientWidth === 0) return;
      const nearest = Math.round((element.scrollLeft + element.clientWidth / 2 - first.offsetLeft - first.offsetWidth / 2) / step);
      if (!Number.isFinite(nearest)) return;
      position.current = Math.max(0, Math.min(slides.length - 1, nearest));
      setActive(position.current % count);
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (drag.current.down) return;
        if (position.current < count || position.current >= count * 2) goTo(count + position.current % count, true);
      }, 180);
    };
    const resize = new ResizeObserver(() => goTo(count + position.current % count, true));
    resize.observe(element);
    goTo(count, true);
    element.addEventListener("scroll", update, { passive: true });
    return () => { clearTimeout(timer); resize.disconnect(); element.removeEventListener("scroll", update); };
  }, []);

  return (
    <section id="industries" className={styles.section} aria-label="Industries"
      onPointerDownCapture={() => { interacting.current = true; }}
      onPointerUpCapture={() => { interacting.current = false; }}
      onPointerCancelCapture={() => { interacting.current = false; }}>
      <div className={styles.toolbar}>
        <div ref={categories} className={styles.categories} aria-label="Choose an industry">
          {industries.map((industry, index) => <button key={industry.name} type="button" aria-pressed={active === index} onClick={() => goTo(count + index)}><span className={styles.tabProgress} aria-hidden="true" /><span className={styles.tabLabel}>{industry.name}</span></button>)}
        </div>
      </div>
      <div className={styles.stage}>
        <div ref={rail} className={styles.rail} role="region" aria-roledescription="carousel" aria-label="Industries" tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); goTo(position.current + (event.key === "ArrowRight" ? 1 : -1)); }
          }}
          onPointerDown={(event) => {
            elapsed.current = 0;
            if (event.pointerType !== "mouse" || event.button !== 0) return;
            drag.current = { start: event.clientX, scroll: event.currentTarget.scrollLeft, moved: false, down: true };
          }}
          onPointerMove={(event) => {
            if (!drag.current.down) return;
            const distance = event.clientX - drag.current.start;
            if (Math.abs(distance) > 6) {
              drag.current.moved = true;
              event.currentTarget.setPointerCapture(event.pointerId);
              event.currentTarget.style.scrollSnapType = "none";
              event.currentTarget.scrollLeft = drag.current.scroll - distance;
            }
          }}
          onPointerUp={(event) => {
            drag.current.down = false;
            event.currentTarget.style.scrollSnapType = "";
            if (drag.current.moved) goTo(position.current);
          }}
          onPointerCancel={(event) => { drag.current.down = false; event.currentTarget.style.scrollSnapType = ""; }}
          onClickCapture={(event) => { if (drag.current.moved) { event.preventDefault(); event.stopPropagation(); drag.current.moved = false; } }}>
          {slides.map((industry, index) => {
            const content = <>
              {industry.image && <><span aria-hidden="true" className={`${styles.photo} ${industry.noir ? styles.noir : ""} ${industry.name === "Property Services" ? styles.workerPhoto : ""}`} style={{ backgroundImage: `url("${industry.image}")`, backgroundPosition: industry.imagePosition ?? "center" }} /><span aria-hidden="true" className={styles.photoShade} /></>}
              <span className={styles.caption} style={brandPairings[(index % count) % brandPairings.length]}><span className={styles.eyebrow}>{industry.name}</span><span className={styles.cardTitle}>{industry.headline} <ArrowUpRight aria-hidden="true" /></span></span>
              {!industry.image && <span className={styles.backdropWord} aria-hidden="true">{industry.name}</span>}
              <span className={styles.cardBottom}><span>Explore solutions <ArrowUpRight size={17} /></span><span>0{index % count + 1} / 0{count}</span></span>
            </>;
            return <article key={index} className={`${styles.card} ${styles[industry.tone]}`} aria-roledescription="slide" aria-label={`${index % count + 1} of ${count}: ${industry.name}`} aria-hidden={index !== count + active}>
            <Link href={`/industries/${industry.slug}`} draggable={false} className={styles.cardLink} tabIndex={index === count + active ? 0 : -1} aria-label={`Explore ${industry.name} solutions`}>{content}</Link>
            <div className={styles.arrows}>
              <button type="button" tabIndex={index === count + active ? 0 : -1} aria-label="Previous industry" onClick={() => goTo(index - 1)}><ArrowLeft strokeWidth={1.4} /></button>
              <button type="button" tabIndex={index === count + active ? 0 : -1} aria-label="Next industry" onClick={() => goTo(index + 1)}><ArrowRight strokeWidth={1.4} /></button>
            </div>
          </article>; })}
        </div>
      </div>
      <div className={styles.status}>
        <span aria-live={paused ? "polite" : "off"}>{industries[active].name}</span>
        <div className={styles.playback}>
          <button type="button" className={styles.playbackButton} aria-label={paused ? "Play industry slideshow" : "Pause industry slideshow"} onClick={() => setPauseOverride(!paused)}>{paused ? <Play size={13} /> : <Pause size={13} />}</button>
          <span>0{active + 1} / 0{count}</span>
        </div>
      </div>
    </section>
  );
}
