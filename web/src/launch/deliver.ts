/* How a request leaves the public site.

   There is no server behind the site yet, and none of the visitor's details are
   stored or relayed by a third party: the request is written out as a WhatsApp
   message to the Tarmem team, and the visitor sends it from their own WhatsApp.
   Tarmem then has their number and the conversation. Email is the fallback.

   When a backend exists, this is the file that changes. */

import { site } from './mode';

export const whatsAppUrl = (text: string) =>
  `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;

export const mailtoUrl = (subject: string, text: string) =>
  `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;

/** Must run inside the click that asked for it, or the browser blocks the new tab. */
export function openWhatsApp(text: string): void {
  window.open(whatsAppUrl(text), '_blank', 'noopener');
}

/** A Saudi mobile as WhatsApp wants it: "055 123 4567" and "+966 55 123 4567" both become "966551234567". */
export function whatsAppNumber(mobile: string): string {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('05') && digits.length === 10) return '966' + digits.slice(1);
  if (digits.startsWith('5') && digits.length === 9) return '966' + digits;
  return digits;
}

/** Open WhatsApp with a message written to somebody else (the team writing to a contractor). Must run inside a click. */
export function openWhatsAppTo(mobile: string, text: string): void {
  window.open(`https://wa.me/${whatsAppNumber(mobile)}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}
