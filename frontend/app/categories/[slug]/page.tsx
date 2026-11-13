import { notFound } from "next/navigation";
import { cache } from "react";
import { Catalogue, type SearchParams } from "@/components/catalogue";
import { server, storeUnavailable } from "@/lib/server";
import type { Category } from "@/lib/types";
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };
const readCategory = cache(async (slug: string) => {
  const category = (await server<Category[]>("/categories")).find(c => c.slug === slug);
  if (!category) notFound();
  return category;
});

export async function generateMetadata({ params }: Props) {
  const category = await readCategory((await params).slug).catch(storeUnavailable);
  return category ? { title: category.name, description: category.description.trim().slice(0, 155) || `Shop ${category.name.toLowerCase()} at DESKLY.` }
    : { title: "Collection temporarily unavailable" };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const category = await readCategory((await params).slug);
  return <Catalogue params={await searchParams} category={category}/>;
}
