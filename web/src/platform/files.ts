/* A project's photos and files: chosen in the design's own pickers, kept in Tarmem's storage.

   The design only remembers file NAMES (it is a prototype). Here the files themselves are held
   from the moment they are chosen — a guest can pick photos before they even have an account —
   and uploaded once the project exists, into a private bucket under
   <owner's account id>/<project id>/. Only the owner and Tarmem's admins can read them back
   (supabase/003_project_files.sql); links are signed and expire. */

import { supabase } from './client';

const BUCKET = 'project-files';
export const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const FILE_RULES = { maxFiles: 10, maxBytes: 10 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'] };
export interface StoredFile { name: string; path: string; createdAt: string }

/** Files chosen in the project form, by the name the form lists them under. */
const chosen = new Map<string, File>();

const extensionOf = (name: string) => (name.match(/\.([A-Za-z0-9]{1,5})$/)?.[1] || 'jpg').toLowerCase();
const toKeyPart = (text: string) => btoa(String.fromCharCode(...new TextEncoder().encode(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromKeyPart = (part: string) => {
  try { return new TextDecoder().decode(Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))); } catch { return part; }
};
/** Storage keys must be plain ASCII; the name a person gave the file (often Arabic) travels inside the key. */
const keyFor = (name: string, n: number) => `${Date.now().toString(36)}${n}-${toKeyPart(name.replace(/\.[A-Za-z0-9]{1,5}$/, '').slice(0, 60))}.${extensionOf(name)}`;
const nameFromKey = (key: string) => { const m = key.match(/^[a-z0-9]+-(.+)\.([A-Za-z0-9]{1,5})$/); return m ? `${fromKeyPart(m[1])}.${m[2]}` : key; };

export type FileProblem = 'type' | 'size' | 'count';
/** Sort a picker's files into those that can be uploaded and the first reason any were refused. */
export function acceptFiles(files: Iterable<File>, already: number): { ok: File[]; problem: FileProblem | null } {
  const ok: File[] = []; let problem: FileProblem | null = null;
  for (const file of files) {
    const typed = FILE_RULES.types.includes(file.type) || (!file.type && /\.(jpe?g|png|webp|heic|heif|pdf)$/i.test(file.name));
    if (!typed) problem ||= 'type';
    else if (file.size > FILE_RULES.maxBytes) problem ||= 'size';
    else if (already + ok.length >= FILE_RULES.maxFiles) problem ||= 'count';
    else ok.push(file);
  }
  return { ok, problem };
}

/** Remember the form's files until the project exists. Returns the names to list, made unique. */
export function holdFiles(files: File[]): string[] {
  return files.map((file) => {
    let name = file.name || 'photo.jpg';
    for (let n = 2; chosen.has(name); n += 1) name = file.name.replace(/(\.[A-Za-z0-9]{1,5})?$/, ` (${n})$1`);
    chosen.set(name, file);
    return name;
  });
}
export const heldFile = (name: string) => chosen.get(name);
export const forgetHeldFiles = () => chosen.clear();

/** `within` places a file in a stage's folder under a name that says what it is: `stage-0/photo-`, `stage-0/video-`, `stage-0/accept-`. */
export async function uploadFile(ownerId: string, projectId: string, file: File, n = 0, within = ''): Promise<StoredFile | null> {
  if (!supabase) return null;
  const path = `${ownerId}/${projectId}/${within}${keyFor(file.name || 'photo.jpg', n)}`;
  const send = () => supabase!.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
  try {
    let result = await send();
    if (result.error) result = await send(); // a phone on a weak connection: once more
    return result.error ? null : { name: file.name, path, createdAt: new Date().toISOString() };
  } catch { return null; }
}

export async function listFiles(ownerId: string, projectId: string): Promise<StoredFile[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.storage.from(BUCKET).list(`${ownerId}/${projectId}`, { limit: 50, sortBy: { column: 'created_at', order: 'asc' } });
    if (error || !data) return [];
    return data.filter((o) => o.id).map((o) => ({ name: nameFromKey(o.name), path: `${ownerId}/${projectId}/${o.name}`, createdAt: o.created_at || '' }));
  } catch { return []; }
}

/** A link that opens one file for the next hour. */
export async function fileLink(path: string): Promise<string | null> {
  if (!supabase) return null;
  try { return (await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)).data?.signedUrl || null; } catch { return null; }
}
