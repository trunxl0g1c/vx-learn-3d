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
        <Button
          disabled
          size="sm"
          variant="outline"
          className="h-10! min-w-0 justify-between border-accent-main! px-3! whitespace-nowrap sm:min-w-[148px]"
        >
          <span className="truncate">All Workspaces</span>
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
          className="h-10! min-w-0 justify-between border-accent-main! px-3! whitespace-nowrap sm:min-w-[126px]"
        >
          <span className="truncate">Last Viewed</span>
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
          className="h-10! w-full! min-w-0 sm:w-[140px]!"
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
