import { AuthForm } from "@/components/auth";
import { PageHeader } from "@/components/ui";
export const metadata = { title: "Sign in" };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; token?: string }> }) {
  const { next, token } = await searchParams;
  return <div className="wrap content narrow"><PageHeader kicker="YOUR DESKLY" title="Sign in">Welcome back. Sign in to see orders and saved setups.</PageHeader><AuthForm mode="login" next={typeof next === "string" ? next : undefined} token={typeof token === "string" ? token : undefined}/></div>;
}
