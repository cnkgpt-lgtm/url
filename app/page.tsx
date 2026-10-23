"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NextLink from "next/link";
import { signOut, useSession } from "next-auth/react";
import type { AppData, Category, LinkItem } from "@/lib/types";
import { COLOR_PALETTE, STORAGE_KEY } from "@/lib/types";
import {
  ensureUrl,
  extractDomain,
  faviconForDomain,
  formatDateID,
  isValidUrl,
  normalizeUrlStrict,
} from "@/lib/utils";

type SortKey = "newest" | "oldest" | "title" | "clicks";
type RangeKey = "all" | "today" | "7d" | "30d";
type ViewMode = "grid" | "list";

interface MetadataResult {
  title: string;
  description: string;
  image?: string;
  favicon: string;
  domain: string;
  warning?: string;
}

/** Kunci identitas pemilik link (username paling stabil; fallback ke nama). */
function ownerKeyOf(l: LinkItem): string {
  return l.ownerUsername || l.ownerName || "";
}

/** Label pemilik untuk lencana & filter Pemilik, mis. "Akademik (@akademik)". */
function ownerLabelOf(l: LinkItem): string {
  if (l.ownerName && l.ownerUsername) return `${l.ownerName} (@${l.ownerUsername})`;
  if (l.ownerUsername) return `@${l.ownerUsername}`;
  return l.ownerName || "Pengguna lain";
}

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <p className="text-slate-500">Memuat Accank Arsip Link…</p>
      </main>
    );
  }

  if (!session?.user) {
    return <Welcome />;
  }

  return (
    <ArchiveApp
      userName={session.user.name || ""}
      userUsername={(session.user as { username?: string | null }).username || ""}
      userRole={(session.user as { role?: string }).role || "USER"}
    />
  );
}

function Welcome() {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/90">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white">🔗</div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-slate-900">Accank Arsip Link</h1>
              <p className="text-xs text-slate-500">Simpan & temukan kembali link dalam &lt; 5 detik</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NextLink href="/login" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
              Masuk
            </NextLink>
            <NextLink href="/register" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
              Daftar Gratis
            </NextLink>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
        <div className="text-6xl">🔗</div>
        <h2 className="mt-5 text-3xl font-bold leading-tight text-slate-900">
          Semua link penting Anda, tersimpan rapi dalam satu arsip
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-600">
          Tempel URL — judul, deskripsi, dan favicon terisi otomatis. Beri kategori berwarna dan tag,
          lalu temukan kembali dalam sekejap lewat pencarian real-time.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <NextLink href="/register" className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
            Buat Akun Gratis
          </NextLink>
          <NextLink href="/login" className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold hover:bg-slate-50">
            Masuk
          </NextLink>
        </div>

        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl">⚡</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">Simpan super cepat</p>
            <p className="mt-1 text-xs text-slate-500">Metadata URL diambil otomatis, tanpa ketik manual.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl">🏷️</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">Kategori & tag</p>
            <p className="mt-1 text-xs text-slate-500">Kelompokkan dengan kategori berwarna dan tag kustom.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl">📱</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">Sinkron semua perangkat</p>
            <p className="mt-1 text-xs text-slate-500">Arsip tersimpan per akun di server — buka dari HP atau laptop, isinya sama.</p>
          </div>
        </div>

        <p className="mt-10 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Arsip tersimpan <strong>per akun</strong> dan bisa dibuka dari perangkat apa pun.
          Silakan masuk atau daftar untuk mulai mengarsipkan.
        </p>
      </div>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <p className="font-medium text-slate-500">Accank Arsip Link — Aplikasi Pengarsipan URL/Link</p>
        <p className="mt-1">Data tersimpan aman per akun di server dan sinkron antarperangkat.</p>
      </footer>
    </main>
  );
}

