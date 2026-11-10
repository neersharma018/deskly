import Link from "next/link";
import { Search } from "lucide-react";
import { ProductCard } from "./product";
import { Button, Empty, PageHeader } from "./ui";
import { server } from "@/lib/server";
import { editorial, samplePhoto } from "@/lib/editorial-media";
import type { Category, Listing } from "@/lib/types";

export type SearchParams = Record<string, string | string[] | undefined>;
export async function Catalogue({ params, category }: { params: SearchParams; category?: Category }) {
  const keys = ["q", "category", "brand", "color", "min_price", "max_price", "available", "sort", "page"];
  const query = new URLSearchParams();
  for (const key of keys) {
    const value = params[key];
    const maximum = key === "color" ? 40 : key === "brand" || key === "category" ? 80 : 100;
    if (typeof value !== "string" || !value || value.length > maximum) continue;
    if (key === "min_price" || key === "max_price") {
      if (/^\d{1,7}$/.test(value)) query.set(key, String(Number(value) * 100));
    } else if (key === "page") {
      if (/^[1-9]\d{0,3}$/.test(value)) query.set(key, value);
    } else if (key === "sort") {
      if (["featured", "price-asc", "price-desc", "newest", "name"].includes(value)) query.set(key, value);
    } else if (key !== "available" || value === "true") query.set(key, value);
  }
  if (category) query.set("category", category.slug);
  const [listing, categories] = await Promise.all([server<Listing>("/products?" + query), server<Category[]>("/categories")]);
  const base = category ? "/categories/" + category.slug : "/shop";
  const photo = category ? samplePhoto(category.image)?.src ?? category.image : editorial.detail;
  const pagination = (page: number) => {
    const next = new URLSearchParams();
    for (const key of keys) if (typeof params[key] === "string") next.set(key, params[key]);
    next.set("page", String(page));
    return base + "?" + next;
  };
  return <div className="wrap content">
    <PageHeader kicker="THE DESKLY CATALOGUE" title={category?.name || "Shop essentials"} photo={photo}>{category?.description || "Find the pieces that make your workspace yours."}</PageHeader>
    <form action={base} role="search" className="catalogue-filters">
      <div className="filters">
        <label className="field">Search<input name="q" type="search" maxLength={100} defaultValue={query.get("q") || ""} placeholder="Keyboard, lamp, mat…"/></label>
        {!category && <label className="field">Category<select name="category" defaultValue={query.get("category") || ""}><option value="">All categories</option>{categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></label>}
        <label className="field">Brand<input name="brand" maxLength={80} defaultValue={query.get("brand") || ""} placeholder="Any brand"/></label>
        <label className="field">Colour<input name="color" maxLength={40} defaultValue={query.get("color") || ""} placeholder="Any colour"/></label>
        <label className="field">Min ₹<input type="number" min="0" max="9999999" name="min_price" defaultValue={query.has("min_price") ? Number(query.get("min_price")) / 100 : ""}/></label>
        <label className="field">Max ₹<input type="number" min="0" max="9999999" name="max_price" defaultValue={query.has("max_price") ? Number(query.get("max_price")) / 100 : ""}/></label>
        <label className="field">Sort<select name="sort" defaultValue={query.get("sort") || "featured"}>{[["featured","Featured"],["price-asc","Price low to high"],["price-desc","Price high to low"],["newest","Newest"],["name","Name A to Z"]].map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
      </div>
      <div className="filter-bottom"><label className="choice"><input type="checkbox" name="available" value="true" defaultChecked={query.has("available")}/>In stock only</label><div className="button-row"><Link href={base} className="inline-link">Clear filters</Link><Button><Search size={16}/> Apply filters</Button></div></div>
    </form>
    <p className="fine mb-3">{listing.total} {listing.total === 1 ? "product" : "products"}</p>
    {listing.items.length ? <div className="products">{listing.items.map(p => <ProductCard product={p} key={p.id}/>)}</div> :
      <Empty title="No products found" href={base} label="Clear filters">Try a different search term or widen your filters.</Empty>}
    {listing.total > listing.limit && <nav className="pagination" aria-label="Product pages">
      {listing.page > 1 && <Button asChild variant="outline"><Link href={pagination(listing.page - 1)}>Previous</Link></Button>}
      <span>Page {listing.page} of {Math.ceil(listing.total / listing.limit)}</span>
      {listing.page * listing.limit < listing.total && <Button asChild variant="outline"><Link href={pagination(listing.page + 1)}>Next</Link></Button>}
    </nav>}
  </div>;
}
