import { useState, useEffect } from "react";
import { Editor } from "@/components/editor/Editor";
import { AccuracyLab } from "./AccuracyLab";

export default function App() {
  const [isTestRoute, setIsTestRoute] = useState(() => {
    if (typeof window === "undefined") return false;
    const pathname = window.location.pathname.replace(/\/+$/, "");
    const hash = window.location.hash;
    return pathname === "/test" || hash === "#/test" || hash === "#test";
  });

  useEffect(() => {
    const checkRoute = () => {
      const pathname = window.location.pathname.replace(/\/+$/, "");
      const hash = window.location.hash;
      setIsTestRoute(pathname === "/test" || hash === "#/test" || hash === "#test");
    };

    window.addEventListener("popstate", checkRoute);
    window.addEventListener("hashchange", checkRoute);
    return () => {
      window.removeEventListener("popstate", checkRoute);
      window.removeEventListener("hashchange", checkRoute);
    };
  }, []);

  if (isTestRoute) {
    return <AccuracyLab />;
  }

  return <Editor />;
}

