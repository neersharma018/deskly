import { Catalogue, type SearchParams } from "@/components/catalogue";
export const metadata = { title: "Shop essentials", description: "Browse desk accessories by category, price and stock, from mechanical keyboards to task lighting." };
export default async function Shop({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <Catalogue params={await searchParams}/>;
}
