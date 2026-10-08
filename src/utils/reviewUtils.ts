import { Product, ReviewItem } from "../types";
import { cleanUnicodeString, normalizeTitleForMatching } from "./textSanitizer";

export const BUILTIN_REVIEW_TEMPLATES = [
  {
    author: "Jessica Albright",
    rating: 5,
    title: "Tastes like real natural fruit juices!",
    comment: "Unlike other brands that leave a chemical sugar aftertaste, this formula tastes amazingly clean and pure. Gentle yet highly effective.",
    date: "May 25, 2026",
    verified: true,
  },
  {
    author: "Dr. Ethan Brooks",
    rating: 5,
    title: "Superior therapeutic & somatic relaxation quality",
    comment: "The purity rating and transparent lab certificates speak for themselves. Absorbs amazingly well with clean natural terpenes.",
    date: "May 28, 2026",
    verified: true,
  },
  {
    author: "Marcus Ramirez",
    rating: 4,
    title: "Great daytime focus and calm",
    comment: "I take this in the morning with my coffee. It helps stabilize my focus through long meetings without any midday drowsiness.",
    date: "May 14, 2026",
    verified: true,
  },
  {
    author: "Charlotte K.",
    rating: 5,
    title: "Noticeable improvement within days!",
    comment: "Incredibly appetizing and easy to consume. Truly a top-tier organic formulation crafted with Texas state standards.",
    date: "May 22, 2026",
    verified: true,
  },
  {
    author: "Arthur Pendelton",
    rating: 5,
    title: "Fast-acting relief rescue",
    comment: "I use this directly after long active workouts. Non-greasy, refreshing, and works within ten minutes.",
    date: "May 27, 2026",
    verified: true,
  },
  {
    author: "Grace Montgomery",
    rating: 5,
    title: "Absolute skin & body savior salve",
    comment: "Smells clean and works wonders on tension points. Essential addition to my post-shower wellness routine.",
    date: "May 19, 2026",
    verified: true,
  },
  {
    author: "Devon M.",
    rating: 5,
    title: "Highly recommended therapeutic quality",
    comment: "Excellent premium texture & unmatched purity. This completely transformed my evening recovery routine. Absolutely worth every dollar.",
    date: "May 18, 2026",
    verified: true,
  },
  {
    author: "Sarah G.",
    rating: 5,
    title: "Incredible potency & crisp taste!",
    comment: "We have tried numerous local and regional brands around the state, but this formulation delivers exactly what is advertised. Pure natural relief!",
    date: "May 10, 2026",
    verified: true,
  },
  {
    author: "Samantha Wright",
    rating: 5,
    title: "The ultimate non-alcoholic refreshment",
    comment: "The botanical blend is simply outstanding. It feels incredibly refreshing in a chilled glass, completely relaxing without any negative side effects.",
    date: "May 29, 2026",
    verified: true,
  },
  {
    author: "Dustin Green",
    rating: 5,
    title: "Extremely clean harvest & dense quality",
    comment: "Beautifully cured with glowing golden trichomes and rich organic scent. Smells incredible and delivers smooth calming properties.",
    date: "May 26, 2026",
    verified: true,
  },
  {
    author: "Melissa Vance",
    rating: 5,
    title: "Nighttime game changer",
    comment: "I have been using this 30 minutes before sleep. Deep, uninterrupted rest and zero grogginess the next morning!",
    date: "May 20, 2026",
    verified: true,
  },
  {
    author: "Brandon Lee",
    rating: 5,
    title: "Anxiety reducer during Texas storms",
    comment: "Soothes so quickly, and we love that these are organically crafted in Texas. Highly recommended for daily wellness.",
    date: "May 08, 2026",
    verified: true,
  }
];

import { CLIENT_REVIEWS } from "../clientReviews";

/**
 * Generates initial built-in product reviews for every product in the store catalog.
 * Prioritizes authentic client-provided reviews for catalog items!
 */
