import React from "react";
import { 
  ArrowLeft, 
  BookOpen, 
  ShieldCheck, 
  Leaf, 
  Sparkles, 
  Award, 
  ChevronRight, 
  ArrowUpRight 
} from "lucide-react";
import { Product } from "../types";
import { findLearnPageBySlugOrTitle, LEARN_PAGES, LearnPageData } from "../learnPages";
import MarkdownArticleRenderer from "./MarkdownArticleRenderer";

interface LearnPageProps {
  topic: string;
  onBackToHome: () => void;
  products: Product[];
  onSelectProduct?: (product: Product) => void;
  onAddToCart?: (product: Product, option: string) => void;
  onSelectTopic?: (topic: string) => void;
}

export default function LearnPage({ 
  topic, 
  onBackToHome, 
  products, 
  onSelectProduct, 
  onAddToCart,
  onSelectTopic 
}: LearnPageProps) {
  // Find active CSV landing page, fallback to first CSV landing page (CBD Gummies)
  const activePage: LearnPageData = findLearnPageBySlugOrTitle(topic) || LEARN_PAGES[0];

  // Fetch recommended products relevant to the active CSV landing page
  const getRelevantProducts = (): Product[] => {
    const term = (activePage.category + " " + activePage.slug + " " + activePage.title).toLowerCase();
    let filtered: Product[] = [];
    
    if (term.includes("gumm")) {
      filtered = products.filter(p => p.category === "gummies" || p.name.toLowerCase().includes("gumm"));
    } else if (term.includes("tincture") || term.includes("oil")) {
      filtered = products.filter(p => p.category === "tinctures" || p.category === "cbd-oils" || p.name.toLowerCase().includes("tincture") || p.name.toLowerCase().includes("oil"));
    } else if (term.includes("capsule") || term.includes("softgel")) {
      filtered = products.filter(p => p.name.toLowerCase().includes("capsule") || p.name.toLowerCase().includes("softgel") || p.category === "tinctures");
    } else if (term.includes("topical") || term.includes("cream") || term.includes("roll-on")) {
      filtered = products.filter(p => p.category === "topicals" || p.name.toLowerCase().includes("cream") || p.name.toLowerCase().includes("roll-on"));
    } else {
      filtered = products.filter(p => p.isBestSeller);
    }

    if (filtered.length === 0) {
      filtered = products.slice(0, 4);
    }

    return filtered.slice(0, 4);
  };

  const recommendedProducts = getRelevantProducts();

  return (
    <div className="min-h-screen bg-[#fcfdfe] text-[#5b6b55] animate-fadeIn pb-24 font-sans">
      
      {/* Immersive Hero Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#f3f6ee] via-[#f7f9f4] to-white border-b border-[#e1e8db] py-12 md:py-16">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-10 right-20 w-72 h-72 bg-[#3b142e]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 left-10 w-80 h-80 bg-emerald-100/30 rounded-full blur-2xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <button
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 text-xs font-extrabold text-[#3b142e] hover:text-[#5b6b55] uppercase tracking-widest transition-colors mb-6 group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Home</span>
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-[#3b142e] uppercase font-black bg-[#edf2e8] px-3 py-1 rounded-full border border-[#cbd5c2]/40 shadow-2xs">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Hurst Botanical Learning Center</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif font-black text-[#2c3527] leading-tight tracking-tight">
                {activePage.title}
              </h1>
              <p className="text-sm sm:text-base text-[#72856a] font-sans max-w-2xl leading-relaxed">
                {activePage.metaDescription}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3 bg-white border border-[#e1e8db] p-4 sm:p-5 rounded-2xl shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[#3b142e]/10 border border-[#3b142e]/20 flex items-center justify-center text-[#3b142e]">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#3b142e] font-black block">
                  100% Certified Lab Verified
                </span>
                <span className="text-xs font-bold text-[#2c3527]">
                  Hurst, TX Store
                </span>
              </div>
            </div>
          </div>

          {/* Quick Selector Pills for the 5 CSV Landing Pages */}
          <div className="mt-8 pt-6 border-t border-[#e1e8db]/60 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <span className="text-xs font-bold font-mono text-[#72856a] uppercase tracking-wider shrink-0 mr-2">
              Browse Guides:
            </span>
            {LEARN_PAGES.map((lp) => {
              const isActive = lp.slug === activePage.slug;
              return (
                <a
                  key={lp.slug}
                  href={`/${lp.slug}`}
                  onClick={(e) => {
                    if (onSelectTopic && !e.ctrlKey && !e.metaKey) {
                      e.preventDefault();
                      onSelectTopic(lp.slug);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                    isActive
                      ? "bg-[#3b142e] text-white border-[#3b142e] shadow-sm"
                      : "bg-white text-[#5b6b55] hover:text-[#2c3527] border-[#e1e8db] hover:border-[#cbd5c2]"
                  }`}
                >
                  {lp.menuTitle.replace(/\b\w/g, c => c.toUpperCase())}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content & Side Rail Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Main Article Content Container */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-10 md:p-12 border border-[#e1e8db] shadow-xs">
            <MarkdownArticleRenderer content={activePage.content} />
          </div>

          {/* Right Side Rail: Related Guides & Products */}
          <div className="lg:col-span-4 space-y-8 sticky top-24">
            
            {/* Guide Quick Navigation Card */}
            <div className="bg-white border border-[#e1e8db] rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-[#3b142e]" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#2c3527] font-mono">
                  Educational Guides
                </h3>
              </div>
              <p className="text-xs text-[#72856a] leading-relaxed">
                Explore our botanical resources and dispensary compliance guides.
              </p>
              <div className="space-y-2 pt-2">
                {LEARN_PAGES.map((lp) => {
                  const isCurrent = lp.slug === activePage.slug;
                  return (
                    <a
                      key={lp.slug}
                      href={`/${lp.slug}`}
                      onClick={(e) => {
                        if (onSelectTopic && !e.ctrlKey && !e.metaKey) {
                          e.preventDefault();
                          onSelectTopic(lp.slug);
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-xs font-bold ${
                        isCurrent
                          ? "bg-[#edf2e8] border-[#3b142e] text-[#2c3527] shadow-2xs"
                          : "bg-stone-50/50 border-[#e1e8db] text-[#5b6b55] hover:bg-[#f7f9f4] hover:text-[#2c3527] hover:border-[#cbd5c2]"
                      }`}
                    >
                      <span className="capitalize">{lp.menuTitle}</span>
                      <ChevronRight className={`w-4 h-4 ${isCurrent ? "text-[#3b142e]" : "text-gray-400"}`} />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Featured Tested Products Side Rail */}
            {recommendedProducts.length > 0 && (
              <div className="bg-white border border-[#e1e8db] rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#3b142e]" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#2c3527] font-mono">
                      Lab-Tested Products
                    </h3>
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  {recommendedProducts.map((product) => {
                    const prodUrl = `/products/${product.slug || product.id}`;
                    return (
                      <a
                        key={product.id}
                        href={prodUrl}
                        onClick={(e) => {
                          if (onSelectProduct && !e.ctrlKey && !e.metaKey) {
                            e.preventDefault();
                            onSelectProduct(product);
                          }
                        }}
                        className="flex items-center gap-3 p-3 bg-stone-50/60 hover:bg-[#f7f9f4] border border-[#e1e8db] hover:border-[#3b142e]/60 rounded-2xl transition-all group cursor-pointer"
                      >
                        <div className="w-14 h-14 rounded-xl bg-white border border-[#e1e8db] overflow-hidden shrink-0 flex items-center justify-center p-1">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/images/wyld-cbd-sparkling-water-blood-orange-50mg.webp";
                            }}
                          />
                        </div>
                        <div className="flex-grow min-w-0">
                          <h4 className="text-xs font-bold text-[#2c3527] truncate group-hover:text-[#3b142e] transition-colors">
                            {product.name}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-[#72856a] mt-0.5">
                            <span className="font-bold text-[#3b142e]">$${product.price.toFixed(2)}</span>
                            {product.cbd && <span>• {product.cbd}</span>}
                          </div>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#3b142e] shrink-0 transition-colors" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* In-Store Dispensary Visit Callout */}
            <div className="bg-gradient-to-br from-[#2c3527] to-[#1e241a] rounded-3xl p-6 text-white space-y-3 shadow-md">
              <span className="inline-block bg-[#3b142e] text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Visit In Person
              </span>
              <h4 className="text-lg font-serif font-black leading-tight">
                Hurst Storefront
              </h4>
              <p className="text-xs text-[#cbd5c2] leading-relaxed">
                730 W Pipeline Rd, Hurst, TX 76053. Speak with our certified cannabinoid wellness guides today.
              </p>
              <div className="pt-2 text-xs font-mono text-[#3b142e] font-bold">
                Call: (817) 494-3335
              </div>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}
