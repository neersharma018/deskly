import Link from "next/link";
import { Button, PageHeader } from "@/components/ui";
export default function NotFound() {
  return <div className="wrap content">
    <PageHeader kicker="404 / DESKLY" title="Page not found">The page may have moved, or the address may be incorrect.</PageHeader>
    <div className="button-row">
      <Button asChild><Link href="/">Back to home</Link></Button>
      <Button asChild variant="outline"><Link href="/shop">Browse the shop</Link></Button>
    </div>
  </div>;
}
