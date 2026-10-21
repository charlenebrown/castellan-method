// Builds URLs that respect the GitHub Pages base path (e.g. /castellan-method).
export function url(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return base + (path.startsWith('/') ? path : `/${path}`);
}
