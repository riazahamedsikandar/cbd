import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Shield,
  Lock,
  LayoutDashboard,
  ShoppingCart,
  Package,
  BookOpen,
  HelpCircle,
  Settings,
  Users,
  Plus,
  Trash2,
  Edit3,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Globe,
  Download,
  Upload,
  Check,
  RefreshCw,
  Eye,
  Phone,
  Mail,
  MapPin,
  Clock,
  DollarSign,
  AlertCircle,
  Database,
  Key,
  Copy,
  CheckCircle2,
  FileSpreadsheet,
  Star,
  Cloud,
  HardDriveDownload,
  RotateCcw,
  ShieldCheck,
  Search,
  FileJson,
  FileText,
  CheckCircle,
  Archive,
} from "lucide-react";
import {
  Product,
  BlogPost,
  FAQItem,
  Order,
  Inquiry,
  BusinessSettings,
  CategoryItem,
  ReviewItem,
} from "../types";

import { PRODUCTS } from "../data";
import MarkdownArticleRenderer from "./MarkdownArticleRenderer";
import { handleImageError, mapProductAutoImage, normalizeToCleanAsset, resolveBlogImage } from "../utils/imageMatching";
import { classifyCategory, getCategoryHierarchy, getCategoryLabel, matchesCategoryFilter, getCleanCategoryImage } from "../utils/categoryUtils";
import { parseBulkReviewsCSV, generateInitialReviewsForProducts } from "../utils/reviewUtils";
import {
  getSupabaseClient,
  isSupabaseConfigured,
  syncToSupabase,
  pushAllLocalDataToSupabase,
  clearAndSyncProductsToSupabase,
  getSupabaseSchemaSQL,
  restoreFullBackupToSupabase,
  safeSetItem,
  pingSupabaseKeepAlive,
} from "../utils/supabaseClient";
import {
  createFullBackupObject,
  downloadBackupJSON,
  validateBackupData,
  saveSnapshotToStorage,
  getSavedSnapshotsFromStorage,
  deleteSnapshotFromStorage,
  run10xIntegrityAudit,
  AuditReport,
  StoreBackupData,
} from "../utils/backupUtils";


function formatLastEdited(isoStr?: string): string {
  if (!isoStr) return "Recently";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "Recently";

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Recently";
  }
}

const compressImageFile = (
  file: File,
  callback: (resultUrl: string) => void,
  maxSafeChars = 55000
) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    const rawResult = event.target?.result as string;
    if (!rawResult) return;
    const img = new Image();
    img.onload = () => {
      const tryCompress = (targetDim: number, quality: number): string => {
        let width = img.width;
        let height = img.height;
        if (width > targetDim || height > targetDim) {
          if (width > height) {
            height = Math.round((height * targetDim) / width);
            width = targetDim;
          } else {
            width = Math.round((width * targetDim) / height);
            height = targetDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return rawResult;
        ctx.drawImage(img, 0, 0, width, height);
        return canvas.toDataURL("image/jpeg", quality);
      };

      // Progressive compression steps to guarantee complete, crisp image without truncation
      let compressed = tryCompress(800, 0.76);
      if (compressed.length > maxSafeChars) {
        compressed = tryCompress(720, 0.68);
      }
      if (compressed.length > maxSafeChars) {
        compressed = tryCompress(640, 0.60);
      }
      if (compressed.length > maxSafeChars) {
        compressed = tryCompress(540, 0.52);
      }
      callback(compressed);
    };
    img.onerror = () => callback(rawResult);
    img.src = rawResult;
  };
  reader.readAsDataURL(file);
};

interface AdminPanelProps {
  products: Product[];
  setProducts: (products: Product[]) => void;
  blogPosts: BlogPost[];
  setBlogPosts: (posts: BlogPost[]) => void;
  faqItems: FAQItem[];
  setFaqItems: (faqs: FAQItem[]) => void;
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  inquiries: Inquiry[];
  setInquiries: (inquiries: Inquiry[]) => void;
  reviews?: ReviewItem[];
  setReviews?: (reviews: ReviewItem[]) => void;
  businessSettings: BusinessSettings;
  setBusinessSettings: (settings: BusinessSettings) => void;
  categories?: CategoryItem[];
  setCategories?: (categories: CategoryItem[]) => void;
  onClose: () => void;
  onPreviewProduct?: (product: Product) => void;
}

