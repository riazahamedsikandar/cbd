import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, 
  Star, 
  Check, 
  ShieldCheck, 
  HeartPulse, 
  Sparkles, 
  ShoppingCart, 
  Info, 
  MessageSquare, 
  FileText, 
  Plus, 
  User, 
  Calendar, 
  ThumbsUp, 
  CheckCircle,
  HelpCircle,
  Package,
  Award
} from "lucide-react";
import { Product, CategoryItem } from "../types";
import { DEFAULT_CATEGORIES } from "../data";
import { safeSetItem, isSupabaseConfigured, syncToSupabase } from "../utils/supabaseClient";
import { getCategoryFallbackImage, handleImageError, normalizeToCleanAsset } from "../utils/imageMatching";
import { parseAndRenderSeoLinks } from "../utils/seoLinkParser";
import { getCategoryLabel, matchesCategoryFilter } from "../utils/categoryUtils";

interface ProductDetailProps {
  product: Product | null;
  onBackToShop: () => void;
  onAddToCart: (product: Product, option: string, quantity: number) => void;
  allProducts: Product[];
  onSelectProduct: (product: Product) => void;
  setView: (view: string) => void;
  setSelectedCategory?: (category: string) => void;
  categoriesList?: CategoryItem[];
}

interface ReviewItem {
  id: string;
  name: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  verified: boolean;
}

