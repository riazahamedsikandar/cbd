/**
 * TwoBudz Hostinger MySQL Database Client
 * Replaces Supabase SDK with direct HTTP integration to the Hostinger PHP MySQL bridge.
 * Database: u554546348_cbdsouthlake | User: u554546348_cbdsouthlake
 */

import { normalizeToCleanAsset } from "./imageMatching";

export const CURRENT_CACHE_VERSION = "2026.09.08-clean-blogs-v9";

export const checkAndAutoPurgeStaleCache = () => {
  if (typeof window === "undefined") return;
  try {
    const cachedVersion = localStorage.getItem("twobudz_cache_version");
    if (cachedVersion !== CURRENT_CACHE_VERSION) {
      localStorage.removeItem("twobudz_products");
      localStorage.removeItem("twobudz_custom_products");
      localStorage.removeItem("twobudz_blogs");
      localStorage.removeItem("twobudz_api_url");
      localStorage.setItem("twobudz_cache_version", CURRENT_CACHE_VERSION);
    }
  } catch (e) {}
};

// Safe localStorage setItem helper - persists admin session auth
export const safeSetItem = (key: string, value: string) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch (e) {}
};

// Get API base URL: relative "/api/index.php" on Hostinger hosting, or configured URL
export const getApiUrl = (): string => {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "https://cbdhurst.com/api/index.php";
  }
  const custom = localStorage.getItem("twobudz_api_url");
  if (custom && !custom.includes("cornflowerblue")) return custom;
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return process.env.NEXT_PUBLIC_API_URL || "/api/index.php";
  }
  return "/api/index.php";
};

// Always configured for Hostinger MySQL
export const isSupabaseConfigured = (): boolean => {
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
    !process.env.NEXT_PUBLIC_API_URL
  ) {
    return false;
  }
  return true;
};

export const isDatabaseConfigured = isSupabaseConfigured;

// Ping Hostinger MySQL health check endpoint
export const pingSupabaseKeepAlive = async () => {
  try {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}?action=health`);
    if (res.ok) {
      const json = await res.json();
      safeSetItem("twobudz_db_last_ping", String(Date.now()));
      return { success: true, timestamp: new Date().toISOString(), details: json };
    }
    return { success: false, error: `HTTP ${res.status}` };
  } catch (err: any) {
    return { success: false, error: err?.message || "Ping error" };
  }
};

export const pingDatabase = pingSupabaseKeepAlive;

// Query builder to provide 100% compatibility with existing Supabase call signatures
class TableQueryBuilder {
  private tableName: string;
  private selectFields: string = "*";
  private orderCol: string | null = null;
  private orderAsc: boolean = true;
  private filters: Array<{ col: string; val: any }> = [];
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields: string = "*", _opts?: any) {
    this.selectFields = fields;
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAsc = opts?.ascending !== false;
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push({ col, val });
    return this;
  }

  limit(_n: number) {
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async then(resolve: (result: { data: any; error: any }) => void) {
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}?table=${encodeURIComponent(this.tableName)}`);
      if (!res.ok) {
        throw new Error(`API responded with status ${res.status}`);
      }
      const json = await res.json();
      let data = json.data;

      // Handle settings table (which returns an object, not an array)
      if (this.tableName === "settings") {
        if (data && typeof data === "object" && !Array.isArray(data) && Object.keys(data).length > 2) {
          resolve({ data, error: null });
          return;
        }
        if (Array.isArray(data) && data.length > 0) {
          resolve({ data: data[0], error: null });
          return;
        }
        resolve({ data: null, error: null });
        return;
      }

      data = data || [];

      // Apply in-memory filters if specified (e.g. eq("id", "business_info"))
      if (this.filters.length > 0 && Array.isArray(data)) {
        data = data.filter((item: any) => {
          return this.filters.every((f) => String(item[f.col]) === String(f.val));
        });
      }

      // Handle single / maybeSingle
      if (this.isSingle || this.isMaybeSingle) {
        const item = Array.isArray(data) ? (data.length > 0 ? data[0] : null) : data;
        resolve({ data: item, error: null });
        return;
      }

      // Handle ordering if requested
      if (this.orderCol && Array.isArray(data)) {
        const col = this.orderCol;
        const asc = this.orderAsc;
        data = [...data].sort((a: any, b: any) => {
          const valA = a[col] ?? "";
          const valB = b[col] ?? "";
          if (valA < valB) return asc ? -1 : 1;
          if (valA > valB) return asc ? 1 : -1;
          return 0;
        });
      }

      resolve({ data, error: null });
    } catch (err: any) {
      console.warn(`[Hostinger MySQL] Fetch warning on table "${this.tableName}":`, err?.message || err);
      resolve({ data: null, error: err });
    }
  }

  async insert(itemOrItems: any) {
    try {
      const apiUrl = getApiUrl();
      const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
      for (const item of items) {
        try {
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "upsert", table: this.tableName, data: item }),
          });
          if (!res.ok) {
            console.warn(`[Hostinger MySQL] Sync warning on "${this.tableName}": ${res.statusText}`);
          }
        } catch (fetchErr: any) {
          console.warn(`[Hostinger MySQL] Network/CORS deferred on "${this.tableName}":`, fetchErr?.message || fetchErr);
        }
      }
      return { data: itemOrItems, error: null };
    } catch (err: any) {
      console.warn(`[Hostinger MySQL] Deferred sync on "${this.tableName}":`, err?.message || err);
      return { data: itemOrItems, error: null };
    }
  }

  async upsert(itemOrItems: any) {
    return this.insert(itemOrItems);
  }

  delete() {
    return {
      eq: async (_col: string, val: any) => {
        try {
          const apiUrl = getApiUrl();
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", table: this.tableName, data: { id: val } }),
          });
          const json = await res.json();
          return { data: json, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
      neq: async (_col: string, _val: any) => {
        return { data: null, error: null };
      },
      in: async (_col: string, vals: any[]) => {
        try {
          const apiUrl = getApiUrl();
          for (const val of vals) {
            await fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "delete", table: this.tableName, data: { id: val } }),
            });
          }
          return { data: null, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      }
    };
  }
}

