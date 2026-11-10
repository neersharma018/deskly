import { Builder } from "@/components/builder";
import { PageHeader } from "@/components/ui";
import { editorial } from "@/lib/editorial-media";
import { server } from "@/lib/server";
import type { Category } from "@/lib/types";
export const metadata = { title: "Setup Builder" };
export default async function BuilderPage({ searchParams }: { searchParams: Promise<{ purpose?: string; aesthetic?: string }> }) {
  const [categories, params] = await Promise.all([server<Category[]>("/categories"), searchParams]);
  return <div className="wrap content"><PageHeader kicker="DESKLY SETUP STUDIO" title="Build your desk." photo={editorial.focus}>Start with a budget and a few preferences. Find a setup that fits the way you work.</PageHeader><Builder categories={categories} purpose={params.purpose} aesthetic={params.aesthetic}/></div>;
}
