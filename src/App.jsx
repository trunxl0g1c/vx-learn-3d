import { BrowserRouter, Routes, Route } from "react-router-dom";

import ViewerPage from "./ViewerPage";
import EditorPage from "./modules/editor/EditorPage";
import PlayerPage from "./modules/player/PlayerPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ViewerPage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/player" element={<PlayerPage />} />
      </Routes>
    </BrowserRouter>
  );
}