import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { LoadingProvider } from "./modules/loading/LoadingContext";
import { ProjectStoreProvider } from "./modules/project-store/ProjectStoreContext";

import ProjectHubRoute from "./modules/project-hub/ProjectHubRoute";
import ViewerPage from "./ViewerPage";
import PlayerPage from "./modules/player/PlayerPage";
import PlayerV2Page from "./modules/player-v2/PlayerV2Page";

const PREVIOUS_BRAND_BASE_PATH = `/${["vi", "cubed"].join("")}`;
const LEGACY_BASE_PATH = `/${["vx", "plore"].join("")}`;
const LEGACY_BASE_PATHS = [PREVIOUS_BRAND_BASE_PATH, LEGACY_BASE_PATH];

function LegacyProjectRedirect({ destination }) {
  const { projectId } = useParams();
  return <Navigate to={`/viqubed/${destination}/${projectId}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <LoadingProvider>
        <ProjectStoreProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/viqubed" replace />} />

            <Route path="/viqubed" element={<ProjectHubRoute />} />
            <Route path="/viqubed/editor/:projectId" element={<ViewerPage />} />
            <Route path="/viqubed/player/:projectId" element={<PlayerPage />} />
            <Route path="/viqubed/player-v2/:projectId" element={<PlayerV2Page />} />

            {LEGACY_BASE_PATHS.map((basePath) => (
              <Route
                key={basePath}
                path={basePath}
                element={<Navigate to="/viqubed" replace />}
              />
            ))}
            {LEGACY_BASE_PATHS.map((basePath) => (
              <Route
                key={`${basePath}-editor`}
                path={`${basePath}/editor/:projectId`}
                element={<LegacyProjectRedirect destination="editor" />}
              />
            ))}
            {LEGACY_BASE_PATHS.map((basePath) => (
              <Route
                key={`${basePath}-player`}
                path={`${basePath}/player/:projectId`}
                element={<LegacyProjectRedirect destination="player" />}
              />
            ))}
            {LEGACY_BASE_PATHS.map((basePath) => (
              <Route
                key={`${basePath}-player-v2`}
                path={`${basePath}/player-v2/:projectId`}
                element={<LegacyProjectRedirect destination="player-v2" />}
              />
            ))}

            <Route
              path="/editor"
              element={<Navigate to="/viqubed/editor/demo" replace />}
            />
            <Route
              path="/player"
              element={<Navigate to="/viqubed/player/demo" replace />}
            />
          </Routes>
        </ProjectStoreProvider>
      </LoadingProvider>
    </BrowserRouter>
  );
}