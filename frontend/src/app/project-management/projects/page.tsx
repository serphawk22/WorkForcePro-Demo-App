import dynamic from "next/dynamic";

const ProjectsClient = dynamic(() => import("./ProjectsClient"), { ssr: false });

export default function Page({ searchParams }: { searchParams?: { workspace?: string; status?: string; edit?: string } }) {
  return (
    <ProjectsClient
      workspaceQuery={searchParams?.workspace || null}
      statusQuery={searchParams?.status || null}
      editQuery={searchParams?.edit || null}
    />
  );
}