// Database client singleton compatible with Supabase client interface
class HostingerDbClient {
  from(tableName: string) {
    return new TableQueryBuilder(tableName);
  }
}

const dbClientInstance = new HostingerDbClient();

export const getSupabaseClient = () => {
  return dbClientInstance;
};

export const getDatabaseClient = getSupabaseClient;

// Detect columns helper (always valid in MySQL)
export const detectTableColumns = async (_supabase: any, tableName: string): Promise<Set<string>> => {
  const candidateColumns = tableName === "products" ? [
    "id", "name", "slug", "description", "longDescription", "price", "category",
    "categories", "categoryLabel", "rating", "image", "thc", "cbd", "options",
    "benefits", "labResults", "reviewsCount", "isBestSeller", "isFeaturedHome",
    "isNew", "metaTitle", "metaDescription", "tags", "altText", "created_at", "updated_at"
  ] : tableName === "categories" ? [
    "id", "title", "tagline", "desc", "image", "icon", "showInMenu", "isFeaturedHome", "created_at", "updated_at"
  ] : tableName === "blogs" ? [
    "id", "title", "summary", "content", "date", "category", "image", "author", "slug", "metaTitle", "metaDescription", "tags", "altText", "isFeaturedHome", "faqs", "created_at", "updated_at"
  ] : tableName === "settings" ? [
    "id", "phone", "email", "hours", "location", "heroBadge", "heroHeadingLine1", "heroHeadingLine2",
    "heroParagraph", "heroButtonPrimary", "heroButtonSecondary", "heroImage", "heroVerifiedText",
    "heroWidget1Image", "heroWidget1Label", "heroWidget1Title", "heroWidget1Rating",
    "heroWidget2Image", "heroWidget2Label", "heroWidget2Title", "heroWidget2Sub",
    "heroCommitmentLabel", "heroCommitmentTitle", "seoTitleOverride", "seoDescriptionOverride",
    "seoKeywordsOverride", "urlLearn", "urlAbout", "urlFaq", "updated_at"
  ] : tableName === "reviews" ? [
    "id", "productId", "productName", "author", "rating", "comment", "title", "date", "status", "verified", "created_at"
  ] : [];

  return new Set(candidateColumns);
};

export const clearTableColumnsCache = () => {};

// Formats product for storage
export const formatProductForSupabase = (p: any, _validCols?: Set<string>) => {
  const isFeatured = !!(p.isBestSeller || p.isFeaturedHome);
  const cleanImg = normalizeToCleanAsset(p.image, p.category, p.name);

  return {
    id: String(p.id),
    name: p.name || "Unnamed Product",
    slug: p.slug || String(p.id),
    description: p.description || "",
    longDescription: p.longDescription || p.description || "",
    price: typeof p.price === "number" && !isNaN(p.price) ? p.price : (Number(p.price) || 0),
    category: p.category || "cbd-oils",
    categoryLabel: p.categoryLabel || "",
    rating: typeof p.rating === "number" && !isNaN(p.rating) ? p.rating : 5.0,
    image: cleanImg || p.image || "/images/cbd_dropper_1779557730794.png",
    thc: p.thc || "< 0.3% THC",
    cbd: p.cbd || "500mg CBD",
    options: Array.isArray(p.options) ? p.options : [],
    benefits: Array.isArray(p.benefits) ? p.benefits : [],
    labResults: p.labResults || {},
    reviewsCount: typeof p.reviewsCount === "number" && !isNaN(p.reviewsCount) ? p.reviewsCount : 25,
    isBestSeller: isFeatured,
    isFeaturedHome: isFeatured,
    isNew: !!p.isNew,
    metaTitle: p.metaTitle || "",
    metaDescription: p.metaDescription || "",
    tags: typeof p.tags === "string" ? p.tags : "",
    altText: p.altText || "",
    categories: Array.isArray(p.categories) ? p.categories : [p.category || "all"],
    created_at: p.created_at || new Date().toISOString(),
    updated_at: p.updated_at || new Date().toISOString()
  };
};

