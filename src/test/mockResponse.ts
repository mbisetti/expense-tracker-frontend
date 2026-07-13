export function jsonResponse(status: number, body?: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

export function ok(body: unknown) {
  return jsonResponse(200, body);
}
