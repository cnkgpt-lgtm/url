export function normalizeUrl(raw: string): string {
  try {
    let u = raw.trim();
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    const parsed = new URL(u);
    parsed.hostname = parsed.hostname.toLowerCase();
    // remove utm_* and common tracking params
    const keys = Array.from(parsed.searchParams.keys());
    for (const k of keys) {
      if (k.toLowerCase().startsWith("utm_") || k === "fbclid" || k === "gclid") {
        parsed.searchParams.delete(k);
      }
    }
    // remove trailing slash except root
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
    parsed.pathname = pathname;
    // reconstruct without hash? keep hash removed for dedup consistency? keep but normalize: remove empty hash
    // Keep search string sorted? leave as is
    let result = parsed.toString();
    // URL toString adds trailing slash for root, remove it for consistency except keep protocol
    if (parsed.pathname === "/" && !parsed.search) {
      result = result.replace(/\/$/, "");
    }
    return result.toLowerCase().replace(/^https?:\/\//, (m) => m); // host already lower, keep protocol lower
    // Note: full lowercase would break case-sensitive paths, so above we only lower host.
    // Simpler: return result as built (host lowercased)
  } catch {
    return raw.trim().toLowerCase().replace(/\/$/, "");
  }
}

// More precise normalize: host lowercase, trailing slash removed, utm removed
export function normalizeUrlStrict(raw: string): string {
  try {
    let u = raw.trim();
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    const parsed = new URL(u);
    parsed.hostname = parsed.hostname.toLowerCase();
    const keys = Array.from(parsed.searchParams.keys());
    for (const k of keys) {
      if (k.toLowerCase().startsWith("utm_")) parsed.searchParams.delete(k);
    }
    let path = parsed.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    const search = parsed.searchParams.toString() ? `?${parsed.searchParams.toString()}` : "";
    const port = parsed.port ? `:${parsed.port}` : "";
    return `${parsed.protocol}//${parsed.hostname}${port}${path}${search}`;
  } catch {
    return raw.trim().replace(/\/$/, "");
  }
}

export function extractDomain(raw: string): string {
  try {
    let u = raw.trim();
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return raw;
  }
}

export function ensureUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  return "https://" + t;
}

export function isValidUrl(raw: string): boolean {
  try {
    const u = ensureUrl(raw);
    const parsed = new URL(u);
    return !!parsed.hostname && parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

export function formatDateID(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Makassar",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d) + " WITA";
  } catch {
    return iso;
  }
}

export function formatDateShort(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Makassar",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return iso;
  }
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

export function faviconForDomain(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}
