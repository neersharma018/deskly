import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api";
import { server, storeUnavailable } from "@/lib/server";
import type { Product } from "@/lib/types";
import { ProductCard, ProductDetail } from "@/components/product";
import { SectionHeader } from "@/components/ui";
type Props = { params: Promise<{ slug: string }> };
const readProduct = cache((slug: string) =>
  server<Product>("/products/" + encodeURIComponent(slug)).catch(error => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }));

export async function generateMetadata({ params }: Props) {
  const product = await readProduct((await params).slug).catch(storeUnavailable);
  return product ? { title: product.name, description: product.description.trim().slice(0, 155) || `Explore ${product.name} at DESKLY.` }
    : { title: "Product temporarily unavailable" };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await readProduct(slug);
  const related = await server<Product[]>("/products/" + encodeURIComponent(slug) + "/related").catch(storeUnavailable) ?? [];
  return <div className="wrap content"><nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/shop">Shop</Link><span>/</span><Link href={`/categories/${product.category.slug}`}>{product.category.name}</Link><span>/</span><span>{product.name}</span></nav>
    <ProductDetail product={product}/>{related.length > 0 && <section className="home-section"><SectionHeader kicker="MORE FOR YOUR DESK" title="Related products"/><div className="products">{related.map(p => <ProductCard key={p.id} product={p}/>)}</div></section>}
  </div>;
}
