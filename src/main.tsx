import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary fallbackMessage="Une erreur est survenue lors du chargement de l'application.">
    <App />
  </ErrorBoundary>
);
