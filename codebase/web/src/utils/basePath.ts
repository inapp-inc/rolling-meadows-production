/** Application base path, e.g. `/rolling-meadows` (no trailing slash). */
export const BASE_PATH = (import.meta.env.VITE_BASE_PATH ?? '').replace(/\/$/, '');

/** Prefix an absolute app path with the configured base path. */
export function withBasePath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return BASE_PATH ? `${BASE_PATH}${normalized}` : normalized;
}
