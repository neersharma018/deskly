import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountProfile } from "@/components/account";
import { AdminOrders, CategoryEditor, CouponEditor, Dashboard, FulfillmentEditor, InventoryEditor, ProductEditor, Table } from "@/components/admin";
import type { Coupon, InventoryRow, Metrics, Movement } from "@/components/admin";
import { Button, PageHeader } from "@/components/ui";
import { ApiError, money } from "@/lib/api";
import { server, session } from "@/lib/server";
import type { Category, Order, Product } from "@/lib/types";

const routes = [["", "Dashboard"], ["products", "Products"], ["categories", "Categories"], ["inventory", "Inventory"],
  ["orders", "Orders"], ["coupons", "Coupons"], ["analytics", "Analytics"], ["settings", "Settings"]];
const statuses = ["PENDING_PAYMENT", "PLACED", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "PAYMENT_FAILED"];
const uuid = /^[\da-f-]{36}$/i;
export async function generateMetadata({ params }: { params: Promise<{ path?: string[] }> }) {
  const [section, id] = (await params).path ?? [];
  const label = id === "new" ? "New product" : routes.find(([key]) => key === section)?.[1];
  return { title: label ? `${label} · Store admin` : "Store administration",
    description: "Manage stock, products and fulfillment in DESKLY administration.",
    robots: { index: false, follow: false } };
}

export default async function AdminPage({ params, searchParams }: { params: Promise<{ path?: string[] }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { path = [] } = await params;
  const [view = "", id] = path;
  const route = routes.find(([key]) => key === view);
  if (!route || path.length > 2 || (id && !((view === "products" && (id === "new" || uuid.test(id))) || (view === "orders" && uuid.test(id))))) notFound();
  const user = await session("/admin" + (path.length ? "/" + path.join("/") : ""), true);
  const query = await searchParams;
  const page = typeof query.page === "string" && /^[1-9]\d{0,3}$/.test(query.page) ? Number(query.page) : 1;
  const status = statuses.includes(query.status || "") ? query.status! : "";
  const days = ["7", "30", "90"].includes(query.days || "") ? query.days! : "30";
  const read = <T,>(path: string) => server<T>("/admin/" + path, true);
  let count = 0;
  let pageSize = 25;
  let body: React.ReactNode;
  try {
    if (view === "products" && id) {
      const [categories, product] = await Promise.all([read<Category[]>("categories"), id === "new" ? undefined : read<Product>("products/" + id)]);
      body = <ProductEditor key={id} categories={categories} product={product}/>;
    } else if (view === "products") {
      const products = await read<Product[]>("products?page=" + page);
      count = products.length;
      body = <div className="panel stack"><div><Button asChild><Link href="/admin/products/new">New product</Link></Button></div>
        <Table headings={["Name", "Category", "Price from", "Status"]} rows={products.map(p => [<Link key={p.id} href={"/admin/products/" + p.id}>{p.name}</Link>, p.category.name, p.price ? money(p.price) : "—", p.published ? "Published" : "Draft / archived"])}/></div>;
    } else if (view === "categories") {
      const categories = await read<Category[]>("categories");
      body = <div className="stack"><CategoryEditor/>{categories.map(c => <CategoryEditor key={c.id} category={c}/>)}</div>;
    } else if (view === "inventory") {
      const [rows, movements] = await Promise.all([read<InventoryRow[]>(`inventory?page=${page}&low=${query.low === "true"}`), read<Movement[]>(`inventory/movements?page=${page}`)]);
      count = Math.max(rows.length, movements.length);
      pageSize = 30;
      body = <div className="stack"><Link className="inline-link" href={query.low === "true" ? "/admin/inventory" : "/admin/inventory?low=true"}>{query.low === "true" ? "Show all stock" : "Show low stock only"}</Link>
        <InventoryEditor rows={rows} movements={movements} variant={typeof query.variant === "string" && uuid.test(query.variant) ? query.variant : undefined}/></div>;
    } else if (view === "orders" && id) body = <FulfillmentEditor order={await read<Order>("orders/" + id)}/>;
    else if (view === "orders") {
      const orders = await read<Order[]>(`orders?page=${page}&status=${status}`);
      count = orders.length;
      body = <div className="panel stack"><form className="button-row" action="/admin/orders"><label className="field">Status<select name="status" defaultValue={status}><option value="">All orders</option>{statuses.map(s => <option key={s}>{s}</option>)}</select></label><Button variant="outline">Filter</Button></form><AdminOrders orders={orders}/></div>;
    } else if (view === "coupons") {
      const coupons = await read<Coupon[]>("coupons?page=" + page);
      count = coupons.length;
      body = <div className="stack"><CouponEditor/>{coupons.map(c => <CouponEditor key={c.id} coupon={c}/>)}</div>;
    } else if (view === "settings") {
      const config = await read<Record<string, string | number | boolean>>("settings");
      body = <div className="stack"><div className="panel"><h2>Store configuration</h2><Table headings={["Setting", "Value"]} rows={Object.entries(config).map(([key, value]) => [key.replaceAll("_", " "), typeof value === "boolean" ? value ? "Enabled" : "Disabled" : value])}/></div><AccountProfile user={user}/></div>;
    } else {
      const metrics = await read<Metrics>((view ? "analytics/summary" : "dashboard") + "?days=" + days);
      body = <div className="stack"><nav className="button-row" aria-label="Analytics date range">{["7", "30", "90"].map(d => <Button key={d} asChild variant={d === days ? "primary" : "outline"}><Link href={`?days=${d}`}>{d} days</Link></Button>)}</nav><Dashboard data={metrics}/></div>;
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const pageLink = (n: number) => "?" + new URLSearchParams({ page: String(n), ...(status ? { status } : {}), ...(query.low === "true" ? { low: "true" } : {}) });
  return <div className="wrap content"><PageHeader kicker="DESKLY OPERATIONS" title={id === "new" ? "New product" : route[1]}/>
    <div className="side-layout"><nav className="side-nav" aria-label="Administration">{routes.map(([key, name]) => <Link href={"/admin" + (key ? "/" + key : "")} key={key} aria-current={view === key ? "page" : undefined}>{name}</Link>)}</nav>
      <div>{body}{!id && ["products", "inventory", "orders", "coupons"].includes(view) && (page > 1 || count === pageSize) &&
        <nav className="pagination" aria-label="Admin pages">{page > 1 && <Link href={pageLink(page - 1)}>Previous</Link>}<span>Page {page}</span>{count === pageSize && <Link href={pageLink(page + 1)}>Next</Link>}</nav>}</div></div>
  </div>;
}
