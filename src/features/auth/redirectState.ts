// Shape del state que deja ProtectedRoute al rebotar a /login.
// Viaja también por el link login ↔ register para no perder el destino.
export function redirectFrom(state: unknown): string | undefined {
  return (state as { from?: { pathname?: string } } | null)?.from?.pathname;
}
