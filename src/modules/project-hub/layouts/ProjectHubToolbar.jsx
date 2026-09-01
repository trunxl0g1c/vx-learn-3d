import Input from "../../../components/ui/input";
import Button from "../../../components/ui/button";
import SelectField from "../../../components/ui/select";
import MaterialIcon from "../../../components/ui/material-icon";

export default function ProjectHubToolbar({
  search,
  setSearch,
  workspaces = [],
  workspaceFilter,
  setWorkspaceFilter,
  sortBy,
  setSortBy,
  classrooms = [],
  classroomFilter,
  setClassroomFilter,
  onClearLocalDb,
}) {
  return (
    <div className="mb-5 flex min-w-0 flex-col gap-3 xl:mb-6 xl:flex-row xl:items-center xl:justify-between">
      <Input
        value={search}
        placeholder="Find the content you want to learn..."
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => setSearch(event.target.value)}
        className="h-10! w-full! min-w-0 rounded-lg xl:max-w-[390px] 2xl:max-w-[430px]"
        leftIcon={
          <MaterialIcon
            name="search"
            fill={1}
            size={27}
            className="text-secondary-default"
          />
        }
        inputClassName="min-w-0 text-sm italic"
      />

      <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end sm:gap-3 xl:flex-nowrap">
        <SelectField
          value={workspaceFilter || "ALL"}
          onChange={setWorkspaceFilter}
          options={[
            { label: "All Workspaces", value: "ALL" },
            ...workspaces.map((workspace) => ({
              label: workspace.name,
              value: workspace.id,
            })),
          ]}
          className="h-10! w-full! min-w-0 sm:w-auto! sm:min-w-[148px]"
          iconClassName="h-10! text-accent-main"
        />

        <SelectField
          value={sortBy || "LAST_VIEWED"}
          onChange={setSortBy}
          options={[
            { label: "Last Viewed", value: "LAST_VIEWED" },
            { label: "Default Order", value: "DEFAULT" },
          ]}
          className="h-10! w-full! min-w-0 sm:w-auto! sm:min-w-[126px]"
          iconClassName="h-10! text-accent-main"
        />

        <SelectField
          value={classroomFilter || "ALL"}
          onChange={setClassroomFilter}
          options={[
            { label: "All Classrooms", value: "ALL" },
            ...classrooms.map((classroom) => ({
              label: classroom.name,
              value: classroom.id,
            })),
          ]}
          className="h-10! w-full! min-w-0 sm:w-auto! sm:min-w-[172px]"
          iconClassName="h-10! text-accent-main"
        />

        <Button
          size="sm"
          variant="destructive"
          className="h-10! min-w-0 px-3! whitespace-nowrap sm:min-w-[124px]"
          onClick={onClearLocalDb}
        >
          Clear Local DB
        </Button>
      </div>
    </div>
  );
}
