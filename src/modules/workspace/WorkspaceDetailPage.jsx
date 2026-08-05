import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ProjectHubLayout from "../project-hub/layouts/ProjectHubLayout";
import InlineAlert from "../../components/ui/inline-alert";
import { useWorkspaceDetail } from "./api/workspaces";
import WorkspaceOverviewTab from "./components/WorkspaceOverviewTab";
import WorkspaceMemberTab from "./components/WorkspaceMemberTab";
import WorkspaceContentTab from "./components/WorkspaceContentTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "member", label: "Member" },
  { id: "content", label: "Content" },
  { id: "billing", label: "Billing" },
];

export default function WorkspaceDetailPage() {
  const { workspaceId } = useParams();
  
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const {
    data: workspace,
    isLoading,
    isError,
    error,
  } = useWorkspaceDetail(workspaceId);

  return (
    <ProjectHubLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/workspace")}
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-secondary-default transition hover:bg-white/5"
            aria-label="Back to workspaces"
          >
            <ArrowLeft className="size-5" />
          </button>

          <h1 className="truncate text-lg font-medium text-white">
            {isLoading ? "Loading…" : workspace?.name || "Workspace"}
          </h1>
        </div>

        {isError && (
          <InlineAlert
            type="error"
            autoHide={false}
            message={
              error?.response?.data?.message || "Failed to load workspace."
            }
          />
        )}

        <div className="grid grid-cols-4 max-w-lg">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                "cursor-pointer px-3 py-2 text-sm font-medium transition rounded-tr-lg rounded-tl-lg w-32",
                activeTab === tab.id
                  ? "border-accent-main text-white bg-accent-main"
                  : "border-transparent text-secondary-default hover:text-white",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <WorkspaceOverviewTab
            workspaceId={workspaceId}
            workspace={workspace}
            isLoading={isLoading}
          />
        )}

        {activeTab === "member" && (
          <WorkspaceMemberTab workspaceId={workspaceId} />
        )}

        {activeTab === "content" && (
          <WorkspaceContentTab workspaceId={workspaceId} />
        )}

        {activeTab === "billing" && (
          <div className="flex min-h-40 items-center justify-center rounded-lg border border-divider-main bg-dark text-sm text-contrast-grayout">
            Billing isn't available yet.
          </div>
        )}
      </div>
    </ProjectHubLayout>
  );
}
