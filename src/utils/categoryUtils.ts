import { Product, CategoryItem } from "../types";
import { DEFAULT_CATEGORIES } from "../data";
import { normalizeToCleanAsset } from "./imageMatching";

/**
 * Maps a primary category to its explicit ID (returns array with just the category)
 */
export function getCategoryHierarchy(primaryCat: string): string[] {
  const cat = (primaryCat || "").toLowerCase().trim();
  return [cat];
}

/**
 * Returns human-friendly category label
 */
export function getCategoryLabel(category: string, dynamicCategories?: CategoryItem[]): string {
  if (!category) return "Gummies";
  const catLower = category.toLowerCase().trim();

  // 1. Match against dynamic categories passed from Supabase/State first
  if (dynamicCategories && dynamicCategories.length > 0) {
    const dynamicMatch = dynamicCategories.find(
      (c) => c.id.toLowerCase().trim() === catLower || c.title.toLowerCase().trim() === catLower
    );
    if (dynamicMatch) return dynamicMatch.title;
  }

  // 2. Match against DEFAULT_CATEGORIES titles
  const foundCat = DEFAULT_CATEGORIES.find(
    (c) => c.id.toLowerCase().trim() === catLower || c.title.toLowerCase().trim() === catLower
  );
  if (foundCat) return foundCat.title;

  const map: Record<string, string> = {
    gummies: "Gummies",
    "delta-9-gummies": "Gummies",
    "cbd-gummies": "Gummies",
    "sleep-gummies": "Gummies",
    "artisanal-gummies": "Gummies",
    drinks: "Drinks",
    "thc-drinks": "Drinks",
    "cbd-drinks": "Drinks",
    beverages: "Drinks",
    "shots-cocktails": "Drinks",
    oils: "Oils",
    "cbd-oils": "Oils",
    "oils-tinctures": "Oils",
    tinctures: "Tinctures",
    "cbd-tinctures": "Tinctures",
    "delta-9-tinctures": "Tinctures",
    topicals: "Topicals",
    pet: "Pet",
    pets: "Pet",
    "pet-wellness-care": "Pet",
    edibles: "Edibles",
    "edibles-and-gummies": "Edibles and Gummies",
    "edibles_and_gummies": "Edibles and Gummies",
    miscellaneous: "Miscellaneous",
    vapes: "Miscellaneous",
    disposables: "Miscellaneous",
    cartridges: "Miscellaneous",
    flower: "Miscellaneous",
    "smoke-accessories": "Miscellaneous",
  };
  if (map[catLower]) return map[catLower];

  // 3. Fallback: Automatically capitalize words for any new custom category created dynamically
  return catLower
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Smart auto-classification of product category based on product title/description keywords
 */
export function classifyCategory(name: string = "", desc: string = ""): string {
  const text = (name + " " + desc).toLowerCase().trim();

  // 1. Pets (use word boundaries so words like applicator, located, certificate do not trigger "cat")
  if (
    /\b(pet|pets|dog|dogs|cat|cats|puppy|puppies|kitten|kittens|feline|canine)\b/i.test(text)
  ) {
    return "pet";
  }

  // 2. Beverages & Drinks
  if (
    text.includes("seltzer") ||
    text.includes("beverage") ||
    text.includes("soda") ||
    text.includes("drink") ||
    text.includes("cocktail") ||
    text.includes("tonic") ||
    text.includes("lemonade") ||
    text.includes("mocktail") ||
    text.includes("sparkling water") ||
    text.includes("sparkling") ||
    text.includes("iced tea") ||
    text.includes("syrup") ||
    text.includes("shot") ||
    text.includes("shots") ||
    text.includes("elixir")
  ) {
    return "drinks";
  }

  // 3. Gummies
  if (
    text.includes("gummy") ||
    text.includes("gummies") ||
    text.includes("gummie") ||
    text.includes("cube") ||
    text.includes("cubes") ||
    text.includes("chew") ||
    text.includes("chews")
  ) {
    return "gummies";
  }

  // 4. Topicals
  if (
    text.includes("roll-on") ||
    text.includes("roll on") ||
    text.includes("cream") ||
    text.includes("creams") ||
    text.includes("salve") ||
    text.includes("balm") ||
    text.includes("lotion") ||
    text.includes("topical") ||
    text.includes("topicals") ||
    text.includes("cooling") ||
    text.includes("warming") ||
    text.includes("rub") ||
    text.includes("relief stick")
  ) {
    return "topicals";
  }

  // 5. Tinctures
  if (
    text.includes("tincture") ||
    text.includes("tinctures") ||
    text.includes("sublingual")
  ) {
    return "tinctures";
  }

  // 6. Oils
  if (
    text.includes("dropper") ||
    text.includes("oil drops") ||
    text.includes("oil drop") ||
    text.includes("cbd oil") ||
    text.includes("hemp oil") ||
    text.includes("oil")
  ) {
    return "oils";
  }

  // 7. Edibles
  if (
    text.includes("chocolate") ||
    text.includes("cereal") ||
    text.includes("bites") ||
    text.includes("bite") ||
    text.includes("mint") ||
    text.includes("mints") ||
    text.includes("candy") ||
    text.includes("candies") ||
    text.includes("brownie") ||
    text.includes("cookie") ||
    text.includes("crunch") ||
    text.includes("honey") ||
    text.includes("caramel") ||
    text.includes("caramels") ||
    text.includes("bar") ||
    text.includes("edible") ||
    text.includes("edibles") ||
    text.includes("waffle")
  ) {
    return "edibles";
  }

  // Fallback to miscellaneous for everything else (flower, vapes, etc.)
  return "miscellaneous";
}

/**
 * Canonical category alias definitions to map equivalent category IDs
 */
export const CATEGORY_FAMILIES: Record<string, string[]> = {
  drinks: ["drinks", "beverages", "drinks & seltzers", "infused beverages", "thc-drinks", "cbd-drinks", "shots-cocktails"],
  beverages: ["drinks", "beverages", "drinks & seltzers", "infused beverages", "thc-drinks", "cbd-drinks", "shots-cocktails"],
  pet: ["pet", "pets", "pet-care", "pet wellness care"],
  pets: ["pet", "pets", "pet-care", "pet wellness care"],
  topicals: ["topicals", "topical", "creams", "creams & topicals", "cbd-topicals-creams"],
  tinctures: ["tinctures", "cbd-oils", "oils & tinctures", "tinctures & oils", "cbd-oils-tinctures", "oils"],
  "cbd-oils": ["tinctures", "cbd-oils", "oils & tinctures", "tinctures & oils", "cbd-oils-tinctures", "oils"],
  oils: ["tinctures", "cbd-oils", "oils & tinctures", "tinctures & oils", "cbd-oils-tinctures", "oils"],
  gummies: [
    "gummies", "artisanal gummies", "cbd-gummies", "delta-9-gummies",
    "edibles and gummies", "edibles-and-gummies", "edibles_and_gummies", "edibles"
  ],
  edibles: [
    "edibles", "edibles and gummies", "edibles-and-gummies", "edibles_and_gummies",
    "gummies", "artisanal gummies", "cbd-gummies", "delta-9-gummies"
  ],
  "edibles-and-gummies": [
    "edibles-and-gummies", "edibles_and_gummies", "edibles and gummies",
    "edibles", "gummies", "artisanal gummies", "cbd-gummies", "delta-9-gummies"
  ],
  "edibles_and_gummies": [
    "edibles-and-gummies", "edibles_and_gummies", "edibles and gummies",
    "edibles", "gummies", "artisanal gummies", "cbd-gummies", "delta-9-gummies"
  ],
  flower: ["flower", "smoke & accessories", "pre-rolls", "preroll"],
  miscellaneous: ["miscellaneous"],
};

/**
 * Smart category match checker for filtering on Shop page.
 * Respects explicit primary category ID and explicit categories array configured by Admin,
 * ensuring unchecking a category actually removes the product from that category filter.
 */
export function matchesCategoryFilter(
  p: Product,
  targetCat: string,
  categoriesList?: CategoryItem[]
): boolean {
  if (!targetCat || targetCat === "all" || targetCat === "All Products") return true;

  const targetLower = targetCat.toLowerCase().trim();
  const pCatLower = (p.category || "").toLowerCase().trim();
  const pNameLower = (p.name || "").toLowerCase();

  // Determine the list of accepted category tokens for the target filter
  const targetFamily = CATEGORY_FAMILIES[targetLower] || [targetLower];

  // Also resolve if targetCat matches a category by title in categoriesList
  const matchedCatObj = categoriesList?.find(
    (c) => c.id.toLowerCase().trim() === targetLower || c.title.toLowerCase().trim() === targetLower
  );
  if (matchedCatObj) {
    const idLower = matchedCatObj.id.toLowerCase().trim();
    if (!targetFamily.includes(idLower)) {
      targetFamily.push(idLower);
    }
    const related = CATEGORY_FAMILIES[idLower];
    if (related) {
      related.forEach((rel) => {
        if (!targetFamily.includes(rel)) targetFamily.push(rel);
      });
    }
  }

  // 1. Direct match on primary category ID
  if (targetFamily.includes(pCatLower)) return true;

  // 2. Direct match on explicit categories array (Admin checkboxes)
  if (p.categories && Array.isArray(p.categories) && p.categories.length > 0) {
    const pCatsClean = p.categories.map((c) => (c || "").toLowerCase().trim());
    if (targetFamily.some((t) => pCatsClean.includes(t))) {
      return true;
    }
    // If the product has explicit categories set and neither primary nor secondary matches,
    // we MUST respect the admin's explicit configuration!
    return false;
  }

  // 3. Fallback heuristic for products with NO explicit categories array
  if (targetFamily.includes("pet") || targetFamily.includes("pets")) {
    return /\b(pet|pets|dog|dogs|cat|cats|puppy|kitten|canine|feline)\b/i.test(pNameLower);
  }
  if (targetFamily.includes("drinks") || targetFamily.includes("beverages")) {
    return pNameLower.includes("drink") || pNameLower.includes("seltzer") || pNameLower.includes("beverage") || pNameLower.includes("tonic") || pNameLower.includes("cocktail");
  }
  if (
    targetFamily.includes("edibles-and-gummies") ||
    targetFamily.includes("edibles_and_gummies") ||
    targetFamily.includes("gummies") ||
    targetFamily.includes("edibles")
  ) {
    return (
      pNameLower.includes("gumm") ||
      pNameLower.includes("chew") ||
      pNameLower.includes("cube") ||
      pNameLower.includes("chocolate") ||
      pNameLower.includes("bite") ||
      pNameLower.includes("cereal") ||
      pNameLower.includes("mint") ||
      pNameLower.includes("cookie") ||
      pNameLower.includes("edible")
    );
  }
  if (targetFamily.includes("topicals")) {
    return pNameLower.includes("cream") || pNameLower.includes("roll-on") || pNameLower.includes("salve") || pNameLower.includes("balm") || pNameLower.includes("lotion");
  }
  if (targetFamily.includes("tinctures") || targetFamily.includes("cbd-oils") || targetFamily.includes("oils")) {
    return pNameLower.includes("tincture") || pNameLower.includes("dropper") || pNameLower.includes("oil");
  }

  return false;
}

export function getCleanCategoryImage(catId: string, customImage?: string): string {
  if (customImage && !customImage.startsWith("data:")) {
    const normalized = normalizeToCleanAsset(customImage);
    if (normalized) return normalized;
    return customImage;
  }
  const cleanMapping: Record<string, string> = {
    drinks: "/images/category-drinks.jpg",
    tinctures: "/images/category-tinctures.jpg",
    topicals: "/images/category-topicals.jpg",
    gummies: "/images/category-gummies.jpg",
    edibles: "/images/category-edibles.jpg",
    "edibles-and-gummies": "/images/category-edibles.jpg",
    "edibles_and_gummies": "/images/category-edibles.jpg",
    pet: "/images/category-pet.jpg",
    miscellaneous: "/images/thc_gummies_pack_1779557751523.png",
  };
  return cleanMapping[catId.toLowerCase()] || customImage || "/images/category-drinks.jpg";
}
