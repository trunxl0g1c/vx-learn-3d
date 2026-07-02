import ViewerPageLayout from "./components/layout/ViewerPageLayout";
import { useViewerPageController } from "./hooks/useViewerPageController";

export default function ViewerPage() {
  const controller = useViewerPageController();

  return <ViewerPageLayout controller={controller} />;
}