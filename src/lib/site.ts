// Everything Guga or Han may need to swap lives here. Env vars override the
// defaults so Vercel can carry the real values without a code change.
export const site = {
  name: "Pontian",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://pontian.co",
  // Digits only, country code first. Used for the call link and wa.me.
  phone: process.env.NEXT_PUBLIC_PHONE ?? "14073998113",
};

export const telUrl = () => `tel:+${site.phone}`;

export const whatsappUrl = (text?: string) =>
  `https://wa.me/${site.phone}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

// +1 407 399 8113 or +55 11 99999 9999. Display only.
export function formatPhone(digits: string = site.phone) {
  if (digits.startsWith("55") && digits.length === 13)
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 9)} ${digits.slice(9)}`;
  if (digits.startsWith("1") && digits.length === 11)
    return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  return `+${digits}`;
}
