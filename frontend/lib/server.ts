import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ApiError, unpack } from "./api";
import type { User } from "./types";

export async function server<T>(path: string, authenticated = false) {
  const headers = authenticated ? { cookie: (await cookies()).toString() } : undefined;
  const response = await fetch(new URL("/api/v1" + path, process.env.API_URL || "http://127.0.0.1:8000"),
    { cache: "no-store", headers, signal: AbortSignal.timeout(10000) });
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
