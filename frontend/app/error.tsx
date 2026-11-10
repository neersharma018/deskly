"use client";
import { Button, PageHeader } from "@/components/ui";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <section className="wrap content"><PageHeader kicker="STORE CONNECTION" title="The store couldn’t load.">Try again in a moment.</PageHeader><Button onClick={reset}>Try again</Button></section>;
}
