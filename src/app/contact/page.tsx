import type { Metadata } from "next";
import { Contact } from "@/components/Contact";

export const metadata: Metadata = { title: "Contact" };

export default function Page() {
  return <Contact />;
}
