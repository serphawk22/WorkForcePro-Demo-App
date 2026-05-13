import dynamic from "next/dynamic";

const ProjectsClient = dynamic(() => import("@/app/project-management/projects/ProjectsClient"), {
  ssr: false,
});

/**
 * Backward-compatible Tasks route.
 *
 * Uses the same list experience as Project List view so users can access
 * a task list directly from /tasks.
 */
export default function TasksPage({
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
