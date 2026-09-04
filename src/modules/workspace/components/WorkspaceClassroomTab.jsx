import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useWorkspaceMembers } from "../api/workspaces";
import ClassroomListPanel from "./classroom/ClassroomListPanel";
import ClassroomDetailPanel from "./classroom/ClassroomDetailPanel";

// Master-detail layout: the classroom list (left) drives which classroom's
// info/members/content shows in the detail panel (right) — replaces the old
// dense table + a separate "edit members" modal per classroom. The two
// biggest gaps that layout had: renaming/re-describing a classroom had no UI
// at all (the pencil icon actually opened the members dialog, not this), and
// managing members meant repeatedly opening/closing that modal one
// classroom at a time. Both live inline here instead.
export default function WorkspaceClassroomTab({ workspaceId }) {
  const { user } = useAuth();
  const [selected, setSelected] = useState(null);

  const { data: members = [] } = useWorkspaceMembers(workspaceId);
  const currentUserRoleInWorkspace =
    members.find((member) => member.userId === user?.id)?.roleInWorkspace ||
    null;
  const canManageClassrooms =
    currentUserRoleInWorkspace === "owner" ||
    currentUserRoleInWorkspace === "editor";

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
      <ClassroomListPanel
        workspaceId={workspaceId}
        selectedId={selected?.id}
        onSelect={setSelected}
        canManageClassrooms={canManageClassrooms}
      />

      <ClassroomDetailPanel
        classroom={selected}
        canManage={canManageClassrooms}
        onDeleted={() => setSelected(null)}
      />
    </div>
  );
}
