"use client";

import React, { useState } from "react";
import {
  Leaf,
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  Sparkles,
  X,
  ArrowUp,
} from "lucide-react";
import {
  BlogPost,
  CartItem,
  Product,
  FAQItem,
  Order,
  Inquiry,
  BusinessSettings,
  CategoryItem,
  ReviewItem,
} from "./types";
import { PRODUCTS, BLOG_POSTS, FAQ_ITEMS, DEFAULT_CATEGORIES } from "./data";
import { classifyCategory, getCategoryHierarchy, getCategoryLabel as getCatLabel } from "./utils/categoryUtils";
import { generateInitialReviewsForProducts } from "./utils/reviewUtils";
import { LEARN_PAGES, findLearnPageBySlugOrTitle } from "./learnPages";

// Component imports
import Header from "./components/Header";
import Hero from "./components/Hero";
import About from "./components/About";
import Categories from "./components/Categories";
import Products from "./components/Products";
import Promo from "./components/Promo";
import FAQ from "./components/FAQ";
import Testimonials from "./components/Testimonials";
import Blog from "./components/Blog";
import BlogReader from "./components/BlogReader";
import LearnPage from "./components/LearnPage";
import Footer from "./components/Footer";
import ProductDetail from "./components/ProductDetail";
import CartDrawer from "./components/CartDrawer";
import CheckoutModal from "./components/CheckoutModal";
import AdminPanel from "./components/AdminPanel";
import ProductCard from "./components/ProductCard";
import TermsPage from "./components/TermsPage";
import PrivacyPage from "./components/PrivacyPage";
import ContactPage from "./components/ContactPage";

import {
  mapProductAutoImage,
  isAssetAvailable,
  normalizeToCleanAsset,
  findProductBySlug,
  resolveBlogImage,
} from "./utils/imageMatching";
import { RESTORED_IMAGE_ASSETS } from "./utils/restoredImageAssets";
import {
  getSupabaseClient,
  isSupabaseConfigured,
  pingSupabaseKeepAlive,
  pushAllLocalDataToSupabase,
  safeSetItem,
  checkAndAutoPurgeStaleCache,
} from "./utils/supabaseClient";

// Auto purge stale local cache when app version changes
if (typeof window !== "undefined") {
  checkAndAutoPurgeStaleCache();
}

/**
 * Backups and older database rows can contain an original upload filename or a
 * legacy `/resized-1080/...` path.  Always resolve those references before
 * handing a record to the UI, so an otherwise valid restored image cannot
 * leave an empty card while waiting for an error fallback.
 */
const resolveProductImage = (product: Partial<Product>): string =>
  normalizeToCleanAsset(
    product.image || "",
    product.category || "",
    product.name || ""
  );

