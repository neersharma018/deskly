import { AuthForm } from "@/components/auth";
import { PageHeader } from "@/components/ui";
export const metadata = { title: "Choose a new password", description: "Set a new password using your DESKLY reset link.", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; token?: string }> }) {
  const { next, token } = await searchParams;
  return <div className="wrap content narrow"><PageHeader kicker="YOUR DESKLY" title="Choose a new password">Use at least 10 characters.</PageHeader><AuthForm mode="reset-password" next={typeof next === "string" ? next : undefined} token={typeof token === "string" ? token : undefined}/></div>;
}
