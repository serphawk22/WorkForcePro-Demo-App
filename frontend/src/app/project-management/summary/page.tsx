import dynamic from "next/dynamic";

const SummaryClient = dynamic(() => import("./SummaryClient"), { ssr: false });

export default function Page() {
  return <SummaryClient />;
}
