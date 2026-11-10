import { NextRequest } from "next/server";
import { fetchStore, StoreConnectionError } from "@/lib/store-upstream";

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (path.some(part => !/^[a-zA-Z0-9_-]+$/.test(part))) return new Response(null, { status: 404 });
  const headers = new Headers();
  for (const key of ["origin", "cookie", "content-type", "idempotency-key", "x-razorpay-signature", "x-razorpay-event-id"]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  const input = request.method !== "GET" && request.method !== "HEAD";
  if (input && Number(request.headers.get("content-length")) > 4_100_000) return new Response(null, { status: 413 });
  const body = input ? await request.arrayBuffer() : undefined;
  if (body && body.byteLength > 4_100_000) return new Response(null, { status: 413 });
  try {
    const upstream = await fetchStore("/" + path.join("/") + request.nextUrl.search, { method: request.method, headers, body,
      cache: "no-store", signal: AbortSignal.timeout(26000) });
    const result = new Headers({ "Cache-Control": "no-store" });
    for (const key of ["content-type", "x-request-id", "retry-after"]) {
      const value = upstream.headers.get(key);
      if (value) result.set(key, value);
    }
    for (const cookie of upstream.headers.getSetCookie()) result.append("set-cookie", cookie);
    return new Response(upstream.body, { status: upstream.status, headers: result });
  } catch (error) {
    if (!(error instanceof StoreConnectionError)) throw error;
    return Response.json({ detail: error.message }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
export { forward as GET, forward as POST, forward as PATCH, forward as DELETE };
