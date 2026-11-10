export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function unpack<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errors = data.errors as { field: string; message: string }[] | undefined;
    throw new ApiError(response.status, errors?.length
      ? errors.map(error => error.field.replaceAll("_", " ") + " — " + error.message.replace(/^Value error, /, "")).join(" ")
      : typeof data.detail === "string" ? data.detail : "Something went wrong. Try again.");
  }
  return data as T;
}

export async function api<T>(path: string, method = "GET", data?: unknown, headers: Record<string, string> = {}) {
  const multipart = data instanceof FormData;
  return unpack<T>(await fetch("/api/v1" + path, { method, cache: "no-store",
    headers: { ...(!multipart && data !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: multipart ? data : data === undefined ? undefined : JSON.stringify(data) }));
}

export function message(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

export function money(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: paise % 100 ? 2 : 0 }).format(paise / 100);
}
export function statusLabel(status: string) {
  return status.toLowerCase().replaceAll("_", " ").replace(/^./, char => char.toUpperCase());
}
