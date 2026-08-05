import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.jsx";
import { AlertProvider } from "./components/dialog/AlertContext.jsx";
import { queryClient } from "./lib/queryClient.js";

// React StrictMode intentionally mounts, unmounts, and mounts components again
// in development. That behavior is useful for regular DOM applications, but it
// also creates and disposes WebGLRenderer contexts twice. Viqubed keeps a single
// renderer lifecycle here so large GLB scenes do not emit artificial context-loss
// events or allocate duplicate GPU resources during development.
createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={queryClient}>
    <AlertProvider>
      <App />
    </AlertProvider>
  </QueryClientProvider>,
);
