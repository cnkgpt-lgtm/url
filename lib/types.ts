export interface Category {
  id: string;
  name: string;
  color: string; // hex
}

export interface LinkItem {
  id: string;
  url: string;
  normalizedUrl: string;
  title: string;
  description: string;
  image?: string;
  favicon: string;
  domain: string;
  categoryId: string;
  tags: string[];
  clicks: number;
  favorite: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface AppData {
  links: LinkItem[];
  categories: Category[];
}

export const COLOR_PALETTE = [
  { name: "Emerald", hex: "#059669" },
  { name: "Biru", hex: "#2563eb" },
  { name: "Ungu", hex: "#7c3aed" },
  { name: "Merah Muda", hex: "#db2777" },
  { name: "Oranye", hex: "#ea580c" },
  { name: "Kuning", hex: "#ca8a04" },
  { name: "Teal", hex: "#0d9488" },
  { name: "Abu", hex: "#64748b" },
];

export const STORAGE_KEY = "arsip-link-v1";
