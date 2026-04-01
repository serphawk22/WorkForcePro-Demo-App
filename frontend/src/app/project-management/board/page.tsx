import dynamic from "next/dynamic";

const BoardClient = dynamic(() => import("./BoardClient"), { ssr: false });

export default function Page() {
  return <BoardClient />;
}
