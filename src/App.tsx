import { useState, useEffect } from "react";
import { Editor } from "@/components/editor/Editor";
import { AccuracyLab } from "./AccuracyLab";
import { Licenses } from "./Licenses";

export default function App() {
  const [route, setRoute] = useState<"editor" | "test" | "licenses">(() => {
    if (typeof window === "undefined") return "editor";
    const pathname = window.location.pathname.replace(/\/+$/, "");
    const hash = window.location.hash;
    if (pathname === "/test" || hash === "#/test" || hash === "#test") return "test";
    if (pathname === "/licenses" || hash === "#/licenses" || hash === "#licenses") return "licenses";
    return "editor";
  });

  useEffect(() => {
    const checkRoute = () => {
      const pathname = window.location.pathname.replace(/\/+$/, "");
      const hash = window.location.hash;
      if (pathname === "/test" || hash === "#/test" || hash === "#test") {
        setRoute("test");
      } else if (pathname === "/licenses" || hash === "#/licenses" || hash === "#licenses") {
        setRoute("licenses");
      } else {
        setRoute("editor");
      }
    };

    window.addEventListener("popstate", checkRoute);
    window.addEventListener("hashchange", checkRoute);
    return () => {
      window.removeEventListener("popstate", checkRoute);
      window.removeEventListener("hashchange", checkRoute);
    };
  }, []);

  if (route === "test") {
    return <AccuracyLab />;
  }

  if (route === "licenses") {
    return <Licenses />;
  }

  return <Editor />;
}

