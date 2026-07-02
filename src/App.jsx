import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoadingProvider } from "./modules/loading/LoadingContext";
import { ProjectStoreProvider } from "./modules/project-store/ProjectStoreContext";

import ProjectHubRoute from "./modules/project-hub/ProjectHubRoute";
import ViewerPage from "./ViewerPage";
import PlayerPage from "./modules/player/PlayerPage";


export default function App() {
  return (
    <BrowserRouter>
      <LoadingProvider>
        <ProjectStoreProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/vxplore" replace />} />

            <Route path="/vxplore" element={<ProjectHubRoute />} />
            <Route path="/vxplore/editor/:projectId" element={<ViewerPage />} />
            <Route path="/vxplore/player/:projectId" element={<PlayerPage />} />

            <Route
              path="/editor"
              element={<Navigate to="/vxplore/editor/demo" replace />}
            />
            <Route
              path="/player"
              element={<Navigate to="/vxplore/player/demo" replace />}
            />
          </Routes>
        </ProjectStoreProvider>
      </LoadingProvider>
    </BrowserRouter>
  );
}