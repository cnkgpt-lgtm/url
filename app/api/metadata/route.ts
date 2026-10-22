import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .trim();
}

function getMetaContent(html: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return decodeEntities(m[1]);
    if (m && m[2]) return decodeEntities(m[2]);
  }
  return "";
}

function resolveUrl(base: string, rel: string): string {
  try {
    return new URL(rel, base).toString();
  } catch {
    return rel;
  }
}

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return NextResponse.json({ error: "Parameter url wajib diisi" }, { status: 400 });
  }

  let target = urlParam.trim();
  if (!/^https?:\/\//i.test(target)) target = "https://" + target;

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "URL tidak valid" }, { status: 400 });
  }

  const domain = parsed.hostname.replace(/^www\./, "");
  const fallbackFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(target, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/")) {
      return NextResponse.json({
        title: domain,
        description: "",
        image: "",
        favicon: fallbackFavicon,
        domain,
        url: target,
      });
    }

    const html = await res.text();
    // Limit parsing to first 200k chars for performance
    const slice = html.slice(0, 200000);

    // Title
    let title = "";
    const titleMatch = slice.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) title = decodeEntities(titleMatch[1]);
    if (!title) {
      title = getMetaContent(slice, [
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
        /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
      ]);
    }
    if (!title) title = domain;

    // Description
    let description = getMetaContent(slice, [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i,
      /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
      /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i,
      /<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']*)["']/i,
    ]);

    // OG Image
    let image = getMetaContent(slice, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    ]);
    if (image) image = resolveUrl(target, image);

    // Favicon
    let favicon = "";
    const iconMatches = slice.matchAll(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/gi);
    for (const m of iconMatches) {
      const hrefMatch = m[0].match(/href=["']([^"']+)["']/i);
      if (hrefMatch) {
        favicon = resolveUrl(target, hrefMatch[1]);
        break;
      }
    }
    if (!favicon) {
      // try link with href before rel
      const alt = slice.match(/<link[^>]+href=["']([^"']*favicon[^"']*)["'][^>]*>/i);
      if (alt) favicon = resolveUrl(target, alt[1]);
    }
    if (!favicon) favicon = fallbackFavicon;

    return NextResponse.json({
      title,
      description,
      image,
      favicon,
      domain,
      url: target,
    });
  } catch (err) {
    clearTimeout(timeout);
    // Graceful fallback - still return domain info so client can save manually
    return NextResponse.json({
      title: domain,
      description: "",
      image: "",
      favicon: fallbackFavicon,
      domain,
      url: target,
      warning: err instanceof Error ? err.message : "Gagal mengambil metadata, silakan isi manual.",
    });
  }
}
