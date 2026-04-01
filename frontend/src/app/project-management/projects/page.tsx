import dynamic from "next/dynamic";

const ProjectsClient = dynamic(() => import("./ProjectsClient"), { ssr: false });

export default function Page({ searchParams }: { searchParams?: { workspace?: string } }) {
  return <ProjectsClient workspaceQuery={searchParams?.workspace || null} />;
}
