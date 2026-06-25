import {
  playerMenuStyle,
  playerMenuButtonStyle,
} from "../../constants/playerStyles";
import Button from "../ui/button";

export default function PlayerToolsMenu({
  cutEnabled,
  toggleCutSection,
  hideSelectedObject,
  pullApart,
  resetAllTransforms,
  soloSelectedObject,
  showAllObjects,
}) {
  return (
    <div onClick={(e) => e.stopPropagation()} style={playerMenuStyle}>
      <Button size="sm" onClick={toggleCutSection}>
        {cutEnabled ? "Cut ON" : "Cut OFF"}
      </Button>

      <Button size="sm" onClick={hideSelectedObject}>
        Hide Selected
      </Button>

      <Button size="sm" onClick={pullApart}>
        Pull Apart
      </Button>

      <Button size="sm" onClick={resetAllTransforms}>
        Reset All
      </Button>

      <Button size="sm" onClick={soloSelectedObject}>
        Solo
      </Button>

      <Button size="sm" onClick={showAllObjects}>
        Show All
      </Button>
    </div>
  );
}
