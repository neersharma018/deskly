import Link from "next/link";
import { Builder } from "@/components/builder";
import { Button, PageHeader } from "@/components/ui";
import { editorial } from "@/lib/editorial-media";
import { server, storeUnavailable } from "@/lib/server";
import type { Category } from "@/lib/types";
export const metadata = { title: "Setup Builder", description: "Build a desk setup from available products that match your budget, work and preferred style." };
export default async function BuilderPage({ searchParams }: { searchParams: Promise<{ purpose?: string; aesthetic?: string }> }) {
  const [categories, params] = await Promise.all([server<Category[]>("/categories").catch(storeUnavailable), searchParams]);
  return <div className="wrap content">
    <PageHeader kicker="DESKLY SETUP STUDIO" title="Build your desk." photo={editorial.focus}>
      {categories ? "Start with a budget and a few preferences. Find a setup that fits the way you work." : "Setup recommendations are temporarily unavailable."}
    </PageHeader>
    {categories ? <Builder categories={categories} purpose={params.purpose} aesthetic={params.aesthetic}/> :
      <Button asChild variant="outline"><Link href="/#workspace-studies">Explore workspace studies</Link></Button>}
  </div>;
}
