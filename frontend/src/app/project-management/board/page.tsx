import dynamic from "next/dynamic";

const BoardClient = dynamic(() => import("./BoardClient"), { ssr: false });

export default function Page({ searchParams }: { searchParams?: { workspace?: string } }) {
  return <BoardClient workspaceQuery={searchParams?.workspace || null} />;
}
