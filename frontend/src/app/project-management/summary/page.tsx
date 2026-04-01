import dynamic from "next/dynamic";

const SummaryClient = dynamic(() => import("./SummaryClient"), { ssr: false });

export default function Page({ searchParams }: { searchParams?: { workspace?: string } }) {
  return <SummaryClient workspaceQuery={searchParams?.workspace || null} />;
}