export default function App() {
  const isInitialMount = React.useRef(true);
  const [currentView, setView] = useState("home");
  const [activeArticle, setActiveArticle] = useState<BlogPost | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedFilter, setSelectedFilter] = useState<{
    top: string;
    level1?: string;
    level2?: string;
  } | null>(null);
  const [activeInfoTopic, setActiveInfoTopic] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(() => BLOG_POSTS.map((post) => ({
    ...post,
    image: resolveBlogImage(post),
    isFeaturedHome: true,
  })));
  const [faqItems, setFaqItems] = useState<FAQItem[]>(FAQ_ITEMS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const businessName = "CBD American Shaman of Hurst";
  const storePhone = "+1 (817) 494-3335";
  const storeLocation = "730 W Pipeline Rd, Hurst, TX 76053";
  const normalizeBusinessSettings = (settings: BusinessSettings): BusinessSettings => ({
    ...settings,
    phone: storePhone,
    location: storeLocation,
    email: (settings.email || "").toLowerCase().includes("twobudz") ? "" : settings.email,
    heroBadge: (settings.heroBadge || "").replace(/Flower Mound/gi, "Hurst"),
    heroParagraph: (settings.heroParagraph || "")
      .replace(/Two\s*Budz/gi, businessName)
      .replace(/Flower Mound/gi, "Hurst"),
    heroCommitmentLabel: (settings.heroCommitmentLabel || "").replace(/TWO BUDZ/gi, "HURST STORE"),
    seoTitleOverride: (settings.seoTitleOverride || "")
      .replace(/Two\s*Budz/gi, businessName)
      .replace(/Flower Mound/gi, "Hurst"),
    seoDescriptionOverride: (settings.seoDescriptionOverride || "")
      .replace(/Two\s*Budz/gi, businessName)
      .replace(/Flower Mound/gi, "Hurst"),
  });
  const defaultSettings: BusinessSettings = {
    phone: storePhone,
    email: "",
    hours:
      "Monday - Friday: 10:30am - 7:30 pm | Saturday: 10:30am - 6:00 pm | Sunday: 11:00 am - 6:00 pm",
    location: storeLocation,
    heroBadge: "PREMIUM HEMP & CBD • HURST, TX",
    heroHeadingLine1: "Earthy Purity.",
    heroHeadingLine2: "Crafted Wellness & Relief.",
    heroParagraph:
      "Welcome to CBD American Shaman of Hurst, your local source for state-compliant hemp, CBD flowers, clean tinctures, and targeted comfort. Sourced for quality with transparent third-party testing.",
    heroButtonPrimary: "EXPLORE PRODUCTS",
    heroButtonSecondary: "OUR STORY",
    heroImage: "/images/hero_bg_1779557711335.png",
    heroVerifiedText: "VERIFIED 100% LEGAL",
    heroWidget1Image: "/images/cbd_dropper_1779557730794.png",
    heroWidget1Label: "BEST SELLER",
    heroWidget1Title: "Organic CBD",
    heroWidget1Rating: "4.9",
    heroWidget2Image: "/images/thc_gummies_pack_1779557751523.png",
    heroWidget2Label: "POPULAR",
    heroWidget2Title: "Delta-9 Packs",
    heroWidget2Sub: "Pure Extraction",
    heroCommitmentLabel: "HURST STORE COMMITMENT",
    heroCommitmentTitle: "Small Business Owned",
    seoTitleOverride: "",
    seoDescriptionOverride: "",
    seoKeywordsOverride: "",
  };
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(defaultSettings);
  const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_CATEGORIES);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  React.useEffect(() => {
    const readStored = (keys: string[]) => {
      for (const key of keys) {
        try {
          const value = localStorage.getItem(key);
          if (value) return JSON.parse(value);
        } catch (e) {}
      }
      return null;
    };

    const savedProducts = readStored(["twobudz_products", "twobudz_custom_products"]);
    if (Array.isArray(savedProducts) && savedProducts.length > 0) setProducts(savedProducts);

    const savedBlogs = readStored(["twobudz_blogs"]);
    if (Array.isArray(savedBlogs) && savedBlogs.length > 0) {
      setBlogPosts(savedBlogs.map((post: BlogPost) => ({ ...post, image: resolveBlogImage(post) })));
    }

    const savedFaqs = readStored(["twobudz_faqs"]);
    if (Array.isArray(savedFaqs) && savedFaqs.length > 0) setFaqItems(savedFaqs);

    const savedOrders = readStored(["twobudz_orders"]);
    if (Array.isArray(savedOrders)) setOrders(savedOrders);

    const savedInquiries = readStored(["twobudz_inquiries"]);
    if (Array.isArray(savedInquiries)) setInquiries(savedInquiries);

    const savedSettings = readStored([
      "twobudz_settings",
      "twobudz_business_settings",
      "twobudz_business_info",
    ]);
    if (savedSettings && typeof savedSettings === "object") {
      setBusinessSettings(normalizeBusinessSettings({ ...defaultSettings, ...savedSettings }));
    }

    const savedCategories = readStored(["twobudz_categories", "twobudz_custom_categories"]);
    if (Array.isArray(savedCategories) && savedCategories.length > 0) setCategories(savedCategories);

    const savedReviews = readStored(["twobudz_reviews"]);
    if (Array.isArray(savedReviews) && savedReviews.length > 0) setReviews(savedReviews);
  }, []);

  // Floating Scroll to Top State & Listener
  const [showScrollTop, setShowScrollTop] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== "undefined") {
        setShowScrollTop(window.scrollY > 350);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Supabase Real-Time Data Fetcher
  const [supabaseLoading, setSupabaseLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isSupabaseConfigured()) return;

    // Run keep-alive ping silently to prevent Supabase 7-day inactivity pause
    pingSupabaseKeepAlive();

    const fetchSupabaseData = async () => {
      setSupabaseLoading(true);
      const supabase = getSupabaseClient();
      if (!supabase) {
        setSupabaseLoading(false);
        return;
      }

      try {
        // Fetch products with fallback protection if created_at column is missing
        let dbProducts: any[] | null = null;
        let prodErr: any = null;

        const res1 = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (res1.error) {
          const res2 = await supabase.from("products").select("*");
          dbProducts = res2.data;
          prodErr = res2.error;
        } else {
          dbProducts = res1.data;
        }

        if (prodErr) {
          console.warn("Supabase fetch warning:", prodErr.message);
        } else if (dbProducts && dbProducts.length > 0) {
          const mappedDbProducts = dbProducts.map((p: any) => {
            const canonical = PRODUCTS.find(
              (cp) => String(cp.id) === String(p.id) || cp.slug === p.slug || cp.name.toLowerCase() === p.name.toLowerCase()
            );
            const isBestSeller =
              typeof p.isBestSeller === "boolean"
                ? p.isBestSeller
                : typeof p.isFeaturedHome === "boolean"
                ? p.isFeaturedHome
                : false;
            const isFeaturedHome =
              typeof p.isFeaturedHome === "boolean"
                ? p.isFeaturedHome
                : isBestSeller;
            const isValidImg = p.image && typeof p.image === "string" && p.image.trim() !== "" && !p.image.includes("placeholder") && p.image !== "undefined";
            const rawImage = isValidImg
              ? p.image
              : canonical?.image || "/images/balance-thc-cbd-gummies-25mg-hybrid.webp";
            return {
              ...p,
              image: resolveProductImage({ ...p, image: rawImage }),
              isBestSeller,
              isFeaturedHome,
            };
          });
          setProducts(mappedDbProducts as Product[]);
          try {
            safeSetItem("twobudz_custom_products", JSON.stringify(mappedDbProducts));
            safeSetItem("twobudz_products", JSON.stringify(mappedDbProducts));
          } catch (e) {}
        } else if (dbProducts && dbProducts.length === 0) {
          setProducts([]);
        }

        // Fetch categories
        const { data: dbCategories, error: catErr } = await supabase
          .from("categories")
          .select("*");
        if (!catErr && dbCategories && dbCategories.length > 0) {
          setCategories(dbCategories as CategoryItem[]);
          try {
            safeSetItem("twobudz_custom_categories", JSON.stringify(dbCategories));
          } catch (e) {}
        } else if (!catErr && dbCategories && dbCategories.length === 0) {
          setCategories([]);
        }

        // 1. Fetch settings from Supabase Cloud Database first to get cloud-synced featured blog IDs
        let cloudFeaturedIds: string[] = [];
        const { data: dbSettings, error: setErr } = await supabase
          .from("settings")
          .select("*")
          .eq("id", "business_info")
          .maybeSingle();

        if (!setErr && dbSettings && typeof dbSettings === "object" && Object.keys(dbSettings).length > 2) {
          const rawOver = dbSettings.seoKeywordsOverride || dbSettings.featuredBlogIds;
          if (rawOver) {
            try {
              cloudFeaturedIds = typeof rawOver === "string" ? JSON.parse(rawOver) : rawOver;
            } catch (e) {}
          }
          setBusinessSettings((prev) => {
            const mergedSet: BusinessSettings = {
              ...prev,
              ...dbSettings,
              phone: dbSettings.phone || prev.phone,
              email: dbSettings.email || prev.email,
              hours: dbSettings.hours || prev.hours,
              location: dbSettings.location || prev.location,
              heroBadge: dbSettings.heroBadge || prev.heroBadge,
              heroHeadingLine1: dbSettings.heroHeadingLine1 || prev.heroHeadingLine1,
              heroHeadingLine2: dbSettings.heroHeadingLine2 || prev.heroHeadingLine2,
              heroParagraph: dbSettings.heroParagraph || prev.heroParagraph,
              heroButtonPrimary: dbSettings.heroButtonPrimary || prev.heroButtonPrimary,
              heroButtonSecondary: dbSettings.heroButtonSecondary || prev.heroButtonSecondary,
              heroImage: dbSettings.heroImage || prev.heroImage,
              heroVerifiedText: dbSettings.heroVerifiedText || prev.heroVerifiedText,
              heroWidget1Image: dbSettings.heroWidget1Image || prev.heroWidget1Image,
              heroWidget1Label: dbSettings.heroWidget1Label || prev.heroWidget1Label,
              heroWidget1Title: dbSettings.heroWidget1Title || prev.heroWidget1Title,
              heroWidget1Rating: dbSettings.heroWidget1Rating || prev.heroWidget1Rating,
              heroWidget2Image: dbSettings.heroWidget2Image || prev.heroWidget2Image,
              heroWidget2Label: dbSettings.heroWidget2Label || prev.heroWidget2Label,
              heroWidget2Title: dbSettings.heroWidget2Title || prev.heroWidget2Title,
              heroWidget2Sub: dbSettings.heroWidget2Sub || prev.heroWidget2Sub,
              heroCommitmentLabel: dbSettings.heroCommitmentLabel || prev.heroCommitmentLabel,
              heroCommitmentTitle: dbSettings.heroCommitmentTitle || prev.heroCommitmentTitle,
              seoTitleOverride: dbSettings.seoTitleOverride !== undefined ? dbSettings.seoTitleOverride : prev.seoTitleOverride,
              seoDescriptionOverride: dbSettings.seoDescriptionOverride !== undefined ? dbSettings.seoDescriptionOverride : prev.seoDescriptionOverride,
              seoKeywordsOverride: dbSettings.seoKeywordsOverride !== undefined ? dbSettings.seoKeywordsOverride : prev.seoKeywordsOverride,
              urlShop: dbSettings.urlShop || prev.urlShop || "shop",
              urlLearn: dbSettings.urlLearn || prev.urlLearn || "learn",
              urlAbout: dbSettings.urlAbout || prev.urlAbout || "about",
              urlFaq: dbSettings.urlFaq || prev.urlFaq || "faq",
            };
            const normalizedSet = normalizeBusinessSettings(mergedSet);
            try {
              safeSetItem("twobudz_settings", JSON.stringify(normalizedSet));
              safeSetItem("twobudz_business_settings", JSON.stringify(normalizedSet));
              safeSetItem("twobudz_business_info", JSON.stringify(normalizedSet));
            } catch (e) {}
            return normalizedSet;
          });
        }

        // Fetch blogs from Supabase Cloud Database
        const { data: dbBlogs, error: blogErr } = await supabase
          .from("blogs")
          .select("*")
          .order("created_at", { ascending: false });

        if (!blogErr && dbBlogs && dbBlogs.length > 0) {
          const dbBlogList = (dbBlogs as BlogPost[]).map((post) => ({
            ...post,
            image: resolveBlogImage(post),
          }));
          setBlogPosts(dbBlogList);
          try {
            safeSetItem("twobudz_blogs", JSON.stringify(dbBlogList));
          } catch (e) {}
        }

        // Fetch orders
        const { data: dbOrders, error: orderErr } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
        if (!orderErr && dbOrders) {
          setOrders(dbOrders as Order[]);
          try {
            safeSetItem("twobudz_orders", JSON.stringify(dbOrders));
          } catch (e) {}
        }

        // Fetch inquiries
        const { data: dbInquiries, error: inqErr } = await supabase
          .from("inquiries")
          .select("*")
          .order("created_at", { ascending: false });
        if (!inqErr && dbInquiries) {
          setInquiries(dbInquiries as Inquiry[]);
          try {
            safeSetItem("twobudz_inquiries", JSON.stringify(dbInquiries));
          } catch (e) {}
        }

        // Fetch reviews
        const { data: dbReviews, error: revErr } = await supabase
          .from("reviews")
          .select("*")
          .order("created_at", { ascending: false });
        if (!revErr && dbReviews && dbReviews.length > 0) {
          setReviews(dbReviews as ReviewItem[]);
          try {
            safeSetItem("twobudz_reviews", JSON.stringify(dbReviews));
          } catch (e) {}
        } else if (!revErr && (!dbReviews || dbReviews.length === 0)) {
          // Push initial seeded reviews to Supabase table
          const seededRev = generateInitialReviewsForProducts(products && products.length > 0 ? products : PRODUCTS);
          setReviews(seededRev);
          try {
            safeSetItem("twobudz_reviews", JSON.stringify(seededRev));
          } catch (e) {}
        }
      } catch (e) {
        console.error("Error fetching data from Supabase:", e);
      } finally {
        setSupabaseLoading(false);
      }
    };

    fetchSupabaseData();
  }, []);

  // Shopping basket state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Modal tracking
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [previousView, setPreviousView] = useState<string>("home");

  const handleProductSelect = (product: Product) => {
    if (currentView !== "product-detail") {
      setPreviousView(currentView);
    }
    setSelectedProduct(product);
    setView("product-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  // Quick feedback animations on product added
  const [addedItemName, setAddedItemName] = useState<string | null>(null);

  // Inquiries contact form
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    msg: "",
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Add to basket function
  const handleAddToCart = (product: Product, option: string, quantity = 1) => {
    setCartItems((prev) => {
      const existing = prev.find(
        (item) =>
          item.product.id === product.id && item.selectedOption === option,
      );
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && item.selectedOption === option
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [...prev, { product, quantity, selectedOption: option }];
    });

    // Fire quick visual pop banner feedback
    setAddedItemName(`${product.name} (${option}) x${quantity}`);
    setTimeout(() => {
      setAddedItemName(null);
    }, 4000);
  };

  // Adjust basket quantities
  const handleUpdateQuantity = (
    productId: string,
    option: string,
    delta: number,
  ) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId && item.selectedOption === option) {
            const nextQty = item.quantity + delta;
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const handleRemoveItem = (productId: string, option: string) => {
    setCartItems((prev) =>
      prev.filter(
        (item) =>
          !(item.product.id === productId && item.selectedOption === option),
      ),
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contactForm.email) {
      const newInq: Inquiry = {
        id: "inq-" + Date.now(),
        name: contactForm.name,
        email: contactForm.email,
        msg: contactForm.msg,
        status: "unread",
        date: new Date().toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      const nextInquiries = [newInq, ...inquiries];
      setInquiries(nextInquiries);
      safeSetItem("twobudz_inquiries", JSON.stringify(nextInquiries));

      // Push to Supabase if configured
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        if (supabase) {
          supabase
            .from("inquiries")
            .insert(newInq)
            .then(({ error }) => {
              if (error)
                console.error("Error inserting inquiry into Supabase:", error);
            });
        }
      }

      setContactSubmitted(true);
      setContactForm({ name: "", email: "", msg: "" });
      setTimeout(() => setContactSubmitted(false), 5000);
    }
  };

  const handleOrderPlaced = (newOrder: Order) => {
    const nextOrders = [newOrder, ...orders];
    setOrders(nextOrders);
    safeSetItem("twobudz_orders", JSON.stringify(nextOrders));

    // Push to Supabase if configured
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase
          .from("orders")
          .insert(newOrder)
          .then(({ error }) => {
            if (error)
              console.warn("Order sync note:", error);
          })
          .catch((err) => {
            console.warn("Order background sync deferred:", err);
          });
      }
    }
  };

  // Dynamic Routing Listener for Custom SEO Slugs (Preserves old legacy backlinks)
  React.useEffect(() => {
    const checkProductByUrlSlug = () => {
      // 1. Check path (e.g., /products/justcbd-cbd-tincture-for-cats-500mg-tuna/)
      const pathname = window.location.pathname;
      const pathMatch = pathname.match(/\/(products|product)\/([a-zA-Z0-9-_]+)/);
      let detectedSlug = pathMatch ? pathMatch[2] : null;

      // 2. Fallback to hash route (e.g., #/products/justcbd-cats or #justcbd-cats)
      if (!detectedSlug && window.location.hash) {
        const hash = window.location.hash;
        const hashMatch = hash.match(/\/(products|product)\/([a-zA-Z0-9-_]+)/);
        if (hashMatch) {
          detectedSlug = hashMatch[2];
        } else {
          const simpleHash = hash.replace(/^#\/?/, "");
          if (simpleHash && !simpleHash.startsWith("/")) {
            const systemViews = [
              "home",
              "shop",
              "about",
              "faq",
              "blog-article",
            ];
            if (!systemViews.includes(simpleHash)) {
              detectedSlug = simpleHash;
            }
          }
        }
      }

      // 3. Fallback to query parameters (e.g., ?product=gummies-pack)
      if (!detectedSlug) {
        const searchParams = new URLSearchParams(window.location.search);
        detectedSlug = searchParams.get("product") || searchParams.get("p");
      }

      if (detectedSlug) {
        const found = findProductBySlug(products, detectedSlug);
        if (found) {
          setSelectedProduct(found);
          setView("product-detail");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    };

    // Run check on initial mount
    checkProductByUrlSlug();

    // Attach routing hooks for live updates without full page refreshes
    window.addEventListener("hashchange", checkProductByUrlSlug);
    window.addEventListener("popstate", checkProductByUrlSlug);

    return () => {
      window.removeEventListener("hashchange", checkProductByUrlSlug);
      window.removeEventListener("popstate", checkProductByUrlSlug);
    };
  }, [products]);

  // Dynamic Routing Listener for Custom Blog Slugs
  React.useEffect(() => {
    const checkBlogByUrlSlug = () => {
      const pathname = window.location.pathname;
      const pathMatch = pathname.match(/\/blog\/([a-zA-Z0-9-_]+)/);
      let detectedSlug = pathMatch ? pathMatch[1] : null;

      if (!detectedSlug && window.location.hash) {
        const hash = window.location.hash;
        const hashMatch = hash.match(/\/blog\/([a-zA-Z0-9-_]+)/);
        if (hashMatch) {
          detectedSlug = hashMatch[1];
        }
      }

      if (detectedSlug) {
        const cleanSlug = detectedSlug.toLowerCase().trim();
        const found = blogPosts.find(
          (b) =>
            (b.slug && b.slug.toLowerCase() === cleanSlug) ||
            b.id.toString().toLowerCase() === cleanSlug,
        );
        if (found) {
          setActiveArticle(found);
          setView("blog-article");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    };

    checkBlogByUrlSlug();

    window.addEventListener("hashchange", checkBlogByUrlSlug);
    window.addEventListener("popstate", checkBlogByUrlSlug);

    return () => {
      window.removeEventListener("hashchange", checkBlogByUrlSlug);
      window.removeEventListener("popstate", checkBlogByUrlSlug);
    };
  }, [blogPosts]);

  // Dynamic Route & Hash Parser for Core Views (Admin, Shop, Learn, About, FAQ, Blogs, Landing Pages)
  React.useEffect(() => {
    const parseUrlView = () => {
      const pathname = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const searchParams = new URLSearchParams(window.location.search);
      const queryView = searchParams.get("view");
      const catParam = searchParams.get("category");
      if (catParam) {
        setSelectedCategory(catParam.toLowerCase());
      }

      // Skip generic route parsing if on a product or blog deep link
      if (pathname.includes("/products/") || pathname.includes("/product/") || pathname.includes("/blog/")) {
        return;
      }

      // Check if it is root path or empty (essential for browser back button to Home)
      const cleanPath = pathname.replace(/\/$/, "");
      if (cleanPath === "" || cleanPath === "/" || pathname === "/" || pathname === "/index.html") {
        setView("home");
        setSelectedProduct(null);
        setActiveArticle(null);
        return;
      }

      // 1. Check for Blogs
      if (
        pathname === "/blogs" ||
        pathname.endsWith("/blogs") ||
        pathname.includes("/blogs/") ||
        queryView === "blogs" ||
        hash === "#blogs" ||
        hash === "#/blogs"
      ) {
        setView("blogs");
        setSelectedProduct(null);
        setActiveArticle(null);
        return;
      }

      // 2. Check for 5 CSV SEO landing pages
      const matchedLearnPage = LEARN_PAGES.find(
        (lp) =>
          pathname === lp.slug ||
          pathname === "/" + lp.slug.replace(/^\//, "") ||
          pathname.endsWith(lp.slug) ||
          cleanPath === lp.slug.toLowerCase() ||
          cleanPath === "/" + lp.slug.toLowerCase().replace(/^\//, "")
      );
      if (matchedLearnPage) {
        setActiveInfoTopic(matchedLearnPage.slug);
        setView("learn");
        setSelectedProduct(null);
        setActiveArticle(null);
        return;
      }

      const shopSlug = (businessSettings.urlShop || "shop")
        .toLowerCase()
        .trim()
        .replace(/^\//, "");
      const learnSlug = (businessSettings.urlLearn || "learn")
        .toLowerCase()
        .trim()
        .replace(/^\//, "");
      const aboutSlug = (businessSettings.urlAbout || "about")
        .toLowerCase()
        .trim()
        .replace(/^\//, "");
      const faqSlug = (businessSettings.urlFaq || "faq")
        .toLowerCase()
        .trim()
        .replace(/^\//, "");

      // Check query view first (e.g. ?view=admin)
      if (queryView) {
        const cleanQuery = queryView.trim().toLowerCase();
        if (cleanQuery === shopSlug || cleanQuery === "shop") {
          if (catParam) {
            setSelectedCategory(catParam.toLowerCase());
          }
          setView("shop");
          setSelectedProduct(null);
          return;
        } else if (cleanQuery === learnSlug || cleanQuery === "learn") {
          setView("learn");
          setSelectedProduct(null);
          return;
        } else if (cleanQuery === aboutSlug || cleanQuery === "about") {
          setView("about");
          setSelectedProduct(null);
          return;
        } else if (cleanQuery === faqSlug || cleanQuery === "faq") {
          setView("faq");
          setSelectedProduct(null);
          return;
        } else if (cleanQuery === "admin" || cleanQuery === "home") {
          setView(cleanQuery);
          setSelectedProduct(null);
          return;
        }
      }

      // Check path (e.g. /admin, /shop, /our-products)
      if (pathname.endsWith("/admin") || pathname.includes("/admin/")) {
        setView("admin");
        setSelectedProduct(null);
        return;
      } else if (
        pathname.endsWith(`/${shopSlug}`) ||
        pathname.includes(`/${shopSlug}/`) ||
        pathname.endsWith("/shop") ||
        pathname.includes("/shop/")
      ) {
        if (catParam) {
          setSelectedCategory(catParam.toLowerCase());
        }
        setView("shop");
        setSelectedProduct(null);
        return;
      } else if (
        pathname.endsWith(`/${learnSlug}`) ||
        pathname.includes(`/${learnSlug}/`) ||
        pathname.endsWith("/learn") ||
        pathname.includes("/learn/")
      ) {
        setView("learn");
        setSelectedProduct(null);
        return;
      } else if (
        pathname.endsWith(`/${aboutSlug}`) ||
        pathname.includes(`/${aboutSlug}/`) ||
        pathname.endsWith("/about") ||
        pathname.includes("/about/")
      ) {
        setView("about");
        setSelectedProduct(null);
        return;
      } else if (
        pathname.endsWith(`/${faqSlug}`) ||
        pathname.includes(`/${faqSlug}/`) ||
        pathname.endsWith("/faq") ||
        pathname.includes("/faq/")
      ) {
        setView("faq");
        setSelectedProduct(null);
        return;
      } else if (
        pathname.endsWith("/terms") ||
        pathname.includes("/terms/") ||
        pathname.endsWith("/terms-of-service")
      ) {
        setView("terms");
        setSelectedProduct(null);
        return;
      } else if (
        pathname.endsWith("/privacy") ||
        pathname.includes("/privacy/") ||
        pathname.endsWith("/privacy-policy")
      ) {
        setView("privacy");
        setSelectedProduct(null);
        return;
      } else if (
        pathname.endsWith("/contact") ||
        pathname.includes("/contact/") ||
        pathname.endsWith("/contact-us")
      ) {
        setView("contact");
        setSelectedProduct(null);
        return;
      }

      // Check hash (e.g. #admin, #shop, #our-products)
      if (hash) {
        const cleanHash = hash.replace(/^#\/?/, "");
        if (cleanHash === shopSlug || cleanHash === "shop") {
          setView("shop");
          setSelectedProduct(null);
          return;
        } else if (cleanHash === learnSlug || cleanHash === "learn") {
          setView("learn");
          setSelectedProduct(null);
          return;
        } else if (cleanHash === aboutSlug || cleanHash === "about") {
          setView("about");
          setSelectedProduct(null);
          return;
        } else if (cleanHash === faqSlug || cleanHash === "faq") {
          setView("faq");
          setSelectedProduct(null);
          return;
        } else if (cleanHash === "admin" || cleanHash === "home") {
          setView(cleanHash);
          setSelectedProduct(null);
          return;
        }
      }
    };

    // Run on mount or settings change
    parseUrlView();

    // Listen for hash and navigation events
    window.addEventListener("hashchange", parseUrlView);
    window.addEventListener("popstate", parseUrlView);
    return () => {
      window.removeEventListener("hashchange", parseUrlView);
      window.removeEventListener("popstate", parseUrlView);
    };
  }, [
    businessSettings.urlShop,
    businessSettings.urlLearn,
    businessSettings.urlAbout,
    businessSettings.urlFaq,
  ]);

  // URL State Synchronizer: Automatically updates browser address bar to match active view
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Skip state synchronization on initial mount to preserve deep links
    if (isInitialMount.current) {
      const pathname = window.location.pathname;
      const shopSlug =
        "/" +
        (businessSettings.urlShop || "shop")
          .toLowerCase()
          .trim()
          .replace(/^\//, "");
      const learnSlug =
        "/" +
        (businessSettings.urlLearn || "learn")
          .toLowerCase()
          .trim()
          .replace(/^\//, "");
      const aboutSlug =
        "/" +
        (businessSettings.urlAbout || "about")
          .toLowerCase()
          .trim()
          .replace(/^\//, "");
      const faqSlug =
        "/" +
        (businessSettings.urlFaq || "faq")
          .toLowerCase()
          .trim()
          .replace(/^\//, "");
      const path = pathname.toLowerCase().trim().replace(/\/$/, "");

      const isLearnLanding = LEARN_PAGES.some(
        (lp) => path === lp.slug || path === "/" + lp.slug.replace(/^\//, "")
      );

      const isDeepLink =
        path.startsWith("/products/") ||
        path.startsWith("/product/") ||
        path.startsWith("/blog/") ||
        path === "/blogs" ||
        path === "/admin" ||
        path === "/shop" ||
        path === "/learn" ||
        path === "/about" ||
        path === "/faq" ||
        path === shopSlug ||
        path === learnSlug ||
        path === aboutSlug ||
        path === faqSlug ||
        isLearnLanding;

      if (isDeepLink) {
        if (currentView === "home") return;
        isInitialMount.current = false;
        return;
      }
      isInitialMount.current = false;
    }

    let targetPath = "";
    if (currentView === "home") {
      targetPath = "/";
    } else if (currentView === "blogs") {
      targetPath = "/blogs";
    } else if (currentView === "terms") {
      targetPath = "/terms";
    } else if (currentView === "privacy") {
      targetPath = "/privacy";
    } else if (currentView === "contact") {
      targetPath = "/contact";
    } else if (currentView === "shop") {
      targetPath =
        "/" + (businessSettings.urlShop || "shop").trim().replace(/^\//, "");
    } else if (currentView === "learn") {
      const activeLearnPage = activeInfoTopic
        ? findLearnPageBySlugOrTitle(activeInfoTopic)
        : null;
      if (activeLearnPage) {
        targetPath = activeLearnPage.slug;
      } else {
        targetPath =
          "/" + (businessSettings.urlLearn || "learn").trim().replace(/^\//, "");
      }
    } else if (currentView === "about") {
      targetPath =
        "/" + (businessSettings.urlAbout || "about").trim().replace(/^\//, "");
    } else if (currentView === "faq") {
      targetPath =
        "/" + (businessSettings.urlFaq || "faq").trim().replace(/^\//, "");
    } else if (currentView === "admin") {
      targetPath = "/admin";
    } else if (currentView === "product-detail" && selectedProduct) {
      targetPath = "/products/" + (selectedProduct.slug || selectedProduct.id);
    } else if (currentView === "blog-article" && activeArticle) {
      targetPath = "/blog/" + (activeArticle.slug || activeArticle.id);
    }

    if (targetPath) {
      const cleanTargetPath = targetPath.replace(/\/+/g, "/");
      const nextPath = cleanTargetPath === "/" ? "/" : `${cleanTargetPath}/`;
      const currentRelative = window.location.pathname;
      if (currentRelative !== nextPath) {
        window.history.pushState({ view: currentView }, "", nextPath);
      }
    }
  }, [
    currentView,
    selectedProduct,
    activeArticle,
    activeInfoTopic,
    businessSettings.urlShop,
    businessSettings.urlLearn,
    businessSettings.urlAbout,
    businessSettings.urlFaq,
  ]);

  // Dynamic SEO Page Meta Manager (Title, Description, Keywords, etc.)
  React.useEffect(() => {
    let title =
      businessSettings.seoTitleOverride ||
      "CBD American Shaman of Hurst | CBD & Hemp Wellness";
    let description =
      businessSettings.seoDescriptionOverride ||
      "Hurst's trusted source for certified, state-compliant Delta-9, CBD flowers, clean tinctures, and wellness products. Explore products with third-party lab testing.";
    let keywords =
      businessSettings.seoKeywordsOverride ||
      "cbd, delta 9, Hurst Texas, organic hemp, gummies, sleep aid, wellness";

    // Calculate Canonical URL dynamically for current view
    let canonicalUrl = "https://cbdhurst.com/";

    if (currentView === "blogs") {
      title = `Cannabis & Botanical Wellness Blog | CBD American Shaman of Hurst`;
      description = `Discover clinical insights, dosing guides, and expert advice on CBD, Delta 9, and hemp extracts in Hurst, TX.`;
      canonicalUrl = "https://cbdhurst.com/blog";
    } else if (currentView === "learn" && activeInfoTopic) {
      const activeLp = findLearnPageBySlugOrTitle(activeInfoTopic);
      if (activeLp) {
        title = activeLp.metaTitle || `${activeLp.title} | CBD American Shaman of Hurst`;
        description = activeLp.metaDescription || description;
      }
      const cleanTopic = activeInfoTopic.replace(/^\//, "");
      canonicalUrl = `https://cbdhurst.com/${cleanTopic}`;
    }

    if (currentView === "shop") {
      title = "Shop Organic CBD & State-Compliant Hemp | CBD American Shaman of Hurst";
      description =
        "Browse our catalog of artisanal gummies, CBD tinctures, Delta-9, hemp flower, and premium pet formulas. 100% lab tested for purity.";
      keywords =
        "buy cbd online, cbd tinctures texas, delta-9 gummies Hurst, organic pet cbd";
      canonicalUrl = "https://cbdhurst.com/shop";
    } else if (currentView === "about") {
      title = "Our Story & Sourcing Purity | CBD American Shaman of Hurst";
      description =
        "Learn about CBD American Shaman of Hurst's commitment to clean extraction and providing third-party certified wellness products to our community.";
      keywords =
        "CBD American Shaman of Hurst, organic hemp sourcing, gmp certified extraction, Texas CBD";
      canonicalUrl = "https://cbdhurst.com/about";
    } else if (currentView === "contact") {
      title = "Contact & Storefront | CBD American Shaman of Hurst";
      description =
        "Connect with our certified cannabinoid wellness consultants or visit our Hurst storefront. Dosing support, hours, and store directions.";
      keywords =
        "CBD American Shaman of Hurst contact, Hurst CBD store address, CBD store phone number";
      canonicalUrl = "https://cbdhurst.com/contact";
    } else if (currentView === "faq") {
      title = "Answers & Dosing Guides | CBD American Shaman of Hurst FAQ";
      description =
        "Have questions about legal compliance, THC limits, proper sublingual dosing, or pickup times in Hurst? Read our detailed guides.";
      keywords =
        "cbd faq, drug test info, legal hemp limits, cbd dosing directions";
      canonicalUrl = "https://cbdhurst.com/faq";
    } else if (currentView === "product-detail" && selectedProduct) {
      title = selectedProduct.metaTitle || `${selectedProduct.name} | CBD American Shaman of Hurst`;
      description =
        selectedProduct.metaDescription || selectedProduct.description;
      keywords =
        selectedProduct.tags ||
        `${selectedProduct.name}, ${selectedProduct.categoryLabel}, organic wellness`;
      canonicalUrl = `https://cbdhurst.com/products/${selectedProduct.slug || selectedProduct.id}`;
    } else if (currentView === "blog-article" && activeArticle) {
      title =
        activeArticle.metaTitle || `${activeArticle.title} | CBD American Shaman of Hurst Journal`;
      description = activeArticle.metaDescription || activeArticle.summary;
      keywords =
        activeArticle.tags ||
        `${activeArticle.category}, cannabinoids, educational insights`;
      canonicalUrl =
        (activeArticle.canonicalUrl && activeArticle.canonicalUrl.trim()) ||
        `https://cbdhurst.com/blog/${activeArticle.slug || activeArticle.id}`;
    } else if (currentView === "learn" && activeInfoTopic) {
      title = `${activeInfoTopic} | CBD American Shaman of Hurst Learning Center`;
      description = `Read certified guidelines, benefits, and local Texas compliance details regarding ${activeInfoTopic}. Empowering your wellness journey.`;
      keywords = `${activeInfoTopic.toLowerCase()}, endocannabinoid system, texas compliance, dosing information`;
      canonicalUrl = `https://cbdhurst.com/${activeInfoTopic.replace(/^\//, "")}`;
    } else if (currentView === "terms") {
      canonicalUrl = "https://cbdhurst.com/terms";
    } else if (currentView === "privacy") {
      canonicalUrl = "https://cbdhurst.com/privacy";
    } else if (currentView === "admin") {
      canonicalUrl = "https://cbdhurst.com/admin";
    }

    title = title
      .replace(/Two\s*Budz/gi, businessName)
      .replace(/Flower Mound/gi, "Hurst");
    description = description
      .replace(/Two\s*Budz/gi, businessName)
      .replace(/Flower Mound/gi, "Hurst");
    keywords = keywords.replace(/Two\s*Budz/gi, businessName).replace(/Flower Mound/gi, "Hurst");

    // Apply Meta Title
    document.title = title;

    // Apply Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", description);

    // Apply Meta Keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement("meta");
      metaKeywords.setAttribute("name", "keywords");
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute("content", keywords);

    // Apply Canonical Link Tag for All Pages
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", canonicalUrl);

    // Apply OG URL
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement("meta");
      ogUrl.setAttribute("property", "og:url");
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute("content", canonicalUrl);

    // Apply OG Title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement("meta");
      ogTitle.setAttribute("property", "og:title");
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute("content", title);

    // Apply OG Description
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement("meta");
      ogDesc.setAttribute("property", "og:description");
      document.head.appendChild(ogDesc);
    }
    ogDesc.setAttribute("content", description);

    // Apply OG Image
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogImage) {
      ogImage = document.createElement("meta");
      ogImage.setAttribute("property", "og:image");
      document.head.appendChild(ogImage);
    }
    ogImage.setAttribute(
      "content",
      businessSettings.heroImage || "/images/hero_bg_1779557711335.png",
    );
  }, [
    currentView,
    selectedProduct,
    activeArticle,
    activeInfoTopic,
    businessSettings,
  ]);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#f7f9f4] selection:bg-[#3b142e]/20 antialiased text-[#2c3527]">
      {/* Visual Header bar */}
      {currentView !== "admin" && (
        <Header
          currentView={currentView}
          setView={setView}
          cartItemsCount={cartItems.reduce(
            (acc, item) => acc + item.quantity,
            0,
          )}
          toggleCart={() => setIsCartOpen(!isCartOpen)}
          openContactModal={() => setContactOpen(true)}
          settings={businessSettings}
          categories={categories}
          setSelectedCategory={setSelectedCategory}
          onSelectFilter={setSelectedFilter}
          onOpenInfoModal={(topic) => {
            setActiveInfoTopic(topic);
            setView("learn");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      {/* Floating Global Banner Alerts on Item added */}
      {addedItemName && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-white border border-[#e1e8db] shadow-2xl text-[#2c3527] font-sans text-xs flex items-center gap-3 animate-fadeIn max-w-sm">
          <div className="w-8 h-8 rounded-full bg-[#3b142e]/10 border border-[#3b142e]/20 flex items-center justify-center text-[#3b142e] shrink-0 font-bold">
            ✓
          </div>
          <div>
            <p className="font-bold text-[#2c3527]">Item Added to Bag!</p>
            <p className="text-[10px] text-[#5b6b55] mt-0.5 line-clamp-1">
              {addedItemName}
            </p>
          </div>
        </div>
      )}

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 left-6 z-40 p-3 rounded-full bg-[#2c3527] hover:bg-[#3b142e] text-white shadow-2xl transition-all duration-300 flex items-center justify-center cursor-pointer border border-[#cbd5c2]/40 hover:scale-110 active:scale-95 animate-fadeIn"
          title="Back to Top"
          aria-label="Scroll back to top"
        >
          <ArrowUp className="w-4 h-4 text-white" />
        </button>
      )}

      {/* Primary SPA Routing Router Content grids */}
      <main className="flex-grow">
        {/* Dynamic Breadcrumbs Navigation (visible on all sub-pages except home, admin, and product-detail) */}
        {currentView !== "home" && currentView !== "admin" && currentView !== "product-detail" && (
          <div className="bg-[#edf2e8] border-b border-[#cbd5c2]/35 py-3.5 px-4 sm:px-6 md:px-8 lg:px-12 select-none">
            <div className="max-w-7xl mx-auto flex items-center flex-wrap gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-semibold text-[#5b6b55] font-sans tracking-wide">
              <button
                onClick={() => {
                  setView("home");
                  setSelectedProduct(null);
                  setActiveArticle(null);
                  setActiveInfoTopic(null);
                  setSelectedFilter(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="hover:text-[#3b142e] transition-colors cursor-pointer font-bold uppercase"
              >
                Home
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />

              {currentView === "shop" && (
                <>
                  <span className="text-[#2c3527] font-bold uppercase">
                    Shop Catalog
                  </span>
                  {selectedCategory !== "all" && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-[#3b142e] font-extrabold uppercase font-mono">
                        {selectedCategory === "cbd-oils"
                          ? "CBD Oils & Drops"
                          : selectedCategory === "gummies"
                            ? "Artisanal Gummies"
                            : selectedCategory === "flower"
                              ? "Premium Buds"
                              : selectedCategory === "topicals"
                                ? "Targeted Topicals"
                                : selectedCategory === "pets"
                                  ? "Pet CBD Wellness"
                                  : selectedCategory === "beverages"
                                    ? "Active Beverages"
                                    : selectedCategory}
                      </span>
                    </>
                  )}
                </>
              )}

              {currentView === "about" && (
                <span className="text-[#2c3527] font-bold uppercase">
                  Our Sourcing Story
                </span>
              )}

              {currentView === "contact" && (
                <span className="text-[#2c3527] font-bold uppercase">
                  Contact & Storefront
                </span>
              )}

              {currentView === "faq" && (
                <span className="text-[#2c3527] font-bold uppercase font-mono">
                  FAQ Helpdesk
                </span>
              )}

              {currentView === "product-detail" && selectedProduct && (
                <>
                  <button
                    onClick={() => {
                      setView("shop");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="hover:text-[#3b142e] transition-colors cursor-pointer uppercase"
                  >
                    Products
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-[#3b142e] font-extrabold uppercase max-w-[200px] sm:max-w-none truncate">
                    {selectedProduct.name}
                  </span>
                </>
              )}

              {currentView === "blog-article" && activeArticle && (
                <>
                  <button
                    onClick={() => {
                      setView("home");
                      setTimeout(() => {
                        const blogSection =
                          document.getElementById("blog-section");
                        if (blogSection) {
                          blogSection.scrollIntoView({ behavior: "smooth" });
                        }
                      }, 100);
                    }}
                    className="hover:text-[#3b142e] transition-colors cursor-pointer uppercase"
                  >
                    Journal
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-[#3b142e] font-extrabold uppercase max-w-[200px] sm:max-w-none truncate">
                    {activeArticle.title}
                  </span>
                </>
              )}

              {currentView === "learn" && activeInfoTopic && (
                <>
                  <span className="text-[#5b6b55] uppercase">
                    Education Hub
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-[#3b142e] font-extrabold uppercase font-mono">
                    {activeInfoTopic}
                  </span>
                </>
              )}

              {currentView === "admin" && (
                <span className="text-[#2c3527] font-bold uppercase">
                  Admin Console
                </span>
              )}
            </div>
          </div>
        )}

        {currentView === "home" && (
          <div className="animate-fadeIn">
            {/* Elegant slider background Hero section */}
            <Hero setView={setView} settings={businessSettings} />

            {/* Quick Categories list blocks */}
            <Categories
              setView={setView}
              setSelectedCategory={setSelectedCategory}
              categories={categories}
            />

            {/* Sourcing and About details section */}
            <About />

            {/* Handpicked Best-Seller limit showcase */}
            <section className="py-20 px-4 sm:px-6 md:px-8 lg:px-12 bg-white border-b border-[#e1e8db]">
              <div className="max-w-7xl mx-auto space-y-12">
                <div className="text-center space-y-2 max-w-xl mx-auto">
                  <p className="text-[11px] font-mono tracking-widest text-[#3b142e] uppercase font-bold">
                    CUSTOMER FAVORITES
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#2c3527] leading-tight">
                    Our Best Selling{" "}
                    <span className="text-[#3b142e]">Organic Formulas</span>
                  </h2>
                  <p className="text-[#5b6b55] text-xs sm:text-sm">
                    Hand-crafted products preferred by our local community
                    families in Hurst, TX.
                  </p>
                </div>

                {/* Grid limit of best sellers / featured homepage items (9 products) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {(() => {
                    // Combine products marked as featured/bestseller and all other products so new additions always show
                    const combinedList: Product[] = [];
                    const featured = products.filter((p) => p.isFeaturedHome || p.isBestSeller);
                    featured.forEach((p) => combinedList.push(p));
                    products.forEach((p) => {
                      if (!combinedList.some((item) => item.id === p.id)) {
                        combinedList.push(p);
                      }
                    });

                    // Sort so products with custom/valid images are prioritized
                    const sortedList = combinedList.sort((a, b) => {
                      const aHasImg = a.image && a.image.trim() && !a.image.includes("placeholder") ? 1 : 0;
                      const bHasImg = b.image && b.image.trim() && !b.image.includes("placeholder") ? 1 : 0;
                      return bHasImg - aHasImg;
                    });

                    const homeProducts = sortedList.slice(0, 9);

                    return homeProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onViewDetails={handleProductSelect}
                        onAddToCart={handleAddToCart}
                      />
                    ));
                  })()}
                </div>

                <div className="text-center pt-4">
                  <button
                    onClick={() => {
                      setView("shop");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#3b142e] hover:bg-[#5d2a49] text-white text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-md"
                  >
                    <span>View Whole Shop</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </section>

            {/* Special Opening Promo with countdown */}
            <Promo />

            {/* Client Testimonials reviews */}
            <Testimonials />

            {/* Education journals blog posts summaries */}
            <Blog
              postsList={blogPosts}
              isHomepage={true}
              onViewAllBlogs={() => {
                setView("blogs");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onSelectPost={(post) => {
                setActiveArticle(post);
                setView("blog-article");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />

            {/* Expandable FAQs accordion layout */}
            <FAQ faqsList={faqItems} />
          </div>
        )}

        {currentView === "blogs" && (
          <div className="animate-fadeIn">
            <Blog
              postsList={blogPosts}
              isHomepage={false}
              onSelectPost={(post) => {
                setActiveArticle(post);
                setView("blog-article");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        )}

        {currentView === "blog-article" && activeArticle && (
          <BlogReader
            post={activeArticle}
            productsList={products}
            onSelectProduct={(prod) => {
              setSelectedProduct(prod);
              setView("product-detail");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onSelectTopic={(t) => {
              setActiveInfoTopic(t);
              setView("learn");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onClose={() => {
              setActiveArticle(null);
              setView("blogs");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}

        {currentView === "shop" && (
          <div className="animate-fadeIn">
            {/* Standard Category Products list */}
            <Products
              onViewDetails={handleProductSelect}
              onAddToCart={handleAddToCart}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              productsList={products}
              categoriesList={categories}
              selectedFilter={selectedFilter}
              setSelectedFilter={setSelectedFilter}
            />

            {/* Supporting FAQs segment inside shop */}
            <FAQ faqsList={faqItems} />
          </div>
        )}

        {currentView === "about" && (
          <div className="animate-fadeIn">
            {/* Sourcing and About detailed segment */}
            <About />

            {/* Supporting Promo */}
            <Promo />

            {/* Customer reviews */}
            <Testimonials />
          </div>
        )}

        {currentView === "contact" && (
          <div className="animate-fadeIn">
            <ContactPage
              setView={setView}
              settings={businessSettings}
              onInquirySubmitted={handleContactSubmit}
            />
          </div>
        )}

        {currentView === "faq" && (
          <div className="animate-fadeIn">
            {/* Large FAQ listing */}
            <FAQ faqsList={faqItems} />

            {/* Quick newsletter subscription */}
            <section className="py-16 px-4 bg-[#edf2e8] border-b border-[#e1e8db]">
              <div className="max-w-md mx-auto text-center space-y-4 font-sans">
                <Leaf className="w-10 h-10 text-[#3b142e] mx-auto animate-pulse" />
                <h3 className="text-[#2c3527] text-lg font-bold">
                  Have Unresolved Questions?
                </h3>
                <p className="text-[#5b6b55] text-xs leading-relaxed">
                  Connect with our counselors in Hurst directly for
                  personalized dosing advice and regulatory support.
                </p>
                <button
                  onClick={() => setContactOpen(true)}
                  className="px-6 py-3 rounded-xl border border-[#e1e8db] hover:border-[#3b142e] bg-white text-xs font-bold text-[#5b6b55] hover:text-[#2c3527] uppercase tracking-wider transition-colors"
                >
                  Contact Desk
                </button>
              </div>
            </section>
          </div>
        )}

        {currentView === "product-detail" && (
          <ProductDetail
            product={selectedProduct}
            categoriesList={categories}
            onBackToShop={() => {
              const target = previousView && previousView !== "product-detail" ? previousView : "home";
              setView(target);
              setSelectedProduct(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onAddToCart={handleAddToCart}
            allProducts={products}
            onSelectProduct={(p) => {
              setSelectedProduct(p);
              setView("product-detail");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            setView={setView}
            setSelectedCategory={setSelectedCategory}
          />
        )}

        {currentView === "learn" && (
          <LearnPage
            topic={activeInfoTopic || "cbd-gummies"}
            onBackToHome={() => {
              setView("home");
              setActiveInfoTopic(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            products={products}
            onSelectTopic={(t) => {
              setActiveInfoTopic(t);
              setView("learn");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onSelectProduct={(prod) => {
              setSelectedProduct(prod);
              setView("product-detail");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onAddToCart={handleAddToCart}
          />
        )}

        {currentView === "terms" && (
          <div className="animate-fadeIn">
            <TermsPage setView={setView} />
          </div>
        )}

        {currentView === "privacy" && (
          <div className="animate-fadeIn">
            <PrivacyPage setView={setView} />
          </div>
        )}

        {currentView === "admin" && (
          <AdminPanel
            products={products}
            setProducts={setProducts}
            blogPosts={blogPosts}
            setBlogPosts={setBlogPosts}
            faqItems={faqItems}
            setFaqItems={setFaqItems}
            orders={orders}
            setOrders={setOrders}
            inquiries={inquiries}
            setInquiries={setInquiries}
            reviews={reviews}
            setReviews={setReviews}
            businessSettings={businessSettings}
            setBusinessSettings={(settings) =>
              setBusinessSettings(normalizeBusinessSettings(settings))
            }
            categories={categories}
            setCategories={setCategories}
            onClose={() => {
              setView("home");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onPreviewProduct={(p) => {
              const slugPart = p.slug || p.id;
              const previewUrl = `/products/${slugPart}`.replace(/\/+/g, "/");
              window.open(previewUrl, "_blank");
            }}
          />
        )}
      </main>

      {/* Footer copyright */}
      {currentView !== "admin" && (
        <Footer
          setView={setView}
          setSelectedCategory={setSelectedCategory}
          openContactModal={() => setContactOpen(true)}
          onSelectTopic={(t) => {
            setActiveInfoTopic(t);
            setView("learn");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onOpenAdmin={() => {
            setView("admin");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          settings={businessSettings}
        />
      )}

      {/* Floating Side Shopping Cart Slide Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setCheckoutOpen(true);
        }}
        setView={setView}
      />

      {/* Complete Order Checkout Secure Modal */}
      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cartItems={cartItems}
        clearCart={clearCart}
        setView={setView}
        onOrderPlaced={handleOrderPlaced}
      />

      {/* Direct Store Contact desk Modal */}
      {contactOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e1e8db] rounded-2xl w-full max-w-2xl text-[#2c3527] shadow-2xl relative font-sans animate-zoomIn overflow-hidden flex flex-col md:flex-row">
            {/* Absolute Close */}
            <button
              onClick={() => setContactOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#f1f4ee] text-[#2c3527] flex items-center justify-center border border-[#e1e8db] hover:text-[#3b142e] hover:border-[#3b142e] transition-colors focus:outline-none z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Left direct contact column */}
            <div className="p-6 md:w-5/12 bg-[#edf2e8] border-b md:border-b-0 md:border-r border-[#e1e8db] flex flex-col justify-between md:pt-12">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-[#3b142e] uppercase">
                  <Sparkles className="w-4.5 h-4.5" />
                  <span>CBD American Shaman of Hurst</span>
                </div>
                <h3 className="text-[#2c3527] font-serif font-black text-xl leading-tight">
                  Get in Touch with Earthy Purity
                </h3>
                <p className="text-[#5b6b55] text-xs leading-relaxed">
                  Let our certified consultants solve dosing, product
                  compliance, or pickup timing questions directly.
                </p>
              </div>

              <ul className="space-y-4 text-xs pt-6 border-t border-[#e1e8db] mt-6">
                <li className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#3b142e] mt-0.5 shrink-0" />
                  <span>{businessSettings.location}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-[#3b142e] mt-0.5 shrink-0" />
                  <span>{businessSettings.phone}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-[#3b142e] mt-0.5 shrink-0" />
                  <span>{businessSettings.email}</span>
                </li>
              </ul>
            </div>

            {/* Right email client submission column */}
            <div className="p-6 md:w-7/12 flex flex-col justify-center">
              {contactSubmitted ? (
                <div className="p-6 text-center space-y-4 flex flex-col items-center">
                  <div className="w-12 h-12 bg-[#3b142e]/10 border border-[#3b142e]/20 text-[#3b142e] rounded-full flex items-center justify-center">
                    ✓
                  </div>
                  <h4 className="text-[#2c3527] font-bold text-sm">
                    Message Scribed Successfully!
                  </h4>
                  <p className="text-[#5b6b55] text-xs leading-relaxed">
                    A certified wellness consultant will address your question
                    at the provided email address inside 4 hours during standard
                    operational clocks.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <h4 className="text-[#2c3527] text-xs font-extrabold uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <MessageSquare className="w-4.5 h-4.5 text-[#3b142e]" />
                    <span>Send Secure Inquiries</span>
                  </h4>

                  <div className="space-y-1.5 text-xs">
                    <label className="text-[#72856a] uppercase tracking-widest font-bold">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, name: e.target.value })
                      }
                      placeholder="Jane Doe"
                      className="w-full p-3 bg-white border border-[#e1e8db] rounded-xl text-[#2c3527] focus:outline-none focus:border-[#3b142e]"
                    />
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <label className="text-[#72856a] uppercase tracking-widest font-bold">
                      Your Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) =>
                        setContactForm({
                          ...contactForm,
                          email: e.target.value,
                        })
                      }
                      placeholder="jane@doe.com"
                      className="w-full p-3 bg-white border border-[#e1e8db] rounded-xl text-[#2c3527] focus:outline-none focus:border-[#3b142e]"
                    />
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <label className="text-[#72856a] uppercase tracking-widest font-bold">
                      Message details
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={contactForm.msg}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, msg: e.target.value })
                      }
                      placeholder="How should I dose Delta-9 gummies?"
                      className="w-full p-3 bg-white border border-[#e1e8db] rounded-xl text-[#2c3527] focus:outline-none focus:border-[#3b142e] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-[#3b142e] hover:bg-[#5d2a49] text-white text-xs font-extrabold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <span>Submit message</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
