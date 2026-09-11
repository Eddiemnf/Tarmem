/* Assistant transport.

   The design prototype ran inside Claude Design and called `window.claude.complete`
   directly. A deployed site has no such runtime, and a model key must never sit in
   client code — so the brief assistant and contractor matching talk to a server
   endpoint you configure with VITE_AI_ENDPOINT.

   Contract: POST JSON { model, max_tokens, system, messages } and reply with
   { text: string } (or a bare string). The endpoint holds the API key and applies
   your own rate limiting.

   With no endpoint configured the app says so plainly rather than simulating a
   live service: the brief stays editable by hand and the ordinary posting form
   remains the working route. */

export interface CompletionRequest {
  model: string;
  max_tokens: number;
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
}

const ENDPOINT = import.meta.env.VITE_AI_ENDPOINT as string | undefined;

/** True when an assistant endpoint is configured for this build. */
export const aiConfigured = Boolean(ENDPOINT);

export class AiUnavailableError extends Error {
  constructor() {
    super('No assistant endpoint configured (set VITE_AI_ENDPOINT).');
    this.name = 'AiUnavailableError';
  }
}

export async function complete(request: CompletionRequest): Promise<string> {
  if (!ENDPOINT) throw new AiUnavailableError();
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error(`Assistant request failed (${response.status})`);
  const payload: unknown = await response.json();
  if (typeof payload === 'string') return payload;
  const text = (payload as { text?: unknown })?.text;
  if (typeof text !== 'string') throw new Error('Assistant reply had no text field.');
  return text;
}
