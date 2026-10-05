import { ShelfScreen, shelfFilter } from "@/components/ShelfScreen";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: filterParam } = await searchParams;
  return <ShelfScreen filter={shelfFilter(filterParam)} jsonLd />;
}
