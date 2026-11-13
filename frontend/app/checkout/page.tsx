import { CheckoutForm, CheckoutStatus } from "@/components/shopping";
import { PageHeader } from "@/components/ui";
import { server } from "@/lib/server";
import type { Store } from "@/lib/types";
export const metadata = { title: "Checkout", description: "Review shipping, totals and payment options for your DESKLY order.", robots: { index: false, follow: false } };
export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  return <div className="wrap content"><PageHeader kicker="DESKLY CHECKOUT" title={order ? "Order status" : "Checkout"}>{order ? "Track payment and fulfillment." : "Complete your order with delivery within India."}</PageHeader>
    {typeof order === "string" && /^[\da-f-]{36}$/i.test(order) ? <CheckoutStatus id={order}/> : <CheckoutForm store={await server<Store>("/store")}/>}</div>;
}
