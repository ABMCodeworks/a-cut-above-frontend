export const SITE_URL = "https://acutabovemeats.co.zw";
export const SITE_NAME = "A Cut Above Meats";
export const NO_INDEX = "noindex, nofollow, noarchive";

type Page = {
  title: string;
  description: string;
  heading: string;
  index: boolean;
  type?: string;
};

export const pages: Record<string, Page> = {
  "/": {
    title: "A Cut Above Meats | Farm-Raised Meat in Zimbabwe",
    description: "Shop grass-fed, ethically raised meat from A Cut Above, a family-run business in Zimbabwe. Browse available cuts and place your order online.",
    heading: "A Cut Above Meats — from our farm to your table",
    index: true,
    type: "CollectionPage",
  },
  "/about": {
    title: "Our Farm & Story | A Cut Above Meats Zimbabwe",
    description: "Meet A Cut Above, a family-run meat business in Zimbabwe committed to animal care, responsible farming and transparent sourcing from farm to plate.",
    heading: "Honest meat, raised with care",
    index: true,
    type: "AboutPage",
  },
  "/contact": {
    title: "Contact A Cut Above Meats | Orders & Delivery Enquiries",
    description: "Contact A Cut Above Meats in Zimbabwe by WhatsApp or email for help with orders, delivery, product availability and wholesale enquiries.",
    heading: "Contact A Cut Above Meats",
    index: true,
    type: "ContactPage",
  },
  "/privacy": {
    title: "Privacy Notice | A Cut Above Meats",
    description: "Read how A Cut Above Meats collects, uses and protects personal information when you shop online or contact our team.",
    heading: "Privacy Notice",
    index: true,
  },
  "/cookie-policy": {
    title: "Cookie & Browser Storage Policy | A Cut Above Meats",
    description: "Learn how A Cut Above Meats uses essential browser storage and optional preferences, and how to manage your choices.",
    heading: "Cookie & Browser Storage Policy",
    index: true,
  },
  "/terms": {
    title: "Shop Terms | A Cut Above Meats",
    description: "Read A Cut Above Meats shop terms covering orders, availability, weights, prices, delivery and product enquiries.",
    heading: "Shop Terms",
    index: true,
  },
  "/wholesale": {
    title: "Wholesale Partner Access | A Cut Above Meats",
    description: "Secure wholesale access for approved A Cut Above business customers.",
    heading: "Wholesale Partner Access",
    index: false,
  },
  "/checkout": {
    title: "Checkout | A Cut Above Meats",
    description: "Complete your A Cut Above Meats order.",
    heading: "Checkout",
    index: false,
  },
  "/track": {
    title: "Track Your Order | A Cut Above Meats",
    description: "Check the status of your A Cut Above Meats order.",
    heading: "Track Your Order",
    index: false,
  },
  "/privacy-rights": {
    title: "Privacy Choices & Data Rights | A Cut Above Meats",
    description: "Manage your privacy preferences or submit a personal data request to A Cut Above Meats.",
    heading: "Privacy Choices & Data Rights",
    index: false,
  },
  "/admin": {
    title: "Admin Sign In | A Cut Above Meats",
    description: "Authorised staff access only.",
    heading: "Admin Sign In",
    index: false,
  },
  "/admin/setup": {
    title: "Admin Setup | A Cut Above Meats",
    description: "Authorised staff access only.",
    heading: "Admin Setup",
    index: false,
  },
  "/admin/register": {
    title: "Admin Invitation | A Cut Above Meats",
    description: "Authorised staff access only.",
    heading: "Admin Invitation",
    index: false,
  },
  "/admin/dashboard": {
    title: "Admin Dashboard | A Cut Above Meats",
    description: "Authorised staff access only.",
    heading: "Admin Dashboard",
    index: false,
  },
};

export const aliases: Record<string, string> = {
  "/products": "/",
  "/shop": "/",
  "/track-order": "/track",
};

export function normalizePath(path: string) {
  return path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
}

export function getPage(pathname: string): Page & { path: string } {
  const normalized = normalizePath(pathname);
  const path = aliases[normalized] || normalized;
  const page = pages[path] || (path.startsWith("/admin/") ? pages["/admin"] : {
    title: "Page Not Found | A Cut Above Meats",
    description: "This page could not be found. Visit the A Cut Above Meats shop or contact our team for help.",
    heading: "Page not found",
    index: false,
  });
  return { ...page, path };
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

export function structuredData(pathname: string) {
  const page = getPage(pathname);
  if (!page.index) return null;
  const url = `${SITE_URL}${page.path}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/brand-logo.png`,
        description: "Family-run meat business in Zimbabwe, committed to responsible farming and transparent sourcing.",
        address: { "@type": "PostalAddress", addressLocality: "Mutare", addressCountry: "ZW" },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        inLanguage: "en-ZW",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": page.type || "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: page.title,
        description: page.description,
        inLanguage: "en-ZW",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#organization` },
        ...(page.path !== "/" ? { breadcrumb: { "@id": `${url}#breadcrumb` } } : {}),
      },
      ...(page.path === "/" ? [] : [{
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Shop", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: page.heading, item: url },
        ],
      }]),
    ],
  };
}

// Shared by the build and client navigation so crawlers and visitors see the same metadata.
export function renderSeoHead(pathname: string, allowIndex = true) {
  const page = getPage(pathname);
  const index = page.index && allowIndex;
  const meta = (key: string, content: string, property = false) =>
    `<meta data-seo ${property ? "property" : "name"}="${key}" content="${escapeHtml(content)}" />`;
  const schema = index ? structuredData(pathname) : null;
  return [
    `<title data-seo>${escapeHtml(page.title)}</title>`,
    meta("description", page.description),
    meta("robots", index ? "index, follow, max-image-preview:large" : NO_INDEX),
    ...(page.index ? [`<link data-seo rel="canonical" href="${SITE_URL}${escapeHtml(page.path)}" />`] : []),
    ...(index ? [
      meta("og:type", "website", true),
      meta("og:site_name", SITE_NAME, true),
      meta("og:locale", "en_ZW", true),
      meta("og:title", page.title, true),
      meta("og:description", page.description, true),
      meta("og:url", `${SITE_URL}${page.path}`, true),
      meta("og:image", `${SITE_URL}/brand-logo.png`, true),
      meta("og:image:width", "1365", true),
      meta("og:image:height", "1365", true),
      meta("og:image:alt", "A Cut Above Meats logo", true),
      meta("twitter:card", "summary"),
      meta("twitter:title", page.title),
      meta("twitter:description", page.description),
      meta("twitter:image", `${SITE_URL}/brand-logo.png`),
      meta("twitter:image:alt", "A Cut Above Meats logo"),
    ] : []),
    schema ? `<script data-seo type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>` : "",
  ].join("\n  ");
}