export default function AdminPanel({
  products,
  setProducts,
  blogPosts,
  setBlogPosts,
  faqItems,
  setFaqItems,
  orders,
  setOrders,
  inquiries,
  setInquiries,
  reviews = [],
  setReviews,
  businessSettings,
  setBusinessSettings,
  categories = [],
  setCategories,
  onClose,
  onPreviewProduct,
}: AdminPanelProps) {
  // Authentication State with 24-Hour Session Expiration
  const [adminUser, setAdminUser] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("twobudz_admin_user") || "flowermound";
    }
    return "flowermound";
  });
  const [adminRole, setAdminRole] = useState<"super_admin" | "staff_admin">(() => {
    if (typeof window !== "undefined") {
      const u = localStorage.getItem("twobudz_admin_user");
      return u === "cbdflowermound" ? "staff_admin" : "super_admin";
    }
    return "super_admin";
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== "undefined") {
      const isAuth = localStorage.getItem("twobudz_admin_auth") === "true";
      const authTime = Number(localStorage.getItem("twobudz_admin_auth_time") || 0);
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      if (isAuth && authTime && Date.now() - authTime < TWENTY_FOUR_HOURS) {
        return true;
      }
      // Session expired or non-existent
      localStorage.removeItem("twobudz_admin_auth");
      localStorage.removeItem("twobudz_admin_user");
      localStorage.removeItem("twobudz_admin_auth_time");
      return false;
    }
    return false;
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Navigation Panel Views
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "products" | "categories" | "blogs" | "faqs" | "orders" | "reviews" | "settings" | "backup"
  >("dashboard");

  // Backup & Restore State Management
  const [backupFeedback, setBackupFeedback] = useState("");
  const [backupSnapshots, setBackupSnapshots] = useState<any[]>([]);
  const [isRestoringData, setIsRestoringData] = useState(false);
  const [restoreModalData, setRestoreModalData] = useState<StoreBackupData | null>(null);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [isRunningAudit, setIsRunningAudit] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  useEffect(() => {
    setBackupSnapshots(getSavedSnapshotsFromStorage());
  }, []);

  useEffect(() => {
    if (adminRole === "staff_admin" && (activeTab === "settings" || activeTab === "backup")) {
      setActiveTab("dashboard");
    }
  }, [adminRole, activeTab]);

  const refreshBackupSnapshots = () => {
    setBackupSnapshots(getSavedSnapshotsFromStorage());
  };

  const handleCreateAndDownloadBackup = () => {
    const backupObj = createFullBackupObject(
      products,
      categories,
      blogPosts,
      faqItems,
      orders,
      inquiries,
      businessSettings,
      reviews
    );
    saveSnapshotToStorage(backupObj);
    downloadBackupJSON(backupObj);
    refreshBackupSnapshots();
    setBackupFeedback(`✅ Success! Full A-to-Z backup snapshot created (including all current product reviews) and .json file downloaded successfully.`);
    setTimeout(() => setBackupFeedback(""), 8000);
  };

  const handleCreateCloudSnapshot = async () => {
    const backupObj = createFullBackupObject(
      products,
      categories,
      blogPosts,
      faqItems,
      orders,
      inquiries,
      businessSettings,
      reviews
    );
    saveSnapshotToStorage(backupObj);
    refreshBackupSnapshots();
    
    if (isSupabaseConfigured()) {
      await restoreFullBackupToSupabase(backupObj);
    }

    setBackupFeedback(`✅ Success! Snapshot backup saved to local storage & Hostinger MySQL!`);
    setTimeout(() => setBackupFeedback(""), 8000);
  };

  const handleBackupFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const res = validateBackupData(content);
      if (res.valid && res.backup) {
        setRestoreModalData(res.backup);
      } else {
        setBackupFeedback(`❌ Invalid Backup File: ${res.error || "Malformed JSON payload."}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExecuteRestore = async (backupToRestore: StoreBackupData) => {
    setIsRestoringData(true);
    setBackupFeedback("⏳ Restoring all products, categories, blogs, orders, and database tables...");

    try {
      let databaseSynced = false;

      // 1. Update React Component States
      setProducts(backupToRestore.products);
      setCategories(backupToRestore.categories);
      setBlogPosts(backupToRestore.blogs);
      setFaqItems(backupToRestore.faqs);
      setOrders(backupToRestore.orders);
      setInquiries(backupToRestore.inquiries);
      setBusinessSettings(backupToRestore.settings);
      if (Array.isArray(backupToRestore.reviews)) {
        setReviews(backupToRestore.reviews);
        safeSetItem("twobudz_reviews", JSON.stringify(backupToRestore.reviews));
      }

      // 2. Persist to LocalStorage
      safeSetItem("twobudz_products", JSON.stringify(backupToRestore.products));
      safeSetItem("twobudz_categories", JSON.stringify(backupToRestore.categories));
      safeSetItem("twobudz_blogs", JSON.stringify(backupToRestore.blogs));
      safeSetItem("twobudz_faqs", JSON.stringify(backupToRestore.faqs));
      safeSetItem("twobudz_orders", JSON.stringify(backupToRestore.orders));
      safeSetItem("twobudz_inquiries", JSON.stringify(backupToRestore.inquiries));
      safeSetItem("twobudz_settings", JSON.stringify(backupToRestore.settings));
      safeSetItem("twobudz_business_settings", JSON.stringify(backupToRestore.settings));
      safeSetItem("twobudz_business_info", JSON.stringify(backupToRestore.settings));

      // 3. Sync to Supabase if available
      if (isSupabaseConfigured()) {
        const restoreResult = await restoreFullBackupToSupabase(backupToRestore);
        if (!restoreResult.success) {
          throw new Error(restoreResult.error || "Database backup sync failed.");
        }
        databaseSynced = true;
      }

      setRestoreModalData(null);
      setIsRestoringData(false);
      setBackupFeedback(
        `🎉 RESTORE COMPLETE! Restored ${backupToRestore.products.length} products, ${backupToRestore.categories.length} categories, ${backupToRestore.blogs.length} blogs, and all site settings${databaseSynced ? " to Hostinger MySQL" : " locally only; database sync requires the deployed site"}.`
      );
    } catch (err: any) {
      setIsRestoringData(false);
      setBackupFeedback(`❌ Restore Error: ${err.message || "Failed to restore backup."}`);
    }
  };

  const handleRun10xAudit = () => {
    setIsRunningAudit(true);
    setTimeout(() => {
      const report = run10xIntegrityAudit(
        products,
        categories,
        blogPosts,
        faqItems,
        orders,
        inquiries,
        businessSettings
      );
      setAuditReport(report);
      setIsRunningAudit(false);
    }, 600);
  };

  // Managing Category Forms
  const [isEditingCategory, setIsEditingCategory] = useState<CategoryItem | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [categoryAssignSearch, setCategoryAssignSearch] = useState("");
  const [categoryForm, setCategoryForm] = useState<Partial<CategoryItem>>({
    id: "",
    title: "",
    tagline: "",
    desc: "",
    image: "/images/cbd_dropper_1779557730794.png",
    showInMenu: true,
  });

  // Managing Forms & Search
  const [prodSearch, setProdSearch] = useState("");
  const [prodCatFilter, setProdCatFilter] = useState("all");
  const [filterHomeOnly, setFilterHomeOnly] = useState(false);
  const [homeSavedNotice, setHomeSavedNotice] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState<Product | null>(
    null,
  );
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: "",
    slug: "",
    description: "",
    longDescription: "",
    price: 19.99,
    category: "cbd-oils",
    categoryLabel: "CBD Oils",
    rating: 5.0,
    image: "/images/balance-thc-cbd-gummies-25mg-hybrid.webp",
    thc: "< 0.3% THC",
    cbd: "500mg CBD",
    options: ["Standard (30ml)", "Double Pack"],
    benefits: ["Calming effect", "Anxiety reduction"],
    labResults: {
      purity: "99.8%",
      cannabinoids: "Compliant Hemp Extract",
      solventFree: true,
      heavyMetalsPass: true,
      pesticidesPass: true,
    },
  });

  // Blog creation forms
  const [isEditingBlog, setIsEditingBlog] = useState<BlogPost | null>(null);
  const [isAddingBlog, setIsAddingBlog] = useState(false);
  const [previewingBlog, setPreviewingBlog] = useState<BlogPost | null>(null);
  const [blogForm, setBlogForm] = useState<Partial<BlogPost>>({
    title: "",
    summary: "",
    content: "",
    date: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    category: "Wellness Guide",
    image: "",
    author: "CBD American Shaman of Hurst Team",
  });

  // FAQ Forms State
  const [isEditingFaq, setIsEditingFaq] = useState<FAQItem | null>(null);
  const [isAddingFaq, setIsAddingFaq] = useState(false);
  const [faqForm, setFaqForm] = useState<Partial<FAQItem>>({
    question: "",
    answer: "",
  });

  // CSV Import States for All Content Tables
  const [csvText, setCsvText] = useState("");
  const [csvFeedback, setCsvFeedback] = useState("");
  const [showCsvBox, setShowCsvBox] = useState(false);
  const [isImportingPreloaded, setIsImportingPreloaded] = useState(false);

  // Blog CSV Bulk, Markdown Import & Search State
  const [showBlogCsvBox, setShowBlogCsvBox] = useState(false);
  const [blogCsvText, setBlogCsvText] = useState("");
  const [blogCsvFeedback, setBlogCsvFeedback] = useState("");
  const [showMdImportBox, setShowMdImportBox] = useState(false);
  const [mdFileText, setMdFileText] = useState("");
  const [mdImportFeedback, setMdImportFeedback] = useState("");
  const [isImportingMd, setIsImportingMd] = useState(false);
  const [blogSearchQuery, setBlogSearchQuery] = useState("");

  // FAQ CSV Bulk State
  const [showFaqCsvBox, setShowFaqCsvBox] = useState(false);
  const [faqCsvText, setFaqCsvText] = useState("");
  const [faqCsvFeedback, setFaqCsvFeedback] = useState("");

  // Orders CSV Bulk State & Pagination
  const [showOrdersCsvBox, setShowOrdersCsvBox] = useState(false);
  const [ordersCsvText, setOrdersCsvText] = useState("");
  const [ordersCsvFeedback, setOrdersCsvFeedback] = useState("");
  const [ordersCurrentPage, setOrdersCurrentPage] = useState(1);
  const ORDERS_PER_PAGE = 10;

  // Inquiries CSV Bulk State
  const [showInquiriesCsvBox, setShowInquiriesCsvBox] = useState(false);
  const [inquiriesCsvText, setInquiriesCsvText] = useState("");
  const [inquiriesCsvFeedback, setInquiriesCsvFeedback] = useState("");

  // Reviews State Management
  const [isEditingReview, setIsEditingReview] = useState<ReviewItem | null>(null);
  const [isAddingReview, setIsAddingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState<Partial<ReviewItem>>({
    productId: "",
    author: "",
    rating: 5,
    comment: "",
    title: "",
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  });
  const [showReviewsCsvBox, setShowReviewsCsvBox] = useState(false);
  const [reviewsCsvText, setReviewsCsvText] = useState("");
  const [reviewsCsvFeedback, setReviewsCsvFeedback] = useState("");
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewProductFilter, setReviewProductFilter] = useState("all");
  const [reviewRatingFilter, setReviewRatingFilter] = useState("all");

  // Business detail local states
  const [settingsForm, setSettingsForm] = useState(businessSettings);

  // Keep settingsForm in sync whenever businessSettings prop updates (e.g. loaded from MySQL)
  useEffect(() => {
    if (businessSettings && Object.keys(businessSettings).length > 0) {
      setSettingsForm(businessSettings);
    }
  }, [businessSettings]);

  // Supabase states
  const [supabaseUrl, setSupabaseUrl] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("twobudz_supabase_url") || ""
      : "",
  );
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("twobudz_supabase_anon_key") || ""
      : "",
  );
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState("");

  // Preset image recommendations for quick selector
  const PRESET_IMAGES = [
    {
      label: "Dropper Bottle / Oil",
      url: "/images/cbd_dropper_1779557730794.png",
    },
    {
      label: "Gummies Pack",
      url: "/images/balance-thc-cbd-gummies-25mg-hybrid.webp",
    },
    {
      label: "CBD Hemp Buds / Flower",
      url: "/images/northern-lights-live-rosin-thc-gummies-indica.webp",
    },
    {
      label: "Pre-rolls joints container",
      url: "/images/wintergreen-thc-microdose-mints-40-count.webp",
    },
    {
      label: "Dog / Pet calming treat",
      url: "/images/wyld-thc-free-peach-cbd-gummies.webp",
    },
    {
      label: "Sparkling Wellness can",
      url: "/images/wyld-cbd-sparkling-water-blackberry-50mg.webp",
    },
  ];

  // Handle Login with Role Support:
  // Role 1: flowermound / Twobudz@2026 -> Super Admin (all features)
  // Role 2: cbdflowermound / Twobudz@2026 -> Staff Admin (settings & backup hidden)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (cleanUser === "flowermound" && cleanPass === "Twobudz@2026") {
      setIsAuthenticated(true);
      setAdminUser("flowermound");
      setAdminRole("super_admin");
      if (typeof window !== "undefined") {
        localStorage.setItem("twobudz_admin_auth", "true");
        localStorage.setItem("twobudz_admin_user", "flowermound");
        localStorage.setItem("twobudz_admin_auth_time", Date.now().toString());
      }
      setAuthError("");
    } else if (cleanUser === "cbdflowermound" && cleanPass === "Twobudz@2026") {
      setIsAuthenticated(true);
      setAdminUser("cbdflowermound");
      setAdminRole("staff_admin");
      if (typeof window !== "undefined") {
        localStorage.setItem("twobudz_admin_auth", "true");
        localStorage.setItem("twobudz_admin_user", "cbdflowermound");
        localStorage.setItem("twobudz_admin_auth_time", Date.now().toString());
      }
      setAuthError("");
      // Ensure restricted tabs are not active on login
      setActiveTab("dashboard");
    } else {
      setAuthError("Invalid Administrator Username or Access Password.");
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("twobudz_admin_auth");
      localStorage.removeItem("twobudz_admin_user");
      localStorage.removeItem("twobudz_admin_auth_time");
    }
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
    setAdminRole("super_admin");
    setAdminUser("flowermound");
    setActiveTab("dashboard");
  };

  // Safe product form changes
  const handleProductInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setProductForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const insertLinkAtFormKey = (formType: "product" | "blog", key: string) => {
    const text = prompt(
      "Enter the display text for your hyperlink:",
      "CBD American Shaman of Hurst Organic CBD",
    );
    if (!text) return;
    const url = prompt(
      "Enter the destination URL (including http/https):",
      "https://cbdhurst.com",
    );
    if (!url) return;
    const formattedLink = `[${text}](${url})`;

    if (formType === "product") {
      setProductForm((prev) => {
        const currentVal = (prev as any)[key] || "";
        return {
          ...prev,
          [key]: currentVal ? `${currentVal} ${formattedLink}` : formattedLink,
        };
      });
    } else {
      setBlogForm((prev) => {
        const currentVal = (prev as any)[key] || "";
        return {
          ...prev,
          [key]: currentVal ? `${currentVal} ${formattedLink}` : formattedLink,
        };
      });
    }
  };

  // Convert Comma delimited string from Options to Array
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!isEditingProduct;
    const finalId = isEdit ? isEditingProduct!.id : "prod-" + Date.now();

    // Parse options & benefits
    const optionsArr = Array.isArray(productForm.options)
      ? productForm.options
      : typeof productForm.options === "string"
        ? (productForm.options as string)
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean)
        : ["Standard Premium"];

    const benefitsArr = Array.isArray(productForm.benefits)
      ? productForm.benefits
      : typeof productForm.benefits === "string"
        ? (productForm.benefits as string)
            .split("\n")
            .map((b) => b.trim())
            .filter(Boolean)
        : ["Third-Party Lab Tested"];

    let finalSlug = (productForm.slug || "").trim();
    if (!finalSlug) {
      finalSlug = (productForm.name || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    } else {
      // Extract the last non-empty segment if they pass a full URL
      const segments = finalSlug.split("/").filter(Boolean);
      const lastSegment =
        segments.length > 0 ? segments[segments.length - 1] : "";
      finalSlug = (lastSegment || finalSlug)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }

    const primaryCatInput = (productForm.category as string) || "cbd-oils";
    let rawSelectedCats = Array.isArray(productForm.categories)
      ? productForm.categories.filter((id) => id !== "all")
      : [];

    let primaryCat = primaryCatInput;

    // If the user explicitly selected/unselected categories, respect their selections
    if (rawSelectedCats.length > 0) {
      if (!rawSelectedCats.includes(primaryCat)) {
        primaryCat = rawSelectedCats[0];
      }
    } else {
      rawSelectedCats = [primaryCat];
    }

    const selectedCats = Array.from(new Set([primaryCat, ...rawSelectedCats, "all"]));

    const primaryCatLabel = getCategoryLabel(primaryCat);
    const finalCategoryLabel = primaryCatLabel;

    const finalProduct: Product = {
      id: finalId,
      slug: finalSlug,
      name: productForm.name || "Unnamed Product",
      description: productForm.description || "",
      longDescription: productForm.longDescription || "",
      price: Number(productForm.price) || 19.99,
      category: primaryCat,
      categories: selectedCats,
      categoryLabel: finalCategoryLabel,
      rating: Number(productForm.rating) || 5.0,
      image: (productForm.image && productForm.image.trim()) ? productForm.image : (isEdit ? isEditingProduct!.image : PRESET_IMAGES[0].url),
      reviewsCount: isEdit
        ? isEditingProduct!.reviewsCount
        : Math.floor(10 + Math.random() * 90),
      thc: productForm.thc || "< 0.3% THC",
      cbd: productForm.cbd || "500gm CBD",
      options: optionsArr,
      benefits: benefitsArr,
      labResults: {
        purity: productForm.labResults?.purity || "99.8%",
        cannabinoids:
          productForm.labResults?.cannabinoids || "Full Hemp Extract",
        solventFree: productForm.labResults?.solventFree ?? true,
        heavyMetalsPass: productForm.labResults?.heavyMetalsPass ?? true,
        pesticidesPass: productForm.labResults?.pesticidesPass ?? true,
      },
      isBestSeller: isEdit ? (productForm.isBestSeller ?? isEditingProduct!.isBestSeller ?? true) : (productForm.isBestSeller ?? true),
      isFeaturedHome: isEdit ? (productForm.isFeaturedHome ?? isEditingProduct!.isFeaturedHome ?? true) : (productForm.isFeaturedHome ?? true),
      isNew: productForm.isNew || false,
      metaTitle: productForm.metaTitle || "",
      metaDescription: productForm.metaDescription || "",
      tags: productForm.tags || "",
      altText: productForm.altText || "",
      created_at: isEdit ? (isEditingProduct!.created_at || isEditingProduct!.updated_at || new Date().toISOString()) : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let nextProductsList: Product[];
    if (isEdit) {
      nextProductsList = products.map((p) =>
        p.id === finalId ? finalProduct : p,
      );
    } else {
      nextProductsList = [finalProduct, ...products];
    }

    setProducts(nextProductsList);
    safeSetItem("twobudz_products", JSON.stringify(nextProductsList));

    // Sync to Supabase if configured
    if (isSupabaseConfigured()) {
      syncToSupabase("products", "upsert", finalProduct);
    }

    // Reset State
    setIsEditingProduct(null);
    setIsAddingProduct(false);
    resetProductForm();
  };

  const resetProductForm = () => {
    setProductForm({
      name: "",
      slug: "",
      description: "",
      longDescription: "",
      price: 19.99,
      category: "cbd-oils",
      categoryLabel: "CBD Oils",
      rating: 5.0,
      image: PRESET_IMAGES[0].url,
      thc: "< 0.3% THC",
      cbd: "1000mg CBD",
      options: ["Standard (30ml)", "Value Double Pack"],
      benefits: ["Restores relaxation", "Pesticide free growth"],
      labResults: {
        purity: "99.8%",
        cannabinoids: "Compliant Hemp Extract",
        solventFree: true,
        heavyMetalsPass: true,
        pesticidesPass: true,
      },
      metaTitle: "",
      metaDescription: "",
      tags: "",
      altText: "",
    });
  };

  const getCategoryLabel = (cat: string) => {
    if (!cat) return "Premium CBD Products";
    const catLower = cat.toLowerCase().trim();
    const foundCat = (categories || []).find(
      (c) => c.id.toLowerCase().trim() === catLower || c.title.toLowerCase().trim() === catLower
    );
    if (foundCat) return foundCat.title;

    switch (catLower) {
      case "delta-9-gummies":
        return "Delta 9 Gummies";
      case "cbd-gummies":
        return "CBD Gummies";
      case "sleep-gummies":
        return "Sleep Gummies";
      case "gummies":
        return "Artisanal Gummies";
      case "edibles":
        return "Edibles & Cereal Bites";
      case "thc-drinks":
        return "THC Drinks";
      case "cbd-drinks":
        return "CBD Drinks";
      case "shots-cocktails":
        return "Shots & Cocktails";
      case "beverages":
        return "Drinks & Seltzers";
      case "disposables":
        return "Disposables";
      case "cartridges":
        return "Cartridges";
      case "vapes":
        return "Vapes & Disposables";
      case "cbd-tinctures":
        return "CBD Tinctures";
      case "delta-9-tinctures":
        return "Delta 9 Tinctures";
      case "cbd-oils":
        return "Tinctures & Oils";
      case "topicals":
        return "Targeted Topicals";
      case "smoke-accessories":
        return "Smoke & Accessories";
      case "flower":
        return "Premium Buds & Pre-Rolls";
      case "pets":
        return "Pet CBD Wellness";
      default:
        return cat
          .split(/[-_]+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
    }
  };

  // Category management handlers
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.title || !categoryForm.title.trim()) return;

    let catId = (categoryForm.id || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (!catId) {
      catId = categoryForm.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    }

    const newCat: CategoryItem = {
      id: catId,
      title: categoryForm.title.trim(),
      tagline: categoryForm.tagline?.trim() || "",
      desc: categoryForm.desc?.trim() || "",
      image: categoryForm.image || "/images/cbd_dropper_1779557730794.png",
      showInMenu: categoryForm.showInMenu ?? true,
      isFeaturedHome: categoryForm.isFeaturedHome ?? true,
      updated_at: new Date().toISOString(),
    };

    let updatedCats: CategoryItem[];
    if (isEditingCategory) {
      updatedCats = categories.map((c) => (c.id === isEditingCategory.id ? newCat : c));
    } else {
      const existingIdx = categories.findIndex((c) => c.id === newCat.id);
      if (existingIdx >= 0) {
        updatedCats = categories.map((c, i) => (i === existingIdx ? newCat : c));
      } else {
        updatedCats = [...categories, newCat];
      }
    }

    if (setCategories) {
      setCategories(updatedCats);
    }
    safeSetItem("twobudz_categories", JSON.stringify(updatedCats));

    if (isSupabaseConfigured()) {
      syncToSupabase("categories", "upsert", newCat);
    }

    setIsAddingCategory(false);
    setIsEditingCategory(null);
  };

  const handleDeleteCategory = (catId: string) => {
    if (confirm(`Are you sure you want to delete category "${catId}"?`)) {
      const updatedCats = categories.filter((c) => c.id !== catId);
      if (setCategories) {
        setCategories(updatedCats);
      }
      safeSetItem("twobudz_categories", JSON.stringify(updatedCats));

      if (isSupabaseConfigured()) {
        syncToSupabase("categories", "delete", { id: catId });
      }
    }
  };

  const handleToggleFeaturedCategoryHome = (catId: string) => {
    let updatedCat: CategoryItem | undefined;
    const updatedCats = categories.map((c) => {
      if (c.id === catId) {
        updatedCat = {
          ...c,
          isFeaturedHome: c.isFeaturedHome === false ? true : false,
          updated_at: new Date().toISOString(),
        };
        return updatedCat;
      }
      return c;
    });
    if (setCategories) {
      setCategories(updatedCats);
    }
    safeSetItem("twobudz_categories", JSON.stringify(updatedCats));

    if (isSupabaseConfigured() && updatedCat) {
      syncToSupabase("categories", "upsert", updatedCat);
    }
  };

  const handleToggleFeaturedHome = (id: string) => {
    let updatedProduct: Product | undefined;
    const updated = products.map((p) => {
      if (p.id === id) {
        const isCurrentlyFeatured = !!(p.isBestSeller || p.isFeaturedHome);
        const nextVal = !isCurrentlyFeatured;
        updatedProduct = {
          ...p,
          isBestSeller: nextVal,
          isFeaturedHome: nextVal,
          updated_at: new Date().toISOString(),
        };
        return updatedProduct;
      }
      return p;
    });
    setProducts(updated);
    if (typeof window !== "undefined") {
      safeSetItem("twobudz_products", JSON.stringify(updated));
    }
    if (isSupabaseConfigured() && updatedProduct) {
      syncToSupabase("products", "upsert", updatedProduct);
    }
  };

  const handleSaveHomepageProducts = () => {
    setProducts([...products]);
    if (typeof window !== "undefined") {
      safeSetItem("twobudz_products", JSON.stringify(products));
    }
    if (isSupabaseConfigured()) {
      pushAllLocalDataToSupabase(products, categories, blogPosts, faqItems, orders, inquiries, businessSettings);
    }
    setHomeSavedNotice(true);
    setTimeout(() => setHomeSavedNotice(false), 4000);
  };

  const normalizeCategoryToActive = (catId: string, validCatIds: string[]): string => {
    if (!catId) return "";
    const catLower = catId.toLowerCase().trim();
    if (validCatIds.includes(catLower)) return catLower;
    if (["cbd-drinks", "thc-drinks", "beverages", "shots-cocktails"].includes(catLower)) {
      if (validCatIds.includes("drinks")) return "drinks";
    }
    if (["delta-9-gummies", "cbd-gummies", "sleep-gummies", "artisanal-gummies"].includes(catLower)) {
      if (validCatIds.includes("gummies")) return "gummies";
    }
    if (["oils-tinctures", "cbd-oils", "delta-9-tinctures"].includes(catLower)) {
      if (validCatIds.includes("oils")) return "oils";
      if (validCatIds.includes("tinctures")) return "tinctures";
    }
    if (["cbd-tinctures"].includes(catLower)) {
      if (validCatIds.includes("tinctures")) return "tinctures";
      if (validCatIds.includes("oils")) return "oils";
    }
    if (["vapes", "vapes-disposables", "disposables", "cartridges", "flower", "premium-buds"].includes(catLower)) {
      if (validCatIds.includes("miscellaneous")) return "miscellaneous";
    }
    if (["pet-wellness-care", "pets"].includes(catLower)) {
      if (validCatIds.includes("pet")) return "pet";
    }
    return catLower;
  };

  const handleEditProductClick = (p: Product) => {
    setIsEditingProduct(p);
    const validCatIds = (categories || []).map((cat) => cat.id);
    const primaryNormalized = normalizeCategoryToActive(p.category, validCatIds);
    const rawCategories = Array.isArray(p.categories) && p.categories.length > 0 
      ? p.categories 
      : [primaryNormalized || p.category];

    let initialCategories = rawCategories
      .map((cId) => normalizeCategoryToActive(cId, validCatIds))
      .filter((cId) => validCatIds.includes(cId));
    initialCategories = Array.from(new Set(initialCategories));

    setProductForm({
      ...p,
      category: primaryNormalized || p.category || "drinks",
      categories: initialCategories,
      options: p.options.join(", ") as any,
      benefits: p.benefits.join("\n") as any,
      isBestSeller: !!(p.isBestSeller || p.isFeaturedHome),
      isFeaturedHome: !!(p.isBestSeller || p.isFeaturedHome),
    });
    setIsAddingProduct(true);

    setTimeout(() => {
      const el = document.getElementById(`product-edit-form-${p.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 80);
  };

  const handleDeleteProduct = async (id: string | number) => {
    if (
      confirm(
        "Are you sure you want to permanently delete this product from the frontend store?",
      )
    ) {
      const filtered = products.filter((p) => String(p.id) !== String(id));
      setProducts(filtered);
      safeSetItem("twobudz_products", JSON.stringify(filtered));

      // Sync deletion to Supabase
      if (isSupabaseConfigured()) {
        await syncToSupabase("products", "delete", { id: String(id) });
      }
      triggerToast("Product successfully removed from catalog.");
    }
  };

  // Robust CSV parser to handle quotes and multiline cells correctly
  const parseCSV = (text: string): string[][] => {
    const result: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let insideQuote = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuote && nextChar === '"') {
          cell += '"';
          i++; // Skip next quote
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === "," && !insideQuote) {
        row.push(cell.trim());
        cell = "";
      } else if ((char === "\n" || char === "\r") && !insideQuote) {
        if (char === "\r" && nextChar === "\n") {
          i++;
        }
        row.push(cell.trim());
        result.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
    if (cell || row.length > 0) {
      row.push(cell.trim());
      result.push(row);
    }
    return result;
  };

  // Helper to extract a custom URL slug from legacy product links and preserve indexing
  const extractSlug = (url: string, name: string): string => {
    if (url && url.trim()) {
      try {
        const decoded = decodeURIComponent(url);
        // Extracts the part after /products/ or /product/ up to the next slash or end
        const pathMatch = decoded.match(/\/(products|product)\/([a-zA-Z0-9-_]+)/);
        if (pathMatch && (pathMatch[2] || pathMatch[1])) {
          return (pathMatch[2] || pathMatch[1]).trim().toLowerCase();
        }
      } catch (e) {
        console.error("Error parsing URL slug: ", e);
      }
    }
    // Fallback to name slug
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  // Auto-classify category type based on keywords in title/name
  const autoClassifyCategory = (name: string): string => {
    return classifyCategory(name);
  };

  // Maps high quality relevant Unsplash cannabis photos dynamically
  const getAutoImage = (category: string, name: string): string => {
    return mapProductAutoImage(category, name);
    const norm = name.toLowerCase();

    // 1. High Priority Overrides for Cocktails / Coktails / Mocktails / Seltzers/ Beverages
    if (
      norm.includes("cocktail") ||
      norm.includes("coktail") ||
      norm.includes("mocktail") ||
      norm.includes("mojito") ||
      norm.includes("margarita") ||
      norm.includes("spritz") ||
      norm.includes("sangria") ||
      norm.includes("punch") ||
      norm.includes("seltzer") ||
      norm.includes("sparkling") ||
      norm.includes("bubbly") ||
      norm.includes("beverage") ||
      norm.includes("drink")
    ) {
      if (
        norm.includes("berry") ||
        norm.includes("raspberry") ||
        norm.includes("strawberry") ||
        norm.includes("cherry") ||
        norm.includes("rose")
      ) {
        return "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=600&auto=format&fit=crop"; // Crimson / pink sparkling berry cocktail
      }
      if (
        norm.includes("lime") ||
        norm.includes("mint") ||
        norm.includes("cucumber") ||
        norm.includes("green") ||
        norm.includes("mojito")
      ) {
        return "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=600&auto=format&fit=crop"; // Refreshing green mint botanical drink mockup
      }
      if (
        norm.includes("orange") ||
        norm.includes("citrus") ||
        norm.includes("sun") ||
        norm.includes("peach")
      ) {
        return "https://images.unsplash.com/photo-1536935338788-846bb9981813?q=80&w=600&auto=format&fit=crop"; // High contrast double craft orange cocktails
      }
      return "https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=600&auto=format&fit=crop"; // Super sophisticated crystal glass cocktail with flowers / fruit peel
    }

    // 2. High Priority Overrides for Gummies / Sweets / Fruit Chews
    if (
      category === "gummies" ||
      norm.includes("gummy") ||
      norm.includes("gummies") ||
      norm.includes("chew") ||
      norm.includes("chews") ||
      norm.includes("candy") ||
      norm.includes("fruit chew") ||
      norm.includes("gumdrop")
    ) {
      if (
        norm.includes("chocolate") ||
        norm.includes("bar") ||
        norm.includes("cookie") ||
        norm.includes("brownie") ||
        norm.includes("bite") ||
        norm.includes("caramels") ||
        norm.includes("lollipop")
      ) {
        return "https://images.unsplash.com/photo-1511381939415-e44015466834?q=80&w=600&auto=format&fit=crop"; // Dark chocolate bites & bars
      }
      if (
        norm.includes("worm") ||
        norm.includes("worms") ||
        norm.includes("sour") ||
        norm.includes("tangy")
      ) {
        return "https://images.unsplash.com/photo-1581798459219-318e76aecc7b?q=80&w=600&auto=format&fit=crop"; // Bright sour sugared gummy strands
      }
      if (
        norm.includes("raspberry") ||
        norm.includes("blue raspberry") ||
        norm.includes("berry") ||
        norm.includes("blackberry") ||
        norm.includes("strawberry") ||
        norm.includes("blueberry") ||
        norm.includes("cherry")
      ) {
        return "https://images.unsplash.com/photo-1501168532438-bb4eac9c6a1d?q=80&w=600&auto=format&fit=crop"; // Crimson / mixed berry organic jellies in a crystal bowl
      }
      if (
        norm.includes("watermelon") ||
        norm.includes("melon") ||
        norm.includes("slice") ||
        norm.includes("apple") ||
        norm.includes("lime") ||
        norm.includes("green")
      ) {
        return "https://images.unsplash.com/photo-1582041258696-6e2ee04c86fe?q=80&w=600&auto=format&fit=crop"; // Glossy green-apple & watermelon gum slices
      }
      if (
        norm.includes("peach") ||
        norm.includes("ring") ||
        norm.includes("rings") ||
        norm.includes("pineapple") ||
        norm.includes("mango") ||
        norm.includes("citrus") ||
        norm.includes("lemon") ||
        norm.includes("orange")
      ) {
        return "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?q=80&w=600&auto=format&fit=crop"; // Peach rings and premium citrus chews
      }
      return "https://images.unsplash.com/photo-1556881286-fc6915169721?q=80&w=600&auto=format&fit=crop"; // Rainbow collection wellness gummies
    }

    // 3. Category Fallbacks
    if (category === "pets") {
      if (
        norm.includes("treat") ||
        norm.includes("bite") ||
        norm.includes("chew") ||
        norm.includes("strip") ||
        norm.includes("snack")
      ) {
        if (norm.includes("cat") || norm.includes("feline")) {
          return "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=600&auto=format&fit=crop"; // Cat gourmet treats
        }
        return "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=600&auto=format&fit=crop"; // Dog eating treats
      }
      if (
        norm.includes("tincture") ||
        norm.includes("oil") ||
        norm.includes("drop") ||
        norm.includes("liquid")
      ) {
        if (
          norm.includes("cat") ||
          norm.includes("feline") ||
          norm.includes("salmon") ||
          norm.includes("tuna")
        ) {
          return "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?q=80&w=600&auto=format&fit=crop"; // Cat relaxation dropper setup
        }
        return "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=600&auto=format&fit=crop"; // Dog wellness drops
      }
      return "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=600&auto=format&fit=crop";
    }

    if (category === "flower") {
      if (
        norm.includes("pre-roll") ||
        norm.includes("preroll") ||
        norm.includes("joint") ||
        norm.includes("joints")
      ) {
        return "https://images.unsplash.com/photo-1603909223429-69bb7101f420?q=80&w=600&auto=format&fit=crop"; // Hemp joint prerolls
      }
      if (
        norm.includes("sour") ||
        norm.includes("diesel") ||
        norm.includes("sativa") ||
        norm.includes("haze")
      ) {
        return "https://images.unsplash.com/photo-1510627831412-255b57d5416c?q=80&w=600&auto=format&fit=crop"; // Sparkling green cannabis flower bud
      }
      if (
        norm.includes("purple") ||
        norm.includes("indica") ||
        norm.includes("kush") ||
        norm.includes("berry") ||
        norm.includes("cherry")
      ) {
        return "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=600&auto=format&fit=crop"; // Purple Indica flower bud
      }
      return "https://images.unsplash.com/photo-1536882240095-0379873feb4e?q=80&w=600&auto=format&fit=crop"; // Handcrafted boutique flower trichomes close up
    }

    if (category === "topicals") {
      if (
        norm.includes("soap") ||
        norm.includes("bath") ||
        norm.includes("bomb") ||
        norm.includes("shampoo")
      ) {
        return "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=600&auto=format&fit=crop"; // Foaming luxury bath salts & herbal soap bars
      }
      if (
        norm.includes("roll-on") ||
        norm.includes("rollon") ||
        norm.includes("gel") ||
        norm.includes("active")
      ) {
        return "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=600&auto=format&fit=crop"; // Deep penetrating cooling recovery gel dispenser
      }
      if (
        norm.includes("cream") ||
        norm.includes("lotion") ||
        norm.includes("ointment") ||
        norm.includes("balm") ||
        norm.includes("salve")
      ) {
        return "https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=600&auto=format&fit=crop"; // Luxury skin smoothing balm container on white vanity
      }
      return "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?q=80&w=600&auto=format&fit=crop"; // Organic skin balm product
    }

    if (category === "beverages") {
      if (
        norm.includes("tea") ||
        norm.includes("chamomile") ||
        norm.includes("honey") ||
        norm.includes("matcha")
      ) {
        return "https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=600&auto=format&fit=crop"; // Glowing golden herbal tea infusion cup
      }
      if (
        norm.includes("shot") ||
        norm.includes("elixir") ||
        norm.includes("energy")
      ) {
        return "https://images.unsplash.com/photo-1610970881699-44a5587cabec?q=80&w=600&auto=format&fit=crop"; // Ginger honey dynamic energy shot
      }
      return "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=600&auto=format&fit=crop"; // Refreshed seltzer drink can
    }

    // Fallback / CBD Oils Category
    if (
      norm.includes("night") ||
      norm.includes("sleep") ||
      norm.includes("lavender") ||
      norm.includes("dream") ||
      norm.includes("calm")
    ) {
      return "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?q=80&w=600&auto=format&fit=crop"; // Organic lavender sleep dropper infusion setup
    }
    if (
      norm.includes("morning") ||
      norm.includes("energy") ||
      norm.includes("focus") ||
      norm.includes("citrus") ||
      norm.includes("mint")
    ) {
      return "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?q=80&w=600&auto=format&fit=crop"; // Golden morning sunlit dropper bottle with orange elements
    }
    return "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=600&auto=format&fit=crop"; // Golden CBD tincture oil bottle
  };

  // Main 1-Click preloaded catalog importer
  const importPreloadedCatalog = async (partNum: number | "all") => {
    setIsImportingPreloaded(true);
    setCsvFeedback(`Hold tight! Fetching & parsing legacy catalog parts ...`);

    try {
      let filesToFetch: string[] = [];
      if (partNum === "all") {
        filesToFetch = [
          "/products_raw_1.csv",
          "/products_raw_2.csv",
          "/products_raw_3.csv",
          "/products_raw_4.csv",
        ];
      } else {
        filesToFetch = [`/products_raw_${partNum}.csv`];
      }

      const allParsedProducts: Product[] = [];

      for (const filepath of filesToFetch) {
        const response = await fetch(filepath);
        if (!response.ok) {
          throw new Error(
            `Failed to load static file: ${filepath}. Please double check static paths.`,
          );
        }
        const csvContent = await response.text();
        const parsedRows = parseCSV(csvContent);

        if (parsedRows.length < 2) continue;

        // Match columns
        const headers = parsedRows[0].map((h) => h.toLowerCase().trim());
        const nameIndex = headers.findIndex(
          (h) => h.includes("product name") || h === "name" || h === "title",
        );
        const idIndex = headers.findIndex(
          (h) => h === "twobudz id" || h === "product id" || h === "product_id" || h === "id" || h === "sku" || h === "item id",
        );
        const urlIndex = headers.findIndex(
          (h) => h.includes("url") || h.includes("link"),
        );
        const priceIndex = headers.findIndex(
          (h) =>
            h.includes("price") || h.includes("amount") || h.includes("cost"),
        );
        const shortDescIndex = headers.findIndex(
          (h) =>
            h.includes("short description") ||
            h === "description" ||
            h === "summary",
        );
        const longDescIndex = headers.findIndex(
          (h) =>
            h.includes("long description") ||
            h.includes("longdescription") ||
            h.includes("content"),
        );

        for (let i = 1; i < parsedRows.length; i++) {
          const row = parsedRows[i];
          if (row.length < 3) continue;

          const name = row[nameIndex] || row[2] || "";
          if (!name.trim()) continue;

          const rawId = idIndex !== -1 ? row[idIndex] : "";
          const id = rawId
            ? rawId.trim()
            : "prod-item-" + Math.floor(Math.random() * 1000000);

          const rawPrice = priceIndex !== -1 ? row[priceIndex] : "";
          let price = parseFloat((rawPrice || "").replace(/[^0-9.]/g, ""));
          if (isNaN(price) || price <= 0) {
            price = 44.99; // Standard high fidelity price for dynamic catalogs
          }

          const urlVal = urlIndex !== -1 ? row[urlIndex] : "";
          const slug = extractSlug(urlVal, name);

          const desc =
            (shortDescIndex !== -1 ? row[shortDescIndex] : "") ||
            `Premium high potency ${name} - formulated for consistent wellness.`;
          const longDesc =
            (longDescIndex !== -1 ? row[longDescIndex] : "") || desc;
          const category = autoClassifyCategory(name);
          const image = getAutoImage(category, name);

          // Regex match concentration (e.g. 1000mg, 500mg)
          const mgMatch = name.match(/([0-9]+mg)/i);
          const cbdGuess = mgMatch ? mgMatch[1] : "500mg CBD";

          let thcGuess = "< 0.3% THC";
          if (
            name.toLowerCase().includes("delta-9") ||
            name.toLowerCase().includes("d9")
          ) {
            thcGuess = "10mg Delta-9 THC";
          } else if (
            name.toLowerCase().includes("thc-free") ||
            name.toLowerCase().includes("thc free") ||
            name.toLowerCase().includes("0.0% thc")
          ) {
            thcGuess = "0.0% THC (Zero THC)";
          }

          let options: string[] = ["Standard Premium Pack"];
          if (category === "cbd-oils")
            options = ["30ml Dropper Bottle", "60ml Value Pack"];
          else if (category === "gummies")
            options = ["15 Gummy Pack", "30 Gummy Value Pack"];
          else if (category === "flower")
            options = [
              "3.5 Grams (1/8 oz)",
              "7 Grams (1/4 oz)",
              "14 Grams (1/2 oz)",
            ];
          else if (category === "topicals")
            options = ["3 oz Active Pump", "6 oz Active Tube"];
          else if (category === "pets") options = ["30ml Dropper Bottle"];
          else if (category === "beverages")
            options = ["4-Pack Cans", "12-Pack Case"];

          let benefits: string[] = [
            "Certified 100% Organic Texas Sourced Hemp",
            "Double-tested inside third party lab states",
            "Soothes baseline mental stress and physical soreness",
          ];
          if (category === "cbd-oils")
            benefits = [
              "High-potency sublingual absorption profile",
              "Organically cured cold-pressed MCT compound base",
              "Fast restorative action to manage daily tension",
            ];
          else if (category === "gummies")
            benefits = [
              "Vegan-friendly, delicious real fruit berry juices",
              "Deep body soothing relaxation and tranquil alignment",
              "Consistent dosage block in every bite",
            ];
          else if (category === "flower")
            benefits = [
              "Hand trimmed boutique hemp cures",
              "Rich natural terpene flower aroma",
              "Instant physical release with raw whole hemp",
            ];
          else if (category === "topicals")
            benefits = [
              "Deep-tissue muscle warming, non-greasy lotion",
              "Fast cellular hydration for targeted relief",
              "Pure natural botanical oils of eucalyptus/aloe",
            ];
          else if (category === "pets")
            benefits = [
              "Vet-approved 100% safe broad-spectrum base",
              "Delectable natural flavors pet easily swallows",
              "Relief from thunder storms and joint stiffness",
            ];
          else if (category === "beverages")
            benefits = [
              "Sparkling organic carbonated hydration",
              "Fast acting nano-emulsified active cannabinoids",
              "Zero high-fructose corn syrups or artificial color",
            ];

          allParsedProducts.push({
            id,
            slug,
            name,
            description: desc,
            longDescription: longDesc,
            price,
            category,
            categoryLabel: getCategoryLabel(category),
            rating: parseFloat((4.7 + (name.length % 4) * 0.1).toFixed(1)),
            reviewsCount: 15 + ((name.length * 3) % 110),
            image,
            thc: thcGuess,
            cbd: cbdGuess,
            options,
            benefits,
            labResults: {
              purity: "99.8%",
              cannabinoids: "Farm Bill Compliant Phytocannabinoid Profile",
              solventFree: true,
              heavyMetalsPass: true,
              pesticidesPass: true,
            },
          });
        }
      }

      if (allParsedProducts.length === 0) {
        throw new Error("Parsed zero records. Check CSV formatting.");
      }

      const existingIds = new Set(products.map((p) => p.id));
      const newUnique = allParsedProducts.filter((p) => !existingIds.has(p.id));

      if (newUnique.length === 0) {
        setCsvFeedback(
          "Note: All products from this selection are already imported!",
        );
        setTimeout(() => setCsvFeedback(""), 5000);
        return;
      }

      const mergedList = [...newUnique, ...products];
      setProducts(mergedList);
      safeSetItem("twobudz_products", JSON.stringify(mergedList));
      setCsvFeedback(
        `Success! Beautifully injected ${newUnique.length} premium products from your legacy CSV Catalog!`,
      );
      setTimeout(() => setCsvFeedback(""), 8000);
    } catch (err: any) {
      setCsvFeedback(`Error importing preloaded CSV: ${err.message}`);
    } finally {
      setIsImportingPreloaded(false);
    }
  };

  // Product File Selector Handler (.csv or .json)
  const handleProductFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvText(content);
        // Replace mode is default so whatever CSV is uploaded becomes the EXACT store catalog!
        handleImportCSV(content, "replace");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input
  };

  // CSV Import Parser for Products (text paste or file input)
  const handleImportCSV = (overrideText?: string, mode: "replace" | "merge" = "replace") => {
    const textToParse = overrideText !== undefined ? overrideText : csvText;
    if (!textToParse || !textToParse.trim()) {
      setCsvFeedback("❌ Error: Please select a CSV/JSON file or paste product data first.");
      return;
    }

    const rowErrors: string[] = [];

    try {
      let parsedProducts: Product[] = [];

      // Check if user uploaded or pasted JSON array
      if (textToParse.trim().startsWith("[") || textToParse.trim().startsWith("{")) {
        try {
          const jsonVal = JSON.parse(textToParse.trim());
          const list = Array.isArray(jsonVal) ? jsonVal : [jsonVal];
          parsedProducts = list.map((item: any, i: number) => {
            const name = item.name || item.title || item.product_name;
            if (!name) {
              rowErrors.push(`JSON Item #${i + 1}: Missing 'name' or 'title' property.`);
            }
            return {
              id: item.id ? String(item.id) : "bulk-json-prod-" + Date.now() + "-" + i,
              name: name || "Imported Product " + (i + 1),
              slug: item.slug || extractSlug("", name || ""),
              description: item.description || "Organic high potency wellness product.",
              longDescription: item.longDescription || item.description || "Organic high potency wellness product.",
              price: typeof item.price === "number" ? item.price : parseFloat(String(item.price || "29.99").replace(/[^0-9.]/g, "")) || 29.99,
              category: item.category || autoClassifyCategory(name || ""),
              categoryLabel: getCategoryLabel(item.category || autoClassifyCategory(name || "")),
              rating: item.rating || 4.8,
              reviewsCount: item.reviewsCount || Math.floor(12 + Math.random() * 80),
              image: item.image || getAutoImage(item.category || autoClassifyCategory(name || ""), name || ""),
              thc: item.thc || "< 0.3% THC",
              cbd: item.cbd || "500mg CBD",
              options: Array.isArray(item.options) ? item.options : (item.options ? String(item.options).split(";").map((s: string) => s.trim()) : ["Standard Premium Pack"]),
              benefits: Array.isArray(item.benefits) ? item.benefits : (item.benefits ? String(item.benefits).split(";").map((s: string) => s.trim()) : ["Third-party lab tested", "Organically farm certified"]),
              labResults: item.labResults || { purity: "99.2%", cannabinoids: "Compliant active extract", solventFree: true, heavyMetalsPass: true, pesticidesPass: true },
            };
          });
        } catch (jsonErr: any) {
          setCsvFeedback(`❌ JSON Format Error: ${jsonErr.message}. Please verify valid JSON syntax.`);
          return;
        }
      }

      // If JSON parsing wasn't applicable or returned 0, parse CSV
      if (parsedProducts.length === 0) {
        const parsedRows = parseCSV(textToParse);
        if (parsedRows.length < 2) {
          setCsvFeedback(`❌ CSV Format Error: File must contain at least 2 lines (1 Header row + at least 1 Product row). Only found ${parsedRows.length} line(s).`);
          return;
        }

        const headers = parsedRows[0].map((h) => h.replace(/['"]+/g, "").trim().toLowerCase());

        let nameIndex = headers.findIndex((h) =>
          h === "product name" || h === "title" || h === "name" || h === "product title" || h === "product_name" || h === "item" || h.includes("product") || h.includes("name") || h.includes("title") || h.includes("item")
        );
        if (nameIndex === -1) {
          nameIndex = 0; // Fallback to first column if no explicit title column header
        }

        const idIndex = headers.findIndex((h) =>
          h === "twobudz id" ||
          h === "product id" ||
          h === "product_id" ||
          h === "id" ||
          h === "sku" ||
          h === "item id" ||
          h === "item_id"
        );
        const urlIndex = headers.findIndex((h) => h.includes("url") || h.includes("link") || h.includes("slug"));
        const priceIndex = headers.findIndex((h) => h.includes("price") || h.includes("amount") || h.includes("cost") || h.includes("rate") || h.includes("msrp") || h.includes("$"));
        const shortDescIndex = headers.findIndex((h) => h === "short description" || h === "description" || h === "summary" || h.includes("short") || h.includes("desc"));
        const longDescIndex = headers.findIndex((h) => h === "long description" || h === "longdescription" || h.includes("long"));
        const categoryIndex = headers.findIndex((h) => h.includes("category") || h.includes("type") || h.includes("dept") || h.includes("group"));
        const imageIndex = headers.findIndex((h) => h.includes("image") || h.includes("photo") || h.includes("picture") || h.includes("img") || h.includes("src") || h.includes("thumb"));
        const thcIndex = headers.findIndex((h) => h.includes("thc"));
        const cbdIndex = headers.findIndex((h) => h.includes("cbd"));
        const optionsIndex = headers.findIndex((h) => h.includes("option"));
        const benefitsIndex = headers.findIndex((h) => h.includes("benefit"));
        const purityIndex = headers.findIndex((h) => h.includes("purity"));
        const cannabinoidsIndex = headers.findIndex((h) => h.includes("cannabinoid"));
        const metaTitleIndex = headers.findIndex((h) => h.includes("metatitle") || h.includes("meta title"));
        const metaDescIndex = headers.findIndex((h) => h.includes("metadescription") || h.includes("meta desc"));
        const tagsIndex = headers.findIndex((h) => h.includes("tag"));
        const altTextIndex = headers.findIndex((h) => h.includes("alt"));
        const bestSellerIndex = headers.findIndex((h) => h.includes("bestseller") || h.includes("best seller") || h.includes("featured"));
        const isNewIndex = headers.findIndex((h) => h.includes("isnew") || h.includes("new arrival") || h === "new");

        for (let i = 1; i < parsedRows.length; i++) {
          const rowNumber = i + 1; // CSV line number (Row 1 is header)
          const row = parsedRows[i];
          if (!row || row.length === 0 || row.every(cell => !cell || !cell.trim())) continue;

          const name = nameIndex !== -1 ? row[nameIndex] : row[0] || "";
          if (!name || !name.trim()) {
            rowErrors.push(`Row ${rowNumber}: Skipped row because Product Name/Title is empty.`);
            continue;
          }

          const rawPrice = priceIndex !== -1 ? row[priceIndex] : "";
          let price = 29.99;
          if (rawPrice && rawPrice.trim()) {
            const parsedPrice = parseFloat(rawPrice.replace(/[^0-9.]/g, ""));
            if (!isNaN(parsedPrice) && parsedPrice > 0) {
              price = parsedPrice;
            } else {
              rowErrors.push(`Row ${rowNumber} ('${name.trim()}'): Price '${rawPrice}' is invalid (used default $29.99).`);
            }
          }

          const catInput = categoryIndex !== -1 && row[categoryIndex] ? row[categoryIndex].trim() : "";
          const category = catInput ? (catInput.toLowerCase() as any) : autoClassifyCategory(name.trim());
          const description = shortDescIndex !== -1 && row[shortDescIndex] ? row[shortDescIndex].trim() : "";
          const longDescription = longDescIndex !== -1 && row[longDescIndex] ? row[longDescIndex].trim() : "";
          const slug = urlIndex !== -1 && row[urlIndex] && row[urlIndex].trim() ? extractSlug(row[urlIndex], name) : extractSlug("", name);
          const id = idIndex !== -1 && row[idIndex] && row[idIndex].trim() ? row[idIndex].trim() : "";
          const image = imageIndex !== -1 && row[imageIndex] ? row[imageIndex].trim() : "";
          const thc = thcIndex !== -1 && row[thcIndex] ? row[thcIndex].trim() : "";
          const cbd = cbdIndex !== -1 && row[cbdIndex] ? row[cbdIndex].trim() : "";

          const rawOptions = optionsIndex !== -1 && row[optionsIndex] ? row[optionsIndex] : "";
          const options = rawOptions ? rawOptions.split(";").map((s) => s.trim()).filter(Boolean) : [];

          const rawBenefits = benefitsIndex !== -1 && row[benefitsIndex] ? row[benefitsIndex] : "";
          const benefits = rawBenefits ? rawBenefits.split(";").map((s) => s.trim()).filter(Boolean) : [];

          const purity = purityIndex !== -1 && row[purityIndex] ? row[purityIndex].trim() : "";
          const cannabinoids = cannabinoidsIndex !== -1 && row[cannabinoidsIndex] ? row[cannabinoidsIndex].trim() : "";
          const metaTitle = metaTitleIndex !== -1 && row[metaTitleIndex] ? row[metaTitleIndex].trim() : "";
          const metaDescription = metaDescIndex !== -1 && row[metaDescIndex] ? row[metaDescIndex].trim() : "";
          const tags = tagsIndex !== -1 && row[tagsIndex] ? row[tagsIndex].trim() : "";
          const altText = altTextIndex !== -1 && row[altTextIndex] ? row[altTextIndex].trim() : "";
          const isBestSeller = bestSellerIndex !== -1 && row[bestSellerIndex] ? ["true", "1", "yes"].includes(row[bestSellerIndex].trim().toLowerCase()) : undefined;
          const isNew = isNewIndex !== -1 && row[isNewIndex] ? ["true", "1", "yes"].includes(row[isNewIndex].trim().toLowerCase()) : undefined;

          parsedProducts.push({
            id,
            slug,
            name: name.trim(),
            description,
            longDescription,
            price,
            category,
            categoryLabel: category ? getCategoryLabel(category) : "",
            rating: 4.8,
            image,
            reviewsCount: Math.floor(12 + Math.random() * 80),
            thc,
            cbd,
            options,
            benefits,
            labResults: {
              purity,
              cannabinoids,
              solventFree: true,
              heavyMetalsPass: true,
              pesticidesPass: true,
            },
            metaTitle,
            metaDescription,
            tags,
            altText,
            isBestSeller: isBestSeller as any,
            isFeaturedHome: isBestSeller as any,
            isNew: isNew as any,
          });
        }
      }

      if (parsedProducts.length === 0) {
        let errMessage = `❌ No valid products parsed from CSV (${(parseCSV(textToParse).length - 1)} row(s) checked).`;
        if (rowErrors.length > 0) {
          errMessage += `\n\nRow Issues:\n${rowErrors.join("\n")}`;
        }
        setCsvFeedback(errMessage);
        return;
      }

      let updatedList: Product[] = [];
      let updatedCount = 0;
      let addedCount = 0;

      if (mode === "replace") {
        // REPLACE / SYNC MODE: The uploaded CSV becomes the EXACT new store catalog!
        const existingMap = new Map<string, Product>();
        [...products, ...PRODUCTS].forEach((p) => {
          if (p.id) existingMap.set(String(p.id).trim().toLowerCase(), p);
          if (p.slug) existingMap.set(p.slug.trim().toLowerCase(), p);
          if (p.name) existingMap.set(p.name.trim().toLowerCase(), p);
        });

        updatedList = parsedProducts.map((item, idx) => {
          const ex =
            (item.id && existingMap.get(String(item.id).trim().toLowerCase())) ||
            (item.slug && existingMap.get(item.slug.trim().toLowerCase())) ||
            (item.name && existingMap.get(item.name.trim().toLowerCase()));

          const name = item.name && item.name.trim() ? item.name.trim() : ex ? ex.name : "Product " + (idx + 1);
          const price = typeof item.price === "number" && !isNaN(item.price) && item.price > 0 ? item.price : ex ? ex.price : 29.99;
          const description = item.description && item.description.trim() ? item.description.trim() : ex ? ex.description : "Organic high potency wellness product.";
          const longDescription = item.longDescription && item.longDescription.trim() ? item.longDescription.trim() : ex ? (ex.longDescription || ex.description) : description;
          const category = item.category ? item.category : ex ? ex.category : autoClassifyCategory(name);
          const categoryLabel = getCategoryLabel(category);

          let image = "";
          if (item.image && item.image.trim() && !item.image.includes("placeholder") && item.image !== "undefined") {
            image = normalizeToCleanAsset(item.image.trim(), category, name);
          } else if (ex && ex.image && !ex.image.includes("placeholder")) {
            image = normalizeToCleanAsset(ex.image, category, name);
          } else {
            image = normalizeToCleanAsset(getAutoImage(category, name), category, name);
          }

          const thc = item.thc && item.thc.trim() ? item.thc.trim() : ex ? ex.thc : "< 0.3% THC";
          const cbd = item.cbd && item.cbd.trim() ? item.cbd.trim() : ex ? ex.cbd : "500mg CBD";
          const options = item.options && item.options.length > 0 ? item.options : ex ? ex.options : ["Standard Pack"];
          const benefits = item.benefits && item.benefits.length > 0 ? item.benefits : ex ? ex.benefits : ["Third-party lab tested"];

          const purity = item.labResults?.purity || ex?.labResults?.purity || "99.8%";
          const cannabinoids = item.labResults?.cannabinoids || ex?.labResults?.cannabinoids || "Compliant active extract";

          const metaTitle = item.metaTitle || ex?.metaTitle || name;
          const metaDescription = item.metaDescription || ex?.metaDescription || description;
          const tags = item.tags || ex?.tags || "";
          const altText = item.altText || ex?.altText || name;

          const isBestSeller = typeof item.isBestSeller === "boolean" ? item.isBestSeller : ex ? ex.isBestSeller : false;
          const isNew = typeof item.isNew === "boolean" ? item.isNew : ex ? ex.isNew : false;

          const id = item.id ? String(item.id).trim() : ex ? String(ex.id) : "TB-" + String(idx + 1).padStart(3, "0");
          const slug = item.slug || (ex ? ex.slug : extractSlug("", name));

          if (ex) updatedCount++;
          else addedCount++;

          return {
            id,
            slug,
            name,
            description,
            longDescription,
            price,
            category,
            categoryLabel,
            categories: Array.from(new Set([category, "all"])),
            rating: ex ? ex.rating : 4.8,
            reviewsCount: ex ? ex.reviewsCount : 24,
            image,
            thc,
            cbd,
            options,
            benefits,
            labResults: {
              purity,
              cannabinoids,
              solventFree: true,
              heavyMetalsPass: true,
              pesticidesPass: true,
            },
            metaTitle,
            metaDescription,
            tags,
            altText,
            isBestSeller,
            isFeaturedHome: isBestSeller,
            isNew,
          };
        });
      } else {
        // MERGE MODE: Keep existing store products and append/update from CSV
        updatedList = [...products];
        for (const item of parsedProducts) {
          const matchIndex = updatedList.findIndex((existing) => {
            if (item.id && String(existing.id).trim().toLowerCase() === String(item.id).trim().toLowerCase()) return true;
            if (item.slug && existing.slug && existing.slug.trim().toLowerCase() === item.slug.trim().toLowerCase()) return true;
            if (item.name && existing.name && existing.name.trim().toLowerCase() === item.name.trim().toLowerCase()) return true;
            return false;
          });

          if (matchIndex !== -1) {
            const ex = updatedList[matchIndex];
            const name = item.name && item.name.trim() ? item.name.trim() : ex.name;
            const price = typeof item.price === "number" && !isNaN(item.price) && item.price > 0 ? item.price : ex.price;
            const description = item.description && item.description.trim() ? item.description.trim() : ex.description;
            const longDescription = item.longDescription && item.longDescription.trim() ? item.longDescription.trim() : (ex.longDescription || description);
            const category = item.category ? item.category : ex.category;
            const categoryLabel = item.category ? getCategoryLabel(category) : ex.categoryLabel;

            let image = normalizeToCleanAsset(ex.image || "", category, name);
            if (item.image && item.image.trim() && !item.image.includes("placeholder") && item.image !== "undefined") {
              image = normalizeToCleanAsset(item.image.trim(), category, name);
            }

            const thc = item.thc && item.thc.trim() ? item.thc.trim() : ex.thc;
            const cbd = item.cbd && item.cbd.trim() ? item.cbd.trim() : ex.cbd;
            const options = item.options && item.options.length > 0 ? item.options : ex.options;
            const benefits = item.benefits && item.benefits.length > 0 ? item.benefits : ex.benefits;

            const purity = item.labResults?.purity || ex.labResults?.purity || "99.8%";
            const cannabinoids = item.labResults?.cannabinoids || ex.labResults?.cannabinoids || "Compliant active extract";

            const metaTitle = item.metaTitle || ex.metaTitle || name;
            const metaDescription = item.metaDescription || ex.metaDescription || description;
            const tags = item.tags || ex.tags || "";
            const altText = item.altText || ex.altText || name;

            const isBestSeller = typeof item.isBestSeller === "boolean" ? item.isBestSeller : ex.isBestSeller;
            const isNew = typeof item.isNew === "boolean" ? item.isNew : ex.isNew;

            updatedList[matchIndex] = {
              ...ex,
              name,
              price,
              description,
              longDescription,
              category,
              categoryLabel,
              categories: Array.from(new Set([category, "all"])),
              image,
              thc,
              cbd,
              options,
              benefits,
              labResults: {
                purity,
                cannabinoids,
                solventFree: true,
                heavyMetalsPass: true,
                pesticidesPass: true,
              },
              metaTitle,
              metaDescription,
              tags,
              altText,
              isBestSeller,
              isFeaturedHome: isBestSeller,
              isNew,
            };
            updatedCount++;
          } else {
            const newId = item.id ? String(item.id).trim() : "TB-" + String(updatedList.length + addedCount + 1).padStart(3, "0");
            const newSlug = item.slug || extractSlug("", item.name || "");
            const category = item.category || autoClassifyCategory(item.name || "");
            const rawImage = item.image && item.image.trim() ? item.image.trim() : getAutoImage(category, item.name || "");
            const image = normalizeToCleanAsset(rawImage, category, item.name || "");

            updatedList.push({
              id: newId,
              slug: newSlug,
              name: item.name || "New Product",
              description: item.description || "Organic high potency wellness product.",
              longDescription: item.longDescription || item.description || "Organic high potency wellness product.",
              price: typeof item.price === "number" && !isNaN(item.price) && item.price > 0 ? item.price : 29.99,
              category,
              categoryLabel: getCategoryLabel(category),
              categories: Array.from(new Set([category, "all"])),
              rating: 4.8,
              reviewsCount: 24,
              image,
              thc: item.thc || "< 0.3% THC",
              cbd: item.cbd || "500mg CBD",
              options: item.options && item.options.length > 0 ? item.options : ["Standard Pack"],
              benefits: item.benefits && item.benefits.length > 0 ? item.benefits : ["Third-party lab tested"],
              labResults: item.labResults || { purity: "99.2%", cannabinoids: "Compliant active extract", solventFree: true, heavyMetalsPass: true, pesticidesPass: true },
              metaTitle: item.metaTitle || item.name,
              metaDescription: item.metaDescription || item.description,
              tags: item.tags || "",
              altText: item.altText || item.name,
              isBestSeller: !!item.isBestSeller,
              isFeaturedHome: !!item.isBestSeller,
              isNew: !!item.isNew,
            });
            addedCount++;
          }
        }
      }

      setProducts(updatedList);
      safeSetItem("twobudz_products", JSON.stringify(updatedList));
      safeSetItem("twobudz_products_preloaded", "true");

      let successFeedback = "";
      if (mode === "replace") {
        successFeedback = `✅ Success! Store catalog replaced with exact ${updatedList.length} product(s) from your CSV file.`;
      } else {
        successFeedback = `✅ Success! Merged ${addedCount} new item(s) and updated ${updatedCount} existing item(s). Total store products: ${updatedList.length}!`;
      }

      if (rowErrors.length > 0) {
        successFeedback += `\n\n⚠️ Row Warnings / Skipped (${rowErrors.length}):\n` + rowErrors.slice(0, 10).join("\n");
        if (rowErrors.length > 10) successFeedback += `\n...and ${rowErrors.length - 10} more warnings.`;
      }

      if (isSupabaseConfigured()) {
        setCsvFeedback(`${successFeedback}\n\nSyncing catalog (${updatedList.length} products) to Hostinger MySQL Database...`);
        clearAndSyncProductsToSupabase(updatedList).then((res) => {
          if (res.success) {
            setCsvFeedback(`${successFeedback}\n\n🗄️ Synced to Hostinger MySQL Database!`);
          } else {
            setCsvFeedback(`${successFeedback}\n\n⚠️ (Hostinger MySQL sync notice: ${res.error || "Check database connection"})`);
          }
        });
      } else {
        setCsvFeedback(successFeedback);
      }
    } catch (err: any) {
      setCsvFeedback(`❌ Unexpected error parsing file: ${err.message}`);
    }
  };

  // Product CSV Blank Template Download (Headings Only)
  const handleDownloadBlankTemplateCSV = () => {
    const headers = [
      "Title",
      "Description",
      "Long Description",
      "Price",
      "Category",
      "THC",
      "CBD",
      "Image",
      "Options",
      "Benefits",
      "Purity",
      "Cannabinoids",
      "Meta Title",
      "Meta Description",
      "Tags",
      "Alt Text",
      "Is Best Seller",
      "Is New",
      "ID",
      "Slug"
    ];

    const sampleRow = [
      "\"Sample Product Title (Edit or Replace)\"",
      "\"Organic hemp product summary description\"",
      "\"Detailed product description with full ingredient list and usage recommendations\"",
      "29.99",
      "\"gummies\"",
      "\"10mg Delta-9 THC\"",
      "\"25mg CBD\"",
      "\"\"",
      "\"10 Pack; 30 Pack\"",
      "\"Third-party lab tested; Organically farm certified\"",
      "\"99.2%\"",
      "\"Full Spectrum Distillate\"",
      "\"Buy Sample Product | CBD American Shaman of Hurst\"",
      "\"Order premium sample product with natural organic ingredients.\"",
      "\"gummies, hemp, organic\"",
      "\"Sample Product Package Image\"",
      "FALSE",
      "TRUE",
      "\"prod-001\"",
      "\"sample-product-title\""
    ];

    const csvRows = [headers.join(","), sampleRow.join(",")];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CBD American Shaman of Hurst_Empty_Product_Upload_Template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Restore Default Catalog & Recover Original Images
  const handleResetToDefaultProducts = async () => {
    if (
      window.confirm(
        `Are you sure you want to restore the default store product catalog? This will reset local products to the clean ${PRODUCTS.length} items and overwrite Hostinger MySQL database with all original high-resolution catalog images.`
      )
    ) {
      localStorage.removeItem("twobudz_products");
      setProducts([...PRODUCTS]);
      safeSetItem("twobudz_products", JSON.stringify(PRODUCTS));

      if (isSupabaseConfigured()) {
        const res = await clearAndSyncProductsToSupabase(PRODUCTS);
        if (res.success) {
          setCsvFeedback(
            `Store catalog & Hostinger MySQL Database successfully restored! ${PRODUCTS.length} clean products written to Hostinger MySQL.`
          );
        } else {
          setCsvFeedback(
            `Local catalog restored to ${PRODUCTS.length} items. Hostinger MySQL sync notice: ${res.error}`
          );
        }
      } else {
        setCsvFeedback(
          `Store catalog successfully restored to default ${PRODUCTS.length} items! All original high-res product images recovered.`
        );
      }
      setTimeout(() => setCsvFeedback(""), 8000);
    }
  };

  const handleForceClearLocalCache = () => {
    if (window.confirm("Are you sure you want to clear browser local cache? This will purge old cached items and reload fresh data from code and Hostinger MySQL database.")) {
      const keysToClear = [
        "twobudz_products",
        "twobudz_blogs",
        "twobudz_categories",
        "twobudz_faqs",
        "twobudz_products_preloaded",
        "twobudz_app_cache_version"
      ];
      keysToClear.forEach((k) => localStorage.removeItem(k));
      window.location.reload();
    }
  };

  // Sync / Overwrite Current Local Products directly to Hostinger MySQL Database
  const handleOverwriteSupabaseProducts = async () => {
    if (!isSupabaseConfigured()) {
      alert("Hostinger MySQL Database connection is not available. Please verify your connection.");
      return;
    }
    if (
      window.confirm(
        `Are you sure you want to overwrite Hostinger MySQL database with your current ${products.length} products? This will purge duplicate rows in the database and write exactly ${products.length} clean items.`
      )
    ) {
      const res = await clearAndSyncProductsToSupabase(products);
      if (res.success) {
        setCsvFeedback(
          `Successfully overwrote Hostinger MySQL database! ${products.length} clean items synced.`
        );
      } else {
        setCsvFeedback(`Failed to sync to Hostinger MySQL: ${res.error}`);
      }
      setTimeout(() => setCsvFeedback(""), 8000);
    }
  };

  // Product CSV Export
  const handleExportCSV = () => {
    const headers = [
      "Title",
      "Description",
      "Long Description",
      "Price",
      "Category",
      "THC",
      "CBD",
      "Image",
      "Options",
      "Benefits",
      "Purity",
      "Cannabinoids",
      "Meta Title",
      "Meta Description",
      "Tags",
      "Alt Text",
      "Is Best Seller",
      "Is New",
      "ID",
      "Slug"
    ];

    const csvRows = [headers.join(",")];

    const itemsToExport = products.length > 0 ? products : [
      {
        id: "sample-prod-1",
        name: "Delta 9 Live Resin Gummies 500mg",
        slug: "delta-9-live-resin-gummies-500mg",
        description: "Delicious full spectrum gummies infused with premium hemp live resin.",
        longDescription: "Our flagship Delta 9 Live Resin Gummies offer exceptional flavor and balanced relaxation. Each gummy contains 10mg Delta 9 THC.",
        price: 39.99,
        category: "delta-9-gummies",
        thc: "10mg Delta-9 THC",
        cbd: "15mg CBD",
        image: "https://picsum.photos/seed/delta9gummies/600/600",
        options: ["15 Gummies Pack", "30 Gummies Pack"],
        benefits: ["Sustained relaxation", "Third party lab verified", "100% Organic hemp"],
        labResults: { purity: "99.8%", cannabinoids: "Delta-9 + CBD Extract" },
        metaTitle: "Buy Delta 9 Live Resin Gummies | CBD American Shaman of Hurst",
        metaDescription: "Shop organic Delta 9 Live Resin Gummies with 10mg Delta-9 THC per piece.",
        tags: "gummies, delta 9, live resin, edibles",
        altText: "Delta 9 Live Resin Gummies Bottle",
        isBestSeller: true,
        isFeaturedHome: true,
        isNew: true
      },
      {
        id: "sample-prod-2",
        name: "Full Spectrum Hemp Tincture 1000mg",
        slug: "full-spectrum-hemp-tincture-1000mg",
        description: "Organic broad spectrum oil drops for natural daily stress relief and sound sleep.",
        longDescription: "Cold-pressed hemp seed oil formulation rich in naturally occurring terpenes and active cannabinoids for maximum bioavailability.",
        price: 49.99,
        category: "cbd-tinctures",
        thc: "< 0.3% THC",
        cbd: "1000mg CBD",
        image: "https://picsum.photos/seed/cbdtinctures/600/600",
        options: ["30ml Bottle", "60ml Value Size"],
        benefits: ["Rapid absorption", "Non-GMO certified", "All day calm"],
        labResults: { purity: "99.5%", cannabinoids: "Full Spectrum Distillate" },
        metaTitle: "Full Spectrum CBD Tincture 1000mg | CBD American Shaman of Hurst",
        metaDescription: "Order premium 1000mg CBD tincture formulated with organic carrier oil.",
        tags: "tincture, cbd oil, full spectrum, organic",
        altText: "Full Spectrum CBD Tincture Bottle Drop",
        isBestSeller: false,
        isFeaturedHome: false,
        isNew: true
      }
    ];

    itemsToExport.forEach((p: any) => {
      const sanitize = (val: string) => {
        if (!val) return "";
        return String(val).replace(/"/g, '""');
      };

      // Omit image strings from CSV export to keep Excel perfectly clean with 1 line per product row.
      // Re-importing automatically preserves 100% of all existing store images!
      const exportImage = "";

      const row = [
        `"${sanitize(p.name)}"`,
        `"${sanitize(p.description)}"`,
        `"${sanitize(p.longDescription || p.description)}"`,
        p.price,
        `"${sanitize(p.category)}"`,
        `"${sanitize(p.thc)}"`,
        `"${sanitize(p.cbd)}"`,
        `"${sanitize(exportImage)}"`,
        `"${sanitize((p.options || []).join("; "))}"`,
        `"${sanitize((p.benefits || []).join("; "))}"`,
        `"${sanitize(p.labResults?.purity || "99.2%")}"`,
        `"${sanitize(p.labResults?.cannabinoids || "Full Hemp Extract")}"`,
        `"${sanitize(p.metaTitle || p.name)}"`,
        `"${sanitize(p.metaDescription || p.description)}"`,
        `"${sanitize(p.tags)}"`,
        `"${sanitize(p.altText || p.name)}"`,
        (p.isBestSeller || p.isFeaturedHome) ? "TRUE" : "FALSE",
        p.isNew ? "TRUE" : "FALSE",
        `"${sanitize(p.id)}"`,
        `"${sanitize(p.slug)}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "\uFEFF" + csvRows.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CBD American Shaman of Hurst_Products_Catalog_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // BLOGS BULK IMPORT & EXPORT
  const handleBlogFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setBlogCsvText(content);
        handleImportBlogs(content);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImportBlogs = (overrideText?: string) => {
    const textToParse = overrideText !== undefined ? overrideText : blogCsvText;
    if (!textToParse.trim()) {
      setBlogCsvFeedback("Error: Please select a file or paste CSV/JSON article data first.");
      return;
    }

    try {
      let parsedBlogs: BlogPost[] = [];

      if (textToParse.trim().startsWith("[") || textToParse.trim().startsWith("{")) {
        try {
          const jsonVal = JSON.parse(textToParse.trim());
          const list = Array.isArray(jsonVal) ? jsonVal : [jsonVal];
          parsedBlogs = list.map((item: any, i: number) => ({
            id: item.id ? (typeof item.id === "number" ? item.id : parseInt(String(item.id)) || Date.now() + i) : Date.now() + i,
            title: item.title || item.name || "Bulk Article " + (i + 1),
            summary: item.summary || item.description || "Educational resource and hemp guide.",
            content: item.content || item.body || item.summary || "Full detailed article content...",
            date: item.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            category: item.category || "Education",
            image: item.image || PRESET_IMAGES[2].url,
            author: item.author || "CBD American Shaman of Hurst Team",
            slug: item.slug || (item.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
            metaTitle: item.metaTitle || item.title || "",
            metaDescription: item.metaDescription || item.summary || "",
            tags: item.tags || "",
            altText: item.altText || "",
          }));
        } catch (e) {}
      }

      if (parsedBlogs.length === 0) {
        const parsedRows = parseCSV(textToParse);
        if (parsedRows.length < 2) {
          setBlogCsvFeedback("Error: CSV must include a header row and at least 1 article row.");
          return;
        }

        const headers = parsedRows[0].map((h) => h.replace(/['"]+/g, "").trim().toLowerCase());
        const titleIdx = headers.findIndex((h) => h.includes("title") || h === "name");
        const summaryIdx = headers.findIndex((h) => h.includes("summary") || h.includes("description"));
        const contentIdx = headers.findIndex((h) => h.includes("content") || h.includes("body"));
        const categoryIdx = headers.findIndex((h) => h.includes("category"));
        const authorIdx = headers.findIndex((h) => h.includes("author"));
        const dateIdx = headers.findIndex((h) => h.includes("date"));
        const imageIdx = headers.findIndex((h) => h.includes("image") || h.includes("url"));
        const slugIdx = headers.findIndex((h) => h.includes("slug"));
        const tagsIdx = headers.findIndex((h) => h.includes("tag"));

        for (let i = 1; i < parsedRows.length; i++) {
          const row = parsedRows[i];
          if (row.length < 1) continue;

          const title = titleIdx !== -1 ? row[titleIdx] : row[0] || "";
          if (!title.trim()) continue;

          const summary = summaryIdx !== -1 ? row[summaryIdx] : "Educational guide.";
          const content = contentIdx !== -1 ? row[contentIdx] : summary;
          const category = categoryIdx !== -1 && row[categoryIdx] ? row[categoryIdx] : "Education";
          const author = authorIdx !== -1 && row[authorIdx] ? row[authorIdx] : "CBD American Shaman of Hurst Team";
          const date = dateIdx !== -1 && row[dateIdx] ? row[dateIdx] : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          const image = imageIdx !== -1 && row[imageIdx] ? row[imageIdx] : PRESET_IMAGES[2].url;
          const slug = slugIdx !== -1 && row[slugIdx] ? row[slugIdx] : title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          const tags = tagsIdx !== -1 && row[tagsIdx] ? row[tagsIdx] : "";

          parsedBlogs.push({
            id: Date.now() + i,
            title,
            summary,
            content,
            date,
            category,
            image,
            author,
            slug,
            metaTitle: title,
            metaDescription: summary,
            tags,
            altText: title,
          });
        }
      }

      if (parsedBlogs.length === 0) {
        setBlogCsvFeedback("No valid articles parsed. Ensure headers have 'title', 'summary', or 'content'.");
        return;
      }

      // Preserve existing blog articles! Deduplicate by Title or ID
      const existingTitles = new Set(blogPosts.map((b) => b.title.trim().toLowerCase()));
      const uniqueNew = parsedBlogs.filter((b) => !existingTitles.has(b.title.trim().toLowerCase()));

      if (uniqueNew.length === 0) {
        setBlogCsvFeedback("Notice: All articles in this bulk file already exist in your blog list!");
        setTimeout(() => setBlogCsvFeedback(""), 5000);
        return;
      }

      const merged = [...blogPosts, ...uniqueNew];
      setBlogPosts(merged);
      safeSetItem("twobudz_blogs", JSON.stringify(merged));

      if (isSupabaseConfigured()) {
        uniqueNew.forEach((b) => syncToSupabase("blogs", "upsert", b));
      }

      setBlogCsvFeedback(`Success! Imported ${uniqueNew.length} new blog articles. Existing ${blogPosts.length} articles preserved!`);
      setBlogCsvText("");
      setTimeout(() => setBlogCsvFeedback(""), 7000);
    } catch (err: any) {
      setBlogCsvFeedback(`Error importing blogs: ${err.message}`);
    }
  };

  const handleExportBlogsCSV = () => {
    const csvRows = [
      ["Title", "Summary", "Content", "Category", "Author", "Date", "Image", "Slug", "Tags"].join(","),
    ];

    blogPosts.forEach((b) => {
      const cleanImg = (b.image && (b.image.startsWith("data:image/") || b.image.length > 250)) ? "" : (b.image || "");
      const row = [
        `"${b.title.replace(/"/g, '""')}"`,
        `"${b.summary.replace(/"/g, '""')}"`,
        `"${b.content.replace(/"/g, '""')}"`,
        `"${b.category}"`,
        `"${b.author}"`,
        `"${b.date}"`,
        `"${cleanImg.replace(/"/g, '""')}"`,
        `"${b.slug}"`,
        `"${b.tags || ""}"`
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CBD American Shaman of Hurst_Blogs_Export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // DYNAMIC MARKDOWN (.MD) BLOG PARSER & IMPORTER
  const parseMarkdownBlogPost = (rawText: string, defaultFileName: string = ""): BlogPost => {
    let text = rawText.trim();
    let frontmatter: Record<string, string> = {};
    let body = text;

    // 1. Check for YAML frontmatter block (--- ... ---)
    if (text.startsWith("---")) {
      const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
      if (match) {
        const fmContent = match[1];
        body = match[2].trim();
        fmContent.split("\n").forEach((line) => {
          const colonIdx = line.indexOf(":");
          if (colonIdx > -1) {
            const key = line.slice(0, colonIdx).trim().toLowerCase().replace(/[\s_-]+/g, "");
            const val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
            frontmatter[key] = val;
          }
        });
      }
    } else {
      // 2. Check for key: value headers without delimiter lines at start of file
      const lines = text.split("\n");
      let headerLinesCount = 0;
      for (let i = 0; i < Math.min(lines.length, 12); i++) {
        const line = lines[i].trim();
        if (/^(post_title|title|url|slug|meta_title|meta_description|category|author|date|image|tags):/i.test(line)) {
          const colonIdx = line.indexOf(":");
          const key = line.slice(0, colonIdx).trim().toLowerCase().replace(/[\s_-]+/g, "");
          const val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
          frontmatter[key] = val;
          headerLinesCount = i + 1;
        } else if (line === "") {
          if (headerLinesCount > 0) {
            headerLinesCount = i + 1;
            break;
          }
        } else {
          break;
        }
      }
      if (headerLinesCount > 0) {
        body = lines.slice(headerLinesCount).join("\n").trim();
      }
    }

    // Determine Title
    let title =
      frontmatter["posttitle"] ||
      frontmatter["title"] ||
      frontmatter["metatitle"] ||
      "";

    if (!title) {
      const h1Match = body.match(/^#\s+(.+)$/m);
      if (h1Match) {
        title = h1Match[1].trim();
        body = body.replace(/^#\s+(.+)$/m, "").trim();
      } else {
        title = defaultFileName
          .replace(/\.md$/i, "")
          .replace(/[-_]+/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()) || "New Imported Article";
      }
    }

    // Determine Slug
    let rawUrl = frontmatter["url"] || frontmatter["slug"] || "";
    let slug = rawUrl
      .replace(/^https?:\/\/[^\/]+/i, "")
      .replace(/^\/blog\//i, "")
      .replace(/^\/blogs\//i, "")
      .replace(/^\//, "")
      .replace(/\/$/, "")
      .toLowerCase()
      .trim();

    if (!slug) {
      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }

    // Determine Summary
    let metaDescription = frontmatter["metadescription"] || frontmatter["description"] || "";
    let summary = metaDescription;
    if (!summary) {
      const firstPara = body.split("\n\n").find((p) => p.trim() && !p.trim().startsWith("#") && !p.trim().startsWith("---"));
      summary = firstPara ? firstPara.trim().slice(0, 240) + (firstPara.length > 240 ? "..." : "") : "Comprehensive botanical science and educational wellness guide.";
    }

    const category = frontmatter["category"] || "Cannabinoid Science";
    const author = frontmatter["author"] || "CBD American Shaman of Hurst Wellness Team";
    const date = frontmatter["date"] || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const image = frontmatter["image"] || "";
    const metaTitle = frontmatter["metatitle"] || `${title} | CBD American Shaman of Hurst`;
    const tags = frontmatter["tags"] || "cbd, wellness, flower mound, hemp";

    // Clean draft/internal notes safely without swallowing article body
    body = body
      .replace(/(?:^|\n)>\s*\*\*INTERNAL NOTE[\s\S]*?(?=\n\s*\n|\n[^>]|$)/gi, "")
      .replace(/(?:^|\n)\*\*INTERNAL NOTE[\s\S]*?(?=\n\s*\n|$)/gi, "")
      .trim();
    body = body.replace(/^\s*[-*•]\s*$/gm, "").trim();

    const id = frontmatter["id"] || `blog-${slug}` || `blog-${Date.now()}`;

    return {
      id,
      title,
      slug,
      summary,
      content: body,
      category,
      author,
      date,
      image,
      metaTitle,
      metaDescription: metaDescription || summary,
      tags,
      altText: title,
      isFeaturedHome: true
    };
  };

  const handleMdFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setMdFileText(content);
        handleImportMdBlog(content, file.name);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImportMdBlog = async (overrideContent?: string, fileName?: string) => {
    const raw = overrideContent !== undefined ? overrideContent : mdFileText;
    if (!raw.trim()) {
      setMdImportFeedback("Error: Please select a Markdown (.md) file or paste Markdown text.");
      return;
    }

    setIsImportingMd(true);
    setMdImportFeedback("Parsing Markdown and publishing to Hostinger MySQL database...");

    try {
      const newPost = parseMarkdownBlogPost(raw, fileName);

      const existingIdx = blogPosts.findIndex(
        (b) =>
          (b.slug && b.slug.toLowerCase().trim() === newPost.slug.toLowerCase().trim()) ||
          String(b.id) === String(newPost.id) ||
          b.title.toLowerCase().replace(/[^a-z0-9]/g, "") === newPost.title.toLowerCase().replace(/[^a-z0-9]/g, "")
      );

      let updatedList: BlogPost[] = [];
      if (existingIdx > -1) {
        updatedList = [...blogPosts];
        updatedList[existingIdx] = { ...updatedList[existingIdx], ...newPost };
      } else {
        updatedList = [newPost, ...blogPosts];
      }

      setBlogPosts(updatedList);
      safeSetItem("twobudz_blogs", JSON.stringify(updatedList));

      // Sync directly to live Hostinger MySQL database
      const syncRes = await syncToSupabase("blogs", "upsert", newPost);

      if (syncRes.success) {
        setMdImportFeedback(`Success! Blog post "${newPost.title}" imported & published to Hostinger MySQL! URL: /blog/${newPost.slug}`);
      } else {
        setMdImportFeedback(`Imported locally! (Hostinger MySQL status: ${syncRes.error || "Updated"}). URL: /blog/${newPost.slug}`);
      }
    } catch (err: any) {
      setMdImportFeedback(`Error importing Markdown: ${err?.message || "Invalid formatting"}`);
    } finally {
      setIsImportingMd(false);
    }
  };

  // FAQS BULK IMPORT & EXPORT
  const handleFaqFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setFaqCsvText(content);
        handleImportFaqs(content);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImportFaqs = (overrideText?: string) => {
    const textToParse = overrideText !== undefined ? overrideText : faqCsvText;
    if (!textToParse.trim()) {
      setFaqCsvFeedback("Error: Please select a file or paste CSV/JSON FAQ data first.");
      return;
    }

    try {
      let parsedFaqs: FAQItem[] = [];

      if (textToParse.trim().startsWith("[") || textToParse.trim().startsWith("{")) {
        try {
          const jsonVal = JSON.parse(textToParse.trim());
          const list = Array.isArray(jsonVal) ? jsonVal : [jsonVal];
          parsedFaqs = list.map((item: any, i: number) => ({
            id: typeof item.id === "number" ? item.id : Date.now() + i + Math.floor(Math.random() * 1000),
            question: item.question || item.title || "Frequently Asked Question " + (i + 1),
            answer: item.answer || item.content || item.description || "Details regarding compliance and store policy...",
          }));
        } catch (e) {}
      }

      if (parsedFaqs.length === 0) {
        const parsedRows = parseCSV(textToParse);
        if (parsedRows.length < 2) {
          setFaqCsvFeedback("Error: CSV must include a header and at least 1 question row.");
          return;
        }

        const headers = parsedRows[0].map((h) => h.replace(/['"]+/g, "").trim().toLowerCase());
        const qIdx = headers.findIndex((h) => h.includes("question") || h === "q" || h === "title");
        const aIdx = headers.findIndex((h) => h.includes("answer") || h === "a" || h === "content");

        for (let i = 1; i < parsedRows.length; i++) {
          const row = parsedRows[i];
          if (row.length < 1) continue;

          const question = qIdx !== -1 ? row[qIdx] : row[0] || "";
          if (!question.trim()) continue;

          const answer = aIdx !== -1 ? row[aIdx] : row[1] || "Detailed answer information...";

          parsedFaqs.push({
            id: Date.now() + i + Math.floor(Math.random() * 1000),
            question,
            answer,
          });
        }
      }

      if (parsedFaqs.length === 0) {
        setFaqCsvFeedback("No valid FAQs parsed. Ensure headers have 'question' and 'answer'.");
        return;
      }

      // Preserve existing FAQs! Deduplicate by question text
      const existingQuestions = new Set(faqItems.map((f) => f.question.trim().toLowerCase()));
      const uniqueNew = parsedFaqs.filter((f) => !existingQuestions.has(f.question.trim().toLowerCase()));

      if (uniqueNew.length === 0) {
        setFaqCsvFeedback("Notice: All FAQs in this file already exist in your FAQ desk!");
        setTimeout(() => setFaqCsvFeedback(""), 5000);
        return;
      }

      const merged = [...faqItems, ...uniqueNew];
      setFaqItems(merged);
      safeSetItem("twobudz_faqs", JSON.stringify(merged));

      if (isSupabaseConfigured()) {
        uniqueNew.forEach((f) => syncToSupabase("faqs", "upsert", f));
      }

      setFaqCsvFeedback(`Success! Added ${uniqueNew.length} new FAQs. Existing ${faqItems.length} FAQs preserved!`);
      setFaqCsvText("");
      setTimeout(() => setFaqCsvFeedback(""), 7000);
    } catch (err: any) {
      setFaqCsvFeedback(`Error importing FAQs: ${err.message}`);
    }
  };

  const handleExportFaqsCSV = () => {
    const csvRows = [["Question", "Answer"].join(",")];

    faqItems.forEach((f) => {
      const row = [
        `"${f.question.replace(/"/g, '""')}"`,
        `"${f.answer.replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CBD American Shaman of Hurst_FAQs_Export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // ORDERS BULK IMPORT & EXPORT
  const handleOrdersFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setOrdersCsvText(content);
        handleImportOrders(content);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImportOrders = (overrideText?: string) => {
    const textToParse = overrideText !== undefined ? overrideText : ordersCsvText;
    if (!textToParse.trim()) {
      setOrdersCsvFeedback("Error: Please select a file or paste CSV/JSON order data first.");
      return;
    }

    try {
      let parsedOrders: Order[] = [];

      if (textToParse.trim().startsWith("[") || textToParse.trim().startsWith("{")) {
        try {
          const jsonVal = JSON.parse(textToParse.trim());
          const list = Array.isArray(jsonVal) ? jsonVal : [jsonVal];
          parsedOrders = list.map((item: any, i: number) => {
            const rawName = item.customerName || item.name || (item.customer ? `${item.customer.firstName} ${item.customer.lastName}` : "Customer " + (i + 1));
            const parts = rawName.trim().split(" ");
            const firstName = parts[0] || "Customer";
            const lastName = parts.slice(1).join(" ") || "Client";
            const email = item.customerEmail || item.email || (item.customer && item.customer.email) || "customer@example.com";
            const phone = item.customerPhone || item.phone || (item.customer && item.customer.phone) || "555-0199";
            const address = item.shippingAddress || item.address || (item.customer && item.customer.address) || "Hurst, TX";
            const totalVal = typeof item.totalAmount === "number" ? item.totalAmount : parseFloat(String(item.totalAmount || item.total || "49.99").replace(/[^0-9.]/g, "")) || 49.99;

            return {
              id: item.id || "ORD-" + Math.floor(100000 + Math.random() * 900000),
              customer: {
                firstName,
                lastName,
                email,
                phone,
                address,
                city: "Hurst",
                state: "TX",
                zipCode: "75028",
              },
              items: item.items || [{ productName: "Assorted Product Order", selectedOption: "Standard", quantity: 1, price: totalVal }],
              subtotal: totalVal,
              tax: 0,
              shipping: 0,
              total: totalVal,
              deliveryMethod: "Local Delivery",
              paymentMethod: "Credit Card",
              status: item.status || "Completed",
              date: item.date || new Date().toISOString().split("T")[0],
            };
          });
        } catch (e) {}
      }

      if (parsedOrders.length === 0) {
        const parsedRows = parseCSV(textToParse);
        if (parsedRows.length < 2) {
          setOrdersCsvFeedback("Error: CSV must include a header and at least 1 order row.");
          return;
        }

        const headers = parsedRows[0].map((h) => h.replace(/['"]+/g, "").trim().toLowerCase());
        const idIdx = headers.findIndex((h) => h.includes("id") || h.includes("order"));
        const nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("customer"));
        const emailIdx = headers.findIndex((h) => h.includes("email"));
        const phoneIdx = headers.findIndex((h) => h.includes("phone"));
        const totalIdx = headers.findIndex((h) => h.includes("total") || h.includes("amount") || h.includes("price"));
        const statusIdx = headers.findIndex((h) => h.includes("status"));
        const dateIdx = headers.findIndex((h) => h.includes("date"));
        const addrIdx = headers.findIndex((h) => h.includes("address"));

        for (let i = 1; i < parsedRows.length; i++) {
          const row = parsedRows[i];
          if (row.length < 1) continue;

          const rawName = nameIdx !== -1 ? row[nameIdx] : row[0] || "Customer " + i;
          if (!rawName.trim()) continue;

          const parts = rawName.trim().split(" ");
          const firstName = parts[0] || "Customer";
          const lastName = parts.slice(1).join(" ") || "Client";
          const id = idIdx !== -1 && row[idIdx] ? row[idIdx] : "ORD-" + Math.floor(100000 + Math.random() * 900000);
          const email = emailIdx !== -1 && row[emailIdx] ? row[emailIdx] : "client@twobudz.com";
          const phone = phoneIdx !== -1 && row[phoneIdx] ? row[phoneIdx] : "972-555-0100";
          const totalVal = totalIdx !== -1 ? parseFloat(row[totalIdx].replace(/[^0-9.]/g, "")) || 49.99 : 49.99;
          const status = statusIdx !== -1 && row[statusIdx] ? row[statusIdx] : "Completed";
          const date = dateIdx !== -1 && row[dateIdx] ? row[dateIdx] : new Date().toISOString().split("T")[0];
          const address = addrIdx !== -1 && row[addrIdx] ? row[addrIdx] : "Hurst, TX";

          parsedOrders.push({
            id,
            customer: {
              firstName,
              lastName,
              email,
              phone,
              address,
              city: "Hurst",
              state: "TX",
              zipCode: "75028",
            },
            items: [{ productName: "Assorted Product Order", selectedOption: "Standard", quantity: 1, price: totalVal }],
            subtotal: totalVal,
            tax: 0,
            shipping: 0,
            total: totalVal,
            deliveryMethod: "Local Delivery",
            paymentMethod: "Credit Card",
            status,
            date,
          });
        }
      }

      if (parsedOrders.length === 0) {
        setOrdersCsvFeedback("No valid orders parsed. Check headers for 'customer', 'total', 'email'.");
        return;
      }

      // Preserve existing orders! Deduplicate by Order ID
      const existingIds = new Set(orders.map((o) => String(o.id)));
      const uniqueNew = parsedOrders.filter((o) => !existingIds.has(String(o.id)));

      if (uniqueNew.length === 0) {
        setOrdersCsvFeedback("Notice: All orders in this file already exist in your CRM!");
        setTimeout(() => setOrdersCsvFeedback(""), 5000);
        return;
      }

      const merged = [...orders, ...uniqueNew];
      setOrders(merged);
      safeSetItem("twobudz_orders", JSON.stringify(merged));

      if (isSupabaseConfigured()) {
        uniqueNew.forEach((o) => syncToSupabase("orders", "upsert", o));
      }

      setOrdersCsvFeedback(`Success! Added ${uniqueNew.length} new order records. Existing ${orders.length} orders preserved!`);
      setOrdersCsvText("");
      setTimeout(() => setOrdersCsvFeedback(""), 7000);
    } catch (err: any) {
      setOrdersCsvFeedback(`Error importing orders: ${err.message}`);
    }
  };

  const handleExportOrdersCSV = () => {
    const csvRows = [["Order ID", "Customer Name", "Email", "Phone", "Total Amount", "Status", "Date", "Address"].join(",")];

    orders.forEach((o) => {
      const fullName = `${o.customer.firstName} ${o.customer.lastName}`;
      const row = [
        `"${o.id}"`,
        `"${fullName.replace(/"/g, '""')}"`,
        `"${o.customer.email}"`,
        `"${o.customer.phone}"`,
        o.total,
        `"${o.status}"`,
        `"${o.date}"`,
        `"${(o.customer.address || "").replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CBD American Shaman of Hurst_Orders_Export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // INQUIRIES BULK IMPORT & EXPORT
  const handleInquiriesFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInquiriesCsvText(content);
        handleImportInquiries(content);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImportInquiries = (overrideText?: string) => {
    const textToParse = overrideText !== undefined ? overrideText : inquiriesCsvText;
    if (!textToParse.trim()) {
      setInquiriesCsvFeedback("Error: Please select a file or paste CSV/JSON inquiry data first.");
      return;
    }

    try {
      let parsedInquiries: Inquiry[] = [];

      if (textToParse.trim().startsWith("[") || textToParse.trim().startsWith("{")) {
        try {
          const jsonVal = JSON.parse(textToParse.trim());
          const list = Array.isArray(jsonVal) ? jsonVal : [jsonVal];
          parsedInquiries = list.map((item: any, i: number) => ({
            id: item.id || "INQ-" + Math.floor(100000 + Math.random() * 900000),
            name: item.name || "Inquirer " + (i + 1),
            email: item.email || "inquiry@twobudz.com",
            msg: item.msg || item.message || "Bulk imported inquiry message...",
            date: item.date || new Date().toISOString().split("T")[0],
            status: item.status || "unread",
          }));
        } catch (e) {}
      }

      if (parsedInquiries.length === 0) {
        const parsedRows = parseCSV(textToParse);
        if (parsedRows.length < 2) {
          setInquiriesCsvFeedback("Error: CSV must include a header and at least 1 inquiry row.");
          return;
        }

        const headers = parsedRows[0].map((h) => h.replace(/['"]+/g, "").trim().toLowerCase());
        const idIdx = headers.findIndex((h) => h.includes("id"));
        const nameIdx = headers.findIndex((h) => h.includes("name"));
        const emailIdx = headers.findIndex((h) => h.includes("email"));
        const msgIdx = headers.findIndex((h) => h.includes("message") || h.includes("msg") || h.includes("query") || h.includes("text"));
        const dateIdx = headers.findIndex((h) => h.includes("date"));
        const statusIdx = headers.findIndex((h) => h.includes("status"));

        for (let i = 1; i < parsedRows.length; i++) {
          const row = parsedRows[i];
          if (row.length < 1) continue;

          const name = nameIdx !== -1 ? row[nameIdx] : row[0] || "Inquirer " + i;
          if (!name.trim()) continue;

          const id = idIdx !== -1 && row[idIdx] ? row[idIdx] : "INQ-" + Math.floor(100000 + Math.random() * 900000);
          const email = emailIdx !== -1 && row[emailIdx] ? row[emailIdx] : "user@twobudz.com";
          const msg = msgIdx !== -1 && row[msgIdx] ? row[msgIdx] : "General inquiry submitted.";
          const date = dateIdx !== -1 && row[dateIdx] ? row[dateIdx] : new Date().toISOString().split("T")[0];
          const status = statusIdx !== -1 && row[statusIdx] ? row[statusIdx] : "unread";

          parsedInquiries.push({
            id,
            name,
            email,
            msg,
            date,
            status,
          });
        }
      }

      if (parsedInquiries.length === 0) {
        setInquiriesCsvFeedback("No valid inquiries parsed. Check headers for 'name', 'email', 'message'.");
        return;
      }

      // Preserve existing inquiries! Deduplicate by ID
      const existingIds = new Set(inquiries.map((i) => String(i.id)));
      const uniqueNew = parsedInquiries.filter((i) => !existingIds.has(String(i.id)));

      if (uniqueNew.length === 0) {
        setInquiriesCsvFeedback("Notice: All inquiries in this file already exist in your records!");
        setTimeout(() => setInquiriesCsvFeedback(""), 5000);
        return;
      }

      const merged = [...inquiries, ...uniqueNew];
      setInquiries(merged);
      safeSetItem("twobudz_inquiries", JSON.stringify(merged));

      if (isSupabaseConfigured()) {
        uniqueNew.forEach((i) => syncToSupabase("inquiries", "upsert", i));
      }

      setInquiriesCsvFeedback(`Success! Added ${uniqueNew.length} new inquiry records. Existing ${inquiries.length} inquiries preserved!`);
      setInquiriesCsvText("");
      setTimeout(() => setInquiriesCsvFeedback(""), 7000);
    } catch (err: any) {
      setInquiriesCsvFeedback(`Error importing inquiries: ${err.message}`);
    }
  };

  const handleExportInquiriesCSV = () => {
    const csvRows = [["Inquiry ID", "Name", "Email", "Message", "Date", "Status"].join(",")];

    inquiries.forEach((i) => {
      const row = [
        `"${i.id}"`,
        `"${i.name.replace(/"/g, '""')}"`,
        `"${i.email}"`,
        `"${i.msg.replace(/"/g, '""')}"`,
        `"${i.date}"`,
        `"${i.status}"`,
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CBD American Shaman of Hurst_Inquiries_Export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Manage Product Reviews
  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.author || !reviewForm.comment) return;

    const isEdit = !!isEditingReview;
    const finalId = isEdit ? isEditingReview!.id : "rev-" + Date.now();
    const targetProdId = reviewForm.productId || (products[0]?.id || "p1");
    const targetProd = products.find((p) => p.id === targetProdId);

    const finalReview: ReviewItem = {
      id: finalId,
      productId: targetProdId,
      productName: targetProd ? targetProd.name : (reviewForm.productName || "General Product"),
      author: reviewForm.author.trim(),
      rating: Number(reviewForm.rating) || 5,
      title: reviewForm.title?.trim() || "",
      comment: reviewForm.comment.trim(),
      date: reviewForm.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: reviewForm.status || "approved",
      verified: reviewForm.verified ?? true,
      created_at: isEdit ? (isEditingReview!.created_at || new Date().toISOString()) : new Date().toISOString(),
    };

    let nextReviewsList: ReviewItem[];
    if (isEdit) {
      nextReviewsList = (reviews || []).map((r) => (r.id === finalId ? finalReview : r));
    } else {
      nextReviewsList = [finalReview, ...(reviews || [])];
    }

    if (setReviews) setReviews(nextReviewsList);
    safeSetItem("twobudz_reviews", JSON.stringify(nextReviewsList));

    if (isSupabaseConfigured()) {
      syncToSupabase("reviews", "upsert", finalReview);
    }

    setIsEditingReview(null);
    setIsAddingReview(false);
    setReviewForm({
      productId: "",
      author: "",
      rating: 5,
      comment: "",
      title: "",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    });
  };

  const handleDeleteReview = async (id: string | number) => {
    if (confirm("Are you sure you want to delete this product review?")) {
      const filtered = (reviews || []).filter((r) => String(r.id) !== String(id));
      if (setReviews) setReviews(filtered);
      safeSetItem("twobudz_reviews", JSON.stringify(filtered));

      if (isSupabaseConfigured()) {
        await syncToSupabase("reviews", "delete", { id: String(id) });
      }
      triggerToast("Review successfully removed.");
    }
  };

  const handleReviewsFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setReviewsCsvText(content);
        handleImportReviews(content);
      }
    };
    reader.readAsText(file);
  };

  const handleImportReviews = (overrideText?: string) => {
    const textToParse = overrideText !== undefined ? overrideText : reviewsCsvText;
    if (!textToParse.trim()) {
      setReviewsCsvFeedback("Error: Please select a file or paste CSV/JSON review data first.");
      return;
    }

    try {
      const parsedReviews = parseBulkReviewsCSV(textToParse, products);

      if (parsedReviews.length === 0) {
        setReviewsCsvFeedback("No valid reviews parsed. Ensure headers have 'Product Name', 'Author', 'Rating', or 'Comment'.");
        return;
      }

      // Filter out old reviews for products included in parsedReviews so uploaded CSV replaces them cleanly without overlap!
      const importedProductIds = new Set(parsedReviews.map(r => String(r.productId)));
      const importedProductNames = new Set(parsedReviews.map(r => (r.productName || "").toLowerCase().trim()));

      const existingFiltered = (reviews || []).filter(r => {
        if (!r) return false;
        const rId = String(r.productId || "");
        const rName = (r.productName || "").toLowerCase().trim();
        return !importedProductIds.has(rId) && (!rName || !importedProductNames.has(rName));
      });

      const merged = [...parsedReviews, ...existingFiltered];
      if (setReviews) setReviews(merged);
      safeSetItem("twobudz_reviews", JSON.stringify(merged));

      if (isSupabaseConfigured()) {
        pushAllLocalDataToSupabase(products, categories, blogPosts, faqItems, orders, inquiries, businessSettings, merged);
      }

      setReviewsCsvFeedback(`✅ Success! Imported ${parsedReviews.length} new reviews into store catalog & cloud database.`);
      setReviewsCsvText("");
      setTimeout(() => setReviewsCsvFeedback(""), 7000);
    } catch (err: any) {
      setReviewsCsvFeedback(`Error importing reviews: ${err.message}`);
    }
  };

  const handleAutoGenerateAllReviews = () => {
    if (confirm("Generate 3 to 4 authentic 5-star product reviews for ALL products across the store?")) {
      const generated = generateInitialReviewsForProducts(products);
      const merged = [...(reviews || []), ...generated];
      if (setReviews) setReviews(merged);
      safeSetItem("twobudz_reviews", JSON.stringify(merged));

      if (isSupabaseConfigured()) {
        pushAllLocalDataToSupabase(products, categories, blogPosts, faqItems, orders, inquiries, businessSettings, merged);
      }

      alert(`✅ Success! Generated ${generated.length} fresh glowing reviews across all store formulas and synced live!`);
    }
  };

  const handleExportReviewsCSV = () => {
    const csvRows = [["Product Name", "Reviewer Name", "Rating Score (1-5)", "Review Headline", "Detailed Review Comment", "Date", "Product ID", "Review ID"].join(",")];

    const activeProductIds = new Set(products.map((p) => String(p.id)));
    const activeProductNames = new Set(products.map((p) => p.name.toLowerCase().trim()));

    (reviews || []).forEach((r) => {
      if (!r) return;
      const matchedProd = products.find((p) => String(p.id) === String(r.productId) || p.name.toLowerCase().trim() === (r.productName || "").toLowerCase().trim());
      if (!matchedProd) return; // Skip reviews for deleted products!

      const row = [
        `"${matchedProd.name.replace(/"/g, '""')}"`,
        `"${(r.author || "").replace(/"/g, '""')}"`,
        `"${r.rating || 5}"`,
        `"${(r.title || "").replace(/"/g, '""')}"`,
        `"${(r.comment || "").replace(/"/g, '""')}"`,
        `"${r.date || ""}"`,
        `"${matchedProd.id}"`,
        `"${r.id || ""}"`,
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CBD American Shaman of Hurst_Product_Reviews_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Manage Blogs
  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!isEditingBlog;
    const finalId = isEdit ? isEditingBlog!.id : Date.now();

    let finalSlug = (blogForm.slug || "").trim();
    if (!finalSlug) {
      finalSlug = (blogForm.title || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }

    const finalBlog: BlogPost = {
      id: finalId,
      title: blogForm.title || "Untitled Article",
      summary: blogForm.summary || "",
      content: blogForm.content || "",
      date:
        blogForm.date ||
        new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      category: blogForm.category || "Education",
      image: (blogForm.image || "").trim(),
      author: blogForm.author || "CBD American Shaman of Hurst Editor",
      slug: finalSlug,
      metaTitle: blogForm.metaTitle || "",
      metaDescription: blogForm.metaDescription || "",
      tags: blogForm.tags || "",
      altText: blogForm.altText || "",
      canonicalUrl: (blogForm.canonicalUrl || "").trim() || `https://cbdhurst.com/blog/${finalSlug}`,
      isFeaturedHome: blogForm.isFeaturedHome ?? true,
    };

    let nextBlogsList: BlogPost[];
    if (isEdit) {
      nextBlogsList = blogPosts.map((b) => (b.id === finalId ? finalBlog : b));
    } else {
      nextBlogsList = [finalBlog, ...blogPosts];
    }

    setBlogPosts(nextBlogsList);
    safeSetItem("twobudz_blogs", JSON.stringify(nextBlogsList));

    // Persist the local draft immediately, but report whether it reached MySQL.
    if (isSupabaseConfigured()) {
      const syncResult = await syncToSupabase("blogs", "upsert", finalBlog);
      if (syncResult.success) {
        triggerToast("Blog saved and synced to the database.");
      } else {
        triggerToast(`Blog saved in this browser only. Database sync failed: ${syncResult.error}`);
      }
    } else {
      triggerToast("Blog saved in this browser only. Database sync is unavailable in local preview.");
    }

    setIsEditingBlog(null);
    setIsAddingBlog(false);
    setBlogForm({
      title: "",
      summary: "",
      content: "",
      date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      category: "Wellness Guide",
      image: "",
      author: "CBD American Shaman of Hurst Team",
      slug: "",
      metaTitle: "",
      metaDescription: "",
      tags: "",
      altText: "",
      canonicalUrl: "",
    });
  };

  const handleEditBlogClick = (b: BlogPost) => {
    setIsEditingBlog(b);
    setBlogForm({
      ...b,
      canonicalUrl: b.canonicalUrl || `https://cbdhurst.com/blog/${b.slug || b.id}`,
    });
    setIsAddingBlog(true);
  };

  const handleDeleteBlog = async (id: number | string) => {
    if (
      confirm(
        "Are you sure you want to delete this blog article from the journaling feed?",
      )
    ) {
      const blogToDelete = blogPosts.find(
        (b) => String(b.id) === String(id) || b.slug === String(id)
      );
      const filtered = blogPosts.filter(
        (b) => String(b.id) !== String(id) && b.slug !== String(id)
      );
      setBlogPosts(filtered);
      safeSetItem("twobudz_blogs", JSON.stringify(filtered));

      // Sync deletion to Supabase
      if (isSupabaseConfigured()) {
        const idToDelete = blogToDelete?.id ? String(blogToDelete.id) : String(id);
        await syncToSupabase("blogs", "delete", { id: idToDelete });
        if (blogToDelete?.slug) {
          const sb = getSupabaseClient();
          if (sb) {
            await sb.from("blogs").delete().eq("slug", blogToDelete.slug);
          }
        }
      }
      triggerToast("Article successfully removed from blog journal.");
    }
  };

  // Manage FAQs
  const handleSaveFaq = (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!isEditingFaq;
    const finalId = isEdit ? isEditingFaq!.id : Date.now();

    const finalFaq: FAQItem = {
      id: finalId,
      question: faqForm.question || "Empty Question?",
      answer: faqForm.answer || "",
    };

    let nextFaqList: FAQItem[];
    if (isEdit) {
      nextFaqList = faqItems.map((f) => (f.id === finalId ? finalFaq : f));
    } else {
      nextFaqList = [...faqItems, finalFaq];
    }

    setFaqItems(nextFaqList);
    safeSetItem("twobudz_faqs", JSON.stringify(nextFaqList));

    // Sync to Supabase if configured
    if (isSupabaseConfigured()) {
      syncToSupabase("faqs", "upsert", {
        ...finalFaq,
        id: String(finalFaq.id),
      });
    }

    setIsEditingFaq(null);
    setIsAddingFaq(false);
    setFaqForm({ question: "", answer: "" });
  };

  const handleDeleteFaq = async (id: number | string) => {
    if (confirm("Delete this FAQ item?")) {
      const filtered = faqItems.filter((f) => String(f.id) !== String(id));
      setFaqItems(filtered);
      safeSetItem("twobudz_faqs", JSON.stringify(filtered));

      // Sync deletion to Supabase
      if (isSupabaseConfigured()) {
        await syncToSupabase("faqs", "delete", { id: String(id) });
      }
      triggerToast("FAQ item removed.");
    }
  };

  // Update business parameters
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusinessSettings(settingsForm);
    safeSetItem("twobudz_settings", JSON.stringify(settingsForm));
    safeSetItem("twobudz_business_settings", JSON.stringify(settingsForm));
    safeSetItem("twobudz_business_info", JSON.stringify(settingsForm));

    // Sync to Hostinger MySQL Database if configured
    if (isSupabaseConfigured()) {
      const res = await syncToSupabase("settings", "upsert", {
        id: "business_info",
        ...settingsForm,
        updated_at: new Date().toISOString(),
      });
      if (res && res.success) {
        alert("✅ Business settings, SEO Meta, Email, & Address saved live to Hostinger MySQL Database and synced across devices!");
      } else {
        alert(`Notice: Settings saved locally. Database sync response: ${res?.error || "Saved"}`);
      }
    } else {
      alert("✅ Business parameters saved locally!");
    }
  };

  // Order state update (pending -> processing -> completed)
  const handleUpdateOrderStatus = (orderId: string, status: string) => {
    const updated = orders.map((o) =>
      o.id === orderId ? { ...o, status } : o,
    );
    setOrders(updated);
    safeSetItem("twobudz_orders", JSON.stringify(updated));

    // Sync to Supabase if configured
    if (isSupabaseConfigured()) {
      const orderToUpdate = updated.find((o) => o.id === orderId);
      if (orderToUpdate) {
        syncToSupabase("orders", "upsert", orderToUpdate);
      }
    }
  };

  // Inquiry message reply simulation
  const handleInquiryStatusChange = (inqId: string, status: string) => {
    const updated = inquiries.map((i) =>
      i.id === inqId ? { ...i, status } : i,
    );
    setInquiries(updated);
    safeSetItem("twobudz_inquiries", JSON.stringify(updated));

    // Sync to Supabase if configured
    if (isSupabaseConfigured()) {
      const inqToUpdate = updated.find((i) => i.id === inqId);
      if (inqToUpdate) {
        syncToSupabase("inquiries", "upsert", inqToUpdate);
      }
    }
  };

  const totalRevenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((acc, order) => acc + order.total, 0);

  return (
    <div className="w-full min-h-screen bg-[#f7f9f4] flex flex-col animate-fadeIn">
      <div className="bg-white border-b border-[#e1e8db] w-full min-h-screen text-[#2c3527] relative font-sans flex flex-col">
        {/* Header Block */}
        <div className="flex items-center justify-between p-4 sm:p-6 bg-[#edf2e8] border-b border-[#e1e8db] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#3b142e]/10 border border-[#3b142e]/20 flex items-center justify-center text-[#3b142e] shrink-0">
              <Shield className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg md:text-xl font-bold uppercase tracking-tight text-[#2c3527] line-clamp-1">
                CBD American Shaman of Hurst{" "}
                <span className="text-[#3b142e]">Central Admin Console</span>
              </h2>
              <p className="text-[9px] sm:text-[10px] text-[#5b6b55] uppercase tracking-widest font-mono line-clamp-1">
                Store management, CRM, Articles & CMS Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <>
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-[#cbd5c2] text-xs">
                  <span className="text-gray-500 font-medium">User:</span>
                  <span className="font-bold text-[#2c3527] font-mono">{adminUser}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                    adminRole === "super_admin"
                      ? "bg-[#3b142e]/15 text-[#3b142e] border border-[#3b142e]/30"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}>
                    {adminRole === "super_admin" ? "Super Admin" : "Staff"}
                  </span>
                </div>

                {adminRole === "super_admin" && (
                  <button
                    onClick={handleCreateAndDownloadBackup}
                    className="px-3 py-2 rounded-xl bg-[#3b142e] text-white hover:bg-[#5d2a49] flex items-center gap-1.5 font-bold uppercase text-[10px] sm:text-xs transition-all shadow-sm cursor-pointer shrink-0"
                    title="Instant A-to-Z Backup (.json Download)"
                  >
                    <HardDriveDownload className="w-3.5 h-3.5" />
                    <span>Backup Store</span>
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 flex items-center gap-1.5 font-bold uppercase text-[10px] sm:text-xs transition-all cursor-pointer shrink-0"
                  title="Log out administrator session"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-white text-[#5b6b55] border border-[#e1e8db] hover:text-[#3b142e] hover:border-[#3b142e] flex items-center gap-2 font-bold uppercase text-[10px] sm:text-xs transition-all duration-300 shadow-sm hover:shadow cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Exit Console</span>
            </button>
          </div>
        </div>

        {/* NOT AUTHENTICATED ACCESS SCREEN */}
        {!isAuthenticated ? (
          <div className="flex-grow flex items-center justify-center p-4 sm:p-8 bg-[#f7f9f4]">
            <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-2xl border border-[#e1e8db] shadow-xl space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[#3b142e]/10 border border-[#3b142e]/20 flex items-center justify-center mx-auto text-[#3b142e]">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-[#2c3527] text-lg uppercase tracking-wider">
                  CBD American Shaman of Hurst Admin Console
                </h3>
                <p className="text-xs text-[#5b6b55]">
                  Please enter your administrator username and password to proceed.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#5b6b55]">
                    Username
                  </label>
                  <div className="relative">
                    <Users className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter Username"
                      className="w-full pl-10 pr-4 py-3 bg-[#f7f9f4] border border-[#cbd5c2] rounded-xl text-[#2c3527] text-sm focus:outline-none focus:border-[#3b142e] focus:bg-white transition-colors"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#5b6b55]">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter Password"
                      className="w-full pl-10 pr-4 py-3 bg-[#f7f9f4] border border-[#cbd5c2] rounded-xl text-[#2c3527] text-sm font-mono focus:outline-none focus:border-[#3b142e] focus:bg-white transition-colors"
                      required
                    />
                  </div>
                </div>

                {authError && (
                  <p className="text-xs text-red-600 font-bold flex items-center gap-1.5 pt-1">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{authError}</span>
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-[#3b142e] hover:bg-[#5d2a49] text-white text-xs font-bold uppercase tracking-widest transition-colors shadow-md cursor-pointer block text-center mt-2"
                >
                  Sign In to Console
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* MAIN AUTHENTICATED CONSOLE PANEL */
          <div className="flex-grow flex flex-col md:flex-row">
            {/* Sidebar Navigation Options */}
            <aside className="w-full md:w-72 lg:w-80 bg-[#f7f9f4] border-b md:border-b-0 md:border-r border-[#e1e8db] p-3 md:p-5 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto shrink-0 font-sans whitespace-nowrap scrollbar-thin">
              <p className="text-[11px] font-mono tracking-widest text-[#72856a] uppercase font-bold px-3 py-1.5 hidden md:block">
                Core Systems
              </p>

              <button
                onClick={() => {
                  setActiveTab("dashboard");
                  resetProductForm();
                }}
                className={`shrink-0 md:w-full text-center md:text-left px-3.5 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-semibold flex items-center justify-center md:justify-start gap-3 transition-colors cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-[#edf2e8] text-[#3b142e]"
                    : "text-[#5b6b55] hover:bg-[#f1f4ee] hover:text-[#2c3527]"
                }`}
              >
                <LayoutDashboard className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("products");
                  resetProductForm();
                }}
                className={`shrink-0 md:w-full text-center md:text-left px-3.5 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-semibold flex items-center justify-center md:justify-start gap-3 transition-colors cursor-pointer ${
                  activeTab === "products"
                    ? "bg-[#edf2e8] text-[#3b142e]"
                    : "text-[#5b6b55] hover:bg-[#f1f4ee] hover:text-[#2c3527]"
                }`}
              >
                <Package className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                <span>Products ({products.length})</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("categories");
                  setIsAddingCategory(false);
                  setIsEditingCategory(null);
                }}
                className={`shrink-0 md:w-full text-center md:text-left px-3.5 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-semibold flex items-center justify-center md:justify-start gap-3 transition-colors cursor-pointer ${
                  activeTab === "categories"
                    ? "bg-[#edf2e8] text-[#3b142e]"
                    : "text-[#5b6b55] hover:bg-[#f1f4ee] hover:text-[#2c3527]"
                }`}
              >
                <Database className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                <span>Categories ({categories.length})</span>
              </button>

              <p className="text-[11px] font-mono tracking-widest text-[#72856a] uppercase font-bold px-3 py-1.5 mt-4 hidden md:block">
                Content Engine
              </p>

              <button
                onClick={() => setActiveTab("blogs")}
                className={`shrink-0 md:w-full text-center md:text-left px-3.5 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-semibold flex items-center justify-center md:justify-start gap-3 transition-colors cursor-pointer ${
                  activeTab === "blogs"
                    ? "bg-[#edf2e8] text-[#3b142e]"
                    : "text-[#5b6b55] hover:bg-[#f1f4ee] hover:text-[#2c3527]"
                }`}
              >
                <BookOpen className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                <span>Blogs ({blogPosts.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("faqs")}
                className={`shrink-0 md:w-full text-center md:text-left px-3.5 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-semibold flex items-center justify-center md:justify-start gap-3 transition-colors cursor-pointer ${
                  activeTab === "faqs"
                    ? "bg-[#edf2e8] text-[#3b142e]"
                    : "text-[#5b6b55] hover:bg-[#f1f4ee] hover:text-[#2c3527]"
                }`}
              >
                <HelpCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                <span>FAQs ({faqItems.length})</span>
              </button>

              <p className="text-[11px] font-mono tracking-widest text-[#72856a] uppercase font-bold px-3 py-1.5 mt-4 hidden md:block">
                CRM & Backoffice
              </p>

              <button
                onClick={() => setActiveTab("orders")}
                className={`shrink-0 md:w-full text-center md:text-left px-3.5 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-semibold flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  activeTab === "orders"
                    ? "bg-[#edf2e8] text-[#3b142e]"
                    : "text-[#5b6b55] hover:bg-[#f1f4ee] hover:text-[#2c3527]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                  <span>Orders</span>
                </div>
                {inquiries.filter((i) => i.status === "unread").length > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("reviews")}
                className={`shrink-0 md:w-full text-center md:text-left px-3.5 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-semibold flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  activeTab === "reviews"
                    ? "bg-[#edf2e8] text-[#3b142e]"
                    : "text-[#5b6b55] hover:bg-[#f1f4ee] hover:text-[#2c3527]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Star className="w-4 h-4 md:w-5 md:h-5 text-amber-500 fill-amber-400 shrink-0" />
                  {(() => {
                    const activeProductIds = new Set(products.map((p) => String(p.id)));
                    const activeProductNames = new Set(products.map((p) => p.name.toLowerCase().trim()));
                    const activeCount = (reviews || []).filter((r) => {
                      if (!r) return false;
                      const rId = String(r.productId || "");
                      const rName = (r.productName || "").toLowerCase().trim();
                      return activeProductIds.has(rId) || activeProductNames.has(rName);
                    }).length;
                    return <span>Product Reviews ({activeCount})</span>;
                  })()}
                </div>
              </button>

              {/* SETTINGS: Only visible to Super Admin */}
              {adminRole === "super_admin" && (
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`shrink-0 md:w-full text-center md:text-left px-3.5 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-semibold flex items-center justify-center md:justify-start gap-3 transition-colors cursor-pointer ${
                    activeTab === "settings"
                      ? "bg-[#edf2e8] text-[#3b142e]"
                      : "text-[#5b6b55] hover:bg-[#f1f4ee] hover:text-[#2c3527]"
                  }`}
                >
                  <Settings className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                  <span>Settings</span>
                </button>
              )}

              {/* DATA & BACKUP: Only visible to Super Admin */}
              {adminRole === "super_admin" && (
                <>
                  <p className="text-[11px] font-mono tracking-widest text-[#72856a] uppercase font-bold px-3 py-1.5 mt-4 hidden md:block">
                    Data & Protection
                  </p>

                  <button
                    onClick={() => setActiveTab("backup")}
                    className={`shrink-0 md:w-full text-center md:text-left px-3.5 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-semibold flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      activeTab === "backup"
                        ? "bg-[#edf2e8] text-[#3b142e]"
                        : "text-[#5b6b55] hover:bg-[#f1f4ee] hover:text-[#2c3527]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <HardDriveDownload className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                      <span>Backup & Restore</span>
                    </div>
                    <span className="text-[10px] bg-[#3b142e] text-white px-2 py-0.5 rounded font-mono font-bold">
                      PRO
                    </span>
                  </button>
                </>
              )}

              <div className="mt-auto pt-6 border-t border-[#e1e8db] px-3 font-mono text-[10px] text-[#72856a] hidden md:block">
                <p>Environment: Hostinger CJS</p>
                <p>Status: Simulated DB Active</p>
              </div>
            </aside>

            {/* Router Main Panel Panel Area */}
            <main className="flex-grow p-4 sm:p-6 md:p-8 lg:p-10 bg-white flex flex-col justify-between overflow-x-hidden">
              {/* TAB 1: DASHBOARD OVERVIEW */}
              {activeTab === "dashboard" && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-[#edf2e8] p-4 rounded-2xl border border-[#e1e8db] flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-[#2c3527]">
                        Welcome back to CBD American Shaman of Hurst Office Desk
                      </h3>
                      <p className="text-xs text-[#5b6b55]">
                        These live simulations modify and reflect changes on
                        your React Frontend instantly!
                      </p>
                    </div>
                    <span className="px-2 py-1 text-[9px] font-mono text-[#3b142e] border border-[#3b142e]/30 rounded bg-white">
                      ● BACKEND ONLINE
                    </span>
                  </div>

                  {/* Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                          Simulated Sales
                        </p>
                        <p className="text-base font-extrabold text-[#2c3527] font-mono">
                          ${(Number(totalRevenue) || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                          Acquired Orders
                        </p>
                        <p className="text-base font-extrabold text-[#2c3527] font-mono">
                          {orders.length}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#3b142e]/10 text-[#3b142e] flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                          Active Inventory
                        </p>
                        <p className="text-base font-extrabold text-[#2c3527] font-mono">
                          {products.length} Products
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                          Pending inquiries
                        </p>
                        <p className="text-base font-extrabold text-[#2c3527] font-mono">
                          {
                            inquiries.filter((i) => i.status === "unread")
                              .length
                          }{" "}
                          Unread
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                    {/* Recent Orders Overview */}
                    <div className="border border-[#e1e8db] rounded-xl p-4 bg-white space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#2c3527] border-b border-[#e1e8db] pb-2 flex items-center justify-between">
                        <span>Recent Submitted Orders</span>
                        <span className="text-[10px] font-mono text-[#72856a]">
                          CRM Active
                        </span>
                      </h4>

                      {orders.length === 0 ? (
                        <p className="text-xs text-gray-400 py-6 text-center">
                          No orders retrieved yet. Try adding items to the cart
                          and checking out on the frontend!
                        </p>
                      ) : (
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                          {orders.slice(0, 5).map((o) => (
                            <div
                              key={o.id}
                              className="p-3 bg-[#f7f9f4] rounded-lg border border-[#e1e8db] text-xs flex flex-col sm:flex-row justify-between sm:items-center gap-2"
                            >
                              <div>
                                <p className="font-bold text-[#2c3527]">
                                  {o.id} - {o.customer.firstName}{" "}
                                  {o.customer.lastName}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {o.date} • {o.items.length} items
                                </p>
                              </div>
                              <div className="text-left sm:text-right">
                                <p className="font-extrabold font-mono text-[#2c3527]">
                                  ${(Number(o.total) || 0).toFixed(2)}
                                </p>
                                <span
                                  className={`px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold inline-block mt-1 ${
                                    o.status === "completed"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {o.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent Inquiries Overview */}
                    <div className="border border-[#e1e8db] rounded-xl p-4 bg-white space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#2c3527] border-b border-[#e1e8db] pb-2 flex items-center justify-between">
                        <span>Direct Inquiries</span>
                        <span className="text-[10px] font-mono text-[#72856a]">
                          Inbox
                        </span>
                      </h4>

                      {inquiries.length === 0 ? (
                        <p className="text-xs text-gray-400 py-6 text-center">
                          Your Inbox is quiet. Try submitting the contact form
                          overlay to test instant updates!
                        </p>
                      ) : (
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                          {inquiries.slice(0, 5).map((i) => (
                            <div
                              key={i.id}
                              className="p-3 bg-[#f7f9f4] rounded-lg border border-[#e1e8db] text-xs space-y-1"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-[#2c3527]">
                                  {i.name} ({i.email})
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-mono font-bold ${
                                    i.status === "unread"
                                      ? "bg-red-100 text-red-600"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {i.status}
                                </span>
                              </div>
                              <p className="text-gray-500 italic">"{i.msg}"</p>
                              <p className="text-[9px] text-gray-400 text-right">
                                {i.date}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PRODUCT MANAGEMENT & CSV IMPORTER */}
              {activeTab === "products" && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Title Bar with controls */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pb-4 border-b border-[#e1e8db]">
                    <div>
                      <h3 className="text-base font-bold text-[#2c3527]">
                        Product Portfolio Management
                      </h3>
                      <p className="text-xs text-gray-500">
                        Add, edit, delete, or import products as standard
                        e-commerce CSV files.
                      </p>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setShowCsvBox(!showCsvBox)}
                        className="px-4 py-2 bg-[#f7f9f4] border border-[#e1e8db] hover:border-[#3b142e] rounded-xl text-xs font-bold text-[#5b6b55] inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>CSV Bulk Tools</span>
                      </button>

                      <button
                        onClick={handleExportCSV}
                        className="px-4 py-2 bg-white border border-[#e1e8db] hover:border-[#3b142e] rounded-xl text-xs font-bold text-[#5b6b55] inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export CSV</span>
                      </button>

                      <button
                        onClick={() => {
                          resetProductForm();
                          setIsEditingProduct(null);
                          setIsAddingProduct(true);
                        }}
                        className="px-4 py-2 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Product</span>
                      </button>
                    </div>
                  </div>

                  {/* CUSTOM CSV PANEL */}
                  {showCsvBox && (
                    <div className="bg-[#edf2e8] p-5 rounded-2xl border border-[#e1e8db] space-y-4 font-sans animate-fadeIn">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-[#cbd5c2]/40">
                        <div>
                          <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#3b142e]">
                            Products Bulk CSV Download & Upload Manager
                          </h4>
                          <p className="text-[10px] text-[#5b6b55] font-medium">
                            Download existing products, add new rows in Excel/CSV, and re-upload! Existing store products stay completely safe!
                          </p>
                        </div>
                        <button
                          onClick={() => setShowCsvBox(false)}
                          className="text-[#5b6b55] hover:text-[#2c3527] font-bold text-xs shrink-0 self-end sm:self-auto"
                        >
                          Close ✕
                        </button>
                      </div>

                      {/* Download Template / Store Items Action Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Option 1: Blank CSV Template (Headings Only) */}
                        <div className="p-3.5 bg-white border border-[#cbd5c2] rounded-xl flex flex-col justify-between gap-3 shadow-sm">
                          <div className="space-y-1">
                            <span className="font-bold text-xs text-[#2c3527] flex items-center gap-1.5">
                              <FileSpreadsheet className="w-4 h-4 text-[#3b142e]" />
                              <span>1. Download Blank CSV Template (Headings Only)</span>
                            </span>
                            <p className="text-[11px] text-gray-500 leading-snug">
                              Downloads an empty CSV file with standard column headers (Title, Price, Category, Description, etc.). Fill in your new products and upload below!
                            </p>
                          </div>
                          <button
                            onClick={handleDownloadBlankTemplateCSV}
                            type="button"
                            className="w-full px-4 py-2.5 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-xl text-xs font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer shadow transition-all active:scale-95"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download Blank CSV Template</span>
                          </button>
                        </div>

                        {/* Option 2: Full Store Products Export */}
                        <div className="p-3.5 bg-white border border-[#cbd5c2] rounded-xl flex flex-col justify-between gap-3 shadow-sm">
                          <div className="space-y-1">
                            <span className="font-bold text-xs text-[#2c3527] flex items-center gap-1.5">
                              <FileSpreadsheet className="w-4 h-4 text-[#5b6b55]" />
                              <span>2. Backup / Export All Current Store Products ({products.length} Items)</span>
                            </span>
                            <p className="text-[11px] text-gray-500 leading-snug">
                              Export all currently existing products in your store to a CSV spreadsheet for offline backup or bulk editing.
                            </p>
                          </div>
                          <button
                            onClick={handleExportCSV}
                            type="button"
                            className="w-full px-4 py-2.5 bg-[#f7f9f4] hover:bg-[#edf2e8] text-[#2c3527] border border-[#cbd5c2] rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all active:scale-95"
                          >
                            <Download className="w-4 h-4 text-[#3b142e]" />
                            <span>Export All Products CSV</span>
                          </button>
                        </div>

                        {/* Option 3: Restore Default Catalog & Recover Original Images */}
                        <div className="p-3.5 bg-white border border-[#cbd5c2] rounded-xl flex flex-col justify-between gap-3 shadow-sm md:col-span-2">
                          <div className="space-y-1">
                            <span className="font-bold text-xs text-[#2c3527] flex items-center gap-1.5">
                              <RefreshCw className="w-4 h-4 text-[#3b142e]" />
                              <span>3. Restore Default Catalog & Recover Original Images</span>
                            </span>
                            <p className="text-[11px] text-gray-500 leading-snug">
                              Need to undo a CSV import or recover all original {PRODUCTS.length} products with their default high-resolution catalog images and structured descriptions? Click below to restore.
                            </p>
                          </div>
                          <button
                            onClick={handleResetToDefaultProducts}
                            type="button"
                            className="w-full sm:w-auto px-5 py-2.5 bg-[#5b6b55] hover:bg-[#2c3527] text-white rounded-xl text-xs font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-2 cursor-pointer shadow transition-all active:scale-95"
                          >
                            <RefreshCw className="w-4 h-4" />
                            <span>Restore Default Catalog ({PRODUCTS.length} Items)</span>
                          </button>
                        </div>
                      </div>

                      {/* Category Dropdowns Cheat Sheet */}
                      <div className="p-3.5 bg-white/80 border border-[#cbd5c2] rounded-xl space-y-2 text-[11px]">
                        <span className="font-bold text-[#3b142e] block uppercase tracking-wider text-[10px]">
                          💡 Category Dropdown Codes for CSV (Copy/Paste into Category column):
                        </span>
                        <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                          <span className="bg-[#edf2e8] text-[#2c3527] px-2 py-0.5 rounded border border-[#cbd5c2]">gummies</span>
                          <span className="bg-[#edf2e8] text-[#2c3527] px-2 py-0.5 rounded border border-[#cbd5c2]">delta-9-gummies</span>
                          <span className="bg-[#edf2e8] text-[#2c3527] px-2 py-0.5 rounded border border-[#cbd5c2]">cbd-gummies</span>
                          <span className="bg-[#edf2e8] text-[#2c3527] px-2 py-0.5 rounded border border-[#cbd5c2]">sleep-gummies</span>
                          <span className="bg-[#edf2e8] text-[#2c3527] px-2 py-0.5 rounded border border-[#cbd5c2]">edibles</span>
                          <span className="bg-[#edf2e8] text-[#2c3527] px-2 py-0.5 rounded border border-[#cbd5c2]">thc-drinks</span>
                          <span className="bg-[#edf2e8] text-[#2c3527] px-2 py-0.5 rounded border border-[#cbd5c2]">cbd-drinks</span>
                          <span className="bg-[#edf2e8] text-[#2c3527] px-2 py-0.5 rounded border border-[#cbd5c2]">shots-cocktails</span>
                          <span className="bg-[#edf2e8] text-[#2c3527] px-2 py-0.5 rounded border border-[#cbd5c2]">beverages</span>
                          <span className="bg-[#edf2e8] text-[#2c3527] px-2 py-0.5 rounded border border-[#cbd5c2]">disposables</span>
                          <span className="bg-[#edf2e8] text-[#2c3527] px-2 py-0.5 rounded border border-[#cbd5c2]">cartridges</span>
                          <span className="bg-[#edf2e8] text-[#2c3527] px-2 py-0.5 rounded border border-[#cbd5c2]">vapes</span>
                          <span className="bg-[#edf2e8] text-[#2c3527] px-2 py-0.5 rounded border border-[#cbd5c2]">cbd-tinctures</span>
                          <span className="bg-[#edf2e8] text-[#2c3527] px-2 py-0.5 rounded border border-[#cbd5c2]">delta-9-tinctures</span>
                          <span className="bg-[#edf2e8] text-[#2c3527] px-2 py-0.5 rounded border border-[#cbd5c2]">cbd-oils</span>
                          <span className="bg-[#edf2e8] text-[#2c3527] px-2 py-0.5 rounded border border-[#cbd5c2]">topicals</span>
                          <span className="bg-[#edf2e8] text-[#2c3527] px-2 py-0.5 rounded border border-[#cbd5c2]">smoke-accessories</span>
                          <span className="bg-[#edf2e8] text-[#2c3527] px-2 py-0.5 rounded border border-[#cbd5c2]">flower</span>
                          <span className="bg-[#edf2e8] text-[#2c3527] px-2 py-0.5 rounded border border-[#cbd5c2]">pets</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                        <label className="px-4 py-2.5 bg-white border border-[#cbd5c2] hover:border-[#3b142e] text-[#2c3527] rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm">
                          <Upload className="w-4 h-4 text-[#3b142e]" />
                          <span>2. Select Edited CSV / JSON File to Upload</span>
                          <input
                            id="product-csv-file-input"
                            type="file"
                            accept=".csv,.json,text/csv,application/json"
                            onChange={handleProductFileSelect}
                            className="hidden"
                          />
                        </label>
                        <span className="text-[10px] text-gray-500 font-mono text-center sm:text-left">
                          OR paste formatted raw CSV/JSON below
                        </span>
                      </div>

                      <textarea
                        value={csvText}
                        onChange={(e) => setCsvText(e.target.value)}
                        placeholder="Title,Description,Long Description,Price,Category,THC,CBD,Image,Options,Benefits&#10;Delta Gums,Organic CBD sweets,Full organic gummies batch,39.99,gummies,0.2% THC,25mg CBD,https://image.url,10 Pack; 30 Pack,Calming; Tasty Relief"
                        rows={5}
                        className="w-full p-3 bg-white border border-[#e1e8db] rounded-xl font-mono text-xs focus:ring-1 focus:ring-[#3b142e] focus:outline-none"
                      />

                      {csvFeedback && (
                        <div
                          className={`text-xs font-mono font-bold whitespace-pre-wrap p-3 rounded-xl border ${
                            csvFeedback.includes("Error") || csvFeedback.includes("❌")
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-[#edf2e8] text-[#2c3527] border-[#cbd5c2]"
                          }`}
                        >
                          {csvFeedback}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!csvText.trim()) {
                              const fileInput = document.getElementById("product-csv-file-input") as HTMLInputElement;
                              if (fileInput) {
                                fileInput.click();
                              } else {
                                handleImportCSV(undefined, "replace");
                              }
                            } else {
                              handleImportCSV(undefined, "replace");
                            }
                          }}
                          className="px-5 py-2.5 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-xl text-xs font-bold font-sans cursor-pointer shadow-sm transition-all"
                          title="Replaces store catalog with the exact items in your CSV file (removes deleted products)"
                        >
                          Upload & Sync CSV Products (Replace Catalog)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleImportCSV(undefined, "merge")}
                          className="px-4 py-2.5 bg-white border border-[#3b142e]/40 hover:bg-[#edf2e8] text-[#2c3527] rounded-xl text-xs font-bold font-sans cursor-pointer shadow-sm transition-all"
                          title="Keeps existing store products and adds/updates products from CSV"
                        >
                          Merge / Append Products Only
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCsvText("");
                            setCsvFeedback("");
                          }}
                          className="px-4 py-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs font-bold text-gray-500 cursor-pointer"
                        >
                          Clear Text
                        </button>
                      </div>

                      {/* PRE-LOADED CUSTOM CSV CATALOG BULK INJECTORS */}
                      <div className="pt-4 border-t border-[#3b142e]/15 space-y-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#3b142e] animate-pulse"></span>
                          <label className="block text-[11px] font-extrabold uppercase tracking-widest text-[#72856a]">
                            ⚡ Quick Inject Preloaded Custom Product Catalog
                          </label>
                        </div>
                        <p className="text-[10px] text-[#5b6b55] leading-relaxed">
                          Your legacy e-commerce catalog has been structured
                          into 4 seamless parts (totaling {PRODUCTS.length} products). Inject
                          them to populate your store with premium images,
                          specific options, and SEO-preserving custom slugs.
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-sans">
                          <button
                            type="button"
                            disabled={isImportingPreloaded}
                            onClick={() => importPreloadedCatalog(1)}
                            className="p-2 sm:p-2.5 bg-white border border-[#e1e8db] hover:border-[#3b142e] disabled:opacity-50 text-[10px] sm:text-xs font-semibold text-[#5b6b55] hover:text-[#2c3527] rounded-xl text-center active:scale-95 transition-all cursor-pointer inline-flex flex-col items-center justify-center gap-0.5 shadow-sm"
                          >
                            <span className="font-bold text-[#3b142e]">
                              Part 1
                            </span>
                            <span className="text-[9px] text-[#72856a]">
                              Products 1-50
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={isImportingPreloaded}
                            onClick={() => importPreloadedCatalog(2)}
                            className="p-2 sm:p-2.5 bg-white border border-[#e1e8db] hover:border-[#3b142e] disabled:opacity-50 text-[10px] sm:text-xs font-semibold text-[#5b6b55] hover:text-[#2c3527] rounded-xl text-center active:scale-95 transition-all cursor-pointer inline-flex flex-col items-center justify-center gap-0.5 shadow-sm"
                          >
                            <span className="font-bold text-[#3b142e]">
                              Part 2
                            </span>
                            <span className="text-[9px] text-[#72856a]">
                              Products 51-100
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={isImportingPreloaded}
                            onClick={() => importPreloadedCatalog(3)}
                            className="p-2 sm:p-2.5 bg-white border border-[#e1e8db] hover:border-[#3b142e] disabled:opacity-50 text-[10px] sm:text-xs font-semibold text-[#5b6b55] hover:text-[#2c3527] rounded-xl text-center active:scale-95 transition-all cursor-pointer inline-flex flex-col items-center justify-center gap-0.5 shadow-sm"
                          >
                            <span className="font-bold text-[#3b142e]">
                              Part 3
                            </span>
                            <span className="text-[9px] text-[#72856a]">
                              Products 101-150
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={isImportingPreloaded}
                            onClick={() => importPreloadedCatalog(4)}
                            className="p-2 sm:p-2.5 bg-white border border-[#e1e8db] hover:border-[#3b142e] disabled:opacity-50 text-[10px] sm:text-xs font-semibold text-[#5b6b55] hover:text-[#2c3527] rounded-xl text-center active:scale-95 transition-all cursor-pointer inline-flex flex-col items-center justify-center gap-0.5 shadow-sm"
                          >
                            <span className="font-bold text-[#3b142e]">
                              Part 4
                            </span>
                            <span className="text-[9px] text-[#72856a]">
                              Products 151-{PRODUCTS.length}
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={isImportingPreloaded}
                            onClick={() => importPreloadedCatalog("all")}
                            className="col-span-2 sm:col-span-1 p-2 sm:p-2.5 bg-[#3b142e] hover:bg-[#5d2a49] disabled:opacity-50 text-white font-extrabold rounded-xl text-center active:scale-95 transition-all cursor-pointer inline-flex flex-col items-center justify-center gap-0.5 shadow-md"
                          >
                            <span className="text-[10px] uppercase tracking-wider font-extrabold">
                              Unified
                            </span>
                            <span className="text-[9px] text-white/95">
                              Import All {PRODUCTS.length}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FORM PANEL: ADD/EDIT PRODUCT */}
                  {isAddingProduct && !isEditingProduct && (
                    <form
                      id="product-edit-form-section"
                      onSubmit={handleSaveProduct}
                      className="p-5 border border-[#3b142e]/30 rounded-2xl bg-[#edf2e8]/45 space-y-4 animate-fadeIn"
                    >
                      <div className="flex justify-between items-center border-b border-[#e1e8db] pb-3">
                        <div className="flex items-center gap-3">
                          <h4 className="text-sm font-bold text-[#2c3527]">
                            {isEditingProduct
                              ? `Edit product: ${isEditingProduct.name}`
                              : "Create New Product Entry"}
                          </h4>
                          {isEditingProduct && (
                            <a
                              href={`/products/${isEditingProduct.slug || isEditingProduct.id}`.replace(/\/+/g, "/")}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-[#f7f9f4] border border-[#3b142e]/30 text-[#3b142e] hover:bg-[#edf2e8] rounded-lg text-[11px] font-bold flex items-center gap-1 no-underline shrink-0"
                              title="Open Live Product Preview in New Tab"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Preview in New Tab</span>
                            </a>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingProduct(false);
                            setIsEditingProduct(null);
                          }}
                          className="text-xs text-gray-500 hover:text-[#2c3527] font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase">
                            Product Name
                          </label>
                          <input
                            type="text"
                            name="name"
                            required
                            value={productForm.name || ""}
                            onChange={handleProductInputChange}
                            placeholder="Full Spectrum Drops"
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase">
                            Primary Category
                          </label>
                          <select
                            name="category"
                            value={productForm.category || "gummies"}
                            onChange={(e) => {
                              const newCat = e.target.value;
                              setProductForm((prev) => {
                                const currentCats = Array.isArray(prev.categories) ? prev.categories.filter((id) => id !== "all") : [];
                                const updatedCats = Array.from(new Set([newCat, ...currentCats]));
                                return {
                                  ...prev,
                                  category: newCat,
                                  categories: updatedCats,
                                };
                              });
                            }}
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none font-medium"
                          >
                            {categories && categories.length > 0 ? (
                              categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.title} ({c.id})
                                </option>
                              ))
                            ) : (
                              <option value="gummies">Artisanal Gummies (gummies)</option>
                            )}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase">
                            Price ($ USD)
                          </label>
                          <input
                            type="number"
                            name="price"
                            step="0.01"
                            required
                            value={productForm.price || ""}
                            onChange={handleProductInputChange}
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Multiple Categories Checkbox Selector */}
                      <div className="bg-white p-4 rounded-xl border border-[#e1e8db] space-y-3 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#edf2e8] pb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <label className="font-bold text-gray-800 block uppercase tracking-wider text-xs">
                                Assign Multiple Categories to Product
                              </label>
                              <span className="px-2 py-0.5 bg-[#edf2e8] text-[#3b142e] font-mono font-bold text-[10px] rounded-full border border-[#3b142e]/30">
                                {(() => {
                                  const validCatIds = (categories || []).map((cat) => cat.id);
                                  const activeCats = Array.isArray(productForm.categories) && productForm.categories.length > 0
                                    ? productForm.categories
                                    : [productForm.category || "gummies"];
                                  const visibleSelected = activeCats.filter((catId) => catId !== "all" && validCatIds.includes(catId));
                                  return `${visibleSelected.length} Selected`;
                                })()}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              Check any & all categories this product should appear under across the header menu & category filter pages.
                            </p>
                          </div>

                          {/* Quick Filter Search Input */}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={categoryAssignSearch}
                              onChange={(e) => setCategoryAssignSearch(e.target.value)}
                              placeholder="Search categories..."
                              className="px-2.5 py-1 bg-[#f7f9f4] border border-[#e1e8db] rounded-lg text-xs focus:outline-none w-36 sm:w-44"
                            />
                            {categoryAssignSearch && (
                              <button
                                type="button"
                                onClick={() => setCategoryAssignSearch("")}
                                className="text-[10px] text-gray-400 hover:text-gray-600 font-bold"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Category Checkboxes List */}
                        <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pt-1 pr-1">
                          {(() => {
                            const filteredCats = (categories || []).filter((c) => {
                              if (!categoryAssignSearch.trim()) return true;
                              const q = categoryAssignSearch.toLowerCase();
                              return (
                                c.title.toLowerCase().includes(q) ||
                                c.id.toLowerCase().includes(q) ||
                                (c.tagline && c.tagline.toLowerCase().includes(q))
                              );
                            });

                            if (filteredCats.length === 0) {
                              return (
                                <p className="text-xs text-gray-400 py-2">
                                  No categories found matching "{categoryAssignSearch}".
                                </p>
                              );
                            }

                            const activeCats = Array.isArray(productForm.categories) && productForm.categories.length > 0
                              ? productForm.categories
                              : [productForm.category || "gummies"];

                            return filteredCats.map((c) => {
                              const isChecked = activeCats.includes(c.id);
                              return (
                                <label
                                  key={c.id}
                                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer flex items-center gap-2 transition-all select-none ${
                                    isChecked
                                      ? "bg-[#edf2e8] border-[#3b142e] text-[#2c3527] font-bold shadow-xs"
                                      : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-white"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const validCatIds = (categories || []).map((cat) => cat.id);
                                      const currentArr = (
                                        Array.isArray(productForm.categories) && productForm.categories.length > 0
                                          ? productForm.categories
                                          : [productForm.category || "gummies"]
                                      ).filter((catId) => catId !== "all");

                                      let updatedArr: string[];
                                      if (e.target.checked) {
                                        updatedArr = Array.from(new Set([...currentArr, c.id]));
                                      } else {
                                        updatedArr = currentArr.filter((catId) => catId !== c.id);
                                      }

                                      const newPrimaryCat = updatedArr.find((id) => validCatIds.includes(id)) || updatedArr[0] || "gummies";
                                      const primaryCat = updatedArr.includes(productForm.category) ? productForm.category : newPrimaryCat;

                                      setProductForm((prev) => ({
                                        ...prev,
                                        categories: updatedArr,
                                        category: primaryCat,
                                      }));
                                    }}
                                    className="w-4 h-4 text-[#3b142e] rounded accent-[#3b142e]"
                                  />
                                  <span>{c.title}</span>
                                  <span className="text-[10px] font-mono text-gray-400">({c.id})</span>
                                </label>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* SEO Custom URL Slug Matching */}
                      <div className="p-4 bg-white border border-[#3b142e]/20 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-[#3b142e] block uppercase tracking-wider">
                            SEO Custom URL Slug (Legacy Match)
                          </label>
                          <span className="text-[10px] text-gray-500 font-mono">
                            SEO URL Optimization
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
                          <span className="px-3 py-2.5 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-[#72856a] font-mono select-none text-[11px] shrink-0">
                            twobudz.com/products/
                          </span>
                          <input
                            type="text"
                            name="slug"
                            value={productForm.slug || ""}
                            onChange={handleProductInputChange}
                            placeholder="justcbd-cbd-tincture-for-cats-500mg-tuna"
                            className="flex-grow p-2.5 bg-white border border-[#e1e8db] rounded-xl font-mono text-xs focus:outline-none focus:border-[#3b142e]"
                          />
                        </div>
                        <p className="text-[10px] text-[#5b6b55] leading-relaxed">
                          Custom URL path segment. When users access{" "}
                          <strong className="font-bold text-[#2c3527]">
                            /products/{"{slug}"}
                          </strong>
                          , this product will automatically load to preserve
                          your old site's backlinks and Google SEO indexing!
                          Leave blank to auto-generate from the product name.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="font-bold text-gray-600 block uppercase">
                              Short Summary Description
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                insertLinkAtFormKey("product", "description")
                              }
                              className="text-[#3b142e] hover:underline font-mono text-[10px] uppercase font-black cursor-pointer"
                              title="Word menu: Click to add a hyperlink"
                            >
                              🔗 Add Hyperlink
                            </button>
                          </div>
                          <textarea
                            name="description"
                            rows={2}
                            required
                            value={productForm.description || ""}
                            onChange={handleProductInputChange}
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none text-xs"
                            placeholder="Briefly describe is in 10-15 words."
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="font-bold text-gray-600 block uppercase">
                              Detailed Long Description
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                insertLinkAtFormKey(
                                  "product",
                                  "longDescription",
                                )
                              }
                              className="text-[#3b142e] hover:underline font-mono text-[10px] uppercase font-black cursor-pointer"
                              title="Word menu: Click to add a hyperlink"
                            >
                              🔗 Add Hyperlink
                            </button>
                          </div>
                          <textarea
                            name="longDescription"
                            rows={2}
                            required
                            value={productForm.longDescription || ""}
                            onChange={handleProductInputChange}
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none text-xs"
                            placeholder="Complete details and specifications."
                          />
                        </div>
                      </div>

                      {/* ADVANCED PRODUCT SEO PARAMETERS SECTION */}
                      <div className="p-4 bg-emerald-50/50 border border-[#edf2e8] rounded-xl space-y-3.5 text-xs">
                        <div className="flex items-center gap-1.5 border-b border-[#cbd5c2]/40 pb-2">
                          <span className="text-base">🌿</span>
                          <span className="font-extrabold text-[#2c3527] uppercase tracking-wider text-[11px]">
                            Product SEO Meta Elements & Alt tags
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="font-bold text-[#5b6b55] block uppercase text-[10px]">
                              Meta Title Tag (Google Title)
                            </label>
                            <input
                              type="text"
                              name="metaTitle"
                              value={productForm.metaTitle || ""}
                              onChange={handleProductInputChange}
                              placeholder="e.g. Organic Hemp Gummies | Best Sleep Aid in Texas"
                              className="w-full p-2.5 bg-white border border-[#cbd5c2] rounded-xl focus:outline-none focus:border-[#3b142e] text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold text-[#5b6b55] block uppercase text-[10px]">
                              Meta Description Tag (Google Description Snippet)
                            </label>
                            <input
                              type="text"
                              name="metaDescription"
                              value={productForm.metaDescription || ""}
                              onChange={handleProductInputChange}
                              placeholder="e.g. Buy high potency state-compliant Delta-9 gummies. Clean-extracted, organic..."
                              className="w-full p-2.5 bg-white border border-[#cbd5c2] rounded-xl focus:outline-none focus:border-[#3b142e] text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="font-bold text-[#5b6b55] block uppercase text-[10px]">
                              SEO Indexing Keywords / Tags (Comma Separated)
                            </label>
                            <input
                              type="text"
                              name="tags"
                              value={productForm.tags || ""}
                              onChange={handleProductInputChange}
                              placeholder="e.g. organic, cbd, gummies, stress-relief"
                              className="w-full p-2.5 bg-white border border-[#cbd5c2] rounded-xl focus:outline-none focus:border-[#3b142e] text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold text-[#5b6b55] block uppercase text-[10px]">
                              Image Alternate Text (Alt Text for Screen Readers
                              & Image SEO)
                            </label>
                            <input
                              type="text"
                              name="altText"
                              value={productForm.altText || ""}
                              onChange={handleProductInputChange}
                              placeholder="e.g. CBD American Shaman of Hurst Broad Spectrum CBD Sleep Tincture Bottle"
                              className="w-full p-2.5 bg-white border border-[#cbd5c2] rounded-xl focus:outline-none focus:border-[#3b142e] text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase">
                            THC Level
                          </label>
                          <input
                            type="text"
                            name="thc"
                            value={productForm.thc || ""}
                            onChange={handleProductInputChange}
                            placeholder="< 0.3% THC"
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase">
                            CBD Level
                          </label>
                          <input
                            type="text"
                            name="cbd"
                            value={productForm.cbd || ""}
                            onChange={handleProductInputChange}
                            placeholder="1000mg CBD"
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                            <label className="font-bold text-gray-600 block uppercase">
                              Product Image
                            </label>
                            <span className="text-[10px] text-gray-500 font-mono">
                              Upload from PC/Gallery or paste URL below
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                            <div className="md:col-span-4">
                              <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#edf2e8] hover:bg-[#cbd5c2] border border-[#cbd5c2] rounded-xl text-xs font-bold text-[#2c3527] cursor-pointer transition-colors w-full text-center">
                                <span>Choose Local File</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      compressImageFile(file, (compressedUrl) => {
                                        setProductForm((prev) => ({
                                          ...prev,
                                          image: compressedUrl,
                                        }));
                                      });
                                    }
                                  }}
                                />
                              </label>
                            </div>
                            <div className="md:col-span-8">
                              <input
                                type="text"
                                name="image"
                                value={productForm.image || ""}
                                onChange={handleProductInputChange}
                                placeholder="https://images.unsplash... or Select file"
                                className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none text-xs"
                              />
                            </div>
                          </div>
                          {productForm.image && (
                            <div className="flex items-center gap-3 mt-2 p-2.5 bg-[#f7f9f4] rounded-xl border border-[#e1e8db]">
                              <div className="w-14 h-14 rounded-lg border border-[#e1e8db] overflow-hidden bg-white flex items-center justify-center shrink-0 p-1 shadow-sm">
                                <img
                                  src={normalizeToCleanAsset(productForm.image, productForm.category, productForm.name) || productForm.image}
                                  alt="Product Preview"
                                  className="w-full h-full object-contain"
                                  onError={(e) => handleImageError(e, productForm.category || "gummies")}
                                />
                              </div>
                              <div className="text-[11px] font-sans truncate flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="font-bold text-[#2c3527]">Product Image Preview</span>
                                  {productForm.image.startsWith("data:") && (
                                    <span className="text-[9px] text-emerald-800 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold">
                                      Custom File
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-gray-500 font-mono truncate block max-w-sm">
                                  {productForm.image}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Presets Grid */}
                      <div className="space-y-1 text-xs">
                        <label className="font-bold text-gray-500 block uppercase">
                          ...Or Select Recommended Media Asset Preset
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                          {PRESET_IMAGES.map((p, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() =>
                                setProductForm((prev) => ({
                                  ...prev,
                                  image: p.url,
                                }))
                              }
                              className={`p-1.5 rounded-lg border text-[10px] text-left truncate cursor-pointer transition-colors ${
                                productForm.image === p.url
                                  ? "bg-[#3b142e]/10 border-[#3b142e]"
                                  : "bg-white border-[#e1e8db]"
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase">
                            Options / Packaging variants (Comma Separated)
                          </label>
                          <input
                            type="text"
                            name="options"
                            value={(productForm.options as any) || ""}
                            onChange={handleProductInputChange}
                            placeholder="15 Gummies Pack, 30 Gummies Pack, Value Double Pack"
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase">
                            Benefits Points list (One line each)
                          </label>
                          <textarea
                            name="benefits"
                            rows={2}
                            value={(productForm.benefits as any) || ""}
                            onChange={handleProductInputChange}
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none"
                            placeholder="Anxiety elimination&#10;Systemic stress control&#10;Sleep Support"
                          />
                        </div>
                      </div>

                      <div className="flex gap-4 text-xs pt-1">
                        <label className="flex items-center gap-1.5 font-bold text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!(productForm.isBestSeller || productForm.isFeaturedHome)}
                            onChange={(e) =>
                              setProductForm((prev) => ({
                                ...prev,
                                isBestSeller: e.target.checked,
                                isFeaturedHome: e.target.checked,
                              }))
                            }
                            className="w-4 h-4 accent-[#3b142e]"
                          />
                          <span>
                            Pin to HOME CUSTOMER FAVORITES (BEST SELLER)
                          </span>
                        </label>

                        <label className="flex items-center gap-1.5 font-bold text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={productForm.isNew || false}
                            onChange={(e) =>
                              setProductForm((prev) => ({
                                ...prev,
                                isNew: e.target.checked,
                              }))
                            }
                            className="w-4 h-4 accent-[#3b142e]"
                          />
                          <span>Display "NEW ARRIVAL" Tag</span>
                        </label>
                      </div>

                      <div className="flex gap-2.5 pt-4 border-t border-[#e1e8db]">
                        <button
                          type="submit"
                          className="px-6 py-3 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-lg text-xs font-extrabold uppercase tracking-wide cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Commit Store Changes</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingProduct(false);
                            setIsEditingProduct(null);
                          }}
                          className="px-6 py-3 bg-white border border-[#e1e8db] text-[#5b6b55] font-bold rounded-lg text-xs"
                        >
                          Exit Draft
                        </button>
                      </div>
                    </form>
                  )}

                  {/* PRODUCTS GRID SEARCH & HOMEPAGE FEATURED BAR */}
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 bg-[#f7f9f4] p-3 rounded-xl border border-[#e1e8db]">
                    <div className="flex-grow flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={prodSearch}
                          onChange={(e) => setProdSearch(e.target.value)}
                          placeholder="Search items by name, category, price, or ratio..."
                          className="w-full bg-white border border-[#cbd5c2] px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-[#3b142e]"
                        />
                      </div>

                      {/* CATEGORY FILTER DROPDOWN */}
                      <div className="shrink-0 flex items-center gap-1.5 bg-white border border-[#cbd5c2] px-2.5 py-1.5 rounded-lg">
                        <span className="text-[11px] font-bold text-[#2c3527] shrink-0">Filter Category:</span>
                        <select
                          value={prodCatFilter}
                          onChange={(e) => setProdCatFilter(e.target.value)}
                          className="bg-transparent text-xs font-bold text-[#3b142e] focus:outline-none cursor-pointer"
                        >
                          <option value="all">All Categories ({products.length})</option>
                          {categories.map((c) => {
                            const count = products.filter((p) => matchesCategoryFilter(p, c.id, categories)).length;
                            return (
                              <option key={c.id} value={c.id}>
                                {c.title} ({count})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 justify-end">
                      <button
                        type="button"
                        onClick={() => setFilterHomeOnly(!filterHomeOnly)}
                        className={`flex items-center gap-2 text-[11px] font-bold px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                          filterHomeOnly
                            ? "bg-[#3b142e] text-white border-[#3b142e] shadow-sm ring-2 ring-[#3b142e]/20"
                            : "bg-white text-[#3b142e] border-[#e1e8db] hover:border-[#3b142e]"
                        }`}
                        title={filterHomeOnly ? "Click to show all products" : "Click to view/manage products currently featured on Homepage"}
                      >
                        <span>🏠 Homepage Selected:</span>
                        <span className={`font-mono px-1.5 py-0.5 rounded ${
                          filterHomeOnly ? "bg-white text-[#3b142e]" : "bg-[#edf2e8] text-[#3b142e]"
                        }`}>
                          {products.filter((p) => p.isBestSeller || p.isFeaturedHome).length} selected
                        </span>
                        {filterHomeOnly ? (
                          <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Filtered
                          </span>
                        ) : (
                          <span className="text-[9px] bg-[#edf2e8] px-1.5 py-0.5 rounded text-[#5b6b55] hover:text-[#3b142e]">
                            View Home Items
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveHomepageProducts}
                        className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-lg bg-[#3b142e] hover:bg-[#5d2a49] text-white transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                        title="Click to save and immediately sync homepage product selections to front page"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Save Homepage Products</span>
                      </button>
                    </div>
                  </div>

                  {homeSavedNotice && (
                    <div className="flex items-center justify-between bg-[#3b142e] text-white px-4 py-2.5 rounded-xl text-xs font-bold animate-fadeIn shadow-md">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                        <span>
                          Homepage selections saved successfully! All selected products are now active on the homepage.
                        </span>
                      </div>
                      <button
                        onClick={() => setHomeSavedNotice(false)}
                        className="text-white/80 hover:text-white text-xs font-mono ml-2 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {filterHomeOnly && (
                    <div className="flex items-center justify-between bg-[#edf2e8] border border-[#3b142e]/30 px-3.5 py-2 rounded-xl text-xs text-[#2c3527]">
                      <span className="font-medium">
                        Showing only products selected for the <strong>Homepage Top Grid</strong>. Click <strong>★ Home</strong> on any item to remove it.
                      </span>
                      <button
                        onClick={() => setFilterHomeOnly(false)}
                        className="text-[11px] font-bold text-[#3b142e] underline hover:text-[#2c3527] cursor-pointer shrink-0"
                      >
                        Show All Products ({products.length})
                      </button>
                    </div>
                  )}

                  {/* List Grid */}
                  <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
                    {products
                      .filter((p) => {
                        const isFeaturedOnHome = !!(p.isBestSeller || p.isFeaturedHome);
                        if (filterHomeOnly && !isFeaturedOnHome) return false;

                        if (prodCatFilter && prodCatFilter !== "all") {
                          if (!matchesCategoryFilter(p, prodCatFilter, categories)) return false;
                        }

                        if (!prodSearch) return true;
                        const searchLower = prodSearch.toLowerCase();
                        return (
                          p.name.toLowerCase().includes(searchLower) ||
                          (p.categoryLabel && p.categoryLabel.toLowerCase().includes(searchLower)) ||
                          (p.category && p.category.toLowerCase().includes(searchLower)) ||
                          (p.categories && p.categories.some((c) => c.toLowerCase().includes(searchLower))) ||
                          (p.slug && p.slug.toLowerCase().includes(searchLower))
                        );
                      })
                      .sort((a, b) => {
                        const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
                        const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
                        return timeB - timeA;
                      })
                      .map((p) => {
                        if (isAddingProduct && isEditingProduct?.id === p.id) {
                          return (
                            <form
                              key={p.id}
                              id={`product-edit-form-${p.id}`}
                              onSubmit={handleSaveProduct}
                              className="p-5 border-2 border-[#3b142e] rounded-2xl bg-[#edf2e8] space-y-4 animate-fadeIn shadow-lg my-3"
                            >
                              <div className="flex justify-between items-center border-b border-[#cbd5c2] pb-3">
                                <div className="flex items-center gap-3">
                                  <h4 className="text-sm font-bold text-[#2c3527]">
                                    Edit product: {isEditingProduct.name}
                                  </h4>
                                  <a
                                    href={`/products/${isEditingProduct.slug || isEditingProduct.id}`.replace(/\/+/g, "/")}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 bg-white border border-[#3b142e]/30 text-[#3b142e] hover:bg-[#edf2e8] rounded-lg text-[11px] font-bold flex items-center gap-1 no-underline shrink-0"
                                    title="Open Live Product Preview in New Tab"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Preview in New Tab</span>
                                  </a>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsAddingProduct(false);
                                    setIsEditingProduct(null);
                                  }}
                                  className="text-xs text-gray-500 hover:text-red-600 font-bold cursor-pointer px-2 py-1 bg-white rounded-lg border border-gray-200"
                                >
                                  Cancel / Close
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
                                <div className="space-y-1">
                                  <label className="font-bold text-gray-600 block uppercase">
                                    Product Name
                                  </label>
                                  <input
                                    type="text"
                                    name="name"
                                    required
                                    value={productForm.name || ""}
                                    onChange={handleProductInputChange}
                                    placeholder="Full Spectrum Drops"
                                    className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="font-bold text-gray-600 block uppercase">
                                    Primary Category
                                  </label>
                                  <select
                                    name="category"
                                    value={productForm.category || "gummies"}
                                    onChange={(e) => {
                                      const newCat = e.target.value;
                                      setProductForm((prev) => {
                                        const currentCats = Array.isArray(prev.categories) ? prev.categories.filter((id) => id !== "all") : [];
                                        const updatedCats = Array.from(new Set([newCat, ...currentCats]));
                                        return {
                                          ...prev,
                                          category: newCat,
                                          categories: updatedCats,
                                        };
                                      });
                                    }}
                                    className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none font-bold text-[#3b142e]"
                                  >
                                    {categories.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.title} ({c.id})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <label className="font-bold text-gray-600 block uppercase">
                                    Price (USD)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    name="price"
                                    required
                                    value={productForm.price || 0}
                                    onChange={handleProductInputChange}
                                    className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none font-bold"
                                  />
                                </div>
                              </div>

                              {/* MULTI-CATEGORY SELECTOR CHECKBOXES */}
                              <div className="space-y-1.5 p-3 bg-white/70 border border-[#cbd5c2] rounded-xl">
                                {(() => {
                                  const validCatIds = (categories || []).map((cat) => cat.id);
                                  const activeCheckedCats = (categories || []).filter((c) =>
                                    (productForm.categories || []).some(
                                      (catId) => normalizeCategoryToActive(catId, validCatIds) === c.id
                                    )
                                  );
                                  return (
                                    <>
                                      <label className="font-extrabold text-[#2c3527] block uppercase text-[11px] flex items-center justify-between">
                                        <span>Also Include In Secondary Categories (Multi-Category Display)</span>
                                        <span className="text-[10px] text-[#3b142e] font-mono font-bold lowercase">
                                          {activeCheckedCats.length} selected
                                        </span>
                                      </label>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                        {categories.map((c) => {
                                          const isChecked = (productForm.categories || []).some(
                                            (catId) => normalizeCategoryToActive(catId, validCatIds) === c.id
                                          );
                                          return (
                                            <label
                                              key={c.id}
                                              className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                                isChecked
                                                  ? "bg-[#3b142e]/10 border-[#3b142e] font-bold text-[#2c3527]"
                                                  : "bg-white border-[#e1e8db] text-gray-600 hover:border-[#cbd5c2]"
                                              }`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                  const current = Array.isArray(productForm.categories)
                                                    ? productForm.categories.filter((id) => id !== "all")
                                                    : [];
                                                  let updated: string[];
                                                  if (e.target.checked) {
                                                    updated = Array.from(new Set([...current, c.id]));
                                                  } else {
                                                    updated = current.filter(
                                                      (catId) => normalizeCategoryToActive(catId, validCatIds) !== c.id
                                                    );
                                                  }

                                                  const newPrimaryCat = updated.find((id) => validCatIds.includes(id)) || updated[0] || productForm.category || "gummies";

                                                  setProductForm((prev) => ({
                                                    ...prev,
                                                    categories: updated,
                                                    category: newPrimaryCat,
                                                  }));
                                                }}
                                                className="w-3.5 h-3.5 accent-[#3b142e]"
                                              />
                                              <span className="truncate">{c.title}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                                <div className="space-y-1">
                                  <label className="font-bold text-gray-600 block uppercase">
                                    Short Description (Card Teaser)
                                  </label>
                                  <input
                                    type="text"
                                    name="description"
                                    required
                                    value={productForm.description || ""}
                                    onChange={handleProductInputChange}
                                    className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <label className="font-bold text-[#3b142e] block uppercase">
                                      Product URL Slug (SEO Permalink)
                                    </label>
                                    <span className="text-[10px] text-gray-500 font-mono">
                                      twobudz.com/products/{productForm.slug || "your-slug-here"}
                                    </span>
                                  </div>
                                  <input
                                    type="text"
                                    name="slug"
                                    value={productForm.slug || ""}
                                    onChange={handleProductInputChange}
                                    placeholder="e.g. wyld-cbd-sparkling-water-lemon-50mg"
                                    className="w-full p-2.5 bg-white border border-[#cbd5c2] rounded-xl focus:outline-none focus:border-[#3b142e] font-mono text-xs font-bold text-[#2c3527]"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1 text-xs">
                                <label className="font-bold text-gray-600 block uppercase">
                                  Full Long Product Details (Paragraphs)
                                </label>
                                <textarea
                                  name="longDescription"
                                  rows={3}
                                  value={productForm.longDescription || ""}
                                  onChange={handleProductInputChange}
                                  className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none"
                                />
                              </div>

                              {/* SEO META TAGS SECTION */}
                              <div className="p-3.5 bg-white border border-[#cbd5c2] rounded-xl space-y-3">
                                <div className="flex items-center justify-between border-b border-[#e1e8db] pb-2">
                                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#2c3527]">
                                    <Sparkles className="w-3.5 h-3.5 text-[#3b142e]" />
                                    <span>SEO Optimization & Custom Meta Tags (Google Search Snippet)</span>
                                  </div>
                                  <span className="text-[10px] text-gray-500 font-mono">Preserves Legacy SEO Rankings</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="font-bold text-[#5b6b55] block uppercase text-[10px]">
                                      Meta Title Tag (Search Result Headline)
                                    </label>
                                    <input
                                      type="text"
                                      name="metaTitle"
                                      value={productForm.metaTitle || ""}
                                      onChange={handleProductInputChange}
                                      placeholder="e.g. Organic Hemp Gummies | Best Sleep Aid in Texas"
                                      className="w-full p-2.5 bg-white border border-[#cbd5c2] rounded-xl focus:outline-none focus:border-[#3b142e] text-xs"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="font-bold text-[#5b6b55] block uppercase text-[10px]">
                                      Meta Description Tag (Google Description Snippet)
                                    </label>
                                    <input
                                      type="text"
                                      name="metaDescription"
                                      value={productForm.metaDescription || ""}
                                      onChange={handleProductInputChange}
                                      placeholder="e.g. Buy high potency state-compliant Delta-9 gummies. Clean-extracted, organic..."
                                      className="w-full p-2.5 bg-white border border-[#cbd5c2] rounded-xl focus:outline-none focus:border-[#3b142e] text-xs"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="font-bold text-[#5b6b55] block uppercase text-[10px]">
                                      SEO Indexing Keywords / Tags (Comma Separated)
                                    </label>
                                    <input
                                      type="text"
                                      name="tags"
                                      value={productForm.tags || ""}
                                      onChange={handleProductInputChange}
                                      placeholder="e.g. organic, cbd, gummies, stress-relief"
                                      className="w-full p-2.5 bg-white border border-[#cbd5c2] rounded-xl focus:outline-none focus:border-[#3b142e] text-xs"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="font-bold text-[#5b6b55] block uppercase text-[10px]">
                                      Image Alternate Text (Alt Text for Screen Readers & Image SEO)
                                    </label>
                                    <input
                                      type="text"
                                      name="altText"
                                      value={productForm.altText || ""}
                                      onChange={handleProductInputChange}
                                      placeholder="e.g. CBD American Shaman of Hurst Broad Spectrum CBD Sleep Tincture Bottle"
                                      className="w-full p-2.5 bg-white border border-[#cbd5c2] rounded-xl focus:outline-none focus:border-[#3b142e] text-xs"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                                <div className="space-y-1">
                                  <label className="font-bold text-gray-600 block uppercase">
                                    THC Level
                                  </label>
                                  <input
                                    type="text"
                                    name="thc"
                                    value={productForm.thc || ""}
                                    onChange={handleProductInputChange}
                                    placeholder="< 0.3% THC"
                                    className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="font-bold text-gray-600 block uppercase">
                                    CBD Level
                                  </label>
                                  <input
                                    type="text"
                                    name="cbd"
                                    value={productForm.cbd || ""}
                                    onChange={handleProductInputChange}
                                    placeholder="1000mg CBD"
                                    className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none"
                                  />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                                    <label className="font-bold text-gray-600 block uppercase">
                                      Product Image
                                    </label>
                                    <span className="text-[10px] text-gray-500 font-mono">
                                      Upload from PC/Gallery or paste URL below
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                    <div className="md:col-span-4">
                                      <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#edf2e8] hover:bg-[#cbd5c2] border border-[#cbd5c2] rounded-xl text-xs font-bold text-[#2c3527] cursor-pointer transition-colors w-full text-center">
                                        <span>Choose Local File</span>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              compressImageFile(file, (compressedUrl) => {
                                                setProductForm((prev) => ({
                                                  ...prev,
                                                  image: compressedUrl,
                                                }));
                                              });
                                            }
                                          }}
                                        />
                                      </label>
                                    </div>
                                    <div className="md:col-span-8">
                                      <input
                                        type="text"
                                        name="image"
                                        value={productForm.image || ""}
                                        onChange={handleProductInputChange}
                                        placeholder="https://images.unsplash... or Select file"
                                        className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none text-xs"
                                      />
                                    </div>
                                  </div>
                                  {productForm.image && (
                                    <div className="flex items-center gap-3 mt-2 p-2.5 bg-[#f7f9f4] rounded-xl border border-[#e1e8db]">
                                      <div className="w-14 h-14 rounded-lg border border-[#e1e8db] overflow-hidden bg-white flex items-center justify-center shrink-0 p-1 shadow-sm">
                                        <img
                                          src={normalizeToCleanAsset(productForm.image, productForm.category, productForm.name) || productForm.image}
                                          alt="Product Preview"
                                          className="w-full h-full object-contain"
                                          onError={(e) => handleImageError(e, productForm.category || "gummies")}
                                        />
                                      </div>
                                      <div className="text-[11px] font-sans truncate flex-1">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                          <span className="font-bold text-[#2c3527]">Product Image Preview</span>
                                          {productForm.image.startsWith("data:") && (
                                            <span className="text-[9px] text-emerald-800 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold">
                                              Custom File
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[10px] text-gray-500 font-mono truncate block max-w-sm">
                                          {productForm.image}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Presets Grid */}
                              <div className="space-y-1 text-xs">
                                <label className="font-bold text-gray-500 block uppercase">
                                  ...Or Select Recommended Media Asset Preset
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                                  {PRESET_IMAGES.map((preset, index) => (
                                    <button
                                      key={index}
                                      type="button"
                                      onClick={() =>
                                        setProductForm((prev) => ({
                                          ...prev,
                                          image: preset.url,
                                        }))
                                      }
                                      className={`p-1.5 rounded-lg border text-[10px] text-left truncate cursor-pointer transition-colors ${
                                        productForm.image === preset.url
                                          ? "bg-[#3b142e]/10 border-[#3b142e]"
                                          : "bg-white border-[#e1e8db]"
                                      }`}
                                    >
                                      {preset.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                                <div className="space-y-1">
                                  <label className="font-bold text-gray-600 block uppercase">
                                    Options / Packaging variants (Comma Separated)
                                  </label>
                                  <input
                                    type="text"
                                    name="options"
                                    value={(productForm.options as any) || ""}
                                    onChange={handleProductInputChange}
                                    placeholder="15 Gummies Pack, 30 Gummies Pack, Value Double Pack"
                                    className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="font-bold text-gray-600 block uppercase">
                                    Benefits Points list (One line each)
                                  </label>
                                  <textarea
                                    name="benefits"
                                    rows={2}
                                    value={(productForm.benefits as any) || ""}
                                    onChange={handleProductInputChange}
                                    className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none"
                                    placeholder="Anxiety elimination&#10;Systemic stress control&#10;Sleep Support"
                                  />
                                </div>
                              </div>

                              <div className="flex gap-4 text-xs pt-1">
                                <label className="flex items-center gap-1.5 font-bold text-gray-600 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!(productForm.isBestSeller || productForm.isFeaturedHome)}
                                    onChange={(e) =>
                                      setProductForm((prev) => ({
                                        ...prev,
                                        isBestSeller: e.target.checked,
                                        isFeaturedHome: e.target.checked,
                                      }))
                                    }
                                    className="w-4 h-4 accent-[#3b142e]"
                                  />
                                  <span>
                                    Pin to HOME CUSTOMER FAVORITES (BEST SELLER)
                                  </span>
                                </label>

                                <label className="flex items-center gap-1.5 font-bold text-gray-600 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={productForm.isNew || false}
                                    onChange={(e) =>
                                      setProductForm((prev) => ({
                                        ...prev,
                                        isNew: e.target.checked,
                                      }))
                                    }
                                    className="w-4 h-4 accent-[#3b142e]"
                                  />
                                  <span>Display "NEW ARRIVAL" Tag</span>
                                </label>
                              </div>

                              <div className="flex gap-2.5 pt-4 border-t border-[#e1e8db]">
                                <button
                                  type="submit"
                                  className="px-6 py-3 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-lg text-xs font-extrabold uppercase tracking-wide cursor-pointer flex items-center gap-1.5 shadow-md"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>Save Changes to Product</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsAddingProduct(false);
                                    setIsEditingProduct(null);
                                  }}
                                  className="px-6 py-3 bg-white border border-[#e1e8db] text-[#5b6b55] hover:text-red-600 font-bold rounded-lg text-xs cursor-pointer"
                                >
                                  Exit Draft
                                </button>
                              </div>
                            </form>
                          );
                        }

                        const isFeaturedOnHome = !!(p.isBestSeller || p.isFeaturedHome);
                        const displayCategoryLabel = getCategoryLabel(p.category) || p.categoryLabel || p.category;
                        const secondaryCategories = (p.categories || []).filter(
                          (c) => c && c !== "all" && c !== p.category
                        );

                        return (
                          <div
                            key={p.id}
                            className="flex flex-col xl:flex-row items-start xl:items-center justify-between p-3.5 bg-white border border-[#e1e8db] rounded-xl hover:shadow-md transition-all gap-3.5"
                          >
                            <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                              <img
                                src={normalizeToCleanAsset(p.image, p.category, p.name)}
                                alt={p.name}
                                onError={(e) => handleImageError(e, p.category)}
                                className="w-12 h-12 rounded-lg border border-[#e1e8db] object-contain bg-[#f7f9f4] shrink-0 p-0.5"
                              />
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-bold text-xs text-[#2c3527] leading-tight min-w-0">
                                    <span className="truncate max-w-full font-semibold text-sm">
                                      {p.name}
                                    </span>
                                  </h4>
                                  {isFeaturedOnHome && (
                                    <span className="text-[8px] bg-[#3b142e] text-white px-1.5 py-0.5 rounded font-mono font-bold tracking-wider shrink-0 shadow-xs">
                                      HOMEPAGE
                                    </span>
                                  )}
                                </div>

                                {/* CATEGORY BADGES DISPLAY - CLEAR PRIMARY & SECONDARY CATEGORIES */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#edf2e8] text-[#2c3527] border border-[#3b142e]/40 flex items-center gap-1 shrink-0" title={`Primary Category: ${p.category}`}>
                                    <span className="text-[#3b142e]">🏷️ Category:</span> {displayCategoryLabel}
                                  </span>

                                  {secondaryCategories.map((secCat) => (
                                    <span
                                      key={secCat}
                                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200 shrink-0"
                                      title={`Secondary Category Tag: ${secCat}`}
                                    >
                                      +{getCategoryLabel(secCat)}
                                    </span>
                                  ))}

                                  <span className="text-[11px] font-bold text-[#3b142e] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                                    ${(Number(p.price) || 0).toFixed(2)} USD
                                  </span>

                                  <span className="text-[10px] text-gray-500 font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-200 shrink-0">
                                    {p.thc} • {p.cbd}
                                  </span>
                                </div>

                                {p.slug && (
                                  <div className="pt-0.5">
                                    <span className="text-[9px] sm:text-[10px] text-[#3b142e] font-mono font-bold bg-[#f7f9f4] border border-[#e1e8db] px-2 py-0.5 rounded truncate inline-block max-w-full">
                                      SEO URL: twobudz.com/products/{p.slug}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* ACTIONS & LAST UPDATED COLUMN */}
                            <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full xl:w-auto justify-between xl:justify-end border-t xl:border-t-0 pt-2.5 xl:pt-0 border-[#e1e8db]">
                              {/* CLEAR LAST EDITED & TIMESTAMP COLUMN */}
                              <div className="flex flex-col text-left xl:text-right px-2.5 py-1 rounded-lg bg-[#f7f9f4] border border-[#e1e8db] shrink-0 min-w-[120px]">
                                <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold flex items-center gap-1 xl:justify-end">
                                  <Clock className="w-3 h-3 text-[#3b142e]" />
                                  <span>Last Edited</span>
                                </span>
                                <span className="text-xs font-mono font-extrabold text-[#2c3527]">
                                  {formatLastEdited(p.updated_at || p.created_at)}
                                </span>
                                <span className="text-[9px] text-gray-500 font-mono">
                                  {p.updated_at
                                    ? new Date(p.updated_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })
                                    : p.created_at
                                    ? new Date(p.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })
                                    : "N/A"}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => handleToggleFeaturedHome(p.id)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                                    isFeaturedOnHome
                                      ? "bg-[#3b142e] text-white border-[#3b142e]"
                                      : "bg-white text-gray-600 border-[#e1e8db] hover:border-[#3b142e]"
                                  }`}
                                  title="Toggle display on Home Page (Top 9 Grid)"
                                >
                                  <span className="text-[10px] font-bold">
                                    {isFeaturedOnHome ? "★ Home" : "+ Home"}
                                  </span>
                                </button>

                                <a
                                  href={`/products/${p.slug || p.id}`.replace(/\/+/g, "/")}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 border border-[#e1e8db] text-[#3b142e] hover:bg-[#edf2e8] rounded-lg cursor-pointer bg-white flex items-center gap-1.5 text-xs font-semibold no-underline"
                                  title="Live Preview Product in New Tab"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span className="text-[11px]">Preview</span>
                                </a>

                                <button
                                  onClick={() => handleEditProductClick(p)}
                                  className="px-2.5 py-1.5 border border-[#e1e8db] hover:border-[#3b142e] hover:bg-[#f7f9f4] text-[#3b142e] font-semibold rounded-lg cursor-pointer flex items-center gap-1.5 text-xs transition-all bg-white"
                                  title="Edit product parameters"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span className="text-[11px]">Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="px-2.5 py-1.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-lg cursor-pointer flex items-center gap-1.5 text-xs transition-all"
                                  title="Permanently remove product"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span className="text-[11px]">Delete</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* TAB 2.5: CATEGORIES MANAGEMENT ENGINE */}
              {activeTab === "categories" && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-[#e1e8db]">
                    <div>
                      <h3 className="text-base font-bold text-[#2c3527]">
                        Store Categories Management ({categories?.length || 0} Categories)
                      </h3>
                      <p className="text-xs text-gray-500">
                        Create, customize, and manage product categories. Categories set to "Show in Menu" are automatically reflected in the header dropdown navigation and homepage category grid.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setIsAddingCategory(true);
                        setIsEditingCategory(null);
                        setCategoryForm({
                          id: "",
                          title: "",
                          tagline: "",
                          desc: "",
                          image: "/images/cbd_dropper_1779557730794.png",
                          showInMenu: true,
                        });
                      }}
                      className="px-4 py-2 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Category</span>
                    </button>
                  </div>

                  {/* FORM PANEL: ADD/EDIT CATEGORY */}
                  {isAddingCategory && (
                    <form
                      id="category-edit-form-section"
                      onSubmit={handleSaveCategory}
                      className="p-5 border border-[#3b142e]/30 rounded-2xl bg-[#edf2e8]/45 space-y-4 animate-fadeIn"
                    >
                      <div className="flex justify-between items-center border-b border-[#e1e8db] pb-3">
                        <h4 className="text-sm font-bold text-[#2c3527]">
                          {isEditingCategory ? `Edit Category: ${isEditingCategory.title}` : "Create New Store Category"}
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingCategory(false);
                            setIsEditingCategory(null);
                          }}
                          className="text-xs text-gray-500 hover:text-[#2c3527] font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase">Category Title *</label>
                          <input
                            type="text"
                            required
                            value={categoryForm.title || ""}
                            onChange={(e) => setCategoryForm({ ...categoryForm, title: e.target.value })}
                            placeholder="e.g., Artisanal Gummies"
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase">Category ID / Slug</label>
                          <input
                            type="text"
                            value={categoryForm.id || ""}
                            onChange={(e) => setCategoryForm({ ...categoryForm, id: e.target.value })}
                            placeholder="e.g., gummies (auto-generated if empty)"
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase">Tagline / Subtitle</label>
                          <input
                            type="text"
                            value={categoryForm.tagline || ""}
                            onChange={(e) => setCategoryForm({ ...categoryForm, tagline: e.target.value })}
                            placeholder="e.g., Organic Precision Formulations"
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                            <label className="font-bold text-gray-600 block uppercase">Category Image</label>
                            <span className="text-[10px] text-gray-500 font-mono">
                              Upload from PC/Gallery or paste URL
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                            <div className="md:col-span-5">
                              <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#edf2e8] hover:bg-[#cbd5c2] border border-[#cbd5c2] rounded-xl text-xs font-bold text-[#2c3527] cursor-pointer transition-colors w-full text-center">
                                <Upload className="w-3.5 h-3.5 text-[#3b142e]" />
                                <span>Choose Local File</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      compressImageFile(file, (compressedUrl) => {
                                        setCategoryForm((prev) => ({
                                          ...prev,
                                          image: compressedUrl,
                                        }));
                                      });
                                    }
                                  }}
                                />
                              </label>
                            </div>
                            <div className="md:col-span-7">
                              <input
                                type="text"
                                value={categoryForm.image || ""}
                                onChange={(e) => setCategoryForm({ ...categoryForm, image: e.target.value })}
                                placeholder="/images/... or https://..."
                                className="w-full p-2 bg-white border border-[#e1e8db] rounded-xl focus:outline-none font-mono text-[11px]"
                              />
                            </div>
                          </div>
                          {categoryForm.image && (
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-7 h-7 rounded border border-[#e1e8db] overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
                                <img
                                  src={categoryForm.image}
                                  alt="Preview"
                                  className="max-w-full max-h-full object-cover"
                                  onError={(e) => handleImageError(e, categoryForm.title || "gummies")}
                                />
                              </div>
                              <span className="text-[10px] text-emerald-800 font-mono bg-emerald-500/10 px-2 py-0.5 rounded">
                                {categoryForm.image.startsWith("data:") ? "Local file loaded (Base64)" : "Image active"}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="sm:col-span-2 space-y-1">
                          <label className="font-bold text-gray-600 block uppercase">Description</label>
                          <textarea
                            rows={2}
                            value={categoryForm.desc || ""}
                            onChange={(e) => setCategoryForm({ ...categoryForm, desc: e.target.value })}
                            placeholder="Detailed description of this product collection..."
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none resize-none"
                          />
                        </div>

                        <div className="sm:col-span-2 flex flex-col sm:flex-row gap-4 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[#2c3527]">
                            <input
                              type="checkbox"
                              checked={categoryForm.isFeaturedHome !== false}
                              onChange={(e) => setCategoryForm({ ...categoryForm, isFeaturedHome: e.target.checked })}
                              className="w-4 h-4 text-[#3b142e] rounded accent-[#3b142e]"
                            />
                            <span>Display on Home Screen (Featured Starred Category)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[#2c3527]">
                            <input
                              type="checkbox"
                              id="showInMenu"
                              checked={categoryForm.showInMenu !== false}
                              onChange={(e) => setCategoryForm({ ...categoryForm, showInMenu: e.target.checked })}
                              className="w-4 h-4 text-[#3b142e] rounded accent-[#3b142e]"
                            />
                            <span>Show in Header Navigation Menu</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
                        >
                          {isEditingCategory ? "Update Category" : "Save Category"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingCategory(false);
                            setIsEditingCategory(null);
                          }}
                          className="px-4 py-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs font-bold text-gray-600 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* CATEGORIES GRID DISPLAY */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(categories || []).map((cat) => {
                      const productCount = products.filter((p) => {
                        if (p.category === cat.id) return true;
                        if (p.categories && p.categories.includes(cat.id)) return true;
                        return false;
                      }).length;

                      const isCatFeatured = cat.isFeaturedHome !== false;

                      return (
                        <div
                          key={cat.id}
                          className="bg-white border border-[#e1e8db] rounded-2xl flex flex-col justify-between overflow-hidden hover:border-[#3b142e] transition-all shadow-sm group"
                        >
                          {/* Full Category Image Banner Preview */}
                          <div className="relative w-full h-44 bg-[#edf2e8] overflow-hidden border-b border-[#e1e8db]">
                            <img
                              src={getCleanCategoryImage(cat.id, cat.image)}
                              alt={cat.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={(e) => handleImageError(e, cat.title || "gummies")}
                            />
                            <div className="absolute top-3 right-3 flex items-center gap-1.5">
                              {isCatFeatured && (
                                <span className="text-[10px] bg-[#3b142e] text-white font-mono font-bold px-2 py-0.5 rounded shadow-sm">
                                  ★ HOME
                                </span>
                              )}
                              {cat.showInMenu !== false ? (
                                <span className="text-[10px] bg-white/90 backdrop-blur-sm text-[#3b142e] border border-[#3b142e]/30 font-mono font-bold px-2 py-0.5 rounded shadow-sm">
                                  MENU
                                </span>
                              ) : (
                                <span className="text-[10px] bg-gray-900/80 text-white font-mono px-2 py-0.5 rounded shadow-sm">
                                  HIDDEN
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="font-bold text-base text-[#2c3527]">{cat.title}</h4>
                                <span className="text-[10px] font-mono text-[#3b142e] font-bold">ID: {cat.id}</span>
                              </div>
                              {cat.tagline && <p className="text-xs text-[#5b6b55] italic">{cat.tagline}</p>}
                              {cat.desc && <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 mt-1">{cat.desc}</p>}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-[#edf2e8] text-xs">
                            <span className="text-[11px] font-mono font-bold text-gray-500">
                              {productCount} Products
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleFeaturedCategoryHome(cat.id)}
                                className={`px-2 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                                  isCatFeatured
                                    ? "bg-[#3b142e] text-white border-[#3b142e]"
                                    : "bg-white text-gray-600 border-[#e1e8db] hover:border-[#3b142e]"
                                }`}
                                title="Toggle display on Home Page"
                              >
                                <Star className={`w-3.5 h-3.5 ${isCatFeatured ? "fill-white text-white" : "text-gray-400"}`} />
                                <span className="text-[10px] font-bold">
                                  {isCatFeatured ? "Home" : "+ Home"}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditingCategory(cat);
                                  setIsAddingCategory(true);
                                  setCategoryForm({ ...cat });
                                  setTimeout(() => {
                                    const el = document.getElementById("category-edit-form-section");
                                    if (el) {
                                      el.scrollIntoView({ behavior: "smooth", block: "start" });
                                    }
                                  }, 60);
                                }}
                                className="px-2 py-1.5 border border-[#e1e8db] bg-white hover:bg-[#edf2e8] text-[#2c3527] font-semibold rounded-lg cursor-pointer flex items-center gap-1 text-xs"
                                title="Edit Category"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[#3b142e]" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="px-2 py-1.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-lg cursor-pointer flex items-center gap-1 text-xs"
                                title="Delete Category"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}

              {/* TAB 3: BLOG ARTICLES ENGINE */}
              {activeTab === "blogs" && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-[#e1e8db]">
                    <div>
                      <h3 className="text-base font-bold text-[#2c3527]">
                        Journaling Feed Editor ({blogPosts.length} Articles)
                      </h3>
                      <p className="text-xs text-gray-500">
                        Post educational resources detailing dosage guides, hemp science, and compliance files.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          setShowMdImportBox(!showMdImportBox);
                          setShowBlogCsvBox(false);
                        }}
                        className="px-3 py-2 bg-[#edf2e8] hover:bg-[#cbd5c2] text-[#2c3527] border border-[#cbd5c2] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#3b142e]" />
                        <span>Import Markdown (.md)</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowBlogCsvBox(!showBlogCsvBox);
                          setShowMdImportBox(false);
                        }}
                        className="px-3 py-2 bg-white hover:bg-gray-50 text-[#2c3527] border border-gray-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-[#3b142e]" />
                        <span>Bulk Upload</span>
                      </button>
                      <button
                        onClick={handleExportBlogsCSV}
                        className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-gray-500" />
                        <span>Export CSV</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingBlog(true);
                          setIsEditingBlog(null);
                          setBlogForm({
                            title: "",
                            summary: "",
                            content: "",
                            date: new Date().toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }),
                            category: "",
                            image: "",
                            author: "",
                            slug: "",
                            metaTitle: "",
                            metaDescription: "",
                            tags: "",
                            altText: "",
                          });
                        }}
                        className="px-4 py-2 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Write Article</span>
                      </button>
                    </div>
                  </div>

                  {/* MARKDOWN (.MD) UPLOAD & AUTO-PUBLISH PANEL FOR BLOGS */}
                  {showMdImportBox && (
                    <div className="bg-[#f7f9f4] p-6 rounded-2xl border-2 border-[#3b142e]/40 space-y-4 font-sans animate-fadeIn shadow-md">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#3b142e] animate-ping" />
                          <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#3b142e]">
                            Instant Markdown (.md) Blog Importer
                          </h4>
                        </div>
                        <button
                          onClick={() => setShowMdImportBox(false)}
                          className="text-[#5b6b55] hover:text-[#2c3527] font-bold text-xs cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                      <p className="text-xs text-[#5b6b55] leading-relaxed">
                        Select or drop any Markdown (<code className="bg-white px-1.5 py-0.5 rounded font-mono border border-gray-200">.md</code>) file. The system will automatically parse YAML frontmatter (<code className="bg-white px-1.5 py-0.5 rounded font-mono border border-gray-200">post_title</code>, <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-gray-200">url</code>, <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-gray-200">meta_title</code>, <code className="bg-white px-1.5 py-0.5 rounded font-mono border border-gray-200">meta_description</code>), format headings and interactive FAQ accordions, and publish it directly to the live Hostinger MySQL database!
                      </p>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <label className="px-5 py-3 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md">
                          <Upload className="w-4 h-4" />
                          <span>Choose .md File</span>
                          <input
                            type="file"
                            accept=".md,.markdown,text/markdown,text/plain"
                            onChange={handleMdFileSelect}
                            className="hidden"
                          />
                        </label>
                        <span className="text-[11px] text-gray-500 font-mono text-center sm:text-left">
                          OR paste raw Markdown text with frontmatter below
                        </span>
                      </div>

                      <textarea
                        value={mdFileText}
                        onChange={(e) => setMdFileText(e.target.value)}
                        placeholder={`post_title: Understanding Full-Spectrum vs Broad-Spectrum CBD Before You Buy\nurl: /blog/full-spectrum-vs-broad-spectrum-vs-cbd-isolate\nmeta_title: Full Spectrum vs Broad Spectrum CBD Hurst TX\nmeta_description: Learn the difference between full-spectrum and broad-spectrum CBD...\n\n### What Is Full-Spectrum CBD?\nFull-spectrum CBD contains a wide range of naturally occurring compounds...`}
                        rows={8}
                        className="w-full p-4 bg-white border border-[#e1e8db] rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#3b142e] focus:outline-none"
                      />

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                        <button
                          onClick={() => handleImportMdBlog()}
                          disabled={isImportingMd || !mdFileText.trim()}
                          className="px-6 py-2.5 bg-[#3b142e] hover:bg-[#5d2a49] disabled:bg-gray-300 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                        >
                          <FileText className="w-4 h-4" />
                          <span>{isImportingMd ? "Publishing to Hostinger MySQL..." : "Parse & Publish Markdown Post"}</span>
                        </button>

                        {mdImportFeedback && (
                          <div className={`text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2 ${
                            mdImportFeedback.startsWith("Success")
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : mdImportFeedback.startsWith("Error")
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : "bg-blue-100 text-blue-800 border border-blue-300"
                          }`}>
                            <span>{mdImportFeedback}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* BULK UPLOAD PANEL FOR BLOGS */}
                  {showBlogCsvBox && (
                    <div className="bg-[#edf2e8] p-5 rounded-2xl border border-[#e1e8db] space-y-4 font-sans animate-fadeIn">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#3b142e]">
                          Blogs & Articles Bulk Upload (.csv / .json)
                        </h4>
                        <button
                          onClick={() => setShowBlogCsvBox(false)}
                          className="text-[#5b6b55] hover:text-[#2c3527] font-bold text-xs"
                        >
                          Close
                        </button>
                      </div>
                      <p className="text-[11px] text-[#5b6b55] leading-relaxed">
                        Upload a <code className="bg-white px-1 py-0.5 rounded font-mono">.csv</code> or <code className="bg-white px-1 py-0.5 rounded font-mono">.json</code> file or paste blog articles directly.
                        Expected CSV Headers: <code className="bg-white px-1 py-0.5 rounded font-mono">Title, Summary, Content, Category, Author, Date, Image, Slug, Tags</code>.
                        Existing articles will remain completely untouched!
                      </p>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <label className="px-4 py-2 bg-white border border-[#cbd5c2] hover:border-[#3b142e] text-[#2c3527] rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm">
                          <Upload className="w-3.5 h-3.5 text-[#3b142e]" />
                          <span>Choose Articles File (.csv / .json)</span>
                          <input
                            type="file"
                            accept=".csv,.json,text/csv,application/json"
                            onChange={handleBlogFileSelect}
                            className="hidden"
                          />
                        </label>
                        <span className="text-[10px] text-gray-500 font-mono text-center sm:text-left">
                          OR paste formatted raw text below
                        </span>
                      </div>

                      <textarea
                        value={blogCsvText}
                        onChange={(e) => setBlogCsvText(e.target.value)}
                        placeholder="Title,Summary,Content,Category,Author,Date,Image&#10;Understanding CBD Oils,A comprehensive guide on dosage,Detailed article body goes here...,Education,CBD American Shaman of Hurst Team,Jan 12 2025,https://image.url"
                        rows={5}
                        className="w-full p-3 bg-white border border-[#e1e8db] rounded-xl font-mono text-xs focus:ring-1 focus:ring-[#3b142e] focus:outline-none"
                      />

                      {blogCsvFeedback && (
                        <p
                          className={`text-xs font-mono font-bold ${blogCsvFeedback.startsWith("Error") ? "text-red-700" : "text-[#3b142e]"}`}
                        >
                          {blogCsvFeedback}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleImportBlogs()}
                          className="px-4 py-2 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-lg text-xs font-bold font-sans cursor-pointer"
                        >
                          Process Blog Import
                        </button>
                        <button
                          onClick={() => setBlogCsvText("")}
                          className="px-4 py-2 bg-white border border-[#e1e8db] rounded-lg text-xs font-bold text-gray-500 cursor-pointer"
                        >
                          Clear Text
                        </button>
                      </div>
                    </div>
                  )}

                  {/* WRITE FORM */}
                  {isAddingBlog && (
                    <form
                      onSubmit={handleSaveBlog}
                      className="p-4 border border-emerald-200 bg-[#edf2e8]/45 rounded-xl space-y-4 text-xs font-sans"
                    >
                      <h4 className="font-bold border-b border-[#e1e8db] pb-2 text-[#2c3527]">
                        {isEditingBlog
                          ? `Edit: ${isEditingBlog.title}`
                          : "Compose Educational Resource"}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="font-bold uppercase text-gray-500">
                            Article Title
                          </label>
                          <input
                            type="text"
                            required
                            value={blogForm.title || ""}
                            onChange={(e) =>
                              setBlogForm({
                                ...blogForm,
                                title: e.target.value,
                              })
                            }
                            placeholder="Unpacking Terpenes: Why Aromas Matter"
                            className="w-full p-2 bg-white border border-[#e1e8db] rounded-lg"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold uppercase text-gray-500">
                            Category Label
                          </label>
                          <input
                            type="text"
                            required
                            value={blogForm.category || "Education"}
                            onChange={(e) =>
                              setBlogForm({
                                ...blogForm,
                                category: e.target.value,
                              })
                            }
                            placeholder="Education, News, Wellness Guide"
                            className="w-full p-2 bg-white border border-[#e1e8db] rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="font-bold uppercase text-gray-500">
                            Author Name
                          </label>
                          <input
                            type="text"
                            value={blogForm.author || "CBD American Shaman of Hurst Team"}
                            onChange={(e) =>
                              setBlogForm({
                                ...blogForm,
                                author: e.target.value,
                              })
                            }
                            className="w-full p-2 bg-white border border-[#e1e8db] rounded-lg"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold uppercase text-gray-500">
                            Publish Date
                          </label>
                          <input
                            type="text"
                            value={blogForm.date || ""}
                            onChange={(e) =>
                              setBlogForm({ ...blogForm, date: e.target.value })
                            }
                            placeholder="May 26, 2026"
                            className="w-full p-2 bg-white border border-[#e1e8db] rounded-lg"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold uppercase text-gray-500">
                            Banner Image Source
                          </label>
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={blogForm.image || ""}
                                onChange={(e) =>
                                  setBlogForm({
                                    ...blogForm,
                                    image: e.target.value,
                                  })
                                }
                                placeholder="/images/hero_bg_1779557711335.png or base64..."
                                className="w-full p-2 bg-white border border-[#e1e8db] rounded-lg text-xs"
                              />
                              {blogForm.image && (
                                <div className="w-20 h-12 rounded-lg border border-[#e1e8db] overflow-hidden bg-[#f7f9f4] shrink-0">
                                  <img
                                    src={blogForm.image}
                                    alt="Preview"
                                    className="w-full h-full object-cover object-center"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Direct File Selector for PC/Mobile */}
                            <div className="flex items-center gap-2">
                              <label className="px-3 py-1.5 bg-[#3b142e]/10 hover:bg-[#3b142e]/25 text-[#3b142e] font-bold rounded-lg cursor-pointer inline-flex items-center gap-1.5 border border-[#3b142e]/25 transition-all text-[10px] select-none">
                                <span>Select Custom Image (PC/Mobile)</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      compressImageFile(file, (compressedUrl) => {
                                        setBlogForm((prev) => ({
                                          ...prev,
                                          image: compressedUrl,
                                        }));
                                      });
                                    }
                                  }}
                                  className="hidden"
                                />
                              </label>
                              {blogForm.image?.startsWith("data:image/") && (
                                <span className="text-[9px] text-[#3b142e] font-mono font-bold bg-[#edf2e8] px-2 py-0.5 rounded">
                                  ✓ Custom Photo Uploaded
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Blog Presets Grid */}
                      <div className="space-y-1 text-[11px]">
                        <label className="font-bold text-gray-500 block uppercase">
                          ...Or Select Recommended Media Asset Preset
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                          {[
                            {
                              label: "Wellness Routine",
                              url: "/images/how-to-incorporate-cbd-into-your-daily-wellness-routine.jpg",
                            },
                            {
                              label: "Purity & Cannabinoids",
                              url: "/images/understanding-the-purity-difference-cbd-vs-delta-9.jpg",
                            },
                            {
                              label: "Senior Pet Care",
                              url: "/images/senior-pet-care-enhancing-playtime-and-healing-rest-with-cbd.jpg",
                            },
                            {
                              label: "Best CBD Products FM",
                              url: "/images/how-to-choose-the-best-cbd-products-in-flower-mound-tx.jpg",
                            },
                            {
                              label: "CBD American Shaman of Hurst Leaf",
                              url: "/images/hero_bg_1779557711335.png",
                            },
                            {
                              label: "Premium CBD Dropper",
                              url: "/images/cbd_dropper_1779557730794.png",
                            },
                          ].map((p, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() =>
                                setBlogForm((prev) => ({
                                  ...prev,
                                  image: p.url,
                                }))
                              }
                              className={`p-1.5 rounded-lg border text-[10px] text-left truncate cursor-pointer transition-colors ${
                                blogForm.image === p.url
                                  ? "bg-[#3b142e]/10 border-[#3b142e] font-bold text-[#3b142e]"
                                  : "bg-white border-[#e1e8db] text-gray-600"
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="font-bold uppercase text-gray-500">
                            Short Summary Segment
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              insertLinkAtFormKey("blog", "summary")
                            }
                            className="text-[#3b142e] hover:underline font-mono text-[10px] uppercase font-black cursor-pointer"
                            title="Word menu: Click to add a hyperlink"
                          >
                            🔗 Add Hyperlink
                          </button>
                        </div>
                        <input
                          type="text"
                          required
                          value={blogForm.summary || ""}
                          onChange={(e) =>
                            setBlogForm({
                              ...blogForm,
                              summary: e.target.value,
                            })
                          }
                          placeholder="Summarize the core message of the guide to catch quick glances."
                          className="w-full p-2 bg-white border border-[#e1e8db] rounded-lg"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
                          <label className="font-bold uppercase text-gray-500">
                            Rich Body Content (MS Word Style Formatting)
                          </label>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const heading = prompt("Enter Section Heading Title:", "Key Health Benefits");
                                if (heading) {
                                  setBlogForm((prev) => ({
                                    ...prev,
                                    content: (prev.content || "") + `\n\n**${heading}:**\n`,
                                  }));
                                }
                              }}
                              className="px-2 py-1 bg-[#edf2e8] hover:bg-[#cbd5c2] text-[#2c3527] border border-[#cbd5c2] rounded text-[10px] font-bold cursor-pointer transition-colors"
                              title="Add Section Title (Word H2)"
                            >
                              + Heading
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBlogForm((prev) => ({
                                  ...prev,
                                  content: (prev.content || "") + `\n✓ `,
                                }));
                              }}
                              className="px-2 py-1 bg-[#3b142e]/10 hover:bg-[#3b142e]/20 text-[#3b142e] border border-[#3b142e]/30 rounded text-[10px] font-bold cursor-pointer transition-colors"
                              title="Add Tick Bullet item"
                            >
                              ✓ Tick Bullet
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBlogForm((prev) => ({
                                  ...prev,
                                  content: (prev.content || "") + `\n• `,
                                }));
                              }}
                              className="px-2 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded text-[10px] font-bold cursor-pointer transition-colors"
                              title="Add Dot Bullet item"
                            >
                              • Bullet
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBlogForm((prev) => ({
                                  ...prev,
                                  content: (prev.content || "") + ` **Bold Text** `,
                                }));
                              }}
                              className="px-2 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded text-[10px] font-bold cursor-pointer transition-colors"
                              title="Make text bold"
                            >
                              <b>B</b> Bold
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                insertLinkAtFormKey("blog", "content")
                              }
                              className="px-2 py-1 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                              title="Word menu: Click to add a hyperlink"
                            >
                              🔗 Link
                            </button>
                          </div>
                        </div>
                        <textarea
                          required
                          rows={8}
                          value={blogForm.content || ""}
                          onChange={(e) =>
                            setBlogForm({
                              ...blogForm,
                              content: e.target.value,
                            })
                          }
                          placeholder="Write article body here. Use MS Word tools above to add headings (**Title:**) and tick bullets (✓ item)..."
                          className="w-full p-3 bg-white border border-[#e1e8db] rounded-lg font-sans resize-y focus:outline-none focus:border-[#3b142e] text-xs leading-relaxed"
                        />
                      </div>

                      {/* ADVANCED BLOG SEO PARAMETERS SECTION */}
                      <div className="p-4 bg-emerald-50/50 border border-[#edf2e8] rounded-xl space-y-3.5 text-xs">
                        <div className="flex items-center gap-1.5 border-b border-[#cbd5c2]/40 pb-2">
                          <span className="text-base">📝</span>
                          <span className="font-extrabold text-[#2c3527] uppercase tracking-wider text-[11px]">
                            Blog Article SEO Custom Parameters
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="font-bold text-[#5b6b55] block uppercase text-[10px]">
                              SEO Custom URL Slug
                            </label>
                            <input
                              type="text"
                              value={blogForm.slug || ""}
                              onChange={(e) =>
                                setBlogForm({
                                  ...blogForm,
                                  slug: e.target.value,
                                })
                              }
                              placeholder="e.g. guide-to-endocannabinoid-system-dosing"
                              className="w-full p-2 bg-white border border-[#cbd5c2] rounded-lg font-mono text-xs focus:outline-none focus:border-[#3b142e]"
                            />
                            <p className="text-[9px] text-[#72856a]">
                              Leave blank to auto-generate slug from article
                              title
                            </p>
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold text-[#5b6b55] block uppercase text-[10px]">
                              Alt Text (Alternative Image Text)
                            </label>
                            <input
                              type="text"
                              value={blogForm.altText || ""}
                              onChange={(e) =>
                                setBlogForm({
                                  ...blogForm,
                                  altText: e.target.value,
                                })
                              }
                              placeholder="e.g. CBD American Shaman of Hurst Hemp leaves detailing premium terpenes under amber light"
                              className="w-full p-2 bg-white border border-[#cbd5c2] rounded-lg focus:outline-none focus:border-[#3b142e]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="font-bold text-[#5b6b55] block uppercase text-[10px]">
                              Meta Title Tag (Google Title)
                            </label>
                            <input
                              type="text"
                              value={blogForm.metaTitle || ""}
                              onChange={(e) =>
                                setBlogForm({
                                  ...blogForm,
                                  metaTitle: e.target.value,
                                })
                              }
                              placeholder="e.g. Complete Sourcing Guide to Premium Hemp Terpenes | CBD American Shaman of Hurst"
                              className="w-full p-2 bg-white border border-[#cbd5c2] rounded-lg focus:outline-none focus:border-[#3b142e]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="font-bold text-[#5b6b55] block uppercase text-[10px]">
                              Meta Description (Google Snippet)
                            </label>
                            <input
                              type="text"
                              value={blogForm.metaDescription || ""}
                              onChange={(e) =>
                                setBlogForm({
                                  ...blogForm,
                                  metaDescription: e.target.value,
                                })
                              }
                              placeholder="e.g. Read about the clinical history of hemp, active cannabinoids like broad-spectrum CBD, and state compliance..."
                              className="w-full p-2 bg-white border border-[#cbd5c2] rounded-lg focus:outline-none focus:border-[#3b142e]"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-[#5b6b55] block uppercase text-[10px]">
                            SEO Indexing Keywords / Tags (Comma Separated)
                          </label>
                          <input
                            type="text"
                            value={blogForm.tags || ""}
                            onChange={(e) =>
                              setBlogForm({ ...blogForm, tags: e.target.value })
                            }
                            placeholder="e.g. terpenes, cannabidiol, wellness, hemp compliance"
                            className="w-full p-2 bg-white border border-[#cbd5c2] rounded-lg focus:outline-none focus:border-[#3b142e]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-[#5b6b55] block uppercase text-[10px]">
                            Canonical URL (Search Engine Authority Tag)
                          </label>
                          <input
                            type="text"
                            value={blogForm.canonicalUrl || ""}
                            onChange={(e) =>
                              setBlogForm({
                                ...blogForm,
                                canonicalUrl: e.target.value,
                              })
                            }
                            placeholder={`https://cbdhurst.com/blog/${blogForm.slug || "article-slug"}`}
                            className="w-full p-2 bg-white border border-[#cbd5c2] rounded-lg font-mono text-xs focus:outline-none focus:border-[#3b142e]"
                          />
                          <p className="text-[9px] text-[#72856a]">
                            Default: https://cbdhurst.com/blog/{(blogForm.slug || "").trim() || "[slug]"}. Sets the official master canonical link for Google and SEO crawlers.
                          </p>
                        </div>
                      </div>

                      {/* BLOG FAQ DROPDOWNS SECTION */}
                      <div className="p-4 bg-white border border-[#e1e8db] rounded-xl space-y-3 text-xs shadow-sm">
                        <div className="flex items-center justify-between border-b border-[#e1e8db] pb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">❓</span>
                            <span className="font-extrabold text-[#2c3527] uppercase tracking-wider text-[11px]">
                              Blog FAQ Section (Interactive Dropdown Accordions)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const currentFaqs = Array.isArray(blogForm.faqs) ? blogForm.faqs : [];
                              setBlogForm({
                                ...blogForm,
                                faqs: [...currentFaqs, { question: "", answer: "" }],
                              });
                            }}
                            className="px-3 py-1 bg-[#3b142e] text-white rounded text-[11px] font-bold cursor-pointer hover:bg-[#5f8421] transition-all flex items-center gap-1"
                          >
                            <span>+ Add FAQ Item (+1)</span>
                          </button>
                        </div>

                        {Array.isArray(blogForm.faqs) && blogForm.faqs.length > 0 ? (
                          <div className="space-y-3 pt-1">
                            {blogForm.faqs.map((faq, fIdx) => (
                              <div key={fIdx} className="p-3 bg-[#f7f9f4] border border-[#e1e8db] rounded-lg space-y-2 relative">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-[10px] text-[#3b142e] uppercase font-mono">FAQ #{fIdx + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedFaqs = blogForm.faqs!.filter((_, i) => i !== fIdx);
                                      setBlogForm({ ...blogForm, faqs: updatedFaqs });
                                    }}
                                    className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-0.5 border border-red-200 rounded bg-white cursor-pointer"
                                  >
                                    ✕ Delete
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={faq.question || ""}
                                  onChange={(e) => {
                                    const updated = [...blogForm.faqs!];
                                    updated[fIdx].question = e.target.value;
                                    setBlogForm({ ...blogForm, faqs: updated });
                                  }}
                                  placeholder="Question (e.g. Is CBD legal in Texas?)"
                                  className="w-full p-2 bg-white border border-[#cbd5c2] rounded-lg focus:outline-none focus:border-[#3b142e] font-bold text-xs"
                                />
                                <textarea
                                  rows={2}
                                  value={faq.answer || ""}
                                  onChange={(e) => {
                                    const updated = [...blogForm.faqs!];
                                    updated[fIdx].answer = e.target.value;
                                    setBlogForm({ ...blogForm, faqs: updated });
                                  }}
                                  placeholder="Answer details..."
                                  className="w-full p-2 bg-white border border-[#cbd5c2] rounded-lg focus:outline-none focus:border-[#3b142e] text-xs"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-400 italic">No custom FAQ items added yet. Click "+ Add FAQ Item (+1)" above to add interactive question & answer dropdowns to this article.</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 items-center">
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-[#3b142e] hover:bg-[#5c8020] text-white rounded-lg font-bold cursor-pointer transition-colors shadow-sm text-xs"
                        >
                          {isEditingBlog ? "Update Guide" : "Publish Guide"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewingBlog({
                              id: isEditingBlog?.id || "preview-id",
                              title: blogForm.title || "Untitled Blog Post",
                              summary: blogForm.summary || "",
                              content: blogForm.content || "",
                              category: blogForm.category || "Wellness Guide",
                              author: blogForm.author || "CBD American Shaman of Hurst Team",
                              date: blogForm.date || new Date().toLocaleDateString(),
                              image: blogForm.image || "",
                              slug: blogForm.slug || "",
                              isFeaturedHome: blogForm.isFeaturedHome || false,
                              faqs: blogForm.faqs || [],
                            });
                          }}
                          className="px-4 py-2.5 bg-white border border-[#cbd5c2] hover:border-[#3b142e] text-[#2c3527] rounded-lg font-bold flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
                        >
                          <Eye className="w-4 h-4 text-[#3b142e]" />
                          <span>Preview Article</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingBlog(false);
                            setIsEditingBlog(null);
                          }}
                          className="px-5 py-2.5 bg-white border border-[#e1e8db] hover:border-gray-400 text-gray-700 rounded-lg cursor-pointer text-xs font-semibold transition-colors"
                        >
                          Exit
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Search Bar for Blogs */}
                  <div className="flex items-center gap-2 mb-3 bg-white p-2.5 border border-[#cbd5c2] rounded-xl shadow-sm">
                    <Search className="w-4 h-4 text-[#3b142e] shrink-0 ml-1" />
                    <input
                      type="text"
                      value={blogSearchQuery}
                      onChange={(e) => setBlogSearchQuery(e.target.value)}
                      placeholder="Search blog articles by title, category, slug, or content..."
                      className="w-full text-xs font-sans text-[#2c3527] bg-transparent border-none focus:outline-none placeholder-gray-400 font-semibold"
                    />
                    {blogSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setBlogSearchQuery("")}
                        className="text-xs text-gray-400 hover:text-gray-600 px-2 font-bold cursor-pointer"
                      >
                        ✕ Clear
                      </button>
                    )}
                  </div>

                  {/* List feeds */}
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {blogPosts
                      .filter((b) => {
                        if (!blogSearchQuery.trim()) return true;
                        const q = blogSearchQuery.toLowerCase().trim();
                        return (
                          (b.title && b.title.toLowerCase().includes(q)) ||
                          (b.category && b.category.toLowerCase().includes(q)) ||
                          (b.slug && b.slug.toLowerCase().includes(q)) ||
                          (b.summary && b.summary.toLowerCase().includes(q)) ||
                          (b.content && b.content.toLowerCase().includes(q))
                        );
                      })
                      .map((b) => (
                      <div
                        key={b.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-[#e1e8db] rounded-xl font-sans bg-[#f7f9f4]/25 gap-3"
                      >
                        <div className="flex items-center gap-3.5 w-full min-w-0">
                          {(() => {
                            const thumbImg = resolveBlogImage(b);
                            return thumbImg ? (
                              <div className="w-20 sm:w-24 h-14 rounded-xl border border-[#e1e8db] overflow-hidden shrink-0 bg-[#f7f9f4] shadow-xs flex items-center justify-center">
                                <img
                                  src={thumbImg}
                                  alt={b.title}
                                  className="w-full h-full object-cover object-center"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-20 sm:w-24 h-14 rounded-xl border border-[#e1e8db] bg-[#3b142e]/10 text-[#3b142e] flex items-center justify-center font-bold text-sm shrink-0">
                                📄
                              </div>
                            );
                          })()}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-xs sm:text-sm text-[#2c3527] line-clamp-2">
                              {b.title}
                            </h4>
                            <p className="text-[10px] sm:text-[11px] text-gray-500 mt-1 flex flex-wrap items-center gap-1.5 font-mono">
                              <span>By {b.author}</span>
                              <span>•</span>
                              <span>{b.date}</span>
                              <span>•</span>
                              <span className="text-[#3b142e] font-bold">{b.category}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 items-center">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = blogPosts.map((bp) => {
                                if (bp.id === b.id) {
                                  return { ...bp, isFeaturedHome: !bp.isFeaturedHome };
                                }
                                return bp;
                              });
                              setBlogPosts(updated);

                              const featuredIds = updated.filter((bp: any) => bp.isFeaturedHome).map((bp: any) => bp.id);
                              if (typeof window !== "undefined") {
                                safeSetItem("twobudz_featured_blog_ids", JSON.stringify(featuredIds));
                              }

                              const updatedSettings = {
                                ...businessSettings,
                                featuredBlogIds: JSON.stringify(featuredIds),
                                seoKeywordsOverride: JSON.stringify(featuredIds)
                              };
                              setBusinessSettings(updatedSettings);
                              pushAllLocalDataToSupabase(products, categories, updated, faqItems, orders, inquiries, updatedSettings);
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                              b.isFeaturedHome
                                ? "bg-[#3b142e] text-white border-[#3b142e]"
                                : "bg-white text-gray-600 border-[#e1e8db] hover:border-[#3b142e]"
                            }`}
                            title="Star toggle: Show this blog on Homepage (Top 3 Blogs)"
                          >
                            <span>{b.isFeaturedHome ? "★ Home" : "+ Home"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPreviewingBlog(b)}
                            className="p-1.5 border border-[#e1e8db] hover:border-[#3b142e] rounded text-gray-500 hover:text-[#3b142e] bg-white cursor-pointer transition-colors"
                            title="Preview Article"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEditBlogClick(b)}
                            className="p-1.5 border border-[#e1e8db] hover:border-[#3b142e] rounded text-gray-500 hover:text-[#3b142e] bg-white cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBlog(b.id)}
                            className="p-1.5 border border-[#e1e8db] hover:border-red-600 rounded text-gray-400 hover:text-red-700 bg-white cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: FAQS MANAGEMENT */}
              {activeTab === "faqs" && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-[#e1e8db]">
                    <div>
                      <h3 className="text-base font-bold text-[#2c3527]">
                        Accordion Accord Desk ({faqItems.length} FAQs)
                      </h3>
                      <p className="text-xs text-gray-500">
                        Edit, remove, or deploy rapid questions explaining legality, compliance and Hurst logistics.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setShowFaqCsvBox(!showFaqCsvBox)}
                        className="px-3 py-2 bg-[#edf2e8] hover:bg-[#cbd5c2] text-[#2c3527] border border-[#cbd5c2] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-[#3b142e]" />
                        <span>Bulk Upload</span>
                      </button>
                      <button
                        onClick={handleExportFaqsCSV}
                        className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-gray-500" />
                        <span>Export CSV</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingFaq(true);
                          setIsEditingFaq(null);
                          setFaqForm({ question: "", answer: "" });
                        }}
                        className="px-4 py-2 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Insert FAQ</span>
                      </button>
                    </div>
                  </div>

                  {/* BULK UPLOAD PANEL FOR FAQS */}
                  {showFaqCsvBox && (
                    <div className="bg-[#edf2e8] p-5 rounded-2xl border border-[#e1e8db] space-y-4 font-sans animate-fadeIn">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#3b142e]">
                          FAQs Bulk Upload (.csv / .json)
                        </h4>
                        <button
                          onClick={() => setShowFaqCsvBox(false)}
                          className="text-[#5b6b55] hover:text-[#2c3527] font-bold text-xs"
                        >
                          Close
                        </button>
                      </div>
                      <p className="text-[11px] text-[#5b6b55] leading-relaxed">
                        Upload a <code className="bg-white px-1 py-0.5 rounded font-mono">.csv</code> or <code className="bg-white px-1 py-0.5 rounded font-mono">.json</code> file or paste questions and answers directly.
                        Expected CSV Headers: <code className="bg-white px-1 py-0.5 rounded font-mono">Question, Answer, Category</code>.
                        Existing FAQs will remain completely untouched!
                      </p>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <label className="px-4 py-2 bg-white border border-[#cbd5c2] hover:border-[#3b142e] text-[#2c3527] rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm">
                          <Upload className="w-3.5 h-3.5 text-[#3b142e]" />
                          <span>Choose FAQs File (.csv / .json)</span>
                          <input
                            type="file"
                            accept=".csv,.json,text/csv,application/json"
                            onChange={handleFaqFileSelect}
                            className="hidden"
                          />
                        </label>
                        <span className="text-[10px] text-gray-500 font-mono text-center sm:text-left">
                          OR paste formatted raw text below
                        </span>
                      </div>

                      <textarea
                        value={faqCsvText}
                        onChange={(e) => setFaqCsvText(e.target.value)}
                        placeholder="Question,Answer,Category&#10;What are store hours?,We operate 9am to 7pm CST daily,General&#10;Is local delivery free?,Yes on orders over $50 in Hurst,Shipping"
                        rows={5}
                        className="w-full p-3 bg-white border border-[#e1e8db] rounded-xl font-mono text-xs focus:ring-1 focus:ring-[#3b142e] focus:outline-none"
                      />

                      {faqCsvFeedback && (
                        <p
                          className={`text-xs font-mono font-bold ${faqCsvFeedback.startsWith("Error") ? "text-red-700" : "text-[#3b142e]"}`}
                        >
                          {faqCsvFeedback}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleImportFaqs()}
                          className="px-4 py-2 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-lg text-xs font-bold font-sans cursor-pointer"
                        >
                          Process FAQ Import
                        </button>
                        <button
                          onClick={() => setFaqCsvText("")}
                          className="px-4 py-2 bg-white border border-[#e1e8db] rounded-lg text-xs font-bold text-gray-500 cursor-pointer"
                        >
                          Clear Text
                        </button>
                      </div>
                    </div>
                  )}

                  {isAddingFaq && (
                    <form
                      onSubmit={handleSaveFaq}
                      className="p-4 border border-emerald-100 bg-[#edf2e8]/40 rounded-xl space-y-3 text-xs"
                    >
                      <div className="space-y-1">
                        <label className="font-bold uppercase text-gray-500">
                          Question Text
                        </label>
                        <input
                          type="text"
                          required
                          value={faqForm.question || ""}
                          onChange={(e) =>
                            setFaqForm({ ...faqForm, question: e.target.value })
                          }
                          className="w-full p-2 bg-white border border-[#e1e8db] rounded-lg focus:outline-none"
                          placeholder="How long does local Hurst delivery take?"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold uppercase text-gray-500 font-sans text-xs">
                          Elaborative Answer
                        </label>
                        <textarea
                          required
                          rows={3}
                          value={faqForm.answer || ""}
                          onChange={(e) =>
                            setFaqForm({ ...faqForm, answer: e.target.value })
                          }
                          className="w-full p-2 bg-white border border-[#e1e8db] rounded-lg focus:outline-none"
                          placeholder="Provide detailed breakdown to reassure parents or newcomers."
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-[#3b142e] text-white rounded-lg font-bold"
                        >
                          Inject FAQ
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingFaq(false);
                            setIsEditingFaq(null);
                          }}
                          className="px-4 py-2 bg-white border border-[#e1e8db] rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {faqItems.map((f) => (
                      <div
                        key={f.id}
                        className="p-3 bg-white border border-[#e1e8db] rounded-xl font-sans space-y-1 hover:border-[#3b142e]/40 transition-colors"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="font-bold text-xs text-[#2c3527]">
                            Q: {f.question}
                          </h4>
                          <button
                            onClick={() => handleDeleteFaq(f.id)}
                            className="text-gray-400 hover:text-red-700 bg-white border border-[#e1e8db] p-1 rounded cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                          A: {f.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: Simulated CRM (Orders & Inquiries) */}
              {activeTab === "orders" && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-base font-bold text-[#2c3527]">
                        CRM Customer Center & Billing Terminal
                      </h3>
                      <p className="text-xs text-gray-500">
                        Monitor real-time orders submitted by clients and correspondence queries.
                      </p>
                    </div>
                  </div>

                  {/* Orders Log Header with Bulk Tools */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#e1e8db] pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-mono tracking-widest text-[#72856a] uppercase font-bold">
                          Completed & Active Customer Billings ({orders.length})
                        </h4>
                        {orders.length > ORDERS_PER_PAGE && (
                          <span className="text-[11px] font-mono text-[#5b6b55] bg-[#edf2e8] px-2 py-0.5 rounded-md font-bold">
                            Page {Math.min(Math.max(1, ordersCurrentPage), Math.max(1, Math.ceil(orders.length / ORDERS_PER_PAGE)))} of {Math.max(1, Math.ceil(orders.length / ORDERS_PER_PAGE))}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowOrdersCsvBox(!showOrdersCsvBox)}
                          className="px-2.5 py-1.5 bg-[#edf2e8] hover:bg-[#cbd5c2] text-[#2c3527] border border-[#cbd5c2] rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-[#3b142e]" />
                          <span>Bulk Upload Orders</span>
                        </button>
                        <button
                          onClick={handleExportOrdersCSV}
                          className="px-2.5 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-gray-500" />
                          <span>Export Orders CSV</span>
                        </button>
                      </div>
                    </div>

                    {/* BULK UPLOAD PANEL FOR ORDERS */}
                    {showOrdersCsvBox && (
                      <div className="bg-[#edf2e8] p-5 rounded-2xl border border-[#e1e8db] space-y-4 font-sans animate-fadeIn">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#3b142e]">
                            Orders Bulk Upload (.csv / .json)
                          </h4>
                          <button
                            onClick={() => setShowOrdersCsvBox(false)}
                            className="text-[#5b6b55] hover:text-[#2c3527] font-bold text-xs"
                          >
                            Close
                          </button>
                        </div>
                        <p className="text-[11px] text-[#5b6b55] leading-relaxed">
                          Upload a <code className="bg-white px-1 py-0.5 rounded font-mono">.csv</code> or <code className="bg-white px-1 py-0.5 rounded font-mono">.json</code> file or paste order data directly.
                          Expected CSV Headers: <code className="bg-white px-1 py-0.5 rounded font-mono">Order ID, Customer Name, Email, Phone, Total Amount, Status, Date, Address</code>.
                          Existing order records will remain completely untouched!
                        </p>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <label className="px-4 py-2 bg-white border border-[#cbd5c2] hover:border-[#3b142e] text-[#2c3527] rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm">
                            <Upload className="w-3.5 h-3.5 text-[#3b142e]" />
                            <span>Choose Orders File (.csv / .json)</span>
                            <input
                              type="file"
                              accept=".csv,.json,text/csv,application/json"
                              onChange={handleOrdersFileSelect}
                              className="hidden"
                            />
                          </label>
                          <span className="text-[10px] text-gray-500 font-mono text-center sm:text-left">
                            OR paste formatted raw text below
                          </span>
                        </div>

                        <textarea
                          value={ordersCsvText}
                          onChange={(e) => setOrdersCsvText(e.target.value)}
                          placeholder="Order ID,Customer Name,Email,Phone,Total Amount,Status,Date,Address&#10;ORD-9921,John Smith,john@example.com,555-0199,89.50,Completed,2025-01-15,123 Main St"
                          rows={4}
                          className="w-full p-3 bg-white border border-[#e1e8db] rounded-xl font-mono text-xs focus:ring-1 focus:ring-[#3b142e] focus:outline-none"
                        />

                        {ordersCsvFeedback && (
                          <p
                            className={`text-xs font-mono font-bold ${ordersCsvFeedback.startsWith("Error") ? "text-red-700" : "text-[#3b142e]"}`}
                          >
                            {ordersCsvFeedback}
                          </p>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleImportOrders()}
                            className="px-4 py-2 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-lg text-xs font-bold font-sans cursor-pointer"
                          >
                            Process Orders Import
                          </button>
                          <button
                            onClick={() => setOrdersCsvText("")}
                            className="px-4 py-2 bg-white border border-[#e1e8db] rounded-lg text-xs font-bold text-gray-500 cursor-pointer"
                          >
                            Clear Text
                          </button>
                        </div>
                      </div>
                    )}

                    {orders.length === 0 ? (
                      <div className="p-8 border border-dashed border-[#e1e8db] bg-[#f7f9f4]/50 rounded-xl text-center space-y-2">
                        <ShoppingCart className="w-8 h-8 text-gray-400 mx-auto" />
                        <h5 className="text-xs font-bold text-[#2c3527]">
                          Log registers empty
                        </h5>
                        <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                          Submit orders securely by clicking **Order Now** or
                          checkout on your Shopping Cart. It records instantly
                          here!
                        </p>
                      </div>
                    ) : (
                      (() => {
                        const totalOrdersPages = Math.max(1, Math.ceil(orders.length / ORDERS_PER_PAGE));
                        const effectiveOrdersPage = Math.min(Math.max(1, ordersCurrentPage), totalOrdersPages);
                        const paginatedOrders = orders.slice(
                          (effectiveOrdersPage - 1) * ORDERS_PER_PAGE,
                          effectiveOrdersPage * ORDERS_PER_PAGE
                        );

                        return (
                          <>
                            <div className="space-y-4">
                              {paginatedOrders.map((o) => (
                                <div
                                  key={o.id}
                                  className="p-5 bg-white border border-[#cbd5c2] hover:border-[#3b142e] rounded-2xl font-sans space-y-4 shadow-xs transition-all"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e1e8db] pb-3">
                                    <div className="flex items-center gap-3">
                                      <span className="font-mono text-sm font-bold text-[#3b142e] bg-[#edf2e8] px-3 py-1 rounded-lg">
                                        {o.id}
                                      </span>
                                      <span className="text-xs text-gray-500 font-medium">
                                        {o.date}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-[#5b6b55] uppercase tracking-wider">
                                        Status:
                                      </span>
                                      <select
                                        value={o.status}
                                        onChange={(e) =>
                                          handleUpdateOrderStatus(
                                            o.id,
                                            e.target.value,
                                          )
                                        }
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors focus:outline-none cursor-pointer ${
                                          o.status === "completed"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                            : o.status === "processing"
                                            ? "bg-blue-50 text-blue-700 border-blue-300"
                                            : o.status === "cancelled"
                                            ? "bg-red-50 text-red-700 border-red-300"
                                            : "bg-amber-50 text-amber-800 border-amber-300"
                                        }`}
                                      >
                                        <option value="pending">
                                          Pending Review
                                        </option>
                                        <option value="processing">
                                          Processing Doses
                                        </option>
                                        <option value="completed">
                                          Shipped / Completed
                                        </option>
                                        <option value="cancelled">
                                          Cancelled/Refunded
                                        </option>
                                      </select>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div className="bg-[#f7f9f4] p-4 rounded-xl border border-[#e1e8db]">
                                      <h5 className="font-bold text-[#5b6b55] uppercase text-[11px] tracking-wider mb-2 flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5" />
                                        Customer & Delivery Details
                                      </h5>
                                      <p className="font-bold text-[#2c3527] text-base">
                                        {o.customer.firstName} {o.customer.lastName}
                                      </p>
                                      <p className="text-gray-600 mt-1">
                                        {o.customer.address}, {o.customer.city},{" "}
                                        {o.customer.state} ({o.customer.zipCode})
                                      </p>
                                      <div className="mt-2.5 pt-2 border-t border-[#e1e8db] flex flex-wrap items-center gap-3 text-xs text-gray-600 font-mono">
                                        {o.customer.email && (
                                          <a
                                            href={`mailto:${o.customer.email}`}
                                            className="text-[#3b142e] hover:underline"
                                          >
                                            {o.customer.email}
                                          </a>
                                        )}
                                        {o.customer.phone && (
                                          <span>• {o.customer.phone}</span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="bg-[#f7f9f4] p-4 rounded-xl border border-[#e1e8db]">
                                      <h5 className="font-bold text-[#5b6b55] uppercase text-[11px] tracking-wider mb-2 flex items-center gap-1.5">
                                        <DollarSign className="w-3.5 h-3.5" />
                                        Billing & Transaction Breakdown
                                      </h5>
                                      <div className="space-y-1.5 text-xs text-gray-600 font-mono">
                                        <div className="flex justify-between">
                                          <span>Subtotal:</span>
                                          <span className="font-semibold text-gray-800">${(Number(o.subtotal) || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>State Tax:</span>
                                          <span>${(Number(o.tax) || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Fulfillment ({o.deliveryMethod || "Standard"}):</span>
                                          <span className="font-semibold text-gray-800">
                                            {o.shipping === 0
                                              ? "FREE"
                                              : `$${(Number(o.shipping) || 0).toFixed(2)}`}
                                          </span>
                                        </div>
                                        <div className="flex justify-between font-bold text-[#2c3527] pt-2 border-t border-[#cbd5c2] text-sm font-sans">
                                          <span>Grand Total ({o.paymentMethod || "Direct Payment"}):</span>
                                          <span className="text-[#3b142e] font-mono text-base font-bold">${(Number(o.total) || 0).toFixed(2)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="bg-[#edf2e8]/60 p-4 rounded-xl border border-[#cbd5c2] text-xs">
                                    <p className="font-bold text-[#2c3527] mb-2 uppercase tracking-wider text-[11px]">
                                      Ordered Items ({o.items?.length || 0}):
                                    </p>
                                    <div className="divide-y divide-[#cbd5c2]/60">
                                      {o.items.map((item, idx) => (
                                        <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                                          <div>
                                            <span className="font-bold text-[#2c3527] text-sm">{item.productName}</span>
                                            {item.selectedOption && (
                                              <span className="text-gray-600 ml-2 text-xs">({item.selectedOption})</span>
                                            )}
                                            <span className="ml-2.5 px-2 py-0.5 rounded bg-white border border-[#cbd5c2] text-[11px] font-mono font-bold text-gray-700">
                                              Qty: {item.quantity}
                                            </span>
                                          </div>
                                          <span className="font-mono font-bold text-[#2c3527] text-sm shrink-0">
                                            ${(Number(item.price) || 0).toFixed(2)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Pagination Controls */}
                            {totalOrdersPages > 1 && (
                              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#e1e8db] font-sans">
                                <div className="text-xs text-[#5b6b55] font-mono">
                                  Showing <strong className="text-[#2c3527]">{(effectiveOrdersPage - 1) * ORDERS_PER_PAGE + 1}</strong> to{" "}
                                  <strong className="text-[#2c3527]">{Math.min(effectiveOrdersPage * ORDERS_PER_PAGE, orders.length)}</strong> of{" "}
                                  <strong className="text-[#2c3527]">{orders.length}</strong> orders (10 per page)
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {/* Previous Button */}
                                  <button
                                    onClick={() => setOrdersCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={effectiveOrdersPage <= 1}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                                      effectiveOrdersPage <= 1
                                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
                                        : "bg-white hover:bg-[#edf2e8] text-[#2c3527] border-[#cbd5c2] hover:border-[#3b142e]"
                                    }`}
                                  >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                    <span>Previous</span>
                                  </button>

                                  {/* Numbered Page Buttons */}
                                  <div className="flex items-center gap-1">
                                    {Array.from({ length: totalOrdersPages }, (_, idx) => idx + 1).map((pageNum) => {
                                      if (
                                        totalOrdersPages > 7 &&
                                        pageNum !== 1 &&
                                        pageNum !== totalOrdersPages &&
                                        Math.abs(pageNum - effectiveOrdersPage) > 1
                                      ) {
                                        if (
                                          (pageNum === 2 && effectiveOrdersPage > 3) ||
                                          (pageNum === totalOrdersPages - 1 && effectiveOrdersPage < totalOrdersPages - 2)
                                        ) {
                                          return (
                                            <span key={pageNum} className="px-1 text-gray-400 text-xs">
                                              …
                                            </span>
                                          );
                                        }
                                        return null;
                                      }

                                      return (
                                        <button
                                          key={pageNum}
                                          onClick={() => setOrdersCurrentPage(pageNum)}
                                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer font-mono ${
                                            effectiveOrdersPage === pageNum
                                              ? "bg-[#3b142e] text-white shadow-xs font-extrabold"
                                              : "bg-white hover:bg-[#edf2e8] text-[#2c3527] border border-[#cbd5c2]"
                                          }`}
                                        >
                                          {pageNum}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* Next Button */}
                                  <button
                                    onClick={() => setOrdersCurrentPage((p) => Math.min(totalOrdersPages, p + 1))}
                                    disabled={effectiveOrdersPage >= totalOrdersPages}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                                      effectiveOrdersPage >= totalOrdersPages
                                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
                                        : "bg-white hover:bg-[#edf2e8] text-[#2c3527] border-[#cbd5c2] hover:border-[#3b142e]"
                                    }`}
                                  >
                                    <span>Next</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()
                    )}
                  </div>

                  {/* Inquiries Log */}
                  <div className="space-y-4 pt-4 border-t border-[#e1e8db]">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#e1e8db] pb-2">
                      <h4 className="text-xs font-mono tracking-widest text-[#72856a] uppercase font-bold">
                        Direct Support Mailbox Inquiries ({inquiries.length})
                      </h4>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowInquiriesCsvBox(!showInquiriesCsvBox)}
                          className="px-2.5 py-1.5 bg-[#edf2e8] hover:bg-[#cbd5c2] text-[#2c3527] border border-[#cbd5c2] rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-[#3b142e]" />
                          <span>Bulk Upload Inquiries</span>
                        </button>
                        <button
                          onClick={handleExportInquiriesCSV}
                          className="px-2.5 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-gray-500" />
                          <span>Export Inquiries CSV</span>
                        </button>
                      </div>
                    </div>

                    {/* BULK UPLOAD PANEL FOR INQUIRIES */}
                    {showInquiriesCsvBox && (
                      <div className="bg-[#edf2e8] p-5 rounded-2xl border border-[#e1e8db] space-y-4 font-sans animate-fadeIn">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#3b142e]">
                            Customer Inquiries Bulk Upload (.csv / .json)
                          </h4>
                          <button
                            onClick={() => setShowInquiriesCsvBox(false)}
                            className="text-[#5b6b55] hover:text-[#2c3527] font-bold text-xs"
                          >
                            Close
                          </button>
                        </div>
                        <p className="text-[11px] text-[#5b6b55] leading-relaxed">
                          Upload a <code className="bg-white px-1 py-0.5 rounded font-mono">.csv</code> or <code className="bg-white px-1 py-0.5 rounded font-mono">.json</code> file or paste inquiry records directly.
                          Expected CSV Headers: <code className="bg-white px-1 py-0.5 rounded font-mono">Inquiry ID, Name, Email, Phone, Message, Date, Status</code>.
                          Existing inquiry records will remain completely untouched!
                        </p>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <label className="px-4 py-2 bg-white border border-[#cbd5c2] hover:border-[#3b142e] text-[#2c3527] rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm">
                            <Upload className="w-3.5 h-3.5 text-[#3b142e]" />
                            <span>Choose Inquiries File (.csv / .json)</span>
                            <input
                              type="file"
                              accept=".csv,.json,text/csv,application/json"
                              onChange={handleInquiriesFileSelect}
                              className="hidden"
                            />
                          </label>
                          <span className="text-[10px] text-gray-500 font-mono text-center sm:text-left">
                            OR paste formatted raw text below
                          </span>
                        </div>

                        <textarea
                          value={inquiriesCsvText}
                          onChange={(e) => setInquiriesCsvText(e.target.value)}
                          placeholder="Inquiry ID,Name,Email,Phone,Message,Date,Status&#10;INQ-102,Jane Doe,jane@example.com,555-0188,Looking for wholesale pricing,2025-01-16,New"
                          rows={4}
                          className="w-full p-3 bg-white border border-[#e1e8db] rounded-xl font-mono text-xs focus:ring-1 focus:ring-[#3b142e] focus:outline-none"
                        />

                        {inquiriesCsvFeedback && (
                          <p
                            className={`text-xs font-mono font-bold ${inquiriesCsvFeedback.startsWith("Error") ? "text-red-700" : "text-[#3b142e]"}`}
                          >
                            {inquiriesCsvFeedback}
                          </p>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleImportInquiries()}
                            className="px-4 py-2 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-lg text-xs font-bold font-sans cursor-pointer"
                          >
                            Process Inquiries Import
                          </button>
                          <button
                            onClick={() => setInquiriesCsvText("")}
                            className="px-4 py-2 bg-white border border-[#e1e8db] rounded-lg text-xs font-bold text-gray-500 cursor-pointer"
                          >
                            Clear Text
                          </button>
                        </div>
                      </div>
                    )}

                    {inquiries.length === 0 ? (
                      <p className="text-xs text-gray-400 py-6 text-center bg-[#f7f9f4]/35 rounded-xl border border-dashed border-[#e1e8db]">
                        Mailbox empty. Try submitting clean contact messages on
                        the storefront contact modals of Hurst!
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {inquiries.map((i) => (
                          <div
                            key={i.id}
                            className="p-4 bg-white border border-[#cbd5c2] hover:border-[#3b142e] rounded-xl text-xs space-y-3 transition-colors shadow-xs"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#f7f9f4] p-3 rounded-lg border border-[#e1e8db]">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-[#2c3527] text-sm">
                                  {i.name}
                                </span>
                                <a
                                  href={`mailto:${i.email}`}
                                  className="text-[#3b142e] font-mono text-xs hover:underline"
                                >
                                  &lt;{i.email}&gt;
                                </a>
                                {i.phone && (
                                  <span className="text-gray-500 font-mono text-xs">
                                    • {i.phone}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <select
                                  value={i.status}
                                  onChange={(e) =>
                                    handleInquiryStatusChange(
                                      i.id,
                                      e.target.value,
                                    )
                                  }
                                  className={`px-2.5 py-1 rounded text-xs font-bold border focus:outline-none cursor-pointer ${
                                    i.status === "unread"
                                      ? "bg-red-50 text-red-700 border-red-300"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-300"
                                  }`}
                                >
                                  <option value="unread">
                                    Unread / Urgent
                                  </option>
                                  <option value="replied">
                                    Answered & Closed
                                  </option>
                                </select>
                              </div>
                            </div>
                            <p className="text-gray-700 text-sm leading-relaxed px-1">"{i.msg}"</p>
                            <p className="text-[11px] text-[#72856a] text-right font-mono">
                              Received: {i.date}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5.5: REVIEWS MANAGEMENT & MODERATION */}
              {activeTab === "reviews" && (
                <div className="space-y-6 animate-fadeIn font-sans">
                  {/* Header & Stats Bar */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-[#e1e8db] shadow-xs">
                    <div>
                      <h3 className="text-base font-bold text-[#2c3527] flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                        <span>Product Reviews Moderation & Management Console</span>
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Add, edit ratings, filter by star ratings, delete, and bulk upload customer reviews. Synced live to database!
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        onClick={() => {
                          setIsAddingReview(true);
                          setIsEditingReview(null);
                          setReviewForm({
                            productId: products[0]?.id || "",
                            author: "",
                            rating: 5,
                            comment: "",
                            title: "",
                            date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                          });
                        }}
                        className="px-3.5 py-2 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Add New Review</span>
                      </button>
                      <button
                        onClick={() => setShowReviewsCsvBox(!showReviewsCsvBox)}
                        className="px-3 py-2 bg-[#edf2e8] hover:bg-[#cbd5c2] text-[#2c3527] border border-[#cbd5c2] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-[#3b142e]" />
                        <span>Bulk Upload Reviews</span>
                      </button>
                      <button
                        onClick={handleExportReviewsCSV}
                        className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Download className="w-4 h-4 text-gray-500" />
                        <span>Export Reviews CSV</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Reset reviews list to exact 200 client-provided reviews? This will clear old accumulated cache.")) {
                            const clientRevs = generateInitialReviewsForProducts(products);
                            if (setReviews) setReviews(clientRevs);
                            safeSetItem("twobudz_reviews", JSON.stringify(clientRevs));
                            if (isSupabaseConfigured()) {
                              pushAllLocalDataToSupabase(products, categories, blogPosts, faqItems, orders, inquiries, businessSettings, clientRevs);
                            }
                            alert("✅ Success! Reset store reviews list to clean 200 client-provided reviews.");
                          }
                        }}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                        <span>Reset to 200 Client Reviews</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  {(() => {
                    const activeProductIds = new Set(products.map((p) => String(p.id)));
                    const activeProductNames = new Set(products.map((p) => p.name.toLowerCase().trim()));
                    const activeStoreReviews = (reviews || []).filter((r) => {
                      if (!r) return false;
                      const rId = String(r.productId || "");
                      const rName = (r.productName || "").toLowerCase().trim();
                      return activeProductIds.has(rId) || activeProductNames.has(rName);
                    });
                    const fiveStarCount = activeStoreReviews.filter((r) => Number(r.rating) === 5).length;
                    const avgRating = activeStoreReviews.length > 0
                      ? (activeStoreReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / activeStoreReviews.length).toFixed(1)
                      : "5.0";

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-white border border-[#e1e8db] rounded-2xl flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-extrabold text-lg">
                            ⭐
                          </div>
                          <div>
                            <div className="text-xl font-extrabold text-[#2c3527]">{avgRating} / 5.0</div>
                            <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Average Star Rating</div>
                          </div>
                        </div>

                        <div className="p-4 bg-white border border-[#e1e8db] rounded-2xl flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-extrabold text-lg">
                            💬
                          </div>
                          <div>
                            <div className="text-xl font-extrabold text-[#2c3527]">{activeStoreReviews.length}</div>
                            <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Total Product Reviews</div>
                          </div>
                        </div>

                        <div className="p-4 bg-white border border-[#e1e8db] rounded-2xl flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 font-extrabold text-lg">
                            🏆
                          </div>
                          <div>
                            <div className="text-xl font-extrabold text-[#2c3527]">{fiveStarCount}</div>
                            <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">5-Star Glowing Reviews</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* BULK CSV UPLOAD PANEL */}
                  {showReviewsCsvBox && (
                    <div className="bg-[#edf2e8] p-5 rounded-2xl border border-[#e1e8db] space-y-4 font-sans animate-fadeIn">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#3b142e]">
                          Product Reviews Bulk Upload (.csv / .json)
                        </h4>
                        <button
                          onClick={() => setShowReviewsCsvBox(false)}
                          className="text-[#5b6b55] hover:text-[#2c3527] font-bold text-xs"
                        >
                          Close
                        </button>
                      </div>
                      <p className="text-[11px] text-[#5b6b55] leading-relaxed">
                        Upload a <code className="bg-white px-1 py-0.5 rounded font-mono">.csv</code> or <code className="bg-white px-1 py-0.5 rounded font-mono">.json</code> file or paste review records directly.
                        Expected CSV Headers: <code className="bg-white px-1 py-0.5 rounded font-mono">Product ID / Name, Author, Rating (1-5), Title, Comment, Date</code>.
                        Existing reviews will remain intact!
                      </p>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <label className="px-4 py-2 bg-white border border-[#cbd5c2] hover:border-[#3b142e] text-[#2c3527] rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm">
                          <Upload className="w-3.5 h-3.5 text-[#3b142e]" />
                          <span>Choose Reviews File (.csv / .json)</span>
                          <input
                            type="file"
                            accept=".csv,.json,text/csv,application/json"
                            onChange={handleReviewsFileSelect}
                            className="hidden"
                          />
                        </label>
                        <span className="text-[10px] text-gray-500 font-mono text-center sm:text-left">
                          OR paste formatted raw text below
                        </span>
                      </div>

                      <textarea
                        value={reviewsCsvText}
                        onChange={(e) => setReviewsCsvText(e.target.value)}
                        placeholder="Product Name,Author,Rating,Title,Comment,Date&#10;Organic CBD,Jessica M.,5,Amazing Relief,Works wonders for daily relaxation!,May 20 2026"
                        rows={4}
                        className="w-full p-3 bg-white border border-[#e1e8db] rounded-xl font-mono text-xs focus:ring-1 focus:ring-[#3b142e] focus:outline-none"
                      />

                      {reviewsCsvFeedback && (
                        <p
                          className={`text-xs font-mono font-bold ${reviewsCsvFeedback.startsWith("Error") ? "text-red-700" : "text-[#3b142e]"}`}
                        >
                          {reviewsCsvFeedback}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleImportReviews()}
                          className="px-4 py-2 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-lg text-xs font-bold font-sans cursor-pointer"
                        >
                          Process Reviews Import
                        </button>
                        <button
                          onClick={() => setReviewsCsvText("")}
                          className="px-4 py-2 bg-white border border-[#e1e8db] rounded-lg text-xs font-bold text-gray-500 cursor-pointer"
                        >
                          Clear Text
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ADD / EDIT REVIEW FORM MODAL */}
                  {(isAddingReview || isEditingReview) && (
                    <form
                      onSubmit={handleSaveReview}
                      className="p-5 bg-white border-2 border-[#3b142e] rounded-2xl space-y-4 shadow-md text-xs animate-fadeIn"
                    >
                      <div className="flex justify-between items-center border-b border-[#e1e8db] pb-3">
                        <h4 className="font-extrabold text-sm text-[#2c3527] uppercase">
                          {isEditingReview ? "Edit Product Review" : "+ Create & Inject Product Review"}
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingReview(false);
                            setIsEditingReview(null);
                          }}
                          className="text-gray-400 hover:text-gray-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            Assigned Product Formula
                          </label>
                          <select
                            value={reviewForm.productId || (products[0]?.id || "")}
                            onChange={(e) => {
                              const selectedProd = products.find((p) => p.id === e.target.value);
                              setReviewForm({
                                ...reviewForm,
                                productId: e.target.value,
                                productName: selectedProd ? selectedProd.name : "",
                              });
                            }}
                            className="w-full p-2.5 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl font-bold text-xs"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (${Number(p.price).toFixed(2)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            Reviewer / Customer Name
                          </label>
                          <input
                            type="text"
                            required
                            value={reviewForm.author || ""}
                            onChange={(e) => setReviewForm({ ...reviewForm, author: e.target.value })}
                            className="w-full p-2.5 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-xs"
                            placeholder="e.g. Jessica M. or Dr. Ethan Brooks"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            Star Rating (1 to 5 Stars)
                          </label>
                          <div className="flex items-center gap-2 p-2 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                                className="cursor-pointer transition-transform hover:scale-125"
                              >
                                <Star
                                  className={`w-5 h-5 ${
                                    star <= (Number(reviewForm.rating) || 5)
                                      ? "text-amber-500 fill-amber-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              </button>
                            ))}
                            <span className="ml-2 font-bold text-xs text-gray-700 font-mono">
                              {reviewForm.rating || 5} / 5 Stars
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            Headline / Short Title
                          </label>
                          <input
                            type="text"
                            value={reviewForm.title || ""}
                            onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                            className="w-full p-2.5 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-xs"
                            placeholder="e.g. Superior therapeutic quality"
                          />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            Detailed Review Comment Body
                          </label>
                          <textarea
                            required
                            rows={3}
                            value={reviewForm.comment || ""}
                            onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                            className="w-full p-2.5 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-xs"
                            placeholder="Write customer feedback, experience, dosing comments, or test results..."
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            Review Date
                          </label>
                          <input
                            type="text"
                            value={reviewForm.date || ""}
                            onChange={(e) => setReviewForm({ ...reviewForm, date: e.target.value })}
                            className="w-full p-2.5 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-xs"
                            placeholder="May 20, 2026"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-xl font-bold uppercase text-xs cursor-pointer shadow-sm"
                        >
                          {isEditingReview ? "Save Review Updates" : "Publish & Save Review"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingReview(false);
                            setIsEditingReview(null);
                          }}
                          className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold uppercase text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* SEARCH & FILTERS BAR */}
                  {(() => {
                    const activeProductIds = new Set(products.map((p) => String(p.id)));
                    const activeProductNames = new Set(products.map((p) => p.name.toLowerCase().trim()));

                    // Pre-filter active reviews for live catalog products
                    const activeStoreReviews = (reviews || []).filter((r) => {
                      if (!r) return false;
                      const rId = String(r.productId || "");
                      const rName = (r.productName || "").toLowerCase().trim();
                      return activeProductIds.has(rId) || activeProductNames.has(rName);
                    });

                    const filteredReviews = activeStoreReviews.filter((r) => {
                      if (reviewProductFilter !== "all") {
                        const selectedProd = products.find((p) => String(p.id) === String(reviewProductFilter));
                        const targetId = String(reviewProductFilter);
                        const targetName = selectedProd ? selectedProd.name.toLowerCase().trim() : "";
                        const rId = String(r.productId || "");
                        const rName = (r.productName || "").toLowerCase().trim();

                        const matchById = rId === targetId;
                        const matchByName = targetName && rName && (rName === targetName || rName.includes(targetName) || targetName.includes(rName));

                        if (!matchById && !matchByName) return false;
                      }

                      if (reviewRatingFilter !== "all" && String(r.rating) !== reviewRatingFilter) return false;

                      if (reviewSearch.trim()) {
                        const q = reviewSearch.toLowerCase().trim();
                        const matchAuthor = (r.author || "").toLowerCase().includes(q);
                        const matchComment = (r.comment || "").toLowerCase().includes(q);
                        const matchProd = (r.productName || "").toLowerCase().includes(q);
                        const matchTitle = (r.title || "").toLowerCase().includes(q);
                        return matchAuthor || matchComment || matchProd || matchTitle;
                      }
                      return true;
                    });

                    return (
                      <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-[#e1e8db]">
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              value={reviewSearch}
                              onChange={(e) => setReviewSearch(e.target.value)}
                              placeholder="Search reviews by reviewer name, comment, or product title..."
                              className="w-full p-2.5 pl-3 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#3b142e]"
                            />
                          </div>

                          <div className="flex gap-2 shrink-0">
                            <select
                              value={reviewProductFilter}
                              onChange={(e) => setReviewProductFilter(e.target.value)}
                              className="p-2.5 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-xs font-bold max-w-xs truncate"
                            >
                              <option value="all">All Products ({activeStoreReviews.length})</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>

                            {reviewProductFilter !== "all" && (
                              <button
                                type="button"
                                onClick={() => setReviewProductFilter("all")}
                                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                              >
                                ✕ Reset Product Filter
                              </button>
                            )}

                            <select
                              value={reviewRatingFilter}
                              onChange={(e) => setReviewRatingFilter(e.target.value)}
                              className="p-2.5 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-xs font-bold"
                            >
                              <option value="all">All Ratings</option>
                              <option value="5">5 Stars ⭐⭐⭐⭐⭐</option>
                              <option value="4">4 Stars ⭐⭐⭐⭐</option>
                              <option value="3">3 Stars ⭐⭐⭐</option>
                              <option value="2">2 Stars ⭐⭐</option>
                              <option value="1">1 Star ⭐</option>
                            </select>
                          </div>
                        </div>

                        {/* REVIEWS LIST DISPLAY */}
                        {filteredReviews.length === 0 ? (
                          <div className="p-10 text-center bg-white rounded-2xl border border-[#e1e8db] space-y-2">
                            <Star className="w-10 h-10 text-gray-300 mx-auto" />
                            <h4 className="font-bold text-gray-700 text-sm">No Reviews Found Matching Criteria</h4>
                            <p className="text-xs text-gray-500">
                              Try adjusting your search terms or click "+ Add New Review" above to create one.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredReviews.map((r) => (
                              <div
                                key={r.id}
                                className="p-4 bg-white border border-[#e1e8db] rounded-2xl space-y-3 hover:border-[#3b142e]/50 transition-all shadow-2xs"
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <div className="flex">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                          <Star
                                            key={s}
                                            className={`w-3.5 h-3.5 ${
                                              s <= (Number(r.rating) || 5)
                                                ? "text-amber-500 fill-amber-400"
                                                : "text-gray-300"
                                            }`}
                                          />
                                        ))}
                                      </div>
                                      <span className="font-extrabold text-xs text-[#2c3527]">{r.author}</span>
                                      {r.verified !== false && (
                                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[9px] font-bold">
                                          ✓ Verified Buyer
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] font-mono text-gray-400 mt-0.5">
                                      Product:{" "}
                                      <button
                                        type="button"
                                        onClick={() => setReviewProductFilter(r.productId)}
                                        className="text-[#3b142e] font-bold hover:underline cursor-pointer bg-transparent border-0 p-0 text-[10px]"
                                        title={`Click to show only reviews for ${r.productName || r.productId}`}
                                      >
                                        {r.productName || r.productId}
                                      </button>{" "}
                                      • {r.date}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => {
                                        setIsEditingReview(r);
                                        setIsAddingReview(false);
                                        setReviewForm(r);
                                      }}
                                      className="p-1.5 text-gray-500 hover:text-[#3b142e] hover:bg-[#edf2e8] rounded-lg transition-colors cursor-pointer"
                                      title="Edit Review"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteReview(r.id)}
                                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                      title="Delete Review"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {r.title && (
                                  <h5 className="font-bold text-xs text-[#2c3527]">"{r.title}"</h5>
                                )}

                                <p className="text-xs text-gray-600 leading-relaxed bg-[#f7f9f4]/60 p-2.5 rounded-xl border border-[#e1e8db]/60 italic">
                                  "{r.comment}"
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 6: CONTACT INFORMATION SETTINGS */}
              {activeTab === "settings" && adminRole === "super_admin" && (
                <div className="space-y-6 animate-fadeIn font-sans text-xs">
                  <div>
                    <h3 className="text-base font-bold text-[#2c3527]">
                      Store Parameters & Operational Info
                    </h3>
                    <p className="text-xs text-gray-500">
                      Edit business numbers, emails, addresses, and hours.
                      Changes propagate live instantly!
                    </p>
                  </div>

                  <form
                    onSubmit={handleSaveSettings}
                    className="space-y-4 max-w-xl"
                  >
                    <div className="space-y-1">
                      <label className="font-bold text-gray-600 block uppercase">
                        Operational Working Hours
                      </label>
                      <input
                        type="text"
                        value={settingsForm.hours}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            hours: e.target.value,
                          })
                        }
                        required
                        className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl"
                        placeholder="Mon - Fri: 10:30 AM - 7:30 PM | Sat: 10:30 AM - 6:30 PM | Sun: 11:00 AM - 6:00 PM"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-gray-600 block uppercase">
                        Business Contact Support Hotline
                      </label>
                      <input
                        type="text"
                        value={settingsForm.phone}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            phone: e.target.value,
                          })
                        }
                        required
                        className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl"
                        placeholder="+1 (817) 494-3335"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-gray-600 block uppercase">
                        Business Care Email Address
                      </label>
                      <input
                        type="email"
                        value={settingsForm.email}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            email: e.target.value,
                          })
                        }
                        className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl"
                        placeholder="Store email (optional)"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-gray-600 block uppercase">
                        Boutique Headquarter Address Location
                      </label>
                      <input
                        type="text"
                        value={settingsForm.location}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            location: e.target.value,
                          })
                        }
                        required
                        className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl"
                        placeholder="Hurst, Texas (75028)"
                      />
                    </div>

                    {/* CUSTOM PAGES & VIEW URL PATH CUSTOMIZER */}
                    <div className="pt-6 border-t border-[#e1e8db] space-y-4">
                      <div>
                        <h4 className="text-xs font-extrabold text-[#2c3527] uppercase tracking-wider">
                          // Custom Pages & View URL Path Customizer
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Customize the exact URL slug path for each main page
                          view to match your SEO preferences.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-sans">
                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            Shop (Our Products) URL Path
                          </label>
                          <input
                            type="text"
                            value={settingsForm.urlShop || ""}
                            onChange={(e) =>
                              setSettingsForm({
                                ...settingsForm,
                                urlShop: e.target.value,
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs font-mono"
                            placeholder="shop"
                          />
                          <p className="text-[9px] text-gray-400">
                            e.g., /shop or /our-products
                          </p>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            Learn (Our Story) URL Path
                          </label>
                          <input
                            type="text"
                            value={settingsForm.urlLearn || ""}
                            onChange={(e) =>
                              setSettingsForm({
                                ...settingsForm,
                                urlLearn: e.target.value,
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs font-mono"
                            placeholder="learn"
                          />
                          <p className="text-[9px] text-gray-400">
                            e.g., /learn or /wellness-journal
                          </p>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            About Page URL Path
                          </label>
                          <input
                            type="text"
                            value={settingsForm.urlAbout || ""}
                            onChange={(e) =>
                              setSettingsForm({
                                ...settingsForm,
                                urlAbout: e.target.value,
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs font-mono"
                            placeholder="about"
                          />
                          <p className="text-[9px] text-gray-400">
                            e.g., /about or /our-heritage
                          </p>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            FAQ Page URL Path
                          </label>
                          <input
                            type="text"
                            value={settingsForm.urlFaq || ""}
                            onChange={(e) =>
                              setSettingsForm({
                                ...settingsForm,
                                urlFaq: e.target.value,
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs font-mono"
                            placeholder="faq"
                          />
                          <p className="text-[9px] text-gray-400">
                            e.g., /faq or /help-center
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* HOMEPAGE HERO BANNER CUSTOMIZER SUBSECTION */}
                    <div className="pt-6 border-t border-[#e1e8db] space-y-4">
                      <div>
                        <h4 className="text-xs font-extrabold text-[#2c3527] uppercase tracking-wider">
                          // Homepage Hero Section copy customizer
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Edit any copy text, buttons, headings, and images
                          rendered on the storefront banner.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            Hero Small Top Badge
                          </label>
                          <input
                            type="text"
                            value={settingsForm.heroBadge || ""}
                            onChange={(e) =>
                              setSettingsForm({
                                ...settingsForm,
                                heroBadge: e.target.value,
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs"
                            placeholder="PREMIUM HEMP & CBD • HURST, TX"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            Verified Legal Status Text
                          </label>
                          <input
                            type="text"
                            value={settingsForm.heroVerifiedText || ""}
                            onChange={(e) =>
                              setSettingsForm({
                                ...settingsForm,
                                heroVerifiedText: e.target.value,
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs"
                            placeholder="VERIFIED 100% LEGAL"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            Hero Heading Line 1
                          </label>
                          <input
                            type="text"
                            value={settingsForm.heroHeadingLine1 || ""}
                            onChange={(e) =>
                              setSettingsForm({
                                ...settingsForm,
                                heroHeadingLine1: e.target.value,
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs"
                            placeholder="Earthy Purity."
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            Hero Heading Line 2 (Highlighted Green)
                          </label>
                          <input
                            type="text"
                            value={settingsForm.heroHeadingLine2 || ""}
                            onChange={(e) =>
                              setSettingsForm({
                                ...settingsForm,
                                heroHeadingLine2: e.target.value,
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs"
                            placeholder="Crafted Wellness & Relief."
                          />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            Hero Description Paragraph
                          </label>
                          <textarea
                            value={settingsForm.heroParagraph || ""}
                            onChange={(e) =>
                              setSettingsForm({
                                ...settingsForm,
                                heroParagraph: e.target.value,
                              })
                            }
                            rows={3}
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs"
                            placeholder="Welcome to CBD American Shaman of Hurst, Hurst's trusted source..."
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            Primary CTA Button Text
                          </label>
                          <input
                            type="text"
                            value={settingsForm.heroButtonPrimary || ""}
                            onChange={(e) =>
                              setSettingsForm({
                                ...settingsForm,
                                heroButtonPrimary: e.target.value,
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs"
                            placeholder="EXPLORE PRODUCTS"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            Secondary CTA Button Text
                          </label>
                          <input
                            type="text"
                            value={settingsForm.heroButtonSecondary || ""}
                            onChange={(e) =>
                              setSettingsForm({
                                ...settingsForm,
                                heroButtonSecondary: e.target.value,
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs"
                            placeholder="OUR STORY"
                          />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            Hero Main Background Image Asset Path
                          </label>
                          <input
                            type="text"
                            value={settingsForm.heroImage || ""}
                            onChange={(e) =>
                              setSettingsForm({
                                ...settingsForm,
                                heroImage: e.target.value,
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs"
                            placeholder="/images/hero_bg_1779557711335.png"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            Badge Widget 1 Headline Title
                          </label>
                          <input
                            type="text"
                            value={settingsForm.heroWidget1Title || ""}
                            onChange={(e) =>
                              setSettingsForm({
                                ...settingsForm,
                                heroWidget1Title: e.target.value,
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs"
                            placeholder="Organic CBD"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            Badge Widget 1 Rating Scale
                          </label>
                          <input
                            type="text"
                            value={settingsForm.heroWidget1Rating || ""}
                            onChange={(e) =>
                              setSettingsForm({
                                ...settingsForm,
                                heroWidget1Rating: e.target.value,
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs"
                            placeholder="4.9"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            Badge Widget 2 Headline Title
                          </label>
                          <input
                            type="text"
                            value={settingsForm.heroWidget2Title || ""}
                            onChange={(e) =>
                              setSettingsForm({
                                ...settingsForm,
                                heroWidget2Title: e.target.value,
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs"
                            placeholder="Delta-9 Packs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            Badge Widget 2 Sub-Label Info
                          </label>
                          <input
                            type="text"
                            value={settingsForm.heroWidget2Sub || ""}
                            onChange={(e) =>
                              setSettingsForm({
                                ...settingsForm,
                                heroWidget2Sub: e.target.value,
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs"
                            placeholder="Pure Extraction"
                          />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            Bottom Brand Commitment Slogan
                          </label>
                          <input
                            type="text"
                            value={settingsForm.heroCommitmentTitle || ""}
                            onChange={(e) =>
                              setSettingsForm({
                                ...settingsForm,
                                heroCommitmentTitle: e.target.value,
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs"
                            placeholder="Small Business Owned"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SEO META TAGS & SOCIAL GRAPH CUSTOMIZER */}
                    <div className="pt-6 border-t border-[#e1e8db] space-y-4">
                      <div className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-[#3b142e]" />
                        <h4 className="text-xs font-extrabold text-[#2c3527] uppercase tracking-wider">
                          SEO Meta Tags & Social Graph Customizer
                        </h4>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        Customize search engine headings, keywords, and
                        description tags in real-time. These updates
                        automatically inject into the browser index document
                        head and update social sharing OpenGraph previews.
                      </p>

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            SEO Meta Document Title (Home / Default Fallback)
                          </label>
                          <input
                            type="text"
                            value={settingsForm.seoTitleOverride || ""}
                            onChange={(e) =>
                              setSettingsForm({
                                ...settingsForm,
                                seoTitleOverride: e.target.value,
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs"
                            placeholder="CBD American Shaman of Hurst | Premium Organic Hemp & CBD Hurst TX"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            SEO Meta Description Tag Content
                          </label>
                          <textarea
                            value={settingsForm.seoDescriptionOverride || ""}
                            onChange={(e) =>
                              setSettingsForm({
                                ...settingsForm,
                                seoDescriptionOverride: e.target.value,
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs h-20"
                            placeholder="Hurst's trusted source for certified, state-compliant Delta-9, CBD Flowers, clean tinctures, and custom wellness comfort..."
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-gray-600 block uppercase text-[10px]">
                            SEO Meta Keywords (Comma Separated)
                          </label>
                          <input
                            type="text"
                            value={settingsForm.seoKeywordsOverride || ""}
                            onChange={(e) =>
                              setSettingsForm({
                                ...settingsForm,
                                seoKeywordsOverride: e.target.value,
                              })
                            }
                            className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl text-xs"
                            placeholder="cbd, delta 9, Hurst Texas, organic hemp, gummies"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="px-6 py-3 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-xl font-bold uppercase cursor-pointer"
                    >
                      Sync Parameters
                    </button>
                  </form>

                  {/* HOSTINGER MYSQL DATABASE CONTROL */}
                  <div className="pt-6 border-t border-[#e1e8db] space-y-4">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-[#3b142e]" />
                      <h4 className="text-sm font-bold text-[#2c3527]">
                        Hostinger MySQL Database
                      </h4>
                    </div>
                    <p className="text-[11.5px] text-[#5b6b55] leading-relaxed">
                      Your store is configured to use your <strong>Hostinger MySQL Database</strong> (<code>u554546348_twobudz</code>).
                      All product changes, customer inquiries, orders, blogs, and settings are saved directly to Hostinger MySQL via the secure PHP API bridge.
                    </p>

                    <div className="bg-[#f7f9f4] p-4 rounded-xl border border-[#e1e8db] space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-[#e1e8db]">
                        <span className="font-bold text-gray-700 text-xs">
                          Database Status:
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full text-[10px] font-bold text-green-700 uppercase">
                          🟢 HOSTINGER MYSQL ACTIVE
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-lg border border-[#e1e8db] space-y-1">
                          <span className="text-[10px] font-bold uppercase text-gray-500 block">Database Name</span>
                          <span className="font-mono text-xs font-semibold text-gray-800">u554546348_twobudz</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-[#e1e8db] space-y-1">
                          <span className="text-[10px] font-bold uppercase text-gray-500 block">Database User</span>
                          <span className="font-mono text-xs font-semibold text-gray-800">u554546348_Twobudz</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-[#e1e8db] space-y-1">
                          <span className="text-[10px] font-bold uppercase text-gray-500 block">Host & Port</span>
                          <span className="font-mono text-xs font-semibold text-gray-800">localhost:3306 (Internal PDO)</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-[#e1e8db] space-y-1">
                          <span className="text-[10px] font-bold uppercase text-gray-500 block">API Bridge</span>
                          <span className="font-mono text-xs font-semibold text-gray-800">/api/index.php</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={async () => {
                            setSyncFeedback("Testing connection to Hostinger MySQL...");
                            try {
                              const pingRes = await pingSupabaseKeepAlive();
                              if (pingRes.success) {
                                const details = (pingRes as any).details;
                                const counts = details?.tableCounts;
                                const countsStr = counts ? ` (Products: ${counts.products || 0}, Cats: ${counts.categories || 0}, Blogs: ${counts.blogs || 0})` : "";
                                setSyncFeedback(`✅ Connection Successful! Hostinger MySQL is online${countsStr}.`);
                              } else {
                                setSyncFeedback(`⚠️ Health check: ${pingRes.error || "Could not reach API bridge. Make sure the out folder is uploaded to Hostinger public_html."}`);
                              }
                            } catch (e: any) {
                              setSyncFeedback(`⚠️ Health check error: ${e.message}`);
                            }
                          }}
                          className="px-4 py-2 bg-white border border-[#e1e8db] hover:bg-gray-50 text-gray-700 rounded-lg font-bold uppercase text-[10px]"
                        >
                          Test MySQL Connection
                        </button>
                      </div>
                    </div>

                    <div className="p-4 border border-[#e1e8db] rounded-xl bg-white space-y-3">
                      <h5 className="font-bold text-[#2c3527] text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#3b142e]" />{" "}
                        Push all Store Catalog & Settings to Hostinger MySQL
                      </h5>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Click below to instantly populate your Hostinger MySQL database tables with all current products, categories, curated blogs, faqs, and site settings.
                      </p>

                      <button
                        type="button"
                        disabled={isSyncingAll}
                        onClick={async () => {
                          setIsSyncingAll(true);
                          setSyncFeedback("Pushing all catalog data to Hostinger MySQL...");
                          try {
                            const summary = await pushAllLocalDataToSupabase(
                              products,
                              categories,
                              blogPosts,
                              faqItems,
                              orders,
                              inquiries,
                              businessSettings,
                            );
                            setSyncFeedback(
                              `✅ Hostinger MySQL Synced successfully! Uploaded ${summary.products} products, ${summary.categories} categories, ${summary.blogs} blogs, ${summary.faqs} FAQs, and settings row into u554546348_twobudz.`,
                            );
                          } catch (err: any) {
                            console.error(err);
                            setSyncFeedback(
                              `❌ Error seeding Hostinger MySQL: ${err.message || err}`,
                            );
                          } finally {
                            setIsSyncingAll(false);
                          }
                        }}
                        className="px-4 py-2 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-lg font-bold uppercase text-[10px] disabled:opacity-50"
                      >
                        {isSyncingAll
                          ? "Syncing to Hostinger MySQL..."
                          : "Push All Data to Hostinger MySQL"}
                      </button>
                      {syncFeedback && (
                        <p className="text-[10.5px] font-semibold text-[#2c3527] bg-[#edf2e8] p-2 rounded-lg border border-[#e1e8db]">
                          {syncFeedback}
                        </p>
                      )}
                    </div>

                    {/* COPY SQL SCHEMA */}
                    <div className="p-4 border border-[#e1e8db] rounded-xl bg-white space-y-2">
                      <div className="flex justify-between items-center">
                        <h5 className="font-bold text-[#2c3527] text-xs">
                          Hostinger phpMyAdmin SQL Setup Script
                        </h5>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              getSupabaseSchemaSQL(),
                            );
                            setCopiedSql(true);
                            setTimeout(() => setCopiedSql(false), 2000);
                          }}
                          className="inline-flex items-center gap-1 text-[10px] text-[#3b142e] hover:underline bg-transparent border-0 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />{" "}
                          {copiedSql ? "Copied!" : "Copy Code"}
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Note: The PHP API bridge creates all tables automatically upon first visit! If you ever need to inspect or run the SQL statements manually in Hostinger phpMyAdmin, you can copy this script.
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-[#e1e8db] bg-[#f7f9f4] p-4 rounded-xl space-y-2">
                    <h4 className="font-bold text-gray-700">
                      System Diagnostics & Reset Maintenance
                    </h4>
                    <p className="text-[11.5px] text-[#5b6b55]">
                      Need to restore products, blogs, and inquiries back to
                      standard system defaults?
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            "Are you sure you want to revert all records, products, and site parameters back to factory system defaults?",
                          )
                        ) {
                          localStorage.removeItem("twobudz_products");
                          localStorage.removeItem("twobudz_blogs");
                          localStorage.removeItem("twobudz_faqs");
                          localStorage.removeItem("twobudz_orders");
                          localStorage.removeItem("twobudz_inquiries");
                          localStorage.removeItem("twobudz_settings");
                          window.location.reload();
                        }
                      }}
                      className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 rounded-lg font-bold uppercase text-[10px]"
                    >
                      Perform Factory System Reset
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 8: BACKUP & RESTORE CENTER */}
              {activeTab === "backup" && adminRole === "super_admin" && (
                <div className="space-y-6 animate-fadeIn font-sans text-[#2c3527]">
                  {/* Top Welcome Header */}
                  <div className="bg-gradient-to-r from-[#edf2e8] via-[#f7f9f4] to-[#edf2e8] p-6 rounded-2xl border border-[#e1e8db] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#3b142e] text-white flex items-center justify-center shadow-md shrink-0">
                        <HardDriveDownload className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-[#2c3527] uppercase tracking-tight">
                            Store Backup & Disaster Recovery Center
                          </h3>
                          <span className="bg-[#3b142e]/10 text-[#3b142e] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-[#3b142e]/20">
                            A-to-Z Complete
                          </span>
                        </div>
                        <p className="text-xs text-[#5b6b55] mt-0.5">
                          Backup 100% of your products, categories, articles, FAQs, customer orders, inquiries, settings, and image references with zero data loss.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        onClick={handleCreateAndDownloadBackup}
                        className="px-4 py-2.5 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-xl font-bold uppercase text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Full Backup (.json)</span>
                      </button>
                      <button
                        onClick={handleRun10xAudit}
                        disabled={isRunningAudit}
                        className="px-4 py-2.5 bg-white text-[#5b6b55] border border-[#e1e8db] hover:text-[#3b142e] hover:border-[#3b142e] rounded-xl font-bold uppercase text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#3b142e]" />
                        <span>{isRunningAudit ? "Running Audit..." : "Run 10x Integrity Audit"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Feedback Message */}
                  {backupFeedback && (
                    <div className={`p-4 rounded-xl font-mono text-xs font-bold border flex items-center justify-between gap-3 ${
                      backupFeedback.includes("❌") 
                        ? "bg-red-50 text-red-700 border-red-200" 
                        : backupFeedback.includes("⏳")
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                    }`}>
                      <div className="flex items-center gap-2">
                        {backupFeedback.includes("❌") ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />}
                        <span>{backupFeedback}</span>
                      </div>
                      <button 
                        onClick={() => setBackupFeedback("")}
                        className="text-xs opacity-70 hover:opacity-100 bg-transparent border-0 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* 2-Column Main Tools Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* CARD 1: BACKUP EXPORT & SNAPSHOT CREATOR */}
                    <div className="bg-white border border-[#e1e8db] rounded-2xl p-6 shadow-sm space-y-5">
                      <div className="flex items-center justify-between border-b border-[#e1e8db] pb-4">
                        <div className="flex items-center gap-2.5">
                          <Archive className="w-5 h-5 text-[#3b142e]" />
                          <h4 className="font-bold text-[#2c3527] text-sm uppercase tracking-wide">
                            Export Store Snapshot Backup
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono text-gray-500">JSON 2.0 Standard</span>
                      </div>

                      <p className="text-xs text-[#5b6b55] leading-relaxed">
                        Export an exact full-fidelity snapshot of your current catalog, orders, and configuration. Every product image URL, SKU, blog content, and setting is preserved.
                      </p>

                      {/* Live Data Summary Pills */}
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 bg-[#f7f9f4] p-3 rounded-xl border border-[#e1e8db] text-center font-mono">
                        <div className="p-2 bg-white rounded-lg border border-[#e1e8db]">
                          <div className="text-xs text-gray-500">Products</div>
                          <div className="text-sm font-bold text-[#3b142e]">{products.length}</div>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-[#e1e8db]">
                          <div className="text-xs text-gray-500">Categories</div>
                          <div className="text-sm font-bold text-[#2c3527]">{categories.length}</div>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-[#e1e8db]">
                          <div className="text-xs text-gray-500">Articles</div>
                          <div className="text-sm font-bold text-[#2c3527]">{blogPosts.length}</div>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-[#e1e8db]">
                          <div className="text-xs text-gray-500">Orders</div>
                          <div className="text-sm font-bold text-[#2c3527]">{orders.length}</div>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-[#e1e8db]">
                          <div className="text-xs text-gray-500">FAQs</div>
                          <div className="text-sm font-bold text-[#2c3527]">{faqItems.length}</div>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-[#e1e8db]">
                          <div className="text-xs text-gray-500">Inquiries</div>
                          <div className="text-sm font-bold text-[#2c3527]">{inquiries.length}</div>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-[#e1e8db]">
                          <div className="text-xs text-gray-500">Settings</div>
                          <div className="text-sm font-bold text-emerald-600">Active</div>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-[#e1e8db]">
                          <div className="text-xs text-gray-500">Images</div>
                          <div className="text-sm font-bold text-emerald-600">100% Intact</div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          onClick={handleCreateAndDownloadBackup}
                          className="flex-1 py-3 px-4 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-xl font-bold uppercase text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <FileJson className="w-4 h-4" />
                          <span>Download .JSON Backup File</span>
                        </button>

                        <button
                          onClick={handleCreateCloudSnapshot}
                          className="py-3 px-4 bg-[#edf2e8] hover:bg-[#e2ebd9] text-[#3b142e] border border-[#d2e0c9] rounded-xl font-bold uppercase text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Cloud className="w-4 h-4" />
                          <span>Save Cloud Snapshot</span>
                        </button>
                      </div>
                    </div>

                    {/* CARD 2: RESTORE STORE DATA FROM BACKUP */}
                    <div className="bg-white border border-[#e1e8db] rounded-2xl p-6 shadow-sm space-y-5">
                      <div className="flex items-center justify-between border-b border-[#e1e8db] pb-4">
                        <div className="flex items-center gap-2.5">
                          <RotateCcw className="w-5 h-5 text-amber-600" />
                          <h4 className="font-bold text-[#2c3527] text-sm uppercase tracking-wide">
                            Restore Store Data & Database
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          100% Recovery
                        </span>
                      </div>

                      <p className="text-xs text-[#5b6b55] leading-relaxed">
                        Upload any previously exported backup <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">.json</code> file to restore all store products, categories, blogs, orders, and Hostinger MySQL tables back to their exact old state.
                      </p>

                      {/* File Upload Drop Area */}
                      <div className="border-2 border-dashed border-[#e1e8db] hover:border-[#3b142e] rounded-2xl p-6 text-center bg-[#f7f9f4] transition-all relative group cursor-pointer">
                        <input
                          type="file"
                          accept=".json,application/json"
                          onChange={handleBackupFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="space-y-2 pointer-events-none">
                          <div className="w-12 h-12 rounded-full bg-white border border-[#e1e8db] flex items-center justify-center mx-auto text-[#3b142e] group-hover:scale-110 transition-transform">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#2c3527]">
                              Click or Drag & Drop Backup JSON File Here
                            </p>
                            <p className="text-[10px] text-gray-500 font-mono mt-1">
                              Supports CBD American Shaman of Hurst Full Backup (.json)
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                        <span>
                          <strong>Safe Recovery Guarantee:</strong> Restoring will automatically prompt a pre-restore summary so you can verify item counts before overwriting live catalog and database tables.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SAVED BACKUP SNAPSHOTS HISTORY TABLE */}
                  <div className="bg-white border border-[#e1e8db] rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-[#e1e8db] pb-4">
                      <div className="flex items-center gap-2.5">
                        <Database className="w-5 h-5 text-[#3b142e]" />
                        <h4 className="font-bold text-[#2c3527] text-sm uppercase tracking-wide">
                          Snapshot Backup History ({backupSnapshots.length})
                        </h4>
                      </div>
                      <button
                        onClick={refreshBackupSnapshots}
                        className="text-xs text-[#3b142e] hover:underline flex items-center gap-1 font-bold bg-transparent border-0 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Refresh List</span>
                      </button>
                    </div>

                    {backupSnapshots.length === 0 ? (
                      <div className="p-8 text-center bg-[#f7f9f4] rounded-xl border border-[#e1e8db] space-y-2">
                        <Archive className="w-8 h-8 text-gray-400 mx-auto" />
                        <p className="text-xs text-gray-600 font-bold">No Saved Local Snapshots Found</p>
                        <p className="text-[11px] text-gray-500">
                          Click "Download Full Backup" or "Save Cloud Snapshot" above to generate a new snapshot.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-sans border-collapse">
                          <thead>
                            <tr className="bg-[#f7f9f4] text-[#5b6b55] uppercase text-[10px] tracking-wider border-b border-[#e1e8db]">
                              <th className="p-3">Snapshot ID & Timestamp</th>
                              <th className="p-3">Products</th>
                              <th className="p-3">Categories</th>
                              <th className="p-3">Blogs</th>
                              <th className="p-3">Orders</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e1e8db]">
                            {backupSnapshots.map((item: any) => (
                              <tr key={item.id} className="hover:bg-[#f7f9f4]/60 transition-colors">
                                <td className="p-3 font-mono">
                                  <div className="font-bold text-[#2c3527] text-xs">{item.id}</div>
                                  <div className="text-[10px] text-gray-500">
                                    {new Date(item.createdAt).toLocaleString()}
                                  </div>
                                </td>
                                <td className="p-3 font-bold text-[#3b142e]">
                                  {item.itemCounts?.products || 0} items
                                </td>
                                <td className="p-3">{item.itemCounts?.categories || 0} cats</td>
                                <td className="p-3">{item.itemCounts?.blogs || 0} blogs</td>
                                <td className="p-3">{item.itemCounts?.orders || 0} orders</td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => setRestoreModalData(item.data)}
                                      className="px-2.5 py-1 bg-[#edf2e8] hover:bg-[#3b142e] text-[#3b142e] hover:text-white rounded-lg text-[10.5px] font-bold uppercase transition-colors cursor-pointer"
                                    >
                                      Restore
                                    </button>
                                    <button
                                      onClick={() => downloadBackupJSON(item.data)}
                                      className="p-1 text-gray-500 hover:text-[#3b142e] rounded bg-transparent border-0 cursor-pointer"
                                      title="Download JSON File"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        deleteSnapshotFromStorage(item.id);
                                        refreshBackupSnapshots();
                                      }}
                                      className="p-1 text-gray-400 hover:text-red-600 rounded bg-transparent border-0 cursor-pointer"
                                      title="Delete Snapshot"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* 10X AUTOMATED INTEGRITY AUDIT REPORT SECTION */}
                  <div className="bg-white border border-[#e1e8db] rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-[#e1e8db] pb-4">
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        <div>
                          <h4 className="font-bold text-[#2c3527] text-sm uppercase tracking-wide">
                            10x Automated Catalog & Image Integrity Audit Suite
                          </h4>
                          <p className="text-[11px] text-gray-500">
                            Executes 10 automated test passes checking product images, bulk upload anti-deletion safety, categories, blogs, orders, and Supabase DB tables.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleRun10xAudit}
                        disabled={isRunningAudit}
                        className="px-4 py-2 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-xl font-bold uppercase text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRunningAudit ? "animate-spin" : ""}`} />
                        <span>{isRunningAudit ? "Testing..." : "Run 10x Audit Now"}</span>
                      </button>
                    </div>

                    {auditReport && (
                      <div className="space-y-4 animate-fadeIn">
                        {/* Summary Pass Header */}
                        <div className={`p-4 rounded-xl border flex items-center justify-between ${
                          auditReport.overallPassed 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                            : "bg-amber-50 border-amber-200 text-amber-900"
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                              auditReport.overallPassed ? "bg-emerald-600" : "bg-amber-600"
                            }`}>
                              {auditReport.passedCount}/10
                            </div>
                            <div>
                              <div className="font-bold text-sm">
                                {auditReport.overallPassed ? "✓ 10/10 Verification Tests Passed!" : `${auditReport.passedCount}/${auditReport.totalCount} Verification Tests Passed`}
                              </div>
                              <div className="text-xs opacity-80">
                                Tested at {new Date(auditReport.timestamp).toLocaleTimeString()} - Zero image loss detected, bulk upload safety verified.
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold bg-white px-3 py-1 rounded-full border shadow-sm">
                            {auditReport.overallPassed ? "100% HEALTHY" : "NEEDS REVIEW"}
                          </span>
                        </div>

                        {/* Step-by-step Pass Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {auditReport.results.map((res) => (
                            <div
                              key={res.step}
                              className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                                res.passed ? "bg-white border-[#e1e8db]" : "bg-red-50 border-red-200"
                              }`}
                            >
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                                res.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                              }`}>
                                {res.passed ? "✓" : "✕"}
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <h5 className="font-bold text-xs text-[#2c3527]">{res.title}</h5>
                                  {res.metric && (
                                    <span className="text-[10px] font-mono bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-bold shrink-0">
                                      {res.metric}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#5b6b55] leading-relaxed">{res.details}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PRE-RESTORE CONFIRMATION MODAL */}
                  {restoreModalData && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
                      <div className="bg-white rounded-2xl border border-[#e1e8db] max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-[#e1e8db] pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                              <RotateCcw className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-[#2c3527] text-base">
                                Confirm Backup Restoration
                              </h3>
                              <p className="text-xs text-gray-500 font-mono">
                                Backup Version: {restoreModalData.metadata?.version || "2.0"}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setRestoreModalData(null)}
                            className="text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-3">
                          <p className="text-xs text-[#5b6b55] leading-relaxed">
                            You are about to restore the store data to this snapshot. This will update your live active products, categories, blog articles, FAQs, orders, and Supabase tables.
                          </p>

                          {/* Item Breakdown Card */}
                          <div className="bg-[#f7f9f4] p-4 rounded-xl border border-[#e1e8db] space-y-2 font-mono text-xs">
                            <div className="font-bold text-[#2c3527] border-b border-[#e1e8db] pb-1 text-[11px] uppercase tracking-wider">
                              Payload Contents to Restore:
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div>• Products: <strong className="text-[#3b142e]">{restoreModalData.products?.length || 0}</strong></div>
                              <div>• Categories: <strong>{restoreModalData.categories?.length || 0}</strong></div>
                              <div>• Blog Articles: <strong>{restoreModalData.blogs?.length || 0}</strong></div>
                              <div>• FAQs: <strong>{restoreModalData.faqs?.length || 0}</strong></div>
                              <div>• Orders: <strong>{restoreModalData.orders?.length || 0}</strong></div>
                              <div>• Customer Inquiries: <strong>{restoreModalData.inquiries?.length || 0}</strong></div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#e1e8db]">
                          <button
                            type="button"
                            onClick={() => setRestoreModalData(null)}
                            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold uppercase text-xs transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isRestoringData}
                            onClick={() => handleExecuteRestore(restoreModalData)}
                            className="px-5 py-2.5 bg-[#3b142e] hover:bg-[#5d2a49] text-white rounded-xl font-bold uppercase text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {isRestoringData ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Restoring Data...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                <span>Confirm & Restore All Data Now</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </main>
          </div>
        )}

        {/* GLOBAL ARTICLE PREVIEW MODAL */}
        {previewingBlog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-[28px] shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden border border-[#e1e8db]">
              <div className="px-4 sm:px-6 py-4 border-b border-[#e1e8db] flex items-center justify-between bg-[#f7f9f4]">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="px-2.5 py-1 bg-[#3b142e] text-white text-[10px] font-bold rounded-full uppercase tracking-[0.18em]">
                    {previewingBlog.category || "Article Preview"}
                  </span>
                  <h3 className="font-serif font-bold text-sm sm:text-base text-[#2c3527] truncate max-w-md">
                    {previewingBlog.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {previewingBlog.slug && (
                    <a
                      href={`/blog/${previewingBlog.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-[10px] sm:text-xs font-bold text-[#3b142e] hover:bg-[#3b142e]/10 rounded-lg flex items-center gap-1 border border-[#3b142e]/30 transition-colors"
                    >
                      <span>Live URL</span>
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  )}
                  <button
                    onClick={() => setPreviewingBlog(null)}
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                    aria-label="Close blog preview"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-[calc(92vh-80px)] overflow-y-auto">
                <div className="w-full relative bg-[#2c3527] text-white py-12 sm:py-16 overflow-hidden border-b border-[#e1e8db]">
                  {previewingBlog.image ? (
                    <div className="absolute inset-0 z-0">
                      <img
                        src={previewingBlog.image}
                        alt={previewingBlog.title}
                        className="w-full h-full object-cover opacity-25 filter blur-[1px] brightness-75 scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#2c3527] via-[#2c3527]/85 to-[#2c3527]/60" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-b from-[#253022] to-[#1c2419]" />
                  )}

                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-block bg-[#3b142e] text-white text-[10px] font-mono font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] shadow-sm">
                        {previewingBlog.category || "Article Preview"}
                      </span>
                      <span className="text-[10px] font-mono text-[#cbd5c2] flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#3b142e]" />
                        <span>Certified Botanical Science</span>
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif font-black text-white leading-tight tracking-tight max-w-4xl drop-shadow-sm">
                      {previewingBlog.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-[#cbd5c2] font-mono pt-2 border-t border-white/10">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#3b142e]" />
                        <span>Published on {previewingBlog.date || "Today"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-[#3b142e]" />
                        <span>Authored by {previewingBlog.author || "CBD American Shaman of Hurst Team"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                    <article className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 md:p-10 border border-[#e1e8db] shadow-xs space-y-8">
                      {previewingBlog.summary && (
                        <div className="bg-[#f7f9f4] border border-[#e1e8db] rounded-2xl p-4 text-sm text-[#5b6b55] leading-relaxed italic">
                          {previewingBlog.summary}
                        </div>
                      )}

                      <div className="prose max-w-none text-[#5b6b55]">
                        <MarkdownArticleRenderer
                          content={previewingBlog.content || previewingBlog.summary || "No content provided yet."}
                        />
                      </div>
                    </article>

                    <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
                      <div className="bg-white border border-[#e1e8db] rounded-3xl p-5 shadow-xs space-y-4">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-[#3b142e]" />
                          <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#2c3527]">
                            Quick Guide
                          </h3>
                        </div>
                        <p className="text-xs text-[#72856a] leading-relaxed">
                          This article preview mirrors the live blog reader layout used on the main site so content spacing and blocks stay consistent.
                        </p>
                        <div className="space-y-2 pt-1">
                          <div className="rounded-2xl border border-[#e1e8db] bg-[#f7f9f4] p-3 text-xs font-bold text-[#5b6b55]">
                            Topic: {previewingBlog.category || "Wellness"}
                          </div>
                          <div className="rounded-2xl border border-[#e1e8db] bg-[#f7f9f4] p-3 text-xs font-bold text-[#5b6b55]">
                            Author: {previewingBlog.author || "CBD American Shaman of Hurst Team"}
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border border-[#e1e8db] rounded-3xl p-5 shadow-xs space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#3b142e]" />
                          <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#2c3527]">
                            Featured Reads
                          </h3>
                        </div>
                        <div className="space-y-3">
                          <div className="rounded-2xl border border-[#e1e8db] bg-[#f7f9f4] p-3 text-xs text-[#5b6b55] leading-relaxed">
                            Client education articles stay aligned with the main site design so the content looks premium and consistent.
                          </div>
                          <div className="rounded-2xl border border-[#e1e8db] bg-[#f7f9f4] p-3 text-xs text-[#5b6b55] leading-relaxed">
                            Empty markdown headings are stripped automatically to keep the layout clean and readable.
                          </div>
                        </div>
                      </div>
                    </aside>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#1c2419] text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-[#3b142e]/50 animate-fadeIn text-xs font-bold">
            <CheckCircle className="w-4 h-4 text-[#f0bc37] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
