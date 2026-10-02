"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Search, Menu, X, ArrowUpRight } from "lucide-react";
import styles from "@/app/(landing)/frontier.module.css";

const defaultPages = [
  { title: "Home", detail: "Frontier technology for industrial operations", href: "/" },
  { title: "Contact", detail: "Start a conversation with Pontian", href: "/contact" },
];

type FrontierHeaderProps = {
  context?: string;
  action?: { label: string; href: string };
  pages?: { title: string; detail: string; href: string }[];
  originalArtwork?: boolean;
};

export function FrontierHeader({ context, action = { label: "Get Started", href: "/contact" }, pages = defaultPages, originalArtwork = false }: FrontierHeaderProps = {}) {
  const header = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [panel, setPanel] = useState<"menu" | "search">("menu");
  const [query, setQuery] = useState("");
  useEffect(() => {
    let frame = 0;
    const update = () => {
      const progress = Math.min(1, Math.max(0, window.scrollY / 280));
      header.current?.style.setProperty("--nav-progress", String(progress));
      frame = 0;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, []);
  function openPanel(next: "menu" | "search") {
    setPanel(next);
    setQuery("");
    dialog.current?.showModal();
  }
  const results = pages.filter((page) => `${page.title} ${page.detail}`.toLowerCase().includes(query.toLowerCase().trim()));
  return (
    <>
      <header ref={header} className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Pontian home">
          <span className={styles.mark}>
            {originalArtwork ? <Image src="/pontian/frontier-logo.png" alt="" width={2000} height={2000} unoptimized className={styles.logoArtwork} /> : <svg viewBox="0 0 2000 2000" aria-hidden="true" className={styles.logoArtwork}>
              <defs>
                <filter id="pontian-remove-black" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
                  {/* Keep source RGB unchanged; only pure black becomes transparent. */}
                  <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  255 255 255 0 0" />
                </filter>
              </defs>
              <image href="/pontian/frontier-logo.png" width="2000" height="2000" filter="url(#pontian-remove-black)" />
            </svg>}
          </span>
          <span>Pontian{context && <span className={styles.context}>{context}</span>}</span>
        </Link>
        <nav className={styles.actions} aria-label="Primary navigation">
          <Link href={action.href} className={styles.start}>{action.label}</Link>
          <div className={styles.tools}>
            <button type="button" className={styles.iconButton} aria-label="Search site" aria-haspopup="dialog" onClick={() => openPanel("search")}><Search strokeWidth={1.25} /></button>
            <button type="button" className={styles.iconButton} aria-label="Open menu" aria-haspopup="dialog" onClick={() => openPanel("menu")}><Menu strokeWidth={1.25} /></button>
          </div>
        </nav>
      </header>
      <dialog ref={dialog} className={styles.dialog} aria-label={panel === "search" ? "Search Pontian" : "Site menu"} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
        <div className={styles.panel}>
          <div className={styles.panelTop}>
            <span>{panel === "search" ? "Search Pontian" : context ? `Pontian / ${context}` : "Explore Pontian"}</span>
            <button type="button" className={styles.close} aria-label="Close panel" onClick={() => dialog.current?.close()}><X strokeWidth={1.25} /></button>
          </div>
          {panel === "search" && <input autoFocus className={styles.searchInput} aria-label="Search pages" placeholder="What are you looking for?" value={query} onChange={(event) => setQuery(event.target.value)} />}
          <nav aria-label={panel === "search" ? "Search results" : "Site pages"}>
            {(panel === "search" ? results : pages).map((page) => <Link className={styles.pageLink} key={page.href} href={page.href} onClick={() => dialog.current?.close()}><span>{page.title}</span><ArrowUpRight strokeWidth={1.25} /></Link>)}
            {panel === "search" && results.length === 0 && <p className={styles.empty}>No matching pages. Try “home” or “contact”.</p>}
          </nav>
        </div>
      </dialog>
    </>
  );
}
