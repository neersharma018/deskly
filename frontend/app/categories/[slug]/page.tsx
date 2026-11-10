import { notFound } from "next/navigation";
import { Catalogue, type SearchParams } from "@/components/catalogue";
import { server } from "@/lib/server";
import type { Category } from "@/lib/types";
export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }) {
  const { slug } = await params;
  const category = (await server<Category[]>("/categories")).find(c => c.slug === slug);
  if (!category) notFound();
  return <Catalogue params={await searchParams} category={category}/>;
}