export const generateInitialReviewsForProducts = (products: Product[]): ReviewItem[] => {
  const result: ReviewItem[] = [...CLIENT_REVIEWS];
  const coveredProdIds = new Set(CLIENT_REVIEWS.map((r) => String(r.productId)));
  const coveredProdNames = new Set(CLIENT_REVIEWS.map((r) => (r.productName || "").toLowerCase().trim()));

  (products || []).forEach((prod, pIdx) => {
    const pId = String(prod.id);
    const pName = prod.name.toLowerCase().trim();

    // If product already has client-provided reviews, don't generate synthetic ones
    if (coveredProdIds.has(pId) || coveredProdNames.has(pName)) return;

    const count = 3 + (pIdx % 2); // 3 to 4 reviews per product
    for (let i = 0; i < count; i++) {
      const templateIdx = (pIdx * 3 + i) % BUILTIN_REVIEW_TEMPLATES.length;
      const tmpl = BUILTIN_REVIEW_TEMPLATES[templateIdx];
      
      result.push({
        id: `seed-rev-${prod.id}-${i + 1}`,
        productId: prod.id,
        productName: prod.name,
        author: tmpl.author,
        rating: tmpl.rating,
        title: tmpl.title,
        comment: tmpl.comment,
        date: tmpl.date,
        status: "approved",
        verified: tmpl.verified,
        created_at: new Date(Date.now() - (pIdx * 3600000 + i * 1800000)).toISOString(),
      });
    }
  });

  return result;
};

/**
 * Parses raw CSV or JSON text and matches product reviews to products by Product Name or Product ID.
 * Supports adding multiple reviews per product in a single bulk file.
 */
