import { Catalogue, type SearchParams } from "@/components/catalogue";
export const metadata = { title: "Shop essentials" };
export default async function Shop({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <Catalogue params={await searchParams}/>;
}
