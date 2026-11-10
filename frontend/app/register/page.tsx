import { AuthForm } from "@/components/auth";
import { PageHeader } from "@/components/ui";
export const metadata = { title: "Create your account" };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; token?: string }> }) {
  const { next, token } = await searchParams;
  return <div className="wrap content narrow"><PageHeader kicker="YOUR DESKLY" title="Create your account">Save your favourite products and desk setups.</PageHeader><AuthForm mode="register" next={typeof next === "string" ? next : undefined} token={typeof token === "string" ? token : undefined}/></div>;
}