export const parseBulkReviewsCSV = (text: string, products: Product[]): ReviewItem[] => {
  const result: ReviewItem[] = [];
  if (!text || !text.trim()) return result;

  const trimmed = text.trim();

  // 1. JSON Array Parsing
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const jsonVal = JSON.parse(trimmed);
      const list = Array.isArray(jsonVal) ? jsonVal : [jsonVal];
      
      list.forEach((item: any, i: number) => {
        const prodVal = (item.productName || item.product_name || item.productId || item.product_id || item.product || "").trim();
        const matchedProd = (products || []).find(
          (p) => p.name.toLowerCase().trim() === prodVal.toLowerCase() ||
                 p.id.toLowerCase().trim() === prodVal.toLowerCase() ||
                 p.name.toLowerCase().includes(prodVal.toLowerCase())
        );

        result.push({
          id: item.id ? String(item.id) : `rev-bulk-${Date.now()}-${i + 1}`,
          productId: matchedProd ? matchedProd.id : (item.productId || item.product_id || products[0]?.id || "p1"),
          productName: matchedProd ? matchedProd.name : (prodVal || "Customer Product Review"),
          author: item.author || item.name || item.reviewer || "Verified Client",
          rating: Number(item.rating) || 5,
          title: item.title || item.headline || "",
          comment: item.comment || item.review || item.text || "Great quality organic product!",
          date: item.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          status: item.status || "approved",
          verified: item.verified ?? true,
          created_at: new Date().toISOString(),
        });
      });

      return result;
    } catch (e) {}
  }

  // 2. CSV Parser
  const parseCSVRows = (csvStr: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let insideQuote = false;

    for (let i = 0; i < csvStr.length; i++) {
      const char = csvStr[i];
      const nextChar = csvStr[i + 1];

      if (char === '"') {
        if (insideQuote && nextChar === '"') {
          cell += '"';
          i++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === "," && !insideQuote) {
        row.push(cell.trim());
        cell = "";
      } else if ((char === "\r" || char === "\n") && !insideQuote) {
        if (char === "\r" && nextChar === "\n") i++;
        row.push(cell.trim());
        if (row.some(c => c.length > 0)) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
    if (cell || row.length > 0) {
      row.push(cell.trim());
      if (row.some(c => c.length > 0)) rows.push(row);
    }
    return rows;
  };

  const parsedRows = parseCSVRows(trimmed);
  if (parsedRows.length < 2) return result;

  const headers = parsedRows[0].map((h) => h.replace(/['"]+/g, "").trim().toLowerCase());

  const prodIdx = headers.findIndex((h) => h.includes("product name") || h.includes("product_name") || h.includes("formula") || (h.includes("product") && !h.includes("id")));
  const authorIdx = headers.findIndex((h) => h.includes("reviewer") || h.includes("author") || h.includes("user") || (h.includes("name") && !h.includes("product")));
  const ratingIdx = headers.findIndex((h) => h.includes("rating") || h.includes("star") || h.includes("score"));
  const titleIdx = headers.findIndex((h) => h.includes("title") || h.includes("headline") || h.includes("header"));
  const commentIdx = headers.findIndex((h) => h.includes("comment") || h.includes("review text") || h.includes("detailed") || h.includes("text") || h.includes("body"));
  const dateIdx = headers.findIndex((h) => h.includes("date"));
  const prodIdIdx = headers.findIndex((h) => h.includes("product id") || h.includes("product_id") || h.includes("sku"));
  const revIdIdx = headers.findIndex((h) => h.includes("review id") || h.includes("review_id"));

  for (let i = 1; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    if (row.length < 1) continue;

    const prodVal = prodIdx !== -1 ? row[prodIdx] : "";
    const prodIdVal = prodIdIdx !== -1 ? row[prodIdIdx] : "";
    const revIdVal = revIdIdx !== -1 ? row[revIdIdx] : "";
    const author = authorIdx !== -1 ? row[authorIdx] : "Verified Client";
    const comment = commentIdx !== -1 ? row[commentIdx] : (row[1] || "Authentic quality.");
    if (!author.trim() && !comment.trim()) continue;

    let matchedProd: Product | undefined;
    if (prodIdVal.trim()) {
      matchedProd = (products || []).find((p) => String(p.id).toLowerCase().trim() === prodIdVal.toLowerCase().trim());
    }
    if (!matchedProd && prodVal.trim()) {
      const queryLower = prodVal.toLowerCase().trim();
      matchedProd = (products || []).find(
        (p) => p.name.toLowerCase().trim() === queryLower ||
               p.id.toLowerCase().trim() === queryLower ||
               p.name.toLowerCase().includes(queryLower)
      );
    }

    const finalProdId = matchedProd ? matchedProd.id : (prodIdVal || prodVal || products[0]?.id || "p1");
    const finalProdName = matchedProd ? matchedProd.name : (prodVal || "Customer Product Review");
    const finalRevId = revIdVal.trim() || `rev-bulk-${Date.now()}-${i}`;

    result.push({
      id: finalRevId,
      productId: finalProdId,
      productName: finalProdName,
      author: author.trim() || "Verified Customer",
      name: author.trim() || "Verified Customer",
      rating: ratingIdx !== -1 ? Number(row[ratingIdx]) || 5 : 5,
      title: titleIdx !== -1 ? row[titleIdx] : "",
      comment: comment.trim() || "Great organic formula!",
      date: dateIdx !== -1 && row[dateIdx] ? row[dateIdx] : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: "approved",
      verified: true,
      created_at: new Date().toISOString(),
    });
  }

  return result;
};

/**
 * Filters out reviews for products that no longer exist in the active store catalog.
 */
export const filterActiveProductReviews = (reviews: ReviewItem[], products: Product[]): ReviewItem[] => {
  if (!Array.isArray(reviews) || !Array.isArray(products) || products.length === 0) return reviews || [];

  const activeProductIds = new Set(products.map((p) => String(p.id)));
  const activeProductNormalizedNames = new Set(products.map((p) => normalizeTitleForMatching(p.name)));

  return reviews.filter((r) => {
    if (!r) return false;
    const rId = String(r.productId || "");
    const rNormName = normalizeTitleForMatching(r.productName || "");

    return activeProductIds.has(rId) || (rNormName && activeProductNormalizedNames.has(rNormName));
  });
};

/**
 * Gets reviews belonging to a specific product by matching both productId and productName.
 */
export const getReviewsForProduct = (reviews: ReviewItem[], product: Product | null): ReviewItem[] => {
  if (!product || !Array.isArray(reviews)) return [];

  const targetId = String(product.id);
  const targetNormName = normalizeTitleForMatching(product.name);

  return reviews.filter((r) => {
    if (!r) return false;
    const rId = String(r.productId || "");
    const rNormName = normalizeTitleForMatching(r.productName || "");

    return rId === targetId || (targetNormName && rNormName && targetNormName === rNormName);
  });
};
