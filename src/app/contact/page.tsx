import { Contact } from "@/components/Contact";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Contact",
  description: "Contact Pontian Technologies to talk through custom software, data systems or AI tools for your operation.",
  path: "/contact",
  socialTitle: "Contact Pontian Technologies",
});

export default function Page() {
  return <Contact />;
}
