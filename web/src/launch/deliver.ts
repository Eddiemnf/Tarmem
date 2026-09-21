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