export default function ProductDetail({
  product,
  onBackToShop,
  onAddToCart,
  allProducts,
  onSelectProduct,
  setView,
  setSelectedCategory,
  categoriesList,
}: ProductDetailProps) {
  const [selectedOption, setSelectedOption] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"desc" | "reviews">("desc");
  const [addedMessage, setAddedMessage] = useState(false);
  const reviewsEndRef = useRef<HTMLDivElement>(null);

  // New review form states
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>([]);

  const getDisplayCategory = (): { id: string; title: string } => {
    if (!product) return { id: "all", title: "Products" };
    const allCats = categoriesList && categoriesList.length > 0 ? categoriesList : DEFAULT_CATEGORIES;
    const cat = (product.category || "").toLowerCase().trim();

    // 1. Direct match by product.category ID or Title in active categories
    if (cat) {
      const foundCat = allCats.find(
        (c) => c.id.toLowerCase().trim() === cat || c.title.toLowerCase().trim() === cat
      );
      if (foundCat) return { id: foundCat.id, title: foundCat.title };
    }

    // 2. Check product.categories multi-category array for any active category match
    if (Array.isArray(product.categories) && product.categories.length > 0) {
      for (const altCatId of product.categories) {
        const altLower = (altCatId || "").toLowerCase().trim();
        const foundAlt = allCats.find(
          (c) => c.id.toLowerCase().trim() === altLower || c.title.toLowerCase().trim() === altLower
        );
        if (foundAlt) return { id: foundAlt.id, title: foundAlt.title };
      }
    }

    // 3. Match against active category tabs using matchesCategoryFilter (Exact Shop Match!)
    for (const c of allCats) {
      if (matchesCategoryFilter(product, c.id, allCats)) {
        return { id: c.id, title: c.title };
      }
    }

    // 4. Match against product.categoryLabel
    if (product.categoryLabel) {
      const labelLower = product.categoryLabel.toLowerCase().trim();
      const foundByLabel = allCats.find(
        (c) => c.id.toLowerCase().trim() === labelLower || c.title.toLowerCase().trim() === labelLower
      );
      if (foundByLabel) return { id: foundByLabel.id, title: foundByLabel.title };
      return { id: cat || "all", title: product.categoryLabel };
    }

    // 5. Keyword heuristic fallback based on product properties
    const pNameLower = (product.name || "").toLowerCase();
    if (cat.includes("gumm") || cat.includes("edible") || pNameLower.includes("gumm") || pNameLower.includes("chew")) {
      const gummCat = allCats.find((c) =>
        c.id.toLowerCase().includes("gumm") ||
        c.id.toLowerCase().includes("edible") ||
        c.title.toLowerCase().includes("gumm") ||
        c.title.toLowerCase().includes("edible")
      );
      if (gummCat) return { id: gummCat.id, title: gummCat.title };
      return { id: "gummies", title: "Edibles and Gummies" };
    }
    if (cat.includes("drink") || cat.includes("beverage") || pNameLower.includes("drink") || pNameLower.includes("seltzer")) {
      const drinkCat = allCats.find((c) => c.id.toLowerCase().includes("drink") || c.title.toLowerCase().includes("drink"));
      if (drinkCat) return { id: drinkCat.id, title: drinkCat.title };
      return { id: "drinks", title: "Drinks" };
    }
    if (cat.includes("topical") || cat.includes("cream") || pNameLower.includes("cream") || pNameLower.includes("salve") || pNameLower.includes("roll-on")) {
      const topCat = allCats.find((c) => c.id.toLowerCase().includes("topical") || c.title.toLowerCase().includes("topical"));
      if (topCat) return { id: topCat.id, title: topCat.title };
      return { id: "topicals", title: "Topicals" };
    }
    if (cat.includes("tincture") || cat.includes("oil") || pNameLower.includes("tincture") || pNameLower.includes("dropper")) {
      const tincCat = allCats.find((c) => c.id.toLowerCase().includes("tincture") || c.id.toLowerCase().includes("oil") || c.title.toLowerCase().includes("tincture") || c.title.toLowerCase().includes("oil"));
      if (tincCat) return { id: tincCat.id, title: tincCat.title };
      return { id: "tinctures", title: "Tinctures" };
    }
    if (cat.includes("pet") || pNameLower.includes("dog") || pNameLower.includes("cat") || pNameLower.includes("pet")) {
      const petCat = allCats.find((c) => c.id.toLowerCase().includes("pet") || c.title.toLowerCase().includes("pet"));
      if (petCat) return { id: petCat.id, title: petCat.title };
      return { id: "pet", title: "Pet" };
    }

    return { id: "all", title: "Products" };
  };

  const getDisplayCategoryLabel = () => getDisplayCategory().title;

  if (!product) {
    return (
      <div className="py-20 px-4 text-center max-w-xl mx-auto font-sans text-[#5b6b55]">
        <Package className="w-12 h-12 mx-auto text-[#3b142e] mb-4 stroke-1" />
        <h2 className="text-xl font-bold text-[#2c3527]">Product Not Selected</h2>
        <p className="text-xs text-[#72856a] mt-2">
          Choose a premium organic formula from our online catalog list.
        </p>
        <button
          onClick={onBackToShop}
          className="mt-6 px-6 py-2.5 bg-[#3b142e] hover:bg-[#5d2a49] text-white text-xs uppercase font-extrabold rounded-xl transition-all shadow cursor-pointer mx-auto block"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  // Get default seeded reviews by product category & id
  const getSeededReviews = (prod: Product): ReviewItem[] => {
    const pId = prod.id;
    const cat = prod.category;
    
    const general = [
      {
        id: "seed-1",
        name: "Devon M.",
        rating: 5,
        title: "Highly recommended therapeutic quality",
        comment: `Excellent premium texture & unmatched purity. This completely transformed my evening recovery routine. Absolutely worth every single dollar.`,
        date: "May 18, 2026",
        verified: true,
      },
      {
        id: "seed-2",
        name: "Sarah G.",
        rating: 5,
        title: "Incredible potency & taste!",
        comment: `We have tried numerous local and regional brands around the state, but this formulation delivers exactly what is advertised. Pure natural relief!`,
        date: "May 10, 2026",
        verified: true,
      }
    ];

    if (cat === "gummies") {
      return [
        {
          id: `${pId}-rev-1`,
          name: "Jessica Albright",
          rating: 5,
          title: "Tastes like real natural fruit juices!",
          comment: `Unlike other brands that leave a chemical sugar aftertaste, these gummies taste amazingly clean and pure. The dosage is gentle yet highly effective.`,
          date: "May 25, 2026",
          verified: true,
        },
        {
          id: `${pId}-rev-2`,
          name: "Marcus Ramirez",
          rating: 4,
          title: "Great daytime focus and calm",
          comment: `I take half a gummy in the morning with my coffee. It helps stabilize my focus through long meetings without any midday drowsiness.`,
          date: "May 14, 2026",
          verified: true,
        },
        ...general
      ];
    } else if (cat === "cbd-oils") {
      return [
        {
          id: `${pId}-rev-1`,
          name: "Dr. Ethan Brooks",
          rating: 5,
          title: "Superior somatic relaxation quality",
          comment: `The purity rating and lab certificates speak for themselves. The mint or natural terpene taste is pleasant and it absorbs amazingly well.`,
          date: "May 28, 2026",
          verified: true,
        },
        {
          id: `${pId}-rev-2`,
          name: "Melissa Vance",
          rating: 5,
          title: "Nighttime game changer",
          comment: `I have been putting a dropper under my tongue 30 minutes before sleep. Deep, uninterrupted rest and zero grogginess the next morning!`,
          date: "May 20, 2026",
          verified: true,
        },
        ...general
      ];
    } else if (cat === "pets") {
      return [
        {
          id: `${pId}-rev-1`,
          name: "Charlotte K.",
          rating: 5,
          title: "My elder cat is moving around so much better!",
          comment: `The salmon flavored oil drops are incredibly appetizing for my senior rescue feline. She purrs every time I add a tiny drop directly into her wet food.`,
          date: "May 22, 2026",
          verified: true,
        },
        {
          id: `${pId}-rev-2`,
          name: "Brandon Lee",
          rating: 5,
          title: "Anxiety reducer during Texas storms",
          comment: `Our pup gets extremely terrified of thunder. These treats soothe him so quickly, and we love that they are organically made in Texas state.`,
          date: "May 08, 2026",
          verified: true,
        },
        ...general
      ];
    } else if (cat === "beverages") {
      return [
        {
          id: `${pId}-rev-1`,
          name: "Samantha Wright",
          rating: 5,
          title: "The ultimate non-alcoholic cocktail",
          comment: `The botanical blend is simply outstanding. It feels incredibly refreshing in a chilled glass, completely relaxing without any of the negative alcohol side effects.`,
          date: "May 29, 2026",
          verified: true,
        },
        {
          id: `${pId}-rev-2`,
          name: "Preston Cole",
          rating: 5,
          title: "Incredibly crisp flavor profile",
          comment: `Bubbly, refreshing, and clean active ingredients list. Replaced my evening wine with this and I have never felt more refreshed.`,
          date: "May 15, 2026",
          verified: true,
        },
        ...general
      ];
    } else if (cat === "flower") {
      return [
        {
          id: `${pId}-rev-1`,
          name: "Dustin Green",
          rating: 5,
          title: "Extremely clean trim and dense buds",
          comment: `Beautifully cured with glowing golden trichomes and rich organic scent. It smells incredible and burns exceptionally clean.`,
          date: "May 26, 2026",
          verified: true,
        },
        {
          id: `${pId}-rev-2`,
          name: "Elena H.",
          rating: 4,
          title: "Fantastic smooth pre-rolls",
          comment: `Very tight roll and slow clean burn. Excellent aroma and quick calming properties. Highly professional harvest quality.`,
          date: "May 12, 2026",
          verified: true,
        },
        ...general
      ];
    } else {
      return [
        {
          id: `${pId}-rev-1`,
          name: "Arthur Pendelton",
          rating: 5,
          title: "Fast-acting topical muscle rescue",
          comment: `I massage this soothing balm directly into my knee joints after long active workouts. Non-greasy, and works within ten minutes.`,
          date: "May 27, 2026",
          verified: true,
        },
        {
          id: `${pId}-rev-2`,
          name: "Grace Montgomery",
          rating: 5,
          title: "Absolute skin savior salve",
          comment: `Smells clean and works wonders on dry areas and tension points. Essential addition to my post-shower wellness routine.`,
          date: "May 19, 2026",
          verified: true,
        },
        ...general
      ];
    }
  };

  // Load reviews on product load
  useEffect(() => {
    setSelectedOption(product.options[0] || "Standard Pack");
    setQuantity(1);
    setFeedbackMsg("");
    
    // Check for global reviews from Admin Panel or database
    let globalMatched: any[] = [];
    const globalSaved = localStorage.getItem("twobudz_reviews");
    if (globalSaved) {
      try {
        const parsed = JSON.parse(globalSaved);
        if (Array.isArray(parsed)) {
          const targetId = String(product.id);
          const targetName = product.name.toLowerCase().trim();
          globalMatched = parsed.filter((r) => {
            if (!r) return false;
            const rId = String(r.productId || "");
            const rName = (r.productName || "").toLowerCase().trim();
            return rId === targetId || (rName && rName === targetName);
          });
        }
      } catch (e) {}
    }

    if (globalMatched.length > 0) {
      setReviewsList(globalMatched);
    } else {
      const seeded = getSeededReviews(product);
      setReviewsList(seeded);
    }
  }, [product]);

  // Set selected packaging
  const currentOption = selectedOption || product.options[0] || "Standard Pack";

  // Calculate price dynamically based on chosen option multiplier
  const getModifiedPrice = () => {
    let base = Number(product.price) || 0;
    if (currentOption.includes("Double Pack") || currentOption.includes("30 Gummies") || currentOption.includes("7 Grams")) {
      return base * 1.7; // 30% discount on second
    } else if (currentOption.includes("14 Grams") || currentOption.includes("4000mg") || currentOption.includes("Value Pack")) {
      return base * 3.2; // heavy discount bulk
    }
    return base;
  };

  const modifiedPrice = getModifiedPrice();

  const handleQtyChange = (val: number) => {
    if (val < 1) return;
    setQuantity(val);
  };

  const handleAdd = () => {
    onAddToCart(product, currentOption, quantity);
    setAddedMessage(true);
    setTimeout(() => setAddedMessage(false), 3000);
  };

  // Submit dynamic review
  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) {
      setFeedbackMsg("Please complete your screen name and review comment text.");
      return;
    }

    const reviewId = `user-rev-${Date.now()}`;
    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });

    const newReview: any = {
      id: reviewId,
      productId: product.id,
      productName: product.name,
      author: reviewName.trim(),
      name: reviewName.trim(),
      rating: reviewRating,
      title: reviewTitle.trim() || `${reviewRating} Star Organic Formulation`,
      comment: reviewComment.trim(),
      date: dateStr,
      verified: true
    };

    const updated = [newReview, ...reviewsList];
    setReviewsList(updated);
    safeSetItem(`twobudz_reviews_${product.id}`, JSON.stringify(updated));

    // Save to global twobudz_reviews
    try {
      const globalSaved = localStorage.getItem("twobudz_reviews");
      let globalList: any[] = [];
      if (globalSaved) globalList = JSON.parse(globalSaved);
      globalList.unshift(newReview);
      safeSetItem("twobudz_reviews", JSON.stringify(globalList));
    } catch (e) {}

    // Sync to Supabase if configured
    if (isSupabaseConfigured()) {
      syncToSupabase("reviews", "upsert", {
        id: reviewId,
        productId: product.id,
        productName: product.name,
        author: reviewName.trim(),
        rating: reviewRating,
        title: reviewTitle.trim() || `${reviewRating} Star Organic Formulation`,
        comment: reviewComment.trim(),
        date: dateStr,
        status: "approved",
        verified: true,
        created_at: new Date().toISOString(),
      });
    }

    // Clear form
    setReviewName("");
    setReviewTitle("");
    setReviewComment("");
    setReviewRating(5);
    setFeedbackMsg("Thank you! Your verified product review has been submitted and loaded in real time.");
    
    // Optional: auto scroll to reviews list top
    setTimeout(() => {
      reviewsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 200);
  };

  // Generate related products matching same category (limiting to 4)
  const relatedProducts = allProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  // Calculate dynamic stats
  const averageSubRating = (reviewsList && reviewsList.length > 0) 
    ? (reviewsList.reduce((acc, r) => acc + (Number(r?.rating) || 5), 0) / reviewsList.length)
    : (Number(product.rating) || 5.0);

  const countRatings = (stars: number) => {
    return reviewsList.filter((r) => r.rating === stars).length;
  };

  const getPercentageDistribution = (stars: number) => {
    if (reviewsList.length === 0) return 0;
    return Math.round((countRatings(stars) / reviewsList.length) * 100);
  };

  return (
    <div className="bg-[#fcfdfa] min-h-screen text-[#5b6b55] pb-24 animate-fadeIn font-sans">
      
      {/* 1. Breadcrumbs Nav */}
      <div className="border-b border-[#e1e8db] bg-[#f7f9f4] py-3.5 px-4 sm:px-6 lg:px-8 text-[11px] font-mono font-bold uppercase tracking-wider text-[#72856a]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button 
            onClick={() => setView("home")} 
            className="hover:text-[#3b142e] cursor-pointer transition-colors"
          >
            Home
          </button>
          <span>/</span>
          <button 
            onClick={() => setView("shop")} 
            className="hover:text-[#3b142e] cursor-pointer transition-colors"
          >
            Shop
          </button>
          <span>/</span>
          <button
            onClick={() => {
              const activeCat = getDisplayCategory();
              if (setSelectedCategory) {
                setSelectedCategory(activeCat.id || "all");
              }
              setView("shop");
            }}
            className="hover:text-[#3b142e] cursor-pointer transition-colors text-[#72856a]"
          >
            {getDisplayCategory().title}
          </button>
          <span>/</span>
          <span className="text-[#2c3527] truncate font-sans max-w-[140px] sm:max-w-xs lowercase font-bold">{product.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        
        {/* 2. Sleek Back Button */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={onBackToShop}
            className="group inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#e1e8db] hover:border-[#3b142e] hover:bg-[#edf2e8] text-[#2c3527] hover:text-[#3b142e] text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            <span>Back</span>
          </button>
        </div>

        {/* 3. Product Display Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-8 lg:gap-12 bg-white border border-[#e1e8db] rounded-2xl p-4 sm:p-6 lg:p-10 shadow-xs overflow-hidden mb-12">
          
          {/* Left Side: Product Gallery (Col 5) */}
          <div className="md:col-span-5 lg:col-span-5 bg-gradient-to-b from-[#fdfefe] to-[#f4f7f1] border border-[#e1e8db] rounded-2xl p-4 sm:p-8 flex flex-col justify-between items-center relative min-h-[300px] sm:min-h-[380px] lg:min-h-[440px]">
            {/* Centralized image frame with max-height controls per viewport */}
            <div className="w-full flex-grow flex items-center justify-center py-4 relative z-0">
              <img
                src={normalizeToCleanAsset(product.image, product.category, product.name)}
                alt={product.name}
                loading="eager"
                className="max-h-[180px] sm:max-h-[240px] md:max-h-[220px] lg:max-h-[300px] object-contain transition-all duration-300"
                onError={(e) => handleImageError(e, product.category)}
              />
            </div>


          </div>

          {/* Right Side: Product Details & Buying Section (Col 7) */}
          <div className="md:col-span-7 lg:col-span-7 flex flex-col justify-between pt-2">
            <div className="space-y-5 sm:space-y-6">
              
              {/* Product Metadata */}
              <div className="space-y-2.5 pb-4 border-b border-[#edf2e8]">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-black text-[#2c3527] leading-tight mt-1">
                  {product.name}
                </h1>

                {/* Star rating alignment with responsive wraps */}
                <div className="flex gap-3 items-center flex-wrap pt-0.5">
                  <div className="flex gap-0.5 items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < Math.floor(averageSubRating)
                            ? "fill-[#dfb035] text-[#dfb035]"
                            : "text-[#e1e8db]"
                        }`}
                      />
                    ))}
                    <span className="text-xs font-mono font-bold text-[#2c3527] ml-1.5 pt-0.5">
                      {(Number(averageSubRating) || 5.0).toFixed(1)}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("reviews");
                      const el = document.getElementById("product-info-tabs-section");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="text-[#3b142e] text-xs font-semibold hover:underline cursor-pointer transition-all"
                  >
                    ({reviewsList.length} Verified Reviews)
                  </button>
                </div>
              </div>

              {/* Pricing breakdown block - beautifully responsive fallback columns on mobile */}
              <div className="bg-[#f7f9f4] border border-[#e1e8db] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <span className="text-[9px] font-mono text-[#72856a] uppercase font-bold block mb-0.5">
                    Estimated Price:
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-[#2c3527] font-mono">
                      ${(Number(modifiedPrice * quantity) || 0).toFixed(2)}
                    </span>
                    {quantity > 1 && (
                      <span className="text-[#72856a] text-xs font-mono">
                        (${(Number(modifiedPrice) || 0).toFixed(2)} each)
                      </span>
                    )}
                  </div>
                </div>
                {currentOption.includes("Pack") && (
                  <span className="self-start sm:self-auto bg-[#3b142e]/15 border border-[#3b142e]/30 text-[#3b142e] text-[9px] font-mono font-bold px-2.5 py-1.5 rounded-lg uppercase tracking-wider">
                    30% Discount Bundle
                  </span>
                )}
              </div>

              {/* Description block */}
              <div className="text-xs sm:text-sm text-[#5b6b55] leading-relaxed whitespace-pre-line">
                <div className="italic border-l-2 border-[#3b142e]/40 pl-3">
                  "{parseAndRenderSeoLinks(product.description)}"
                </div>
              </div>

              {/* Variant Packaging selection chips */}
              <div className="space-y-2.5">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#72856a] font-black block">
                  Choose Variant / Size:
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSelectedOption(opt)}
                      className={`px-3 py-2.5 rounded-xl text-[10px] sm:text-xs uppercase tracking-wider transition-all border font-bold min-h-[40px] flex items-center justify-center cursor-pointer ${
                        currentOption === opt
                          ? "bg-[#3b142e] border-[#3b142e] text-white shadow-xs"
                          : "bg-white border-[#e1e8db] hover:border-[#3b142e] text-[#72856a] hover:bg-[#edf2e8]"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid aligned Buy Section avoiding mobile overlapping issues */}
              <div className="grid grid-cols-12 gap-3 pt-4 border-t border-[#edf2e8] items-stretch">
                {/* Quantity stepper (Col 4 on mobile, Col 3 on lg) */}
                <div className="col-span-4 sm:col-span-3 h-12 flex items-center justify-between bg-[#f7f9f4] border border-[#e1e8db] rounded-xl px-1 sm:px-2">
                  <button
                    onClick={() => handleQtyChange(quantity - 1)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold font-mono text-[#72856a] hover:text-[#2c3527] hover:bg-[#edf2e8] transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <span className="flex-grow text-center font-bold font-mono text-[#2c3527] text-xs sm:text-sm">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQtyChange(quantity + 1)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold font-mono text-[#3b142e] hover:bg-[#3b142e]/15 transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Add to Shopping Bag button (Col 8 on mobile, Col 9 on lg) */}
                <button
                  onClick={handleAdd}
                  className="col-span-8 sm:col-span-9 h-12 rounded-xl bg-[#3b142e] hover:bg-[#5d2a49] text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer border-0"
                >
                  <ShoppingCart className="w-4 h-4 text-white" />
                  <span className="truncate">Add to Shopping Bag</span>
                </button>
              </div>

              {/* Dynamic Added notification */}
              {addedMessage && (
                <div className="p-3 text-xs text-[#2c3527] bg-[#edf2e8] border border-[#3b142e]/30 rounded-xl flex items-center gap-2 animate-fadeIn font-mono font-bold">
                  <CheckCircle className="w-4 h-4 text-[#3b142e] shrink-0" />
                  <span className="leading-tight">Added {quantity} unit(s) of "{product.name} ({currentOption})" into your bag!</span>
                </div>
              )}

              {/* Trust assurances block */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono tracking-wide uppercase pt-4 border-t border-[#edf2e8] text-[#72856a]">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#3b142e] shrink-0" />
                  <span>Ships Same Day before 2:00 PM CST</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#3b142e] shrink-0" />
                  <span>Free Texas State Shipping over $60</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#3b142e] shrink-0" />
                  <span>Organically Cultivated Crop</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#3b142e] shrink-0" />
                  <span>Solvent-Free Pure Extraction</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* 4. Tabbed detailed Panels with horizontal scrolling on mobile */}
        <div id="product-info-tabs-section" className="bg-white border border-[#e1e8db] rounded-2xl p-4 sm:p-8 shadow-xs mb-12 overflow-hidden">
          
          {/* Tab selectors with horizontal slider on small screens */}
          <div className="flex flex-nowrap overflow-x-auto border-b border-[#edf2e8] text-[10px] sm:text-xs uppercase tracking-widest font-black mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 gap-1 sm:gap-4 scrollbar-none">
            <button
              onClick={() => setActiveTab("desc")}
              className={`pb-3.5 px-2.5 sm:px-1 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "desc"
                  ? "text-[#3b142e] border-[#3b142e] font-black"
                  : "text-[#72856a] hover:text-[#2c3527] border-transparent"
              }`}
            >
              Description & Benefits
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`pb-3.5 px-2.5 sm:px-1 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "reviews"
                  ? "text-[#3b142e] border-[#3b142e] font-black"
                  : "text-[#72856a] hover:text-[#2c3527] border-transparent"
              }`}
            >
              Reviews ({reviewsList.length})
            </button>
          </div>

          {/* Active rendering panel container */}
          <div className="text-xs sm:text-sm leading-relaxed text-[#5b6b55] font-sans min-h-[160px]">
            
            {/* Description Spec Tab */}
            {activeTab === "desc" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="text-xs sm:text-sm text-[#5b6b55] leading-relaxed whitespace-pre-line">
                  {parseAndRenderSeoLinks(product.longDescription)}
                </div>
                {product.benefits && product.benefits.filter((b) => b && b.trim()).length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#72856a] block mb-3">
                      Highlighted Key Formula Benefits:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {product.benefits
                        .filter((benefit) => benefit && benefit.trim())
                        .map((benefit, i) => {
                          const cleanBenefit = benefit.replace(/^[•✓✔➢▶\-\*]+[•✓✔➢▶\-\*\s]*/g, "").trim();
                          return (
                            <div key={i} className="flex items-start gap-2 text-xs text-[#5b6b55]">
                              <Check className="w-3.5 h-3.5 text-[#3b142e] shrink-0 mt-0.5" />
                              <span>{cleanBenefit}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dynamic Community Reviews Tab */}
            {activeTab === "reviews" && (
              <div className="space-y-8 animate-fadeIn" ref={reviewsEndRef}>
                
                {/* Review ratings stats and distributions summary */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center p-4 sm:p-6 bg-[#f7f9f4] border border-[#e1e8db] rounded-2xl">
                  
                  {/* Left big calculation score */}
                  <div className="md:col-span-4 text-center space-y-1 border-b md:border-b-0 md:border-r border-[#e1e8db]/70 pb-4 md:pb-0">
                    <span className="text-3xl sm:text-4xl font-black text-[#2c3527] font-mono block">
                      {(Number(averageSubRating) || 5.0).toFixed(1)}
                    </span>
                    <div className="flex gap-0.5 justify-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < Math.floor(averageSubRating)
                              ? "fill-[#dfb035] text-[#dfb035]"
                              : "text-[#e1e8db]"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase text-[#72856a] block pt-1">
                      out of 5 stars ({reviewsList.length} reviews)
                    </span>
                  </div>

                  {/* Right distributions progress bar list */}
                  <div className="md:col-span-8 space-y-1.5 text-xs font-mono font-semibold text-[#5b6b55]">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const percent = getPercentageDistribution(stars);
                      return (
                        <div key={stars} className="flex items-center gap-3">
                          <span className="w-10 text-right">{stars} star</span>
                          <div className="flex-grow h-2 rounded bg-white border border-[#e1e8db] overflow-hidden relative">
                            <div 
                              className="h-full bg-[#3b142e] rounded absolute top-0 left-0" 
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-gray-400">{percent}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Grid: 2 columns - left reviews list, right write-form */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Column Left: Reviews listing (Grid 7) */}
                  <div className="lg:col-span-7 space-y-4">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-[#72856a] block mb-2">
                      Verified Purchase Reviews Logs
                    </span>

                    {reviewsList.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No reviews logged yet. Be the first to share your authentic experience.</p>
                    ) : (
                      <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                        {reviewsList.map((rev) => {
                          const authorVal = (rev as any).author || rev.name || "Verified Client";
                          // If authorVal accidentally equals product name, fallback to author or Verified Client
                          const reviewerName = (authorVal === product.name && (rev as any).author) ? (rev as any).author : authorVal;
                          return (
                            <div 
                              key={rev.id} 
                              className="bg-white border border-[#edf2e8] hover:border-[#3b142e]/25 p-4 rounded-xl space-y-2.5 transition-all text-xs"
                            >
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-[#edf2e8] text-[#3b142e] flex items-center justify-center font-bold font-mono text-[10px]">
                                    {reviewerName.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-bold text-[#2c3527]">{reviewerName}</span>
                                  {rev.verified !== false && (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase font-bold">
                                      verified buyer
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] font-mono text-gray-400">{rev.date}</span>
                              </div>

                            <div className="flex items-center gap-1">
                              <div className="flex gap-px">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i < rev.rating
                                        ? "fill-[#dfb035] text-[#dfb035]"
                                        : "text-[#e1e8db]"
                                    }`}
                                  />
                                ))}
                              </div>
                              <strong className="text-[#2c3527] font-bold text-xs ml-1">{rev.title}</strong>
                            </div>

                            <p className="text-[#5b6b55] leading-relaxed text-xs">
                              {rev.comment}
                            </p>
                          </div>
                        );
                      })}
                      </div>
                    )}
                  </div>

                  {/* Column Right: Write a Review Form (Grid 5) */}
                  <div className="lg:col-span-5 bg-[#f7f9f4]/40 border border-[#e1e8db] rounded-2xl p-5 space-y-4">
                    <div className="border-b border-[#e1e8db] pb-3">
                      <h4 className="text-sm font-bold text-[#2c3527]">Write a Product Review</h4>
                      <p className="text-[10px] text-[#72856a] mt-0.5">
                        Your honest feedback supports local Texas organic state farming crops.
                      </p>
                    </div>

                    {/* Submit Notification Status */}
                    {feedbackMsg && (
                      <div className="p-3 rounded-lg bg-[#edf2e8] border border-[#3b142e]/20 text-[11px] font-medium text-[#2c3527] leading-relaxed">
                        {feedbackMsg}
                      </div>
                    )}

                    <form onSubmit={handleReviewSubmit} className="space-y-3.5 text-xs font-sans">
                      {/* Interactive clicks rating selector */}
                      <div className="space-y-1">
                        <label className="font-bold text-gray-600 uppercase block text-[10px]">Your Rating Score</label>
                        <div className="flex items-center gap-1.5">
                          {Array.from({ length: 5 }).map((_, i) => {
                            const starValue = i + 1;
                            return (
                              <button
                                type="button"
                                key={starValue}
                                onClick={() => setReviewRating(starValue)}
                                className="focus:outline-none transition-transform hover:scale-125 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center bg-white rounded-lg border border-[#e1e8db]"
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    starValue <= reviewRating
                                      ? "fill-[#dfb035] text-[#dfb035]"
                                      : "text-gray-300"
                                  }`}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Name input */}
                      <div className="space-y-1">
                        <label className="font-bold text-gray-600 uppercase block text-[10px]">Your screen Name *</label>
                        <input
                          type="text"
                          required
                          value={reviewName}
                          onChange={(e) => setReviewName(e.target.value)}
                          placeholder="e.g. John Miller"
                          className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none focus:border-[#3b142e] text-xs font-sans text-[#2c3527]"
                        />
                      </div>

                      {/* Title input */}
                      <div className="space-y-1">
                        <label className="font-bold text-gray-600 uppercase block text-[10px]">Review Heading Title (optional)</label>
                        <input
                          type="text"
                          value={reviewTitle}
                          onChange={(e) => setReviewTitle(e.target.value)}
                          placeholder="e.g. Life-changing effect!"
                          className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none focus:border-[#3b142e] text-xs font-sans text-[#2c3527]"
                        />
                      </div>

                      {/* Comment body */}
                      <div className="space-y-1">
                        <label className="font-bold text-gray-600 uppercase block text-[10px]">Your Review Comment *</label>
                        <textarea
                          rows={3}
                          required
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="What did you love about the potency, flavor, or texture?"
                          className="w-full p-2.5 bg-white border border-[#e1e8db] rounded-xl focus:outline-none focus:border-[#3b142e] text-xs font-sans leading-relaxed text-[#2c3527]"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full h-11 bg-[#3b142e] hover:bg-[#5d2a49] text-white font-extrabold uppercase tracking-wider text-[10px] rounded-xl transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1 border-0"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-white" />
                        <span>Submit Live Review</span>
                      </button>
                    </form>
                  </div>

                </div>

              </div>
            )}

          </div>

        </div>

        {/* 5. Recommended / Related Products: Grid 2 columns on mobile/tablet, 4 columns on desktop */}
        {relatedProducts.length > 0 && (
          <div className="space-y-6 pt-6">
            <div className="border-b border-[#e1e8db] pb-4">
              <span className="text-[10px] font-mono uppercase font-black tracking-widest text-[#3b142e] block mb-1">
                COMPLETE THE EXPERIENCE
              </span>
              <h3 className="text-lg sm:text-2xl font-serif font-black text-[#2c3527]">
                Related organic Formulas
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {relatedProducts.map((p) => (
                <a
                  key={p.id}
                  href={`/products/${p.slug || p.id}`}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey) {
                      return;
                    }
                    e.preventDefault();
                    onSelectProduct(p);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="group bg-white border border-[#e1e8db] rounded-xl p-3 sm:p-4 flex flex-col justify-between hover:shadow-md hover:border-[#3b142e]/30 transition-all duration-300 cursor-pointer text-xs block text-inherit no-underline"
                >
                  <div className="space-y-3">
                    {/* Related Image */}
                    <div className="w-full h-24 sm:h-36 bg-[#f7f9f4] border border-[#e1e8db]/60 rounded-lg flex items-center justify-center p-2 relative overflow-hidden">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>

                    <div className="space-y-1 font-sans">
                      <div className="flex justify-between items-center text-[8px] sm:text-[9px] uppercase tracking-wider font-bold text-[#3b142e]">
                        <span className="truncate max-w-[70px]">{p.categoryLabel}</span>
                        <span>★ {(Number(p.rating) || 5.0).toFixed(1)}</span>
                      </div>
                      <h4 className="font-bold text-[#2c3527] group-hover:text-[#3b142e] transition-colors leading-tight line-clamp-1 text-xs">
                        {p.name}
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-[#72856a] truncate block">
                        {p.cbd}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-[#edf2e8] mt-3 sm:mt-4 font-mono font-bold text-[9px] sm:text-xs">
                    <span className="uppercase text-[#8ca184] text-[8px] sm:text-[9px] truncate max-w-[60px]">{p.thc}</span>
                    <span className="text-[#2c3527]">${(Number(p.price) || 0).toFixed(2)}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
