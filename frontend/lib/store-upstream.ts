import "server-only";
import { connection } from "next/server";

export class StoreConnectionError extends Error {}

export async function fetchStore(path: string, init: RequestInit) {
  await connection();
  const deployed = process.env.VERCEL === "1" && process.env.VERCEL_ENV !== "development";
  const base = process.env.API_URL?.trim() || (deployed ? undefined : "http://127.0.0.1:8000");
  const origin = base && URL.canParse(base) ? new URL(base) : undefined;
  if (!origin || !["http:", "https:"].includes(origin.protocol) || origin.username || origin.password ||
      (deployed && (origin.protocol !== "https:" || origin.hostname === process.env.VERCEL_URL ||
        origin.hostname === process.env.VERCEL_PROJECT_PRODUCTION_URL))) {
    console.error("[deskly] API_URL must point to the separately hosted FastAPI service.");
    throw new StoreConnectionError("The store service is temporarily unavailable.");
  }
  try {
    return await fetch(new URL("/api/v1" + path, origin), { ...init, redirect: "error" });
  } catch (error) {
    if (!(error instanceof TypeError) && !(error instanceof DOMException && error.name === "TimeoutError")) throw error;
    const cause = error instanceof Error ? error.cause : null;
    const code = cause && typeof cause === "object" && "code" in cause ? cause.code : undefined;
    console.error("[deskly] FastAPI request failed", typeof code === "string" && /^[A-Z0-9_]+$/.test(code) ? code : "");
    throw new StoreConnectionError("The store service is temporarily unavailable.");
  }
}