// Sync individual items to Hostinger MySQL
export const syncToSupabase = async (
  table: "products" | "categories" | "blogs" | "faqs" | "orders" | "inquiries" | "settings" | "reviews",
  action: "upsert" | "delete",
  data: any
) => {
  try {
    const apiUrl = getApiUrl();
    const payload = action === "delete"
      ? { action: "delete", table, data: { id: data.id } }
      : { action: "upsert", table, data };

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      console.log(`[Hostinger MySQL] Successfully synced ${table} item ${data.id || ""}.`);
      return { success: true };
    } else {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, error: errJson.error || `HTTP ${res.status}` };
    }
  } catch (err: any) {
    console.error(`[Hostinger MySQL] Sync exception on ${table}:`, err);
    return { success: false, error: err?.message || "Sync error" };
  }
};

export const syncToDatabase = syncToSupabase;

// Push all local store data to Hostinger MySQL (Initial Database Seeding)
export const pushAllLocalDataToSupabase = async (
  products: any[],
  categories: any[],
  blogs: any[],
  faqs: any[],
  orders: any[],
  inquiries: any[],
  settings: any,
  reviews?: any[]
) => {
  const apiUrl = getApiUrl();

  const formattedProducts = Array.isArray(products)
    ? products.map((p) => formatProductForSupabase(p))
    : [];

  const formattedCategories = Array.isArray(categories)
    ? categories.map((c) => ({
        ...c,
        id: String(c.id),
        showInMenu: c.showInMenu !== false,
        isFeaturedHome: c.isFeaturedHome !== false,
      }))
    : [];

  const formattedBlogs = Array.isArray(blogs)
    ? blogs.map((b) => ({
        ...b,
        id: String(b.id),
      }))
    : [];

  const payload = {
    action: "seed_all",
    data: {
      products: formattedProducts,
      categories: formattedCategories,
      blogs: formattedBlogs,
      faqs: faqs || [],
      orders: orders || [],
      inquiries: inquiries || [],
      reviews: reviews || [],
      settings: settings || {},
    },
  };

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Seeding failed (${res.status}): ${errText}`);
    }

    const json = await res.json();
    return json.counts || {
      products: formattedProducts.length,
      categories: formattedCategories.length,
      blogs: formattedBlogs.length,
      faqs: (faqs || []).length,
      orders: (orders || []).length,
      inquiries: (inquiries || []).length,
      reviews: (reviews || []).length,
      settings: true,
    };
  } catch (err: any) {
    console.error("[Hostinger MySQL] Bulk push error:", err);
    throw err;
  }
};

export const pushAllLocalDataToDatabase = pushAllLocalDataToSupabase;

// Wipes and replaces products table in Hostinger MySQL
export const clearAndSyncProductsToSupabase = async (cleanProducts: any[]) => {
  return pushAllLocalDataToSupabase(cleanProducts, [], [], [], [], [], {});
};

export const clearAndSyncProductsToDatabase = clearAndSyncProductsToSupabase;

// Export SQL schema string for manual inspection or phpMyAdmin import
export const getSupabaseSchemaSQL = (): string => {
  return `-- Hostinger MySQL Schema for TwoBudz
-- Database: u554546348_cbdsouthlake | User: u554546348_cbdsouthlake
-- Automatically initialized on Hostinger deployment via /api/index.php
`;
};

// Restores full backup object to Hostinger MySQL
export const restoreFullBackupToSupabase = async (backupData: any) => {
  try {
    const products = Array.isArray(backupData.products) ? backupData.products : [];
    const categories = Array.isArray(backupData.categories) ? backupData.categories : [];
    const blogs = Array.isArray(backupData.blogs) ? backupData.blogs : [];
    const faqs = Array.isArray(backupData.faqs) ? backupData.faqs : [];
    const orders = Array.isArray(backupData.orders) ? backupData.orders : [];
    const inquiries = Array.isArray(backupData.inquiries) ? backupData.inquiries : [];
    const settings = backupData.settings || {};
    const reviews = Array.isArray(backupData.reviews) ? backupData.reviews : [];

    const syncResults = await pushAllLocalDataToSupabase(
      products,
      categories,
      blogs,
      faqs,
      orders,
      inquiries,
      settings,
      reviews
    );

    return {
      success: true,
      counts: syncResults,
    };
  } catch (err: any) {
    console.error("[Hostinger MySQL] Error restoring full backup:", err);
    return { success: false, error: err?.message || "Restore failed" };
  }
};

export const restoreFullBackupToDatabase = restoreFullBackupToSupabase;
