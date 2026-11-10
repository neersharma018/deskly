import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ApiError, unpack } from "./api";
import { fetchStore, StoreConnectionError } from "./store-upstream";
import type { User } from "./types";

export async function server<T>(path: string, authenticated = false) {
  const headers = authenticated ? { cookie: (await cookies()).toString() } : undefined;
  const response = await fetchStore(path, { cache: "no-store", headers, signal: AbortSignal.timeout(10000) });
  if (response.ok && !response.headers.get("content-type")?.includes("application/json")) {
    console.error("[deskly] FastAPI returned a non-JSON response. Check API_URL.");
    throw new StoreConnectionError("The store service is temporarily unavailable.");
  }
  return unpack<T>(response);
}

export async function session(path: string, admin = false) {
  try {
    const user = await server<User>("/me", true);
    if (admin && user.role !== "ADMIN") notFound();
    return user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login?next=" + encodeURIComponent(path));
    throw error;
  }
}
