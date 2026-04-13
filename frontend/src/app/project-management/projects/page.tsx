import dynamic from "next/dynamic";

const ProjectsClient = dynamic(() => import("./ProjectsClient"), { ssr: false });

export default function Page({
  searchParams,
}: {
  searchParams?: {
    workspace?: string;
    status?: string;
    edit?: string;
    create?: string;
    prefillTitle?: string;
    prefillDescription?: string;
    prefillDueDate?: string;
    prefillAssignedTo?: string;
    prefillAssignedBy?: string;
  };
}) {
  return (
    <ProjectsClient
      workspaceQuery={searchParams?.workspace || null}
      statusQuery={searchParams?.status || null}
      editQuery={searchParams?.edit || null}
      createQuery={searchParams?.create || null}
      prefillTitleQuery={searchParams?.prefillTitle || null}
      prefillDescriptionQuery={searchParams?.prefillDescription || null}
      prefillDueDateQuery={searchParams?.prefillDueDate || null}
      prefillAssignedToQuery={searchParams?.prefillAssignedTo || null}
      prefillAssignedByQuery={searchParams?.prefillAssignedBy || null}
    />
  );
}
