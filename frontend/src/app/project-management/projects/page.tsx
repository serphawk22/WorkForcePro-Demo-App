import dynamic from "next/dynamic";

const ProjectsClient = dynamic(() => import("./ProjectsClient"), { ssr: false });

export default function Page() {
  return <ProjectsClient />;
}
