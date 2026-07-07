import { Search } from "lucide-react";
import Input from "../../../components/ui/input";
import Button from "../../../components/ui/button";
import SelectField from "../../../components/ui/select";

export default function ProjectHubToolbar({
  search,
  setSearch,
  accessFilter,
  setAccessFilter,
  onClearLocalDb,
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <Input
        value={search}
        placeholder="Find the content you want to learn..."
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setSearch(e.target.value)}
        className="w-100! rounded-lg border-accent-main! h-10!"
        leftIcon={<Search className="size-5" />}
        inputClassName="text-sm italic"
      />

      <div className="flex gap-3">
        <Button
          size="sm"
          variant="outline"
          className="border-secondary-default! h-10!"
        >
          All Workspaces <span className="text-secondary-default">▼</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="border-secondary-default! h-10!"
        >
          Last Viewed <span className="text-secondary-default">▼</span>
        </Button>

        <SelectField
          value={accessFilter || "ALL"}
          onChange={setAccessFilter}
          options={[
            { label: "All Access", value: "ALL" },
            { label: "Editor Access", value: "EDITOR" },
            { label: "Player Access", value: "PLAYER" },
          ]}
          className="h-10! w-fit!"
          iconClassName="text-secondary-default h-10!"
        />

        <Button size="sm" variant="destructive" className="h-10!" onClick={onClearLocalDb}>
          Clear Local DB
        </Button>
      </div>
    </div>
  );
}
