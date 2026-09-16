import { useLayoutEffect } from "react";
import { useLocation } from "../lib/router";
import { renderSeoHead, SITE_URL } from "../lib/seo";

export default function Seo() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    const template = document.createElement("template");
    template.innerHTML = renderSeoHead(pathname, window.location.origin === SITE_URL);
    document.head.querySelectorAll("[data-seo]").forEach((node) => node.remove());
    document.head.append(template.content);
  }, [pathname]);
  return null;
}
