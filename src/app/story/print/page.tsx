import type { Metadata } from "next";
import { PrintStory } from "@/components/story/PrintStory";

export const metadata: Metadata = {
  title: "Pontian (print)",
  robots: { index: false },
};

export default function Page() {
  return (
    <>
      {/* The print pages are 1920px wide, so rem scales up to match. */}
      <style>{`html { font-size: 21px; } body::after { display: none; }`}</style>
      <PrintStory />
    </>
  );
}
