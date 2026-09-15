// Everything Guga or Han may need to swap lives here. Env vars override the
// defaults so Vercel can carry the real values without a code change.
export const site = {
  name: "Pontian",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://pontian.co",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@pontian.co",
  // Digits only, country code first. Used to build the wa.me link.
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "14075550100",
};

export const whatsappUrl = (text?: string) =>
  `https://wa.me/${site.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const mailtoUrl = (subject?: string) =>
  `mailto:${site.email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
