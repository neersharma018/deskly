import { ShoppingBag } from "@/components/shopping";
import { PageHeader } from "@/components/ui";
export const metadata = { title: "Shopping bag" };
export default function CartPage() {
  return <div className="wrap content"><PageHeader kicker="YOUR SELECTION" title="Shopping bag">Make a little more room for better work.</PageHeader><ShoppingBag/></div>;
}
