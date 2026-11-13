import { AuthForm } from "@/components/auth";
import { PageHeader } from "@/components/ui";
export const metadata = { title: "Reset your password", description: "Request a password reset link for your DESKLY account.", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; token?: string }> }) {
  const { next, token } = await searchParams;
  return <div className="wrap content narrow"><PageHeader kicker="YOUR DESKLY" title="Reset your password">Enter the email address linked to your account.</PageHeader><AuthForm mode="forgot-password" next={typeof next === "string" ? next : undefined} token={typeof token === "string" ? token : undefined}/></div>;
}
