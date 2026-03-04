import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./index.css";

// DOM stability patch — prevents crashes from Google Translate & browser extensions
if (typeof Node !== 'undefined') {
  const origRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    try {
      if (child.parentNode !== this) return child;
      return origRemoveChild.call(this, child) as T;
    } catch {
      return child;
    }
  };
  const origInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, refNode: Node | null): T {
    try {
      return origInsertBefore.call(this, newNode, refNode) as T;
    } catch {
      return newNode;
    }
  };
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary fallbackMessage="Une erreur est survenue lors du chargement de l'application.">
    <App />
  </ErrorBoundary>
);
