import { Search } from "lucide-react";
import Input from "../../../components/ui/input";
import Button from "../../../components/ui/button";
import SelectField from "../../../components/ui/select";
import MaterialIcon from "../../../components/ui/material-icon";

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
        leftIcon={
          <MaterialIcon
            name="search"
            fill={1}
            size={27}
            className="text-secondary-default"
          />
        }
        inputClassName="text-sm italic"
      />

      <div className="flex gap-3">
        <Button
          disabled
          size="sm"
          variant="outline"
          className="border-accent-main! h-10!"
        >
          All Workspaces{" "}
          <MaterialIcon
            name="arrow_back_2"
            fill={1}
            size={18}
            className="-rotate-90 text-accent-main"
          />
        </Button>

        <Button
          disabled
          size="sm"
          variant="outline"
          className="border-accent-main! h-10!"
        >
          Last Viewed
          <MaterialIcon
            name="arrow_back_2"
            fill={1}
            size={18}
            className="-rotate-90 text-accent-main"
          />
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
          iconClassName="text-accent-main h-10!"
        />

        <Button
          size="sm"
          variant="destructive"
          className="h-10!"
          onClick={onClearLocalDb}
        >
          Clear Local DB
        </Button>
      </div>
    </div>
  );
}
