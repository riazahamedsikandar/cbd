import React from "react";
import { Calendar, User, X, BookOpen, Leaf, ArrowLeft, ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
import { BlogPost, Product } from "../types";
import { parseAndRenderSeoLinks } from "../utils/seoLinkParser";
import { PRODUCTS } from "../data";
import { LEARN_PAGES } from "../learnPages";
import MarkdownArticleRenderer from "./MarkdownArticleRenderer";

interface BlogReaderProps {
  post: BlogPost;
  onClose: () => void;
  onSelectProduct?: (product: Product) => void;
  onSelectTopic?: (topic: string) => void;
  productsList?: Product[];
}

export default function BlogReader({ post, onClose, onSelectProduct, onSelectTopic, productsList }: BlogReaderProps) {
  const activeProducts = productsList && productsList.length > 0 ? productsList : PRODUCTS;
  const sidebarProducts = activeProducts.filter(
    (p) => p.image && (p.isBestSeller || p.rating >= 4.8)
  ).slice(0, 4);

  return (
    <div className="animate-fadeIn min-h-screen bg-[#fcfdfe] flex flex-col font-sans pb-24 text-[#5b6b55]">
      
      {/* Sticky Reader Top Navigation Bar */}
      <div className="bg-white/95 backdrop-blur-md border-b border-[#e1e8db] px-4 sm:px-8 py-3.5 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#e1e8db] hover:border-[#3b142e] bg-white text-xs font-bold text-[#5b6b55] hover:text-[#2c3527] transition-all duration-300 cursor-pointer shadow-2xs group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            <span>Back to Articles</span>
          </button>
          
          <div className="hidden md:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#3b142e] animate-pulse" />
            <span className="text-xs font-mono text-[#3b142e] font-bold uppercase tracking-widest">
              CBD American Shaman of Hurst Journal • {post.category}
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-[#e1e8db] hover:border-[#3b142e] bg-white text-[#5b6b55] hover:text-[#2c3527] flex items-center justify-center transition-colors focus:outline-none cursor-pointer"
            title="Close article"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Layout with Balanced Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Main Article Reading Column */}
          <article className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-10 md:p-12 border border-[#e1e8db] shadow-xs space-y-8">
            
            {/* Top Article Cover Image - Natural Aspect Ratio (Never Cut, Zero White/Grey Letterbox) */}
            {post.image && post.image.trim() !== "" && !post.image.toLowerCase().includes("placeholder") && (
              <div className="w-full rounded-2xl overflow-hidden border border-[#e1e8db] bg-[#f7f9f4] shadow-xs">
                <img
                  src={post.image.trim()}
                  alt={post.title}
                  className="w-full h-auto max-h-[550px] object-contain object-center block rounded-2xl mx-auto"
                  onError={(e) => {
                    const container = (e.target as HTMLElement).parentElement;
                    if (container) container.style.display = "none";
                  }}
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* Article Heading & Meta Details */}
            <div className="space-y-4 pb-6 border-b border-[#edf2e8]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3.5 py-1.5 bg-[#3b142e] text-white text-[11px] font-mono font-bold rounded-full uppercase tracking-wider inline-block">
                  {post.category}
                </span>
                <span className="text-xs font-mono text-gray-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#3b142e]" />
                  <span>Certified Botanical Guidance</span>
                </span>
              </div>

              <h1 className="font-serif text-2xl sm:text-4xl md:text-5xl font-black text-[#2c3527] leading-tight tracking-tight">
                {post.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#72856a] font-mono pt-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#3b142e]" />
                  <span>Published on {post.date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#3b142e]" />
                  <span>Authored by {post.author}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#5d2a49]">
                  <BookOpen className="w-4 h-4" />
                  <span>CBD American Shaman of Hurst</span>
                </div>
              </div>

              {/* Summary Highlight Quote Box */}
              {post.summary && (
                <div className="bg-[#f7f9f4] p-5 sm:p-6 rounded-2xl border border-[#e1e8db] text-sm sm:text-base text-[#5b6b55] italic leading-relaxed mt-4">
                  {post.summary}
                </div>
              )}
            </div>

            {/* Pure Markdown Content */}
            <div className="prose max-w-none text-[#5b6b55]">
              <MarkdownArticleRenderer content={post.content || post.summary} />
            </div>

              {/* Explicit Attached Structured FAQs if present */}
              {Array.isArray(post.faqs) && post.faqs.length > 0 && (
                <div className="mt-12 pt-8 border-t border-[#e1e8db] space-y-4">
                  <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#2c3527]">
                    Frequently Asked Questions
                  </h3>
                  <div className="space-y-4 pt-2">
                    {post.faqs.map((faq, fIdx) => (
                      <div
                        key={fIdx}
                        className="p-5 sm:p-6 bg-[#f7f9f4] rounded-2xl border border-[#e1e8db] space-y-2 shadow-2xs"
                      >
                        <h4 className="text-base sm:text-lg font-bold text-[#2c3527]">
                          {faq.question}
                        </h4>
                        <p className="text-sm sm:text-base text-[#5b6b55] leading-relaxed whitespace-pre-line">
                          {parseAndRenderSeoLinks(faq.answer)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regulatory Statement */}
              <div className="pt-8 border-t border-[#e1e8db] mt-10 bg-[#fbfcf9] rounded-2xl p-6 border border-[#e1e8db] space-y-2">
                <span className="text-[10px] font-mono font-black tracking-widest text-[#3b142e] block uppercase">
                  // COMPLIANCE STATEMENT
                </span>
                <p className="text-xs text-[#72856a] leading-relaxed">
                  To explore personalized botanical guidance for your physical wellness goals, stop by our Hurst storefront. Our knowledgeable team can answer questions about purity, legal thresholds, and sublingual use. Always consult with a licensed healthcare practitioner before introducing botanical extracts into your routine.
                </p>
              </div>

              {/* Bottom Back Button */}
              <div className="pt-8 border-t border-[#e1e8db] flex items-center justify-between">
                <button
                  onClick={onClose}
                  className="px-6 py-3 rounded-full border border-[#e1e8db] hover:border-[#3b142e] bg-white font-bold text-xs text-[#5b6b55] hover:text-[#2c3527] uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-2xs"
                >
                  ← Back to All Articles
                </button>
              </div>

          </article>

          {/* Right Sidebar: Quick Guides, Products & Dispensary Info */}
          <aside className="lg:col-span-4 space-y-8 sticky top-24">
            
            {/* Learn Guides Quick Links */}
            <div className="bg-white border border-[#e1e8db] rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-[#3b142e]" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#2c3527] font-mono">
                  Botanical Guides
                </h3>
              </div>
              <p className="text-xs text-[#72856a] leading-relaxed">
                Explore our educational resources and compliance guides.
              </p>
              <div className="space-y-2 pt-1">
                {LEARN_PAGES.map((lp) => (
                  <a
                    key={lp.slug}
                    href={`/${lp.slug}`}
                    onClick={(e) => {
                      if (onSelectTopic && !e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        onSelectTopic(lp.slug);
                      }
                    }}
                    className="flex items-center justify-between p-3 rounded-2xl border border-[#e1e8db] bg-stone-50/50 hover:bg-[#f7f9f4] hover:border-[#3b142e] transition-all text-xs font-bold text-[#5b6b55] hover:text-[#2c3527]"
                  >
                    <span className="capitalize">{lp.menuTitle}</span>
                    <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#3b142e]" />
                  </a>
                ))}
              </div>
            </div>

            {/* Featured Tested Products Side Rail with Valid Images */}
            {sidebarProducts.length > 0 && (
              <div className="bg-white border border-[#e1e8db] rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#3b142e]" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[#2c3527] font-mono">
                    Featured Products
                  </h3>
                </div>
                <div className="space-y-3 pt-1">
                  {sidebarProducts.map((product) => {
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
                            src={product.image || "/images/wyld-cbd-sparkling-water-blood-orange-50mg.webp"}
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
                            <span className="font-bold text-[#3b142e]">${product.price.toFixed(2)}</span>
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
                730 W Pipeline Rd, Hurst, TX 76053. Walk-ins welcome for expert consultations.
              </p>
              <div className="pt-1 text-xs font-mono text-[#3b142e] font-bold">
                (817) 494-3335
              </div>
            </div>

          </aside>

        </div>
      </div>

    </div>
  );
}
