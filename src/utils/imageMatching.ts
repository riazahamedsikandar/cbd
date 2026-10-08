import React from "react";
import type { BlogPost } from "../types";
import { DETECTED_IMAGES, DETECTED_FOLDER } from "./detectedImages";
import { RESTORED_IMAGE_ASSETS } from "./restoredImageAssets";

const FOLDER = DETECTED_FOLDER || "images";

const assetKey = (value: string) =>
  (value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const getRestoredImageAsset = (productName: string) =>
  RESTORED_IMAGE_ASSETS[assetKey(productName)] || "";

// Include all detected images (.jpg, .jpeg, .png, .webp)
export const LOCAL_IMAGES = DETECTED_IMAGES.filter(
  img => img.toLowerCase().endsWith(".webp") || 
         img.toLowerCase().endsWith(".png") ||
         img.toLowerCase().endsWith(".jpg") ||
         img.toLowerCase().endsWith(".jpeg")
);

/**
 * Intelligent product matching helper for custom SEO URLs and slugs.
 * Matches exact slugs, IDs, sanitized names (removing apostrophes like Willie's -> willies),
 * substrings, and tokenized keyword matches.
 */
export const findProductBySlug = (
  products: any[],
  rawSlug: string
): any | undefined => {
  if (!rawSlug || !products || products.length === 0) return undefined;
  const clean = rawSlug.toLowerCase().trim().replace(/^\/+|\/+$/g, "");

  // 1. Direct match on slug or ID
  let match = products.find(
    (p) =>
      (p.slug && p.slug.toLowerCase().trim() === clean) ||
      (p.id && String(p.id).toLowerCase().trim() === clean)
  );
  if (match) return match;

  // 2. Match with cleaned slug (removing apostrophes like Willie's -> willies)
  const stripSpecial = (str: string) =>
    (str || "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const targetClean = stripSpecial(clean);
  match = products.find(
    (p) =>
      stripSpecial(p.slug || "") === targetClean ||
      stripSpecial(p.name || "") === targetClean
  );
  if (match) return match;

  // 3. Match if target is substring of product slug/name or vice-versa
  match = products.find((p) => {
    const pSlug = stripSpecial(p.slug || p.name || "");
    return (
      pSlug.length > 3 &&
      targetClean.length > 3 &&
      (pSlug.includes(targetClean) || targetClean.includes(pSlug))
    );
  });
  if (match) return match;

  // 4. Token-based word match (e.g., "thc-social-tonic-5mg" -> matches "Willie's THC Social Tonic 5mg")
  const targetTokens = targetClean.split("-").filter((t) => t.length > 1);
  if (targetTokens.length > 0) {
    let bestProduct: any = undefined;
    let maxMatches = 0;

    for (const p of products) {
      const pTokens = stripSpecial(`${p.name || ""} ${p.slug || ""}`).split("-");
      let tokenMatches = 0;
      for (const t of targetTokens) {
        if (pTokens.includes(t)) {
          tokenMatches++;
        }
      }
      if (tokenMatches > maxMatches && tokenMatches >= Math.min(2, targetTokens.length)) {
        maxMatches = tokenMatches;
        bestProduct = p;
      }
    }
    if (bestProduct) return bestProduct;
  }

  return undefined;
};

export const isAssetAvailable = (url: string): boolean => {
  if (!url || typeof url !== "string") return false;
  if (url.startsWith("data:") || url.startsWith("blob:")) return true;
  
  try {
    const decoded = decodeURIComponent(url);
    const filename = decoded.substring(decoded.lastIndexOf('/') + 1);
    if (!filename) return false;

    // Check with fuzzy slug matching
    const cleanStr = (s: string) => {
      return s.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    };
    
    const targetSlug = cleanStr(filename);
    const hasMatch = LOCAL_IMAGES.some(img => cleanStr(img) === targetSlug);
    if (hasMatch) return true;

    // Try without extension
    const filenameNoExt = filename.substring(0, filename.lastIndexOf('.')) || filename;
    const targetNoExtSlug = cleanStr(filenameNoExt);
    return LOCAL_IMAGES.some(img => {
      const imgNoExt = img.substring(0, img.lastIndexOf('.')) || img;
      return cleanStr(imgNoExt) === targetNoExtSlug;
    });
  } catch (e) {
    return false;
  }
};

/**
 * Converts any original name or filename into its exact clean WebP slug on disk.
 * e.g., "Barney's Botanicals 12mg Delta 9 Gummies 10ct.jpg" -> "barneys-botanicals-12mg-delta-9-gummies-10ct.webp"
 */
export const getCleanWebpName = (filename: string): string => {
  if (!filename) return "";
  let decoded = filename;
  try {
    decoded = decodeURIComponent(filename);
  } catch (e) {}
  
  let nameNoExt = decoded;
  if (decoded.includes(".")) {
    nameNoExt = decoded.substring(0, decoded.lastIndexOf('.'));
  }
  
  // Replace smart/normal apostrophes with empty string so "Barney's" -> "barneys"
  const cleaned = nameNoExt.toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
    
  return cleaned + ".webp";
};

export const getJpgOrWebp = (jpgName: string, webpName: string): string => {
  if (LOCAL_IMAGES.length === 0) return "/brand-feather.png";

  const cleanStr = (s: string) => {
    return s.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const targetJpgSlug = cleanStr(jpgName);
  const targetWebpSlug = cleanStr(webpName);

  // 1. Try to find an exact matching slug in our local files (either matches the JPG slug or the WebP slug)
  for (const img of LOCAL_IMAGES) {
    const imgSlug = cleanStr(img);
    if (imgSlug === targetJpgSlug || imgSlug === targetWebpSlug) {
      return encodeURI(`/${FOLDER}/${img}`);
    }
  }

  // 2. Try match without file extension
  const jpgNoExt = jpgName.substring(0, jpgName.lastIndexOf('.')) || jpgName;
  const webpNoExt = webpName.substring(0, webpName.lastIndexOf('.')) || webpName;
  const targetJpgNoExtSlug = cleanStr(jpgNoExt);
  const targetWebpNoExtSlug = cleanStr(webpNoExt);

  for (const img of LOCAL_IMAGES) {
    const imgNoExt = img.substring(0, img.lastIndexOf('.')) || img;
    const imgNoExtSlug = cleanStr(imgNoExt);
    if (imgNoExtSlug === targetJpgNoExtSlug || imgNoExtSlug === targetWebpNoExtSlug) {
      return encodeURI(`/${FOLDER}/${img}`);
    }
  }

  // 3. Fallback to any local image we have, prioritizing Bliss gummy if it exists
  const blissGummy = LOCAL_IMAGES.find(img => img.toLowerCase().includes("bliss"));
  if (blissGummy) {
    return encodeURI(`/${FOLDER}/${blissGummy}`);
  }

  if (LOCAL_IMAGES.length > 0) {
    return encodeURI(`/${FOLDER}/${LOCAL_IMAGES[0]}`);
  }

  // Absolutely final resort
  return encodeURI(`/${FOLDER}/${webpName}`);
};export const mapProductAutoImage = (category: string, name: string, index: number = 0): string => {
  if (LOCAL_IMAGES.length === 0) return "/brand-feather.png";
  const normName = name.toLowerCase();

  const STOP_WORDS = new Set([
    "cbd", "thc", "mg", "gummies", "gummy", "free", "delta", "the", "and", "for",
    "with", "in", "of", "pack", "count", "ct", "oz", "ml", "product", "item",
    "hemp", "extract", "natural", "full", "spectrum", "broad", "bottle", "pure",
    "raw", "daily", "blend", "formula", "super", "premium", "two", "budz", "twobudz"
  ]);

  // Robust token clean extractor
  const cleanTokens = (str: string) => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .split(/\s+/)
      .filter(t => t.length > 1);
  };

  const productTokens = cleanTokens(name).filter(t => !STOP_WORDS.has(t));
  let bestScore = 0;
  let bestImage = "";

  // Always search through our verified healthy LOCAL_IMAGES list
  for (const imgname of LOCAL_IMAGES) {
    if (imgname.includes("logo") || imgname.includes("hero_bg")) continue;

    const rawImageName = imgname.substring(0, imgname.lastIndexOf('.'));
    const imgTokens = cleanTokens(rawImageName.replace(/[-_]/g, ' ')).filter(t => !STOP_WORDS.has(t));

    let score = 0;
    for (const pToken of productTokens) {
      for (const iToken of imgTokens) {
        if (pToken === iToken) {
          score += 15; // exact non-stop word match
        } else if (pToken.length > 3 && (pToken.includes(iToken) || iToken.includes(pToken))) {
          score += 5; // partial match 
        }
      }
    }

    // Prefer webp over unencoded space filenames for production stability
    if (imgname.toLowerCase().endsWith(".webp")) {
      score += 2;
    }

    // Add extra weights for brand and unique flavor matches to avoid false positives
    const brands = ["wyld", "barney", "enjoy", "hometown", "proleve", "stardust", "justcbd", "delta"];
    for (const b of brands) {
      if (normName.includes(b) && rawImageName.toLowerCase().includes(b)) {
        score += 20; // heavy brand alignment
      }
    }

    const uniqueFlavors = [
      "blackberry", "raspberry", "grapefruit", "lemon", "peach", "cherry", "strawberry", "starawberry",
      "orange", "elderberry", "pomegranate", "pear", "marionberry", "mariomberry", "maui", "wowie",
      "wedding", "gelato", "blue", "purple", "cool", "warm", "mint", "cocoa", "fruity", "rainbow", "passion",
      "tuna", "salmon", "chicken", "rose", "bliss", "chill", "euphoria", "balance", "relief", "wintergreen", "dark"
    ];
    for (const f of uniqueFlavors) {
      if (normName.includes(f) && rawImageName.toLowerCase().includes(f)) {
        score += 18; // strong flavor alignment
      }
    }

    // High fidelity category booster
    if (category === "beverages" && (rawImageName.toLowerCase().includes("water") || rawImageName.toLowerCase().includes("beverage") || rawImageName.toLowerCase().includes("tea") || rawImageName.toLowerCase().includes("lemonade") || rawImageName.toLowerCase().includes("shot"))) {
      score += 15;
    }
    if (category === "topicals" && (rawImageName.toLowerCase().includes("roll") || rawImageName.toLowerCase().includes("cool") || rawImageName.toLowerCase().includes("warm"))) {
      score += 15;
    }

    if (score > bestScore) {
      bestScore = score;
      bestImage = imgname;
    }
  }

  // If we have any matched score (> 0), return it (preferring webp if available)
  if (bestScore > 0 && bestImage) {
    const webpFile = getCleanWebpName(bestImage);
    if (webpFile && LOCAL_IMAGES.includes(webpFile)) {
      return encodeURI(`/${FOLDER}/${webpFile}`);
    }
    return encodeURI(`/${FOLDER}/${bestImage}`);
  }

  // Fallback pools per category to ensure distinct visual variety
  const gummyPool = [
    "sleep-cbd-gummies-mixed-fruit.webp",
    "wyld-thc-free-peach-cbd-gummies.webp",
    "enjoy-live-rosin-delta-9-gummies-300mg-bliss.webp",
    "enjoy-live-rosin-chill-delta-9-gummies-600mg.webp",
    "barneys-botanicals-12mg-delta-9-gummies-10ct.webp",
    "dark-cherry-cbd-cbn-thc-gummies-sleep-support.webp",
    "marionberry-indica-thc-gummies-10mg.webp",
    "pomegranate-thc-cbd-gummies-10mg.webp",
    "wyld-blood-orange-thc-cbc-gummies-bliss.webp",
    "balance-thc-cbd-gummies-25mg-hybrid.webp",
    "elderberry-thc-cbn-gummies-10mg-30ct.webp",
    "proleve-cbd-daily-gummies-50-mg-30-count.webp",
    "pear-cbd-gummies-hemp-extract-edibles.webp",
    "enjoy-cbd-cbg-gummies-3300mg-relief.webp",
    "enjoy-cbdcbn-gummies-3300mg-sleep.webp",
    "northern-lights-live-rosin-thc-gummies-indica.webp",
    "hometown-hero-delta-9-live-rosin-gummies-blue-dream-10ct.webp",
    "hometown-hero-delta-9-live-rosin-gummies-gelato-10ct.webp",
    "hometown-hero-delta-9-live-rosin-gummies-grand-daddy-purple-10ct.webp"
  ];

  const drinkPool = [
    "10mg-thc-shots-hemp-infused-beverage.webp",
    "drink-delta-d9-water-maui-wowie-passion-fruit-20mg.webp",
    "drink-delta-d9-water-wedding-cake-blood-orange-20mg.webp",
    "wyld-cbd-sparkling-water-blackberry-50mg.webp",
    "wyld-cbd-sparkling-water-blood-orange-50mg.webp",
    "wyld-cbd-sparkling-water-grapefruit-50mg.webp",
    "wyld-cbd-sparkling-water-lemon-50mg.webp",
    "wyld-cbd-sparkling-water-raspberry-50mg.webp",
    "sparkling-thc-iced-tea-lemonade.webp",
    "sparkling-thc-raspberry-lemonade.webp",
  ];

  const oilPool = [
    "cbd-roll-on-cooling-2000mg.webp",
    "cbd-roll-on-warming-2000mg.webp",
    "proleve-cbd-daily-gummies-50-mg-30-count.webp",
    "wyld-thc-free-peach-cbd-gummies.webp",
  ];

  const ediblePool = [
    "desert-stardust-mushroom-chocolate-bar-starawberry-crunch.webp",
    "hometown-hero-delta-9-cocoa-crisp-cereal-bites.webp",
    "hometown-hero-delta-9-fruity-rainbow-cereal-bites.webp",
    "wintergreen-thc-microdose-mints-40-count.webp",
  ];

  let hash = index;
  for (let i = 0; i < normName.length; i++) {
    hash = (hash << 5) - hash + normName.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  const normCat = (category || "").toLowerCase();
  let pool = gummyPool;

  if (normCat.includes("drink") || normCat.includes("beverage") || normCat.includes("shot") || normName.includes("drink") || normName.includes("water") || normName.includes("tea")) {
    pool = drinkPool;
  } else if (normCat.includes("oil") || normCat.includes("tincture") || normCat.includes("topical") || normCat.includes("pet") || normName.includes("tincture") || normName.includes("dropper") || normName.includes("oil")) {
    pool = oilPool;
  } else if (normCat.includes("edible") || normName.includes("chocolate") || normName.includes("mint") || normName.includes("cereal") || normName.includes("bar")) {
    pool = ediblePool;
  }

  const selectedImage = pool[(positiveHash + index) % pool.length];
  return encodeURI(`/${FOLDER}/${selectedImage}`);
};

export const normalizeToCleanAsset = (url: string, category: string = "", productName: string = ""): string => {
  if (LOCAL_IMAGES.length === 0) {
    if (url?.startsWith("data:") || url?.startsWith("blob:") || url?.startsWith("http://") || url?.startsWith("https://")) {
      return url;
    }
    return "/brand-feather.png";
  }

  // Prefer the valid images recovered from the supplied full backup. This
  // prevents the old, corrupted public JPEG/WebP files from winning a match.
  const restoredImage = getRestoredImageAsset(productName);
  if (restoredImage) return restoredImage;

  if (!url || typeof url !== "string" || url.trim() === "" || url.includes("placeholder") || url === "undefined") {
    return mapProductAutoImage(category, productName) || "/brand-feather.png";
  }
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  // A restored record may contain an old absolute URL that points at the
  // previous host.  Keep a truly external/custom URL if we cannot identify it,
  // but first attempt to bind its filename to the bundled, verified asset.
  const isExternalUrl = url.startsWith("http://") || url.startsWith("https://");

  try {
    let decoded = url.trim();
    try {
      decoded = decodeURIComponent(url.trim());
    } catch (e) {}

    // 1. If explicit relative path starting with / (e.g. /images/custom.png or /uploads/pic.jpg)
    if (decoded.startsWith("/")) {
      const pathFilename = decoded.substring(decoded.lastIndexOf('/') + 1);
      const cleanWebp = getCleanWebpName(pathFilename);
      if (cleanWebp && LOCAL_IMAGES.includes(cleanWebp)) {
        return encodeURI(`/${FOLDER}/${cleanWebp}`);
      }
      if (LOCAL_IMAGES.includes(pathFilename)) {
        return encodeURI(`/${FOLDER}/${pathFilename}`);
      }
      // Preserve custom relative path as provided!
      return encodeURI(decoded);
    }

    let filename = decoded;
    if (filename.includes("/")) {
      filename = filename.substring(filename.lastIndexOf('/') + 1);
    }
    
    if (filename.includes("?")) {
      filename = filename.substring(0, filename.indexOf("?"));
    }

    if (!filename) return mapProductAutoImage(category, productName) || "/brand-feather.png";

    // 2. Check for exact clean webp match on disk first
    const webpName = getCleanWebpName(filename);
    if (webpName && LOCAL_IMAGES.includes(webpName)) {
      return encodeURI(`/${FOLDER}/${webpName}`);
    }

    // 3. Check if filename is directly in LOCAL_IMAGES (webp or png preferred)
    if (LOCAL_IMAGES.includes(filename)) {
      return encodeURI(`/${FOLDER}/${filename}`);
    }

    // 4. Match by sanitized slug against LOCAL_IMAGES (preferring webp/png)
    const cleanStr = (s: string) => {
      return (s || "")
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    };

    const inputNameNoExt = filename.substring(0, filename.lastIndexOf('.')) || filename;
    const inputSlug = cleanStr(inputNameNoExt);

    if (inputSlug) {
      // First pass: look for exact slug match with .webp or .png
      for (const img of LOCAL_IMAGES) {
        if (img.toLowerCase().endsWith(".webp") || img.toLowerCase().endsWith(".png")) {
          const imgNameNoExt = img.substring(0, img.lastIndexOf('.')) || img;
          const imgSlug = cleanStr(imgNameNoExt);
          if (inputSlug === imgSlug) {
            return encodeURI(`/${FOLDER}/${img}`);
          }
        }
      }

      // Second pass: general match
      for (const img of LOCAL_IMAGES) {
        const imgNameNoExt = img.substring(0, img.lastIndexOf('.')) || img;
        const imgSlug = cleanStr(imgNameNoExt);
        if (inputSlug === imgSlug) {
          return encodeURI(`/${FOLDER}/${img}`);
        }
      }
    }

    // Do not rewrite an unknown third-party upload. It still gets the shared
    // onError fallback in every image component if that host is unavailable.
    if (isExternalUrl) return url;

    // 5. If filename has a standard image extension, construct image asset path cleanly
    const hasImageExt = /\.(png|jpg|jpeg|webp|svg|gif|avif)$/i.test(filename);
    if (hasImageExt) {
      return encodeURI(`/${FOLDER}/${filename}`);
    }

    // 6. Auto map using product name and category as last resort
    const autoMapped = mapProductAutoImage(category, productName || inputSlug || filename);
    if (autoMapped) return autoMapped;

  } catch (e) {}

  return "/brand-feather.png";
};

export const getCategoryFallbackImage = (category: string): string => {
  if (LOCAL_IMAGES.length === 0) return "/brand-feather.png";

  if (LOCAL_IMAGES.length === 0) return "/brand-feather.png";

  const normCat = (category || "").toLowerCase();
  
  if (normCat.includes("oil") || normCat.includes("drop") || normCat.includes("tincture") || normCat.includes("cbd-oils")) {
    return "/images/wyld-thc-free-peach-cbd-gummies.webp";
  }
  if (normCat.includes("gum") || normCat.includes("gummy") || normCat.includes("chew") || normCat.includes("gumm") || normCat.includes("gummies")) {
    return "/images/enjoy-live-rosin-delta-9-gummies-300mg-bliss.webp";
  }
  if (normCat.includes("flower") || normCat.includes("bud") || normCat.includes("pre-roll") || normCat.includes("roll")) {
    return "/images/northern-lights-live-rosin-thc-gummies-indica.webp";
  }
  if (normCat.includes("topical") || normCat.includes("cream") || normCat.includes("lotion") || normCat.includes("balm") || normCat.includes("muscle") || normCat.includes("tuba") || normCat.includes("topicals")) {
    return "/images/cbd-roll-on-cooling-2000mg.webp";
  }
  if (normCat.includes("beverage") || normCat.includes("drink") || normCat.includes("water") || normCat.includes("liquid") || normCat.includes("shot") || normCat.includes("lemonade") || normCat.includes("beverages")) {
    return "/images/sparkling-thc-iced-tea-lemonade.webp";
  }
  if (normCat.includes("pet") || normCat.includes("dog") || normCat.includes("cat") || normCat.includes("pets")) {
    return "/images/wyld-thc-free-peach-cbd-gummies.webp";
  }

  return "/images/enjoy-live-rosin-delta-9-gummies-300mg-bliss.webp";
};

export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  category: string
) => {
  const target = e.target as HTMLImageElement;
  
  // Guard: Do not overwrite base64 data URLs or blob URLs uploaded by user
  const currentSrc = target.src || "";
  if (currentSrc.startsWith("data:") || currentSrc.startsWith("blob:")) {
    return;
  }

  if (target.getAttribute("data-image-fallback") === "true") {
    target.onerror = null;
    target.src = "/images/product-image-fallback.svg";
    return;
  }
  target.setAttribute("data-image-fallback", "true");
  target.onerror = null;
  target.src = getCategoryFallbackImage(category);
};

/**
 * Resolves a blog image safely:
 * - Only returns an image if the user explicitly provided/uploaded one (e.g. data:image, http/https, custom file)
 *   OR if it is one of the 4 original educational blog articles with authentic images.
 * - NEVER falls back to random product images (edibles, gummies, drinks, tinctures).
 * - For any article where no image was provided, returns "" so the clean BookOpen / 📄 placeholder renders.
 */
export const resolveBlogImage = (
  postOrImage: Partial<BlogPost> | string | undefined | null,
  maybeSlug: string = ""
): string => {
  let raw = "";
  let slugOrTitle = maybeSlug;
  let idStr = "";

  if (postOrImage && typeof postOrImage === "object") {
    raw = (postOrImage.image || "").trim();
    slugOrTitle = postOrImage.slug || postOrImage.title || maybeSlug;
    idStr = String(postOrImage.id || "");
  } else if (typeof postOrImage === "string") {
    raw = postOrImage.trim();
  }

  // Detect corrupted strings truncated by MySQL TEXT 65,535-byte limits
  const isTruncated = raw.startsWith("data:image/") && raw.length >= 65530 && raw.length <= 65536;

  // 1. Valid custom user uploads in Admin Panel (Data URLs, blob URLs, or external URLs)
  if (
    !isTruncated &&
    ((raw.startsWith("data:image/") && raw.length > 100) ||
      raw.startsWith("blob:") ||
      raw.startsWith("http://") ||
      raw.startsWith("https://"))
  ) {
    return raw;
  }

  if (LOCAL_IMAGES.length === 0) return "";

  // 2. Direct ID matching for the 4 authentic educational articles (fallback to verified static assets)
  if (idStr === "1" || idStr === "blog-3") {
    return "/images/how-to-incorporate-cbd-into-your-daily-wellness-routine.jpg";
  }
  if (idStr === "2" || idStr === "blog-1") {
    return "/images/understanding-the-purity-difference-cbd-vs-delta-9.jpg";
  }
  if (idStr === "3" || idStr === "blog-4") {
    return "/images/senior-pet-care-enhancing-playtime-and-healing-rest-with-cbd.jpg";
  }
  if (idStr === "1787081345669" || idStr === "blog-2") {
    return "/images/how-to-choose-the-best-cbd-products-in-flower-mound-tx.jpg";
  }

  // 3. Slug / Title matching for the 4 authentic articles
  const cleanKey = (slugOrTitle || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const ORIGINAL_BLOG_MAP: Record<string, string> = {
    "understanding-the-purity-difference-cbd-vs-delta-9":
      "/images/understanding-the-purity-difference-cbd-vs-delta-9.jpg",
    "full-spectrum-vs-broad-spectrum-vs-cbd-isolate":
      "/images/understanding-the-purity-difference-cbd-vs-delta-9.jpg",
    "how-to-choose-the-best-cbd-products-in-flower-mound-tx":
      "/images/how-to-choose-the-best-cbd-products-in-flower-mound-tx.jpg",
    "how-to-choose-the-best-cbd-products-in-flower-mound":
      "/images/how-to-choose-the-best-cbd-products-in-flower-mound-tx.jpg",
    "how-to-incorporate-cbd-into-your-daily-wellness-routine":
      "/images/how-to-incorporate-cbd-into-your-daily-wellness-routine.jpg",
    "cbd-gummies-vs-cbd-oil-which-one-is-better-for-you":
      "/images/how-to-incorporate-cbd-into-your-daily-wellness-routine.jpg",
    "senior-pet-care-enhancing-playtime-and-healing-rest-with-cbd":
      "/images/senior-pet-care-enhancing-playtime-and-healing-rest-with-cbd.jpg",
    "what-first-time-cbd-buyers-in-flower-mound-should-know":
      "/images/senior-pet-care-enhancing-playtime-and-healing-rest-with-cbd.jpg",
  };

  if (ORIGINAL_BLOG_MAP[cleanKey]) {
    return ORIGINAL_BLOG_MAP[cleanKey];
  }

  // 4. Known authentic blog image assets
  const AUTHENTIC_BLOG_IMAGES = [
    "/images/understanding-the-purity-difference-cbd-vs-delta-9.jpg",
    "/images/how-to-choose-the-best-cbd-products-in-flower-mound-tx.jpg",
    "/images/how-to-incorporate-cbd-into-your-daily-wellness-routine.jpg",
    "/images/senior-pet-care-enhancing-playtime-and-healing-rest-with-cbd.jpg",
    "/restored-images/understanding-the-purity-difference-cbd-vs-delta-9.jpg",
    "/restored-images/how-to-choose-the-best-cbd-products-in-flower-mound-tx.jpg",
    "/restored-images/how-to-incorporate-cbd-into-your-daily-wellness-routine.jpg",
    "/restored-images/senior-pet-care-enhancing-playtime-and-healing-rest-with-cbd.jpg",
  ];

  if (raw && AUTHENTIC_BLOG_IMAGES.some((auth) => raw.endsWith(auth) || raw === auth)) {
    return raw;
  }

  // 5. Otherwise, strictly empty string
  return "";
};

