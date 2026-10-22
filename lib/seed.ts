import type { AppData, Category, LinkItem } from "./types";
import { normalizeUrlStrict, extractDomain, faviconForDomain } from "./utils";

export const SEED_CATEGORIES: Category[] = [
  { id: "cat-umum", name: "Umum", color: "#64748b" },
  { id: "cat-pekerjaan", name: "Pekerjaan", color: "#2563eb" },
  { id: "cat-belajar", name: "Belajar", color: "#059669" },
  { id: "cat-referensi", name: "Referensi", color: "#7c3aed" },
  { id: "cat-hiburan", name: "Hiburan", color: "#db2777" },
];

function makeLink(
  partial: Omit<LinkItem, "id" | "normalizedUrl" | "domain" | "favicon" | "createdAt" | "updatedAt"> & { createdAtOffsetDays: number }
): LinkItem {
  const now = Date.now() - partial.createdAtOffsetDays * 24 * 60 * 60 * 1000;
  const iso = new Date(now).toISOString();
  const domain = extractDomain(partial.url);
  const { createdAtOffsetDays, ...rest } = partial;
  void createdAtOffsetDays;
  return {
    ...rest,
    id: "seed-" + Math.random().toString(36).slice(2, 9),
    normalizedUrl: normalizeUrlStrict(partial.url),
    domain,
    favicon: faviconForDomain(domain),
    createdAt: iso,
    updatedAt: iso,
  };
}

export function getSeedData(): AppData {
  const links: LinkItem[] = [
    makeLink({
      url: "https://github.com",
      title: "GitHub — Build and ship software on a single, collaborative platform",
      description: "GitHub adalah platform untuk menyimpan, mengelola, dan berkolaborasi dalam pengembangan perangkat lunak dengan Git.",
      categoryId: "cat-pekerjaan",
      tags: ["kode", "git", "kolaborasi"],
      clicks: 12,
      favorite: true,
      createdAtOffsetDays: 6,
    }),
    makeLink({
      url: "https://developer.mozilla.org",
      title: "MDN Web Docs",
      description: "Dokumentasi lengkap teknologi web: HTML, CSS, JavaScript, dan Web API dari Mozilla.",
      categoryId: "cat-referensi",
      tags: ["dokumentasi", "web", "javascript"],
      clicks: 18,
      favorite: true,
      createdAtOffsetDays: 5,
    }),
    makeLink({
      url: "https://nextjs.org",
      title: "Next.js — The React Framework for the Web",
      description: "Framework React untuk membangun aplikasi web modern dengan rendering server dan routing bawaan.",
      categoryId: "cat-belajar",
      tags: ["react", "framework", "tutorial"],
      clicks: 9,
      favorite: false,
      createdAtOffsetDays: 3,
    }),
    makeLink({
      url: "https://tailwindcss.com",
      title: "Tailwind CSS — Rapidly build modern websites",
      description: "Framework CSS utility-first untuk membangun desain kustom dengan cepat tanpa meninggalkan HTML.",
      categoryId: "cat-belajar",
      tags: ["css", "desain", "frontend"],
      clicks: 7,
      favorite: false,
      createdAtOffsetDays: 2,
    }),
    makeLink({
      url: "https://www.kemdikbud.go.id",
      title: "Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi",
      description: "Situs resmi Kemdikbudristek — informasi kebijakan, program, dan layanan pendidikan di Indonesia.",
      categoryId: "cat-umum",
      tags: ["pemerintah", "pendidikan", "resmi"],
      clicks: 3,
      favorite: false,
      createdAtOffsetDays: 1,
    }),
  ];
  return { categories: [...SEED_CATEGORIES], links };
}
