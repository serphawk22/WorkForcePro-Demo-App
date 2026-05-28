import ProjectShell from "@/components/project-management/ProjectShell";
import TeamClient from "@/components/project-management/TeamClient";

export const metadata = {
  title: "Your Team | Project Management – WorkForcePro",
  description:
    "View projects by workspace, see team members, and assign or log daily tasks and updates.",
};

export default function TeamPage() {
  return (
    <ProjectShell>
      <TeamClient />
    </ProjectShell>
  );
}
