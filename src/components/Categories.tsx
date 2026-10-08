import { ArrowUpRight } from "lucide-react";
import { DEFAULT_CATEGORIES } from "../data";
import { handleImageError, normalizeToCleanAsset } from "../utils/imageMatching";
import { CategoryItem } from "../types";

interface CategoriesProps {
  setView: (view: string) => void;
  setSelectedCategory: (category: string) => void;
  categories?: CategoryItem[];
}

export default function Categories({ setView, setSelectedCategory, categories = DEFAULT_CATEGORIES }: CategoriesProps) {
  // Filter categories to show featured ones on the home screen
  const filteredCategories = categories.filter((c) => c.isFeaturedHome === true);
  const displayCategoriesRaw = filteredCategories.length > 0 
    ? filteredCategories 
    : categories.filter((c) => c.isFeaturedHome !== false);
  const finalCategoriesToDisplay = displayCategoriesRaw.length > 0 ? displayCategoriesRaw : categories.slice(0, 6);

  const getCleanCategoryImage = (catId: string, customImage?: string) => {
    const cleanMapping: Record<string, string> = {
      drinks: "/images/categories/drinks.jpg",
      tinctures: "/images/categories/tinctures.jpg",
      topicals: "/images/categories/topicals.jpg",
      gummies: "/images/categories/gummies.jpg",
      "edibles-and-gummies": "/images/categories/edibles.jpg",
      pet: "/images/categories/pet.jpg",
      miscellaneous: "/images/category-gummies.jpg",
    };
    const mappedImage = cleanMapping[catId.toLowerCase()];
    if (mappedImage) return mappedImage;
    if (customImage && !customImage.startsWith("data:")) {
      return normalizeToCleanAsset(customImage) || customImage;
    }
    return customImage || "/images/category-drinks.jpg";
  };

  const categoriesList = finalCategoriesToDisplay.map((cat) => ({
    id: cat.id,
    title: cat.title,
    tagline: cat.tagline || "Handcrafted Quality",
    desc: cat.desc || "Explore our top rated organic hemp formulation.",
    image: getCleanCategoryImage(cat.id, cat.image),
  }));

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setView("shop");
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  return (
    <section className="py-12 sm:py-20 px-4 sm:px-6 md:px-8 lg:px-12 bg-[#f7f9f4] border-b border-[#e1e8db]">
      <div className="max-w-7xl mx-auto space-y-10 sm:space-y-12">
        {/* Header Title */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <p className="text-[11px] font-mono tracking-widest text-[#3b142e] uppercase font-bold">
            EXPLORE NATURES REMEDY
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-[#2c3527]">
            Get Always Fresh & Organic <span className="text-[#3b142e]">Cannabis Essentials</span>
          </h2>
          <p className="text-[#5b6b55] text-xs sm:text-sm">
            Select one of our premium, handcrafted categories to explore hemp-derived cannabinoids and terpene families
          </p>
        </div>

        {/* Categories Grid (2 or 3 Columns for distinct sizes) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 font-sans">
          {categoriesList.map((category) => {
            return (
              <a
                key={category.id}
                href={`/shop?category=${category.id}`}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.button === 1) {
                    return;
                  }
                  e.preventDefault();
                  handleCategoryClick(category.id);
                }}
                className="group relative aspect-square rounded-2xl overflow-hidden border border-[#e1e8db] text-left cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:border-[#3b142e] hover:shadow-2xl focus:outline-none bg-[#f7f9f4] block text-inherit no-underline shadow-sm"
              >
                {/* Background Image - Clean & Vibrant, No White Fog */}
                <div className="absolute inset-0 z-0 bg-[#eef2ea]">
                  <img
                    src={category.image}
                    alt={category.title}
                    className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                    onError={(e) => handleImageError(e, category.id)}
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Top-Right "Shop Collection" Floating Pill */}
                <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-10">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-[#e1e8db] text-[11px] font-bold text-[#2c3527] group-hover:bg-[#3b142e] group-hover:text-white group-hover:border-[#3b142e] transition-all duration-300 shadow-sm">
                    <span>Shop</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#3b142e] group-hover:text-white transition-colors" />
                  </span>
                </div>

                {/* Bottom Overlay - Clean Title Only, No Subheadings, No White Fog */}
                <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 pt-12 sm:pt-16 z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl sm:text-2xl font-serif font-black text-white group-hover:text-[#f0bc37] transition-colors leading-tight">
                      {category.title}
                    </h3>
                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white group-hover:bg-[#3b142e] group-hover:border-[#3b142e] transition-all duration-300 shadow-sm shrink-0 ml-3">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {/* Explore All Products Link */}
        <div className="text-center pt-2">
          <button
            onClick={() => {
              setSelectedCategory("all");
              setView("shop");
              window.scrollTo({ top: 300, behavior: "smooth" });
            }}
            className="px-6 py-3 bg-white border border-[#e1e8db] hover:border-[#3b142e] text-[#2c3527] hover:text-[#3b142e] text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer inline-flex items-center gap-2"
          >
            <span>Explore All Products</span>
            <ArrowUpRight className="w-4 h-4 text-[#3b142e]" />
          </button>
        </div>
      </div>
    </section>
  );
}
