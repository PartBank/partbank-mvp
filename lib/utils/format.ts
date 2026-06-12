// Client-safe formatting helpers (no server-only imports).

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase()
}
