import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api";
import { server } from "@/lib/server";
import type { Product } from "@/lib/types";
import { ProductCard, ProductDetail } from "@/components/product";
import { SectionHeader } from "@/components/ui";
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const path = "/products/" + encodeURIComponent(slug);
  const product = await server<Product>(path).catch(error => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const related = await server<Product[]>(path + "/related");
  return <div className="wrap content"><nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/shop">Shop</Link><span>/</span><Link href={`/categories/${product.category.slug}`}>{product.category.name}</Link><span>/</span><span>{product.name}</span></nav>
    <ProductDetail product={product}/>{related.length > 0 && <section className="home-section"><SectionHeader kicker="MORE FOR YOUR DESK" title="Related products"/><div className="products">{related.map(p => <ProductCard key={p.id} product={p}/>)}</div></section>}
  </div>;
}
