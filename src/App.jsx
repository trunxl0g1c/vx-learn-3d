import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { LoadingProvider } from "./modules/loading/LoadingContext";
import { ProjectStoreProvider } from "./modules/project-store/ProjectStoreContext";
import { AuthProvider } from "./modules/auth/AuthContext";
import ProtectedRoute from "./modules/auth/ProtectedRoute";
import LoginPage from "./modules/auth/LoginPage";
import RegisterPage from "./modules/auth/RegisterPage";

import ProjectHubRoute from "./modules/project-hub/ProjectHubRoute";
import { loadPlayerPage, loadViewerPage } from "./routeLoaders";

const ViewerPage = lazy(loadViewerPage);
const PlayerPage = lazy(loadPlayerPage);

const PREVIOUS_BRAND_BASE_PATH = `/${["vi", "cubed"].join("")}`;
const LEGACY_BASE_PATH = `/${["vx", "plore"].join("")}`;
const LEGACY_BASE_PATHS = [PREVIOUS_BRAND_BASE_PATH, LEGACY_BASE_PATH];

function LegacyProjectRedirect({ destination }) {
  const { projectId } = useParams();
  return <Navigate to={`/viqubed/${destination}/${projectId}`} replace />;
}

function RouteLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid h-dvh w-full place-items-center bg-primary text-white"
    >
      <div className="w-[min(360px,calc(100vw-32px))] rounded-2xl border border-divider-main bg-dark px-6 py-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <div className="text-base font-medium">Loading Viqubed...</div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/35">
          <div className="h-full w-[45%] animate-[vx-global-loading-slide_1.1s_infinite_ease-in-out] rounded-full bg-accent-main" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LoadingProvider>
          <ProjectStoreProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Navigate to="/viqubed" replace />} />

                <Route path="/viqubed" element={<ProjectHubRoute />} />
                <Route path="/viqubed/editor/:projectId" element={<ViewerPage />} />
                <Route path="/viqubed/player/:projectId" element={<PlayerPage />} />
                <Route path="/viqubed/player-v2/:projectId" element={<PlayerV2Page />} />
              </Route>

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
      </AuthProvider>
    </BrowserRouter>
  );
}
