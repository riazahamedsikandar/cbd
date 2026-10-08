import React, { useState, useMemo } from "react";
import { Search, SlidersHorizontal, ArrowUpDown, RefreshCw, X } from "lucide-react";
import { Product, CategoryItem } from "../types";
import { PRODUCTS, DEFAULT_CATEGORIES } from "../data";
import ProductCard from "./ProductCard";
import { matchesCategoryFilter } from "../utils/categoryUtils";

interface ProductsProps {
  onViewDetails: (product: Product) => void;
  onAddToCart: (product: Product, option: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  productsList?: Product[];
  categoriesList?: CategoryItem[];
  selectedFilter?: { top: string; level1?: string; level2?: string } | null;
  setSelectedFilter?: (filter: { top: string; level1?: string; level2?: string } | null) => void;
}

export default function Products({
  onViewDetails,
  onAddToCart,
  selectedCategory,
  setSelectedCategory,
  productsList = PRODUCTS,
  categoriesList,
  selectedFilter,
  setSelectedFilter,
}: ProductsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("default");
  const [priceFilter, setPriceFilter] = useState("all");

  const categories = useMemo(() => {
    const list = [{ id: "all", label: "All Products" }];
    const sourceList = categoriesList && categoriesList.length > 0 ? categoriesList : DEFAULT_CATEGORIES;
    sourceList.forEach((cat) => {
      list.push({ id: cat.id, label: cat.title });
    });
    return list;
  }, [categoriesList]);

  const priceRanges = [
    { id: "all", label: "Any Price" },
    { id: "under-30", label: "Under $30" },
    { id: "30-50", label: "$30 - $50" },
    { id: "over-50", label: "Over $50" },
  ];

  // Listen for category in URL search query (e.g. /shop?category=drinks on Cmd/Ctrl+click new tab)
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const catParam = searchParams.get("category");
      if (catParam && catParam.trim() !== "") {
        setSelectedCategory(catParam.trim().toLowerCase());
      }
    }
  }, [setSelectedCategory]);

  // Handle filter clearing
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSortOption("default");
    setPriceFilter("all");
    if (setSelectedFilter) {
      setSelectedFilter(null);
    }
  };

  // Helper check if product matches category ID or label
  const matchesCategory = (p: Product, targetCat: string) => {
    return matchesCategoryFilter(p, targetCat, categoriesList);
  };

  // Filter and sort products
  const processedProducts = useMemo(() => {
    let result = [...productsList];

    // Search query constraint
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          (p.categoryLabel && p.categoryLabel.toLowerCase().includes(query))
      );
    }

    // Category filter constraint (multi-category compatible)
    if (selectedCategory !== "all") {
      result = result.filter((p) => matchesCategory(p, selectedCategory));
    }

    // Deep Menu filter constraint
    if (selectedFilter) {
      const { top, level1, level2 } = selectedFilter;

      // Group 1: Shop All
      if (top === "Shop All") {
        if (level1 === "Gummies") {
          result = result.filter(p => p.category === "gummies");
          if (level2) {
            const l2Lower = level2.toLowerCase();
            if (l2Lower.includes("delta 9") || l2Lower.includes("delta-9")) {
              result = result.filter(p => p.name.toLowerCase().includes("delta-9") || p.name.toLowerCase().includes("delta 9") || p.description.toLowerCase().includes("delta-9") || p.description.toLowerCase().includes("delta 9") || p.thc.toLowerCase().includes("delta-9") || p.thc.toLowerCase().includes("delta 9"));
            } else if (l2Lower.includes("cbd")) {
              result = result.filter(p => p.name.toLowerCase().includes("cbd") || p.description.toLowerCase().includes("cbd") || p.cbd.toLowerCase().includes("cbd"));
            } else if (l2Lower.includes("sleep")) {
              result = result.filter(p => p.name.toLowerCase().includes("sleep") || p.description.toLowerCase().includes("sleep") || p.name.toLowerCase().includes("dream") || p.description.toLowerCase().includes("dream") || p.name.toLowerCase().includes("night") || p.description.toLowerCase().includes("night"));
            }
          }
        } else if (level1 === "Drinks & Seltzers") {
          result = result.filter(p => p.category === "beverages" || p.name.toLowerCase().includes("drink") || p.name.toLowerCase().includes("seltzer") || p.name.toLowerCase().includes("cocktail"));
          if (level2) {
            const l2Lower = level2.toLowerCase();
            if (l2Lower.includes("thc")) {
              result = result.filter(p => p.name.toLowerCase().includes("thc") || p.thc.toLowerCase().includes("thc"));
            } else if (l2Lower.includes("cbd")) {
              result = result.filter(p => p.name.toLowerCase().includes("cbd") || p.cbd.toLowerCase().includes("cbd"));
            } else if (l2Lower.includes("shot") || l2Lower.includes("cocktail")) {
              result = result.filter(p => p.name.toLowerCase().includes("shot") || p.name.toLowerCase().includes("cocktail") || p.name.toLowerCase().includes("coktail"));
            }
          }
        } else if (level1 === "Tinctures & Oils") {
          result = result.filter(p => p.category === "cbd-oils" || p.name.toLowerCase().includes("tincture") || p.name.toLowerCase().includes("oil"));
          if (level2) {
            const l2Lower = level2.toLowerCase();
            if (l2Lower.includes("cbd")) {
              result = result.filter(p => p.name.toLowerCase().includes("cbd") || p.cbd.toLowerCase().includes("cbd"));
            } else if (l2Lower.includes("delta 9") || l2Lower.includes("delta-9")) {
              result = result.filter(p => p.name.toLowerCase().includes("delta-9") || p.name.toLowerCase().includes("delta 9") || p.description.toLowerCase().includes("delta-9") || p.thc.toLowerCase().includes("delta-9") || p.thc.toLowerCase().includes("delta 9"));
            }
          }
        } else if (level1 === "Vapes & Disposables") {
          result = result.filter(p => p.name.toLowerCase().includes("vape") || p.name.toLowerCase().includes("disposable") || p.name.toLowerCase().includes("cartridge") || p.name.toLowerCase().includes("cart") || p.description.toLowerCase().includes("vape") || p.description.toLowerCase().includes("disposable") || p.description.toLowerCase().includes("cartridge"));
          if (level2) {
            const l2Lower = level2.toLowerCase();
            if (l2Lower.includes("disposable")) {
              result = result.filter(p => p.name.toLowerCase().includes("disposable") || p.description.toLowerCase().includes("disposable") || p.name.toLowerCase().includes("pre-roll") || p.name.toLowerCase().includes("preroll"));
            } else if (l2Lower.includes("cartridge")) {
              result = result.filter(p => p.name.toLowerCase().includes("cartridge") || p.name.toLowerCase().includes("cart") || p.description.toLowerCase().includes("cartridge"));
            }
          }
        } else if (level1 === "Edibles") {
          result = result.filter(p => p.category === "gummies" || p.category === "beverages" || p.name.toLowerCase().includes("chocolate") || p.name.toLowerCase().includes("bar") || p.name.toLowerCase().includes("candy") || p.name.toLowerCase().includes("honey") || p.name.toLowerCase().includes("cookie") || p.name.toLowerCase().includes("brownie") || p.name.toLowerCase().includes("bite") || p.name.toLowerCase().includes("edible"));
        } else if (level1 === "Topicals") {
          result = result.filter(p => p.category === "topicals");
        } else if (level1 === "Smoke & Accessories") {
          result = result.filter(p => p.category === "flower" || p.name.toLowerCase().includes("smoke") || p.name.toLowerCase().includes("pre-roll") || p.name.toLowerCase().includes("preroll") || p.name.toLowerCase().includes("joints") || p.name.toLowerCase().includes("joint") || p.name.toLowerCase().includes("accessory") || p.name.toLowerCase().includes("flight") || p.name.toLowerCase().includes("grinder"));
        } else if (level1) {
          result = result.filter(p => matchesCategory(p, level1));
        }
      }

      // Group 2: By Type
      else if (top === "By Type" && level1) {
        const l1Lower = level1.toLowerCase();
        if (l1Lower === "cbd") {
          result = result.filter(p => p.name.toLowerCase().includes("cbd") || p.description.toLowerCase().includes("cbd") || p.cbd.toLowerCase().includes("cbd"));
        } else if (l1Lower.includes("delta 9") || l1Lower.includes("delta-9") || l1Lower.includes("d9")) {
          result = result.filter(p => p.name.toLowerCase().includes("delta-9") || p.name.toLowerCase().includes("delta 9") || p.description.toLowerCase().includes("delta 9") || p.description.toLowerCase().includes("delta-9") || p.thc.toLowerCase().includes("delta-9") || p.thc.toLowerCase().includes("delta 9"));
        } else if (l1Lower.includes("cbn")) {
          result = result.filter(p => p.name.toLowerCase().includes("cbn") || p.description.toLowerCase().includes("cbn"));
        } else if (l1Lower.includes("hhc")) {
          result = result.filter(p => p.name.toLowerCase().includes("hhc") || p.description.toLowerCase().includes("hhc"));
        } else if (l1Lower.includes("thca")) {
          result = result.filter(p => p.name.toLowerCase().includes("thca") || p.description.toLowerCase().includes("thca"));
        } else if (l1Lower.includes("mushroom")) {
          result = result.filter(p => p.name.toLowerCase().includes("mushroom") || p.name.toLowerCase().includes("mushrooms") || p.description.toLowerCase().includes("mushroom") || p.description.toLowerCase().includes("amanita"));
        }
      }

      // Group 3: Deals
      else if (top === "Deals" && level1) {
        if (level1 === "New Arrivals") {
          result = result.filter(p => p.isNew === true || p.id.includes("new") || p.id.includes("arrival"));
        } else if (level1 === "On Sale") {
          result = result.filter(p => p.isBestSeller === true || p.price < 40 || p.description.toLowerCase().includes("sale") || p.name.toLowerCase().includes("sale"));
        } else if (level1 === "Bundle Deals") {
          result = result.filter(p => p.name.toLowerCase().includes("pack") || p.name.toLowerCase().includes("case") || p.name.toLowerCase().includes("bundle") || p.name.toLowerCase().includes("flight") || p.description.toLowerCase().includes("pack") || p.description.toLowerCase().includes("bundle"));
        }
      }

      // Group 4: Pets
      else if (top === "Pets") {
        result = result.filter(p => p.category === "pets" || p.name.toLowerCase().includes("pet") || p.description.toLowerCase().includes("pet") || p.name.toLowerCase().includes("tail") || p.name.toLowerCase().includes("bark") || p.name.toLowerCase().includes("purr"));
        if (level1) {
          if (level1 === "CBD for Dogs") {
            const dogFiltered = result.filter(p => p.name.toLowerCase().includes("dog") || p.description.toLowerCase().includes("dog") || p.name.toLowerCase().includes("bark") || p.name.toLowerCase().includes("canine"));
            if (dogFiltered.length > 0) result = dogFiltered;
          } else if (level1 === "CBD for Cats") {
            const catFiltered = result.filter(p => p.name.toLowerCase().includes("cat") || p.description.toLowerCase().includes("cat") || p.name.toLowerCase().includes("purr") || p.name.toLowerCase().includes("feline") || p.name.toLowerCase().includes("kitty"));
            if (catFiltered.length > 0) result = catFiltered;
          }
        }
      }
    }

    // Price query constraint
    if (priceFilter !== "all") {
      if (priceFilter === "under-30") {
        result = result.filter((p) => p.price < 30);
      } else if (priceFilter === "30-50") {
        result = result.filter((p) => p.price >= 30 && p.price <= 50);
      } else if (priceFilter === "over-50") {
        result = result.filter((p) => p.price > 50);
      }
    }

    // Sorting constraint
    if (sortOption === "price-asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOption === "price-desc") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortOption === "rating") {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortOption === "bestsellers") {
      result.sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0));
    }

    return result;
  }, [searchQuery, selectedCategory, selectedFilter, priceFilter, sortOption]);

  const hasActiveFilters = searchQuery !== "" || selectedCategory !== "all" || priceFilter !== "all" || sortOption !== "default" || !!selectedFilter;

  const selectCategoryAndClearFilter = (catId: string) => {
    setSelectedCategory(catId);
    if (setSelectedFilter) {
      setSelectedFilter(null);
    }
  };

  return (
    <section className="py-16 px-4 sm:px-6 md:px-8 lg:px-12 bg-[#f7f9f4] min-h-[70vh] border-b border-[#e1e8db]">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 pb-6 border-b border-[#e1e8db]">
          <div className="space-y-2">
            <p className="text-[11px] font-mono tracking-widest text-[#3b142e] uppercase font-bold">
              // CBD AMERICAN SHAMAN OF HURST CATALOG
            </p>
            <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-[#2c3527] leading-tight">
              Our Premium <span className="text-[#3b142e]">Organic Catalog</span>
            </h1>
            <p className="text-[#5b6b55] text-xs sm:text-sm">
              We deliver premium, compliant, and verified cannabinoid solutions right with COA transparency.
            </p>
          </div>

          <span className="px-3.5 py-1.5 rounded bg-white border border-[#e1e8db] text-xs font-mono text-[#5b6b55] shadow-sm">
              Showing <strong className="text-[#2c3527]">{processedProducts.length}</strong> of{" "}
              <strong className="text-[#3b142e]">{productsList.length}</strong> premium offerings
            </span>
        </div>

        {/* Filters Panel Interface */}
        <div className="p-6 rounded-2xl bg-white border border-[#e1e8db] space-y-6 font-sans shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Search Filter */}
            <div className="md:col-span-12 lg:col-span-5 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#72856a]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search premium products or categories..."
                className="w-full pl-10 pr-10 py-3 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-[#2c3527] text-xs placeholder:text-[#72856a]/65 focus:outline-none focus:border-[#3b142e] focus:ring-1 focus:ring-[#3b142e] transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#72856a] hover:text-[#2c3527] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sorting */}
            <div className="md:col-span-6 lg:col-span-4 relative flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-[#3b142e] shrink-0" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full py-3 px-3.5 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-[#5b6b55] text-xs focus:outline-none focus:border-[#3b142e] transition-all cursor-pointer shadow-sm"
              >
                <option value="default">Sort: Default Order</option>
                <option value="bestsellers">Sort: Best Sellers First</option>
                <option value="rating">Sort: Customer Rating</option>
                <option value="price-asc">Sort: Price Low to High</option>
                <option value="price-desc">Sort: Price High to Low</option>
              </select>
            </div>

            {/* Price Filter dropdown */}
            <div className="md:col-span-6 lg:col-span-3 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#3b142e] shrink-0" />
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="w-full py-3 px-3.5 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-[#5b6b55] text-xs focus:outline-none focus:border-[#3b142e] transition-all cursor-pointer shadow-sm"
              >
                {priceRanges.map((range) => (
                  <option key={range.id} value={range.id}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Menu Filter Trail (Breadcrumbs) */}
          {selectedFilter && (
            <div className="p-4 rounded-xl bg-[#edf2e8] border border-[#cbd5c2] flex flex-col sm:flex-row items-baseline sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="flex flex-wrap items-center gap-2 font-sans text-xs">
                <span className="text-[#72856a] uppercase font-bold text-[10px] tracking-wider font-mono">Exploring:</span>
                <span className="text-[#2c3527] font-black uppercase text-[11px] bg-white border border-[#e1e8db] px-2.5 py-1 rounded-md shadow-sm">{selectedFilter.top}</span>
                {selectedFilter.level1 && (
                  <>
                    <span className="text-[#cbd5c2] font-semibold">/</span>
                    <span className="text-[#3b142e] font-black uppercase text-[11px] bg-white border border-[#e1e8db] px-2.5 py-1 rounded-md shadow-sm">{selectedFilter.level1}</span>
                  </>
                )}
                {selectedFilter.level2 && (
                  <>
                    <span className="text-[#cbd5c2] font-semibold">/</span>
                    <span className="text-white font-black uppercase text-[10px] bg-[#3b142e] px-2.5 py-1 rounded-md shadow-sm tracking-wide">{selectedFilter.level2}</span>
                  </>
                )}
              </div>
              <button
                onClick={() => setSelectedFilter && setSelectedFilter(null)}
                className="text-xs font-bold uppercase tracking-wider text-[#3b142e] hover:underline cursor-pointer"
              >
                Clear Filter ✕
              </button>
            </div>
          )}

          {/* Category Tabs inside panel */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-[#edf2e8] items-center">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => selectCategoryAndClearFilter(cat.id)}
                className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider font-bold transition-all duration-300 cursor-pointer ${
                  selectedCategory === cat.id && !selectedFilter
                    ? "bg-[#3b142e] text-white shadow-md focus:outline-none"
                    : "bg-white text-[#5b6b55] border border-[#e1e8db] hover:text-[#2c3527] hover:border-[#3b142e] shadow-sm"
                }`}
              >
                {cat.label}
              </button>
            ))}

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="ml-auto inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100/70 text-xs font-bold text-red-700 uppercase transition-colors shadow-sm cursor-pointer animate-fadeIn"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Empty State */}
        {processedProducts.length === 0 ? (
          <div className="p-16 rounded-2xl bg-white border border-[#e1e8db] text-center max-w-xl mx-auto space-y-4 shadow-sm animate-fadeIn">
            <RefreshCw className="w-10 h-10 text-[#72856a] animate-spin mx-auto mb-2" />
            <h3 className="text-[#2c3527] text-lg font-bold">No Premium matches Found</h3>
            <p className="text-[#5b6b55] text-xs leading-relaxed">
              We couldn't locate any products reflecting current selectors. Try clearing search queries, expanding price thresholds, or switching tabs.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-6 py-2.5 rounded-full bg-[#3b142e] hover:bg-[#5d2a49] text-white text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer"
            >
              Show All Products
            </button>
          </div>
        ) : (
          /* Products Grid Layout */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {processedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onViewDetails={onViewDetails}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
