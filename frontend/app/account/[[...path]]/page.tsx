import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountProfile, AddressBook, CustomerOrder, Wishlist } from "@/components/account";
import { Builder } from "@/components/builder";
import { Badge, Button, Empty, PageHeader } from "@/components/ui";
import { ApiError, money } from "@/lib/api";
import { server, session } from "@/lib/server";
import type { Address, Category, Order, Product, SavedSetup } from "@/lib/types";

const routes = [["", "Overview"], ["orders", "Orders"], ["addresses", "Addresses"], ["wishlist", "Wishlist"], ["setups", "Saved setups"], ["settings", "Settings"]];
export async function generateMetadata({ params }: { params: Promise<{ path?: string[] }> }) {
  const [section] = (await params).path ?? [];
  const label = routes.find(([key]) => key === section)?.[1];
  return { title: label ? `${label} · Your account` : "Your account",
    description: "Manage your orders, shipping addresses and saved workspace setups.",
    robots: { index: false, follow: false } };
}

export default async function AccountPage({ params, searchParams }: { params: Promise<{ path?: string[] }>; searchParams: Promise<{ page?: string }> }) {
  const { path = [] } = await params;
  const [view = "", id] = path;
  if (!routes.some(([route]) => route === view) || path.length > 2 || (id && (!["orders", "setups"].includes(view) || !/^[\da-f-]{36}$/i.test(id)))) notFound();
  const user = await session("/account" + (path.length ? "/" + path.join("/") : ""));
  let body: React.ReactNode;
  try {
    if (view === "orders" && id) body = <CustomerOrder initial={await server<Order>("/me/orders/" + id, true)}/>;
    else if (view === "orders") {
      const params = await searchParams;
      const page = typeof params.page === "string" && /^[1-9]\d{0,3}$/.test(params.page) ? Number(params.page) : 1;
      const orders = await server<Order[]>("/me/orders?page=" + page, true);
      body = <div className="stack">{orders.length ? <div className="panel table-wrap"><table className="data-table"><thead><tr><th>Order</th><th>Status</th><th>Total</th></tr></thead><tbody>
        {orders.map(o => <tr key={o.id}><td><Link href={"/account/orders/" + o.id}>{o.number}</Link></td><td><Badge status={o.status}/></td><td>{money(o.pricing.total)}</td></tr>)}
      </tbody></table></div> : <Empty title="No orders on this page">Your purchases appear here after checkout.</Empty>}
      {(page > 1 || orders.length === 20) && <nav className="pagination" aria-label="Order pages">{page > 1 && <Link href={`?page=${page - 1}`}>Previous</Link>}<span>Page {page}</span>{orders.length === 20 && <Link href={`?page=${page + 1}`}>Next</Link>}</nav>}</div>;
    } else if (view === "addresses") body = <AddressBook user={user} initial={await server<(Address & { id: string })[]>("/me/addresses", true)}/>;
    else if (view === "wishlist") body = <Wishlist initial={await server<Product[]>("/me/wishlist", true)}/>;
    else if (view === "setups" && id) {
      const [saved, categories] = await Promise.all([server<SavedSetup>("/me/setups/" + id, true), server<Category[]>("/categories")]);
      body = <Builder categories={categories} saved={saved}/>;
    } else if (view === "setups") {
      const setups = await server<SavedSetup[]>("/me/setups", true);
      body = setups.length ? <div className="stack">{setups.map(s => <article className="panel" key={s.id}><h3>{s.name}</h3><p>{s.preferences.purpose} · {s.variant_ids.length} items</p><Link className="inline-link" href={"/account/setups/" + s.id}>Open setup</Link></article>)}</div> :
        <Empty title="No saved setups" href="/setup-builder" label="Open Setup Builder">Generate and save a setup to view it here.</Empty>;
    } else if (view === "settings") body = <AccountProfile user={user}/>;
    else body = <section className="panel stack"><h2>Welcome, {user.name}.</h2><p>View your orders, saved products and workspace setups.</p><div className="button-row"><Button asChild><Link href="/shop">Browse essentials</Link></Button>{user.role === "ADMIN" && <Button variant="outline" asChild><Link href="/admin">Store admin</Link></Button>}<Button variant="outline" asChild><Link href="/account/settings">Account settings</Link></Button></div></section>;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  return <div className="wrap content"><PageHeader kicker="YOUR DESKLY" title={routes.find(([key]) => key === view)?.[1] === "Overview" ? "Your account" : routes.find(([key]) => key === view)![1]}/>
    <div className="side-layout"><nav className="side-nav" aria-label="Account navigation">{routes.map(([key, name]) => <Link href={"/account" + (key ? "/" + key : "")} key={key} aria-current={view === key ? "page" : undefined}>{name}</Link>)}</nav><div>{body}</div></div>
  </div>;
}