function ArchiveApp({ userName, userUsername, userRole }: { userName: string; userUsername: string; userRole: string }) {
  const isMaster = userRole === "MASTER";
  const myOwnerKey = userUsername || userName;
  // Link tanpa info pemilik (mis. baru dibuat lewat POST) dianggap milik sendiri.
  const isMine = useCallback(
    (l: LinkItem) => {
      const key = ownerKeyOf(l);
      return !key || key === myOwnerKey;
    },
    [myOwnerKey]
  );
  const [data, setData] = useState<AppData>({ links: [], categories: [] });
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");

  // local (v1) archive migration
  const [localData, setLocalData] = useState<AppData | null>(null);
  const [localImporting, setLocalImporting] = useState(false);
  const [localImported, setLocalImported] = useState(false);

  // search & filter
  const [search, setSearch] = useState("");
  const [searchMs, setSearchMs] = useState(0);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filterDomain, setFilterDomain] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [filterRange, setFilterRange] = useState<RangeKey>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // form add/edit
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formUrl, setFormUrl] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formFavicon, setFormFavicon] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formTags, setFormTags] = useState("");
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [saving, setSaving] = useState(false);
  const [metaWarning, setMetaWarning] = useState("");
  const [metaPreview, setMetaPreview] = useState<MetadataResult | null>(null);

  // duplicate
  const [duplicateItem, setDuplicateItem] = useState<LinkItem | null>(null);
  const [pendingSave, setPendingSave] = useState(false);

  // category manager
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(COLOR_PALETTE[0].hex);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [editingCatColor, setEditingCatColor] = useState(COLOR_PALETTE[0].hex);
  const [catError, setCatError] = useState("");

  // delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmClearStep, setConfirmClearStep] = useState(0);
  const [clearing, setClearing] = useState(false);

  // import/export feedback
  const [importMsg, setImportMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [linksRes, catsRes] = await Promise.all([fetch("/api/links"), fetch("/api/categories")]);
      if (linksRes.status === 401 || catsRes.status === 401) {
        setLoadError("Sesi berakhir. Silakan masuk lagi.");
        return;
      }
      const linksJson = await linksRes.json();
      const catsJson = await catsRes.json();
      setData({
        links: Array.isArray(linksJson.links) ? linksJson.links : [],
        categories: Array.isArray(catsJson.categories) ? catsJson.categories : [],
      });
      setLoadError("");
    } catch {
      setLoadError("Gagal memuat data dari server. Periksa koneksi lalu muat ulang halaman.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Deteksi arsip lokal v1 di perangkat ini (untuk ditawarkan impor ke akun)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AppData;
      if (parsed && Array.isArray(parsed.links) && parsed.links.length > 0) {
        setLocalData(parsed);
      }
    } catch {}
  }, []);

  async function importLocalArchive() {
    if (!localData) return;
    setLocalImporting(true);
    try {
      const res = await fetch("/api/links/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: localData.categories, links: localData.links }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Impor gagal");
      setLocalImported(true);
      setImportMsg(
        `Arsip lokal berhasil diimpor ke akun: ${j.ditambahkan} link ditambahkan, ${j.dilewati} duplikat dilewati${j.kategoriBaru ? `, ${j.kategoriBaru} kategori baru dibuat` : ""}.`
      );
      await loadData();
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : "Impor arsip lokal gagal.");
    } finally {
      setLocalImporting(false);
    }
  }

  function clearLocalArchive() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setLocalData(null);
    setLocalImported(false);
  }

  const categoriesById = useMemo(() => {
    const map = new Map<string, Category>();
    data.categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [data.categories]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    data.links.forEach((l) => l.tags.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [data.links]);

  const allDomains = useMemo(() => {
    const s = new Set<string>();
    data.links.forEach((l) => s.add(l.domain));
    return Array.from(s).sort();
  }, [data.links]);

  // Daftar pemilik unik dari link yang termuat (untuk filter Pemilik khusus Master)
  const allOwners = useMemo(() => {
    const map = new Map<string, { key: string; label: string }>();
    data.links.forEach((l) => {
      const key = ownerKeyOf(l);
      if (key && !map.has(key)) map.set(key, { key, label: ownerLabelOf(l) });
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "id"));
  }, [data.links]);

  const showOwnerFilter = isMaster && allOwners.length > 1;

  // Bila pemilik yang sedang dipilih sudah tidak ada di data, kembalikan ke "all"
  useEffect(() => {
    if (filterOwner !== "all" && !allOwners.some((o) => o.key === filterOwner)) setFilterOwner("all");
  }, [allOwners, filterOwner]);

  const stats = useMemo(() => {
    const totalLinks = data.links.length;
    const totalCategories = data.categories.length;
    const totalTags = allTags.length;
    const mostClicked = [...data.links].sort((a, b) => b.clicks - a.clicks)[0] || null;
    const domainCount = new Map<string, number>();
    data.links.forEach((l) => domainCount.set(l.domain, (domainCount.get(l.domain) || 0) + 1));
    let topDomain = "-";
    let topDomainCount = 0;
    domainCount.forEach((v, k) => {
      if (v > topDomainCount) {
        topDomainCount = v;
        topDomain = k;
      }
    });
    return { totalLinks, totalCategories, totalTags, mostClicked, topDomain, topDomainCount };
  }, [data, allTags]);

  const filtered = useMemo(() => {
    const start = performance.now();
    let result = [...data.links];

    if (showFavoritesOnly) result = result.filter((l) => l.favorite);
    if (filterCategory === "none") result = result.filter((l) => !l.categoryId);
    else if (filterCategory !== "all") result = result.filter((l) => l.categoryId === filterCategory);
    if (filterTag !== "all") result = result.filter((l) => l.tags.includes(filterTag));
    if (filterDomain !== "all") result = result.filter((l) => l.domain === filterDomain);
    if (isMaster && filterOwner !== "all") result = result.filter((l) => ownerKeyOf(l) === filterOwner);
    if (filterRange !== "all") {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      let threshold = 0;
      if (filterRange === "today") {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        threshold = d.getTime();
      } else if (filterRange === "7d") threshold = now - 7 * day;
      else if (filterRange === "30d") threshold = now - 30 * day;
      result = result.filter((l) => new Date(l.createdAt).getTime() >= threshold);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((l) => {
        const catName = (l.categoryId ? categoriesById.get(l.categoryId)?.name.toLowerCase() : "") || "";
        return (
          l.title.toLowerCase().includes(q) ||
          l.url.toLowerCase().includes(q) ||
          l.domain.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.tags.some((t) => t.toLowerCase().includes(q)) ||
          (l.ownerUsername || "").toLowerCase().includes(q) ||
          (l.ownerName || "").toLowerCase().includes(q) ||
          catName.includes(q)
        );
      });
    }

    if (sort === "newest") result.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    else if (sort === "oldest") result.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    else if (sort === "title") result.sort((a, b) => a.title.localeCompare(b.title, "id"));
    else if (sort === "clicks") result.sort((a, b) => b.clicks - a.clicks);

    const elapsed = performance.now() - start;
    queueMicrotask(() => setSearchMs(Math.round(elapsed * 10) / 10));
    return result;
  }, [data.links, search, filterCategory, filterTag, filterDomain, filterOwner, filterRange, sort, categoriesById, showFavoritesOnly, isMaster]);

  // Link milik akun yang sedang masuk (untuk aksi ubah/hapus & zona berbahaya).
  // Untuk User biasa ini sama dengan seluruh data.links.
  const ownLinks = useMemo(() => data.links.filter(isMine), [data.links, isMine]);

  // --- Metadata fetch ---
  async function fetchMetadata(url: string) {
    if (!isValidUrl(url)) {
      setMetaWarning("URL belum valid. Contoh: https://example.com");
      return;
    }
    setFetchingMeta(true);
    setMetaWarning("");
    try {
      const res = await fetch(`/api/metadata?url=${encodeURIComponent(ensureUrl(url))}`);
      const json = (await res.json()) as MetadataResult & { error?: string };
      if (!res.ok) throw new Error(json.error || "Gagal mengambil metadata");
      setMetaPreview(json);
      setFormTitle(json.title || "");
      setFormDesc(json.description || "");
      setFormImage(json.image || "");
      setFormFavicon(json.favicon || "");
      if (json.warning) setMetaWarning(json.warning + " Anda tetap bisa menyimpan dengan judul manual.");
    } catch (e) {
      const domain = extractDomain(url);
      setFormTitle(domain);
      setFormFavicon(faviconForDomain(domain));
      setMetaWarning(e instanceof Error ? e.message : "Gagal mengambil info otomatis. Isi judul manual — tetap bisa disimpan.");
    } finally {
      setFetchingMeta(false);
    }
  }

  function resetForm() {
    setFormUrl("");
    setFormTitle("");
    setFormDesc("");
    setFormImage("");
    setFormFavicon("");
    setFormCategory(data.categories[0]?.id || "");
    setFormTags("");
    setMetaPreview(null);
    setMetaWarning("");
    setEditingId(null);
    setPendingSave(false);
    setDuplicateItem(null);
  }

  function openAdd() {
    resetForm();
    setFormCategory(data.categories[0]?.id || "");
    setShowForm(true);
  }

  function openEdit(item: LinkItem) {
    setEditingId(item.id);
    setFormUrl(item.url);
    setFormTitle(item.title);
    setFormDesc(item.description);
    setFormImage(item.image || "");
    setFormFavicon(item.favicon);
    setFormCategory(item.categoryId || "");
    setFormTags(item.tags.join(", "));
    setMetaPreview(null);
    setMetaWarning("");
    setShowForm(true);
  }

  async function doSave(force = false) {
    const url = ensureUrl(formUrl);
    if (!isValidUrl(url)) {
      setMetaWarning("URL tidak valid.");
      return;
    }
    const tags = formTags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const payload = {
      url,
      title: formTitle.trim(),
      description: formDesc.trim(),
      image: formImage,
      favicon: formFavicon,
      categoryId: formCategory || null,
      tags,
      force,
    };
    setSaving(true);
    setMetaWarning("");
    try {
      const res = editingId
        ? await fetch(`/api/links/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/links", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const j = await res.json();
      if (res.status === 409 && j.existing) {
        setDuplicateItem(j.existing as LinkItem);
        setPendingSave(true);
        return;
      }
      if (!res.ok) throw new Error(j.error || "Gagal menyimpan link.");
      const saved = j.link as LinkItem;
      setData((prev) =>
        editingId
          ? { ...prev, links: prev.links.map((l) => (l.id === saved.id ? saved : l)) }
          : { ...prev, links: [saved, ...prev.links] }
      );
      setShowForm(false);
      resetForm();
    } catch (e) {
      setMetaWarning(e instanceof Error ? e.message : "Gagal menyimpan link.");
    } finally {
      setSaving(false);
    }
  }

  async function handleOpen(item: LinkItem) {
    const mine = isMine(item);
    if (mine) {
      setData((prev) => ({
        ...prev,
        links: prev.links.map((l) => (l.id === item.id ? { ...l, clicks: l.clicks + 1 } : l)),
      }));
    }
    window.open(item.url, "_blank", "noopener,noreferrer");
    // Counter akses hanya berlaku untuk link milik sendiri (server menolak link orang lain)
    if (!mine) return;
    try {
      const res = await fetch(`/api/links/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ click: true }),
      });
      if (res.ok) {
        const j = await res.json();
        setData((prev) => ({
          ...prev,
          links: prev.links.map((l) => (l.id === item.id ? (j.link as LinkItem) : l)),
        }));
      }
    } catch {}
  }

  async function handleCopy(item: LinkItem) {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/links/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setData((prev) => ({ ...prev, links: prev.links.filter((l) => l.id !== id) }));
    } catch {
      setImportMsg("Gagal menghapus link. Silakan coba lagi.");
    }
    setDeletingId(null);
  }

  async function toggleFavorite(item: LinkItem) {
    if (!isMine(item)) return; // favorit hanya bisa diubah pada link milik sendiri
    try {
      const res = await fetch(`/api/links/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: !item.favorite }),
      });
      if (!res.ok) throw new Error();
      const j = await res.json();
      setData((prev) => ({
        ...prev,
        links: prev.links.map((l) => (l.id === item.id ? (j.link as LinkItem) : l)),
      }));
    } catch {}
  }

  // Categories CRUD (server)
  async function addCategory() {
    if (!newCatName.trim()) return;
    setCatError("");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim(), color: newCatColor }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Gagal menambah kategori.");
      setData((prev) => ({ ...prev, categories: [...prev.categories, j.category as Category] }));
      setNewCatName("");
    } catch (e) {
      setCatError(e instanceof Error ? e.message : "Gagal menambah kategori.");
    }
  }
  async function saveEditCategory() {
    if (!editingCatId || !editingCatName.trim()) return;
    setCatError("");
    try {
      const res = await fetch(`/api/categories/${editingCatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingCatName.trim(), color: editingCatColor }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Gagal mengubah kategori.");
      setData((prev) => ({
        ...prev,
        categories: prev.categories.map((c) => (c.id === editingCatId ? (j.category as Category) : c)),
      }));
      setEditingCatId(null);
    } catch (e) {
      setCatError(e instanceof Error ? e.message : "Gagal mengubah kategori.");
    }
  }
  async function deleteCategory(id: string) {
    setCatError("");
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setData((prev) => ({
        categories: prev.categories.filter((c) => c.id !== id),
        links: prev.links.map((l) => (l.categoryId === id ? { ...l, categoryId: null } : l)),
      }));
    } catch {
      setCatError("Gagal menghapus kategori. Silakan coba lagi.");
    }
  }

  // Export / Import
  function exportJSON() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    downloadBlob(blob, `arsip-link-${new Date().toISOString().slice(0, 10)}.json`);
  }
  function exportCSV() {
    const header = "Judul,URL,Domain,Kategori,Tag,Deskripsi,Jumlah Akses,Favorit,Tanggal Simpan\n";
    const rows = data.links
      .map((l) => {
        const cat = (l.categoryId ? categoriesById.get(l.categoryId)?.name : "") || "";
        const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
        return [esc(l.title), esc(l.url), esc(l.domain), esc(cat), esc(l.tags.join("; ")), esc(l.description), String(l.clicks), l.favorite ? "Ya" : "Tidak", esc(l.createdAt)].join(",");
      })
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `arsip-link-${new Date().toISOString().slice(0, 10)}.csv`);
  }
  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppData | LinkItem[];
        const incomingLinks: LinkItem[] = Array.isArray(parsed) ? parsed : parsed.links;
        const incomingCats: Category[] = !Array.isArray(parsed) && Array.isArray(parsed.categories) ? parsed.categories : [];
        if (!Array.isArray(incomingLinks)) throw new Error("Format tidak dikenal");
        // Lengkapi nama kategori untuk pencocokan di server
        const catNameById = new Map<string, string>();
        incomingCats.forEach((c) => catNameById.set(c.id, c.name));
        data.categories.forEach((c) => catNameById.set(c.id, c.name));
        const payloadLinks = incomingLinks.map((l) => ({
          ...l,
          categoryName: l.categoryId ? catNameById.get(l.categoryId) : undefined,
        }));
        const res = await fetch("/api/links/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categories: incomingCats, links: payloadLinks }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Impor gagal");
        setImportMsg(`Impor selesai: ${j.ditambahkan} link ditambahkan, ${j.dilewati} duplikat/invalid dilewati.`);
        await loadData();
      } catch {
        setImportMsg("Impor gagal: file JSON tidak valid.");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  }

  async function handleClearAll() {
    if (confirmClearStep === 0) {
      setConfirmClearStep(1);
      return;
    }
    setClearing(true);
    try {
      // Hanya link milik sendiri yang dihapus — untuk Master, link user lain
      // yang sedang tampil TIDAK ikut terhapus (server pun menolaknya).
      const ownIds = new Set(ownLinks.map((l) => l.id));
      await Promise.all(ownLinks.map((l) => fetch(`/api/links/${l.id}`, { method: "DELETE" })));
      setData((prev) => ({ ...prev, links: prev.links.filter((l) => !ownIds.has(l.id)) }));
    } catch {
      setImportMsg("Sebagian link gagal dihapus. Muat ulang halaman untuk memeriksa.");
      await loadData();
    } finally {
      setClearing(false);
      setConfirmClearStep(0);
    }
  }

  if (!loaded) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <p className="text-slate-500">Memuat arsip Anda dari server…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white">🔗</div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-slate-900">Accank Arsip Link</h1>
              <p className="text-xs text-slate-500">Simpan & temukan kembali link dalam &lt; 5 detik</p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="mr-1 hidden text-right sm:block">
              <p className="flex items-center justify-end gap-2 text-sm font-semibold leading-tight text-slate-900">
                {userName || userUsername}
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    isMaster
                      ? "border border-amber-300 bg-amber-100 text-amber-800"
                      : "border border-slate-200 bg-slate-100 text-slate-600"
                  }`}
                >
                  {isMaster ? "Master" : "User"}
                </span>
              </p>
              <p className="text-xs leading-tight text-slate-500">@{userUsername}</p>
            </div>
            {isMaster && (
              <NextLink
                href="/master"
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
              >
                Kelola User
              </NextLink>
            )}
            <button onClick={() => setShowCatManager(true)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
              Kelola Kategori
            </button>
            <button onClick={exportJSON} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">Ekspor JSON</button>
            <button onClick={exportCSV} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">Ekspor CSV</button>
            <button onClick={() => fileInputRef.current?.click()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">Impor JSON</button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
            <button onClick={openAdd} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
              + Tambah Link
            </button>
            <NextLink
              href="/ganti-sandi"
              className="rounded-lg px-2 py-2 text-sm font-medium text-slate-500 hover:text-emerald-700 hover:underline"
            >
              Ganti Sandi
            </NextLink>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {loadError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
        )}

        {/* Banner migrasi arsip lokal v1 */}
        {localData && !localImported && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-4">
            <p className="font-semibold text-amber-900">📦 Ada arsip lokal di perangkat ini</p>
            <p className="mt-1 text-sm text-amber-800">
              Ditemukan {localData.links.length} link dari versi lama (tersimpan di browser ini). Impor ke akun Anda agar
              tersimpan di server dan bisa dibuka dari perangkat apa pun. Link duplikat akan dilewati otomatis.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={importLocalArchive}
                disabled={localImporting}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {localImporting ? "Mengimpor…" : "Impor ke Akun"}
              </button>
              <button onClick={() => setLocalData(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm">
                Nanti Saja
              </button>
            </div>
          </div>
        )}
        {localData && localImported && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm text-emerald-800">
              ✅ Arsip lokal sudah diimpor ke akun. Anda boleh menghapus salinan lokal di browser ini agar tidak bingung —
              data di server tetap aman.
            </p>
            <div className="flex gap-2">
              <button onClick={clearLocalArchive} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Hapus Data Lokal</button>
              <button onClick={() => setLocalData(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">Biarkan</button>
            </div>
          </div>
        )}

        {importMsg && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span>{importMsg}</span>
            <button onClick={() => setImportMsg("")} className="font-bold">✕</button>
          </div>
        )}

        {/* Dashboard Stats */}
        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Link</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{stats.totalLinks}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Kategori</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{stats.totalCategories}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tag Unik</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{stats.totalTags}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Paling Sering Diakses</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-900" title={stats.mostClicked?.title || ""}>
              {stats.mostClicked ? stats.mostClicked.title : "-"}
            </p>
            <p className="text-xs text-slate-500">{stats.mostClicked ? `${stats.mostClicked.clicks}× dibuka` : "Belum ada data"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Domain Terbanyak</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-900">{stats.topDomain}</p>
            <p className="text-xs text-slate-500">{stats.topDomainCount ? `${stats.topDomainCount} link` : "Belum ada data"}</p>
          </div>
        </section>

        {/* Search & Filters */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari judul, URL, domain, deskripsi, tag, kategori… (langsung, tanpa tombol)"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">✕</button>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                {filtered.length} hasil • {searchMs} ms
              </span>
              <span className="hidden text-xs text-slate-400 sm:inline">Target &lt; 5 detik ✓</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
              <option value="all">Semua Kategori</option>
              <option value="none">Tanpa Kategori</option>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
              <option value="all">Semua Tag</option>
              {allTags.map((t) => (
                <option key={t} value={t}>#{t}</option>
              ))}
            </select>
            <select value={filterDomain} onChange={(e) => setFilterDomain(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
              <option value="all">Semua Domain</option>
              {allDomains.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            {showOwnerFilter && (
              <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
                <option value="all">Semua Pemilik</option>
                {allOwners.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            )}
            <select value={filterRange} onChange={(e) => setFilterRange(e.target.value as RangeKey)} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
              <option value="all">Semua Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="7d">7 Hari Terakhir</option>
              <option value="30d">30 Hari Terakhir</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="title">Judul A–Z</option>
              <option value="clicks">Paling Sering Diakses</option>
            </select>
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`rounded-lg border px-3 py-2 text-sm ${showFavoritesOnly ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-300 bg-white"}`}
            >
              ★ Favorit {showFavoritesOnly ? "Aktif" : ""}
            </button>
            <div className="ml-auto flex overflow-hidden rounded-lg border border-slate-300">
              <button onClick={() => setViewMode("grid")} className={`px-3 py-2 text-sm ${viewMode === "grid" ? "bg-emerald-600 text-white" : "bg-white"}`}>Grid</button>
              <button onClick={() => setViewMode("list")} className={`px-3 py-2 text-sm ${viewMode === "list" ? "bg-emerald-600 text-white" : "bg-white"}`}>Daftar</button>
            </div>
          </div>

          {/* Category chips quick filter */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => setFilterCategory("all")} className={`rounded-full px-3 py-1 text-xs font-medium ${filterCategory === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>
              Semua
            </button>
            {data.categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilterCategory(c.id)}
                className="rounded-full px-3 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: c.color, opacity: filterCategory === c.id || filterCategory === "all" ? 1 : 0.55 }}
              >
                {c.name} • {data.links.filter((l) => l.categoryId === c.id).length}
              </button>
            ))}
          </div>
        </section>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="text-5xl">🔗</div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              {data.links.length === 0 ? "Belum ada link tersimpan" : "Tidak ada hasil yang cocok"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {data.links.length === 0
                ? "Mulai arsipkan link pertama Anda — tempel URL, info judul & favicon akan terisi otomatis."
                : "Coba ubah kata kunci atau filter. Atau simpan link baru yang sesuai pencarian Anda."}
            </p>
            <button onClick={openAdd} className="mt-6 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
              + Tambah Link Pertama
            </button>
            {(search || filterCategory !== "all" || filterTag !== "all" || filterDomain !== "all" || filterRange !== "all" || filterOwner !== "all") && data.links.length > 0 && (
              <button
                onClick={() => { setSearch(""); setFilterCategory("all"); setFilterTag("all"); setFilterDomain("all"); setFilterRange("all"); setFilterOwner("all"); }}
                className="ml-2 mt-6 rounded-lg border border-slate-300 px-5 py-2.5 text-sm"
              >
                Reset Filter
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => {
              const cat = item.categoryId ? categoriesById.get(item.categoryId) : undefined;
              return (
                <article key={item.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                  <div className="flex items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.favicon} alt="" width={40} height={40} className="h-10 w-10 rounded-lg border border-slate-100 bg-slate-50 object-contain p-1" onError={(e) => { (e.target as HTMLImageElement).src = faviconForDomain(item.domain); }} />
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 font-semibold leading-snug text-slate-900">{item.title}</h3>
                      <p className="truncate text-xs text-emerald-700">{item.domain}</p>
                    </div>
                    {isMine(item) ? (
                      <button onClick={() => toggleFavorite(item)} title="Favorit" className={`text-lg ${item.favorite ? "text-amber-500" : "text-slate-300 hover:text-amber-400"}`}>
                        {item.favorite ? "★" : "☆"}
                      </button>
                    ) : item.favorite ? (
                      <span className="text-lg text-amber-500" title="Favorit pemiliknya">★</span>
                    ) : null}
                  </div>
                  {item.description && <p className="line-clamp-2 mt-3 text-sm text-slate-600">{item.description}</p>}
                  {item.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" className="mt-3 h-32 w-full rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {!isMine(item) && (
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-medium text-violet-700">
                        👤 {ownerLabelOf(item)}
                      </span>
                    )}
                    {cat && (
                      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white" style={{ backgroundColor: cat.color }}>{cat.name}</span>
                    )}
                    {item.tags.map((t) => (
                      <button key={t} onClick={() => setFilterTag(t)} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-700 hover:bg-slate-200">#{t}</button>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-slate-400">
                    {formatDateID(item.createdAt)} • {item.clicks}× dibuka
                  </p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                    <button onClick={() => handleOpen(item)} className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Buka ↗</button>
                    <button onClick={() => handleCopy(item)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">{copiedId === item.id ? "Tersalin ✓" : "Salin"}</button>
                    {isMine(item) && (
                      <>
                        <button onClick={() => openEdit(item)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Edit</button>
                        <button onClick={() => setDeletingId(item.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50">Hapus</button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
            {filtered.map((item) => {
              const cat = item.categoryId ? categoriesById.get(item.categoryId) : undefined;
              return (
                <div key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.favicon} alt="" width={36} height={36} className="h-9 w-9 rounded-lg border border-slate-100 object-contain p-1" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-slate-900">{item.title}</h3>
                      {isMine(item) ? (
                        <button onClick={() => toggleFavorite(item)} className={item.favorite ? "text-amber-500" : "text-slate-300"}>{item.favorite ? "★" : "☆"}</button>
                      ) : item.favorite ? (
                        <span className="text-amber-500" title="Favorit pemiliknya">★</span>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-slate-500">{item.url}</p>
                    {item.description && <p className="line-clamp-2 text-sm text-slate-600">{item.description}</p>}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {!isMine(item) && <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">👤 {ownerLabelOf(item)}</span>}
                      {cat && <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ backgroundColor: cat.color }}>{cat.name}</span>}
                      {item.tags.map((t) => (<span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px]">#{t}</span>))}
                      <span className="text-[11px] text-slate-400">{formatDateID(item.createdAt)} • {item.clicks}×</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button onClick={() => handleOpen(item)} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Buka ↗</button>
                    <button onClick={() => handleCopy(item)} className="rounded-lg border px-3 py-2 text-sm">{copiedId === item.id ? "✓" : "Salin"}</button>
                    {isMine(item) && (
                      <>
                        <button onClick={() => openEdit(item)} className="rounded-lg border px-3 py-2 text-sm">Edit</button>
                        <button onClick={() => setDeletingId(item.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600">Hapus</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Danger zone — hanya link milik akun yang sedang masuk */}
        {ownLinks.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50/60 px-4 py-3">
            <p className="text-sm text-red-700">Zona berbahaya — menghapus semua link di akun Anda tidak bisa dibatalkan.</p>
            {confirmClearStep === 0 ? (
              <button onClick={handleClearAll} className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600">Hapus semua data</button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-red-700">Yakin? Klik sekali lagi untuk konfirmasi:</span>
                <button onClick={handleClearAll} disabled={clearing} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {clearing ? "Menghapus…" : `Ya, Hapus Semua (${ownLinks.length})`}
                </button>
                <button onClick={() => setConfirmClearStep(0)} className="rounded-lg border px-3 py-2 text-sm">Batal</button>
              </div>
            )}
          </div>
        )}

        <footer className="mt-10 border-t border-slate-200 pt-6 pb-4 text-center text-xs text-slate-400">
          <p className="font-medium text-slate-500">Accank Arsip Link — Aplikasi Pengarsipan URL/Link</p>
          <p className="mt-1">Data tersimpan aman per akun di server — sinkron antarperangkat, bisa dibuka dari HP, laptop, atau perangkat apa pun setelah masuk.</p>
        </footer>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setShowForm(false)}>
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editingId ? "Edit Link" : "Tambah Link Baru"}</h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">✕</button>
            </div>

            <label className="mt-4 block text-sm font-medium text-slate-700">URL *</label>
            <div className="mt-1 flex gap-2">
              <input
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                onBlur={() => { if (formUrl && !editingId) fetchMetadata(formUrl); }}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData("text");
                  if (pasted && isValidUrl(pasted)) setTimeout(() => fetchMetadata(pasted), 100);
                }}
                placeholder="https://contoh.com/artikel-menarik"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              <button onClick={() => fetchMetadata(formUrl)} disabled={fetchingMeta || !formUrl} className="shrink-0 rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                {fetchingMeta ? "Mengambil…" : "Ambil Info Otomatis"}
              </button>
            </div>
            {metaWarning && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{metaWarning}</p>}

            {metaPreview && (
              <div className="mt-3 flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={metaPreview.favicon} alt="" className="h-10 w-10 rounded-lg bg-white object-contain p-1" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{metaPreview.title}</p>
                  <p className="line-clamp-2 text-xs text-slate-600">{metaPreview.description || "— tanpa deskripsi —"}</p>
                  <p className="text-[11px] text-emerald-700">{metaPreview.domain}</p>
                </div>
                {metaPreview.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={metaPreview.image} alt="" className="ml-auto hidden h-16 w-24 rounded-lg object-cover sm:block" />
                )}
              </div>
            )}

            <label className="mt-4 block text-sm font-medium text-slate-700">Judul</label>
            <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Judul link (terisi otomatis, bisa diedit)" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />

            <label className="mt-4 block text-sm font-medium text-slate-700">Deskripsi</label>
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={3} placeholder="Deskripsi singkat…" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Kategori</label>
                <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="">— Tanpa Kategori —</option>
                  {data.categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Tag (pisahkan koma)</label>
                <input value={formTags} onChange={(e) => setFormTags(e.target.value)} placeholder="tutorial, react, penting" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
                <p className="mt-1 text-[11px] text-slate-400">Tekan koma atau tulis dipisah koma, contoh: kerja, penting, baca-nanti</p>
              </div>
            </div>

            {/* Duplicate warning inline */}
            {duplicateItem && pendingSave && (
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
                <p className="font-semibold text-amber-900">⚠️ Link ini sudah pernah disimpan!</p>
                <p className="mt-1 text-sm text-amber-800">
                  <span className="font-medium">{duplicateItem.title}</span> — {duplicateItem.url}
                  <br />Disimpan pada {formatDateID(duplicateItem.createdAt)} • {duplicateItem.clicks}× dibuka
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => { setDuplicateItem(null); setPendingSave(false); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">Batal</button>
                  <button onClick={() => { setDuplicateItem(null); setPendingSave(false); doSave(true); }} className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white">Tetap Simpan</button>
                  <button onClick={() => { window.open(duplicateItem.url, "_blank"); setDuplicateItem(null); setPendingSave(false); setShowForm(false); }} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Buka yang Lama ↗</button>
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <button onClick={() => doSave(false)} disabled={saving} className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                {saving ? "Menyimpan…" : editingId ? "Simpan Perubahan" : "Simpan Link"}
              </button>
              <button onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {showCatManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCatManager(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Kelola Kategori</h2>
              <button onClick={() => setShowCatManager(false)} className="rounded-lg px-2 py-1 hover:bg-slate-100">✕</button>
            </div>
            {catError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{catError}</p>}
            <div className="mt-4 space-y-2">
              {data.categories.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                  <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                  {editingCatId === c.id ? (
                    <>
                      <input value={editingCatName} onChange={(e) => setEditingCatName(e.target.value)} className="min-w-0 flex-1 rounded border px-2 py-1 text-sm" />
                      <div className="flex gap-1">
                        {COLOR_PALETTE.map((col) => (
                          <button key={col.hex} onClick={() => setEditingCatColor(col.hex)} className={`h-6 w-6 rounded-full ${editingCatColor === col.hex ? "ring-2 ring-slate-900 ring-offset-1" : ""}`} style={{ backgroundColor: col.hex }} title={col.name} />
                        ))}
                      </div>
                      <button onClick={saveEditCategory} className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">Simpan</button>
                      <button onClick={() => setEditingCatId(null)} className="rounded border px-2 py-1 text-xs">Batal</button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">{c.name}</span>
                      <span className="text-xs text-slate-400">{data.links.filter((l) => l.categoryId === c.id).length} link</span>
                      <button onClick={() => { setEditingCatId(c.id); setEditingCatName(c.name); setEditingCatColor(c.color); }} className="rounded border px-2 py-1 text-xs">Edit</button>
                      <button onClick={() => { if (confirm(`Hapus kategori "${c.name}"? Link di dalamnya akan menjadi tanpa kategori.`)) deleteCategory(c.id); }} className="rounded border border-red-200 px-2 py-1 text-xs text-red-600">Hapus</button>
                    </>
                  )}
                </div>
              ))}
              {data.categories.length === 0 && <p className="text-sm text-slate-500">Belum ada kategori. Tambahkan kategori pertama Anda di bawah.</p>}
            </div>
            <div className="mt-5 border-t pt-4">
              <p className="text-sm font-semibold">Tambah Kategori Baru</p>
              <div className="mt-2 flex gap-2">
                <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nama kategori" className="flex-1 rounded-lg border px-3 py-2 text-sm" onKeyDown={(e) => e.key === "Enter" && addCategory()} />
                <button onClick={addCategory} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Tambah</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COLOR_PALETTE.map((col) => (
                  <button key={col.hex} onClick={() => setNewCatColor(col.hex)} className={`h-8 w-8 rounded-full ${newCatColor === col.hex ? "ring-2 ring-slate-900 ring-offset-2" : ""}`} style={{ backgroundColor: col.hex }} title={col.name} />
                ))}
                <span className="ml-2 self-center text-xs text-slate-500">{COLOR_PALETTE.find((c) => c.hex === newCatColor)?.name}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDeletingId(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold">Hapus link ini?</h3>
            <p className="mt-2 text-sm text-slate-600">
              {data.links.find((l) => l.id === deletingId)?.title}
            </p>
            <p className="mt-1 text-xs text-slate-400">Tindakan ini tidak bisa dibatalkan.</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => handleDelete(deletingId)} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">Ya, Hapus</button>
              <button onClick={() => setDeletingId(null)} className="flex-1 rounded-lg border px-4 py-2 text-sm">Batal</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
