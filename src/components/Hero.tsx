import { useState } from "react";
import { Shield, Sparkles, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HeroProps {
  setView: (view: string) => void;
  settings?: any;
}

const SLIDES = [
  {
    badge: "PREMIUM HEMP & CBD • HURST, TX",
    headingLine1: "Earthy Purity.",
    headingLine2: "Crafted Wellness & Relief.",
    paragraph: "Welcome to CBD American Shaman of Hurst, your local source for state-compliant hemp, CBD flowers, clean tinctures, and targeted comfort. Sourced for quality with transparent third-party testing.",
    buttonPrimary: { text: "EXPLORE PRODUCTS", action: "shop" },
    buttonSecondary: { text: "OUR STORY", action: "about" },
    image: "/images/hero_bg_1779557711335.png",
    verifiedText: "VERIFIED 100% LEGAL",
    widget1: {
      image: "/images/cbd_dropper_1779557730794.png",
      label: "BEST SELLER",
      title: "Organic CBD",
      rating: "4.9"
    },
    widget2: {
      image: "/images/thc_gummies_pack_1779557751523.png",
      label: "POPULAR",
      title: "Delta-9 Packs",
      sub: "Pure Extraction"
    },
    commitment: {
      label: "HURST STORE COMMITMENT",
      title: "Small Business Owned"
    }
  }
];

export default function Hero({ setView, settings }: HeroProps) {
  const [current, setCurrent] = useState(0);

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % SLIDES.length);
  };

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  const slide = settings ? {
    badge: settings.heroBadge || "PREMIUM HEMP & CBD • HURST, TX",
    headingLine1: settings.heroHeadingLine1 || "Earthy Purity.",
    headingLine2: settings.heroHeadingLine2 || "Crafted Wellness & Relief.",
    paragraph: settings.heroParagraph || "Welcome to CBD American Shaman of Hurst, your local source for state-compliant hemp, CBD flowers, clean tinctures, and targeted comfort. Sourced for quality with transparent third-party testing.",
    buttonPrimary: { text: settings.heroButtonPrimary || "EXPLORE PRODUCTS", action: "shop" },
    buttonSecondary: { text: settings.heroButtonSecondary || "OUR STORY", action: "about" },
    image: settings.heroImage || "/images/hero_bg_1779557711335.png",
    verifiedText: settings.heroVerifiedText || "VERIFIED 100% LEGAL",
    widget1: {
      image: settings.heroWidget1Image || "/images/cbd_dropper_1779557730794.png",
      label: settings.heroWidget1Label || "BEST SELLER",
      title: settings.heroWidget1Title || "Organic CBD",
      rating: settings.heroWidget1Rating || "4.9"
    },
    widget2: {
      image: settings.heroWidget2Image || "/images/thc_gummies_pack_1779557751523.png",
      label: settings.heroWidget2Label || "POPULAR",
      title: settings.heroWidget2Title || "Delta-9 Packs",
      sub: settings.heroWidget2Sub || "Pure Extraction"
    },
    commitment: {
      label: settings.heroCommitmentLabel || "HURST STORE COMMITMENT",
      title: settings.heroCommitmentTitle || "Small Business Owned"
    }
  } : SLIDES[current];

  return (
    <section id="hero-section" className="relative bg-[#f7f9f4] text-[#2c3527] overflow-hidden py-12 md:py-20 lg:py-24 px-6 sm:px-8 md:px-12 lg:px-16 border-b border-[#e1e8db] min-h-[450px] lg:min-h-[750px] flex items-center">
      {/* Background patterns */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <div 
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: "radial-gradient(#3b142e 0.75px, transparent 0.75px)",
            backgroundSize: "24px 24px"
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#f7f9f4] via-[#f7f9f4]/80 to-[#edf2e8]"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#3b142e]/5 blur-3xl"></div>
      </div>


      <div className="relative w-full max-w-7xl mx-auto z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Text content */}
          <div className="lg:col-span-6 flex flex-col items-start text-left gap-5 sm:gap-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`badge-${current}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3b142e]/10 border border-[#3b142e]/20 text-[#3b142e] text-[11px] sm:text-xs font-bold tracking-wider uppercase"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#3b142e]" />
                <span>{slide.badge}</span>
              </motion.div>
            </AnimatePresence>

            <AnimatePresence mode="wait" initial={false}>
              <motion.h1
                key={`heading-${current}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.5, delay: 0.05 }}
                className="text-4xl sm:text-5xl lg:text-[56px] font-serif font-semibold tracking-tight text-[#2c3527] leading-[1.1]"
              >
                {slide.headingLine1} <br />
                <span className="text-[#3b142e]">{slide.headingLine2}</span>
              </motion.h1>
            </AnimatePresence>

            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={`para-${current}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-[#5b6b55] text-sm sm:text-base leading-relaxed max-w-xl"
              >
                {slide.paragraph}
              </motion.p>
            </AnimatePresence>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`buttons-${current}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="flex flex-wrap gap-4 mt-2"
              >
                <button
                  id="explore-products-btn"
                  onClick={() => {
                    setView(slide.buttonPrimary.action);
                    window.scrollTo({ top: 300, behavior: "smooth" });
                  }}
                  className="px-8 py-3.5 bg-[#3b142e] hover:bg-[#5d2a49] text-white text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-full transition-all duration-300 shadow-sm hover:shadow hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  {slide.buttonPrimary.text}
                </button>
                <button
                  id="our-story-btn"
                  onClick={() => {
                    setView(slide.buttonSecondary.action);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="px-8 py-3.5 bg-white border border-[#e1e8db] hover:border-[#3b142e] text-[#5b6b55] hover:text-[#2c3527] text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-full transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
                >
                  {slide.buttonSecondary.text}
                </button>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Column: Hero interactive image card */}
          <div className="lg:col-span-6 hidden lg:flex justify-center items-center relative py-8 lg:py-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`card-${current}`}
                initial={{ opacity: 0, scale: 0.95, rotate: -1 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.95, rotate: 1 }}
                transition={{ duration: 0.6 }}
                className="relative w-full max-w-[480px] aspect-[4/3] sm:aspect-square rounded-[32px] overflow-hidden shadow-xl border border-[#cbd5c2]/40 group"
              >
                {/* Background image */}
                <img
                  src={slide.image}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/brand-feather.png";
                  }}
                />
                
                {/* Visual shadow overlay for legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/20" />

                {/* Top Right: Verified Legal Badge */}
                <div 
                  id="legal-verified-badge"
                  className="absolute top-6 right-6 bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-full shadow-md text-[10px] font-extrabold uppercase tracking-wider text-[#3b142e] flex items-center gap-1.5 border border-[#e1e8db]"
                >
                  <Shield className="w-3 h-3 text-[#3b142e] fill-[#3b142e]/20" />
                  <span>{slide.verifiedText}</span>
                </div>

                {/* Floating Widget 1: Mid-Left */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="absolute left-4 sm:left-6 top-[55%] -translate-y-1/2 bg-white/95 backdrop-blur-sm px-3.5 py-3 rounded-2xl shadow-lg border border-[#e1e8db]/60 flex items-center gap-3 max-w-[210px] z-10 hover:scale-102 transition-transform"
                >
                  <img 
                    src={slide.widget1.image} 
                    alt={slide.widget1.title}
                    className="w-10 h-10 rounded-lg object-cover bg-[#f7f9f4] border border-[#e1e8db]/40 flex-shrink-0"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/brand-feather.png";
                    }}
                  />
                  <div>
                    <span className="block text-[9px] font-extrabold uppercase tracking-wider text-[#3b142e]">
                      {slide.widget1.label}
                    </span>
                    <span className="block text-xs font-extrabold text-[#2c3527] mt-0.5 leading-tight">
                      {slide.widget1.title}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5 text-amber-500 text-[10px] font-bold">
                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                      <span>{slide.widget1.rating}</span>
                    </div>
                  </div>
                </motion.div>

                {/* Floating Widget 2: Mid-Right */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="absolute right-4 sm:right-6 top-[32%] -translate-y-1/2 bg-white/95 backdrop-blur-sm px-3.5 py-3 rounded-2xl shadow-lg border border-[#e1e8db]/60 flex items-center gap-3 max-w-[215px] z-10 hover:scale-102 transition-transform"
                >
                  <img 
                    src={slide.widget2.image} 
                    alt={slide.widget2.title}
                    className="w-10 h-10 rounded-lg object-cover bg-[#f7f9f4] border border-[#e1e8db]/40 flex-shrink-0"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/brand-feather.png";
                    }}
                  />
                  <div>
                    <span className="block text-[9px] font-extrabold uppercase tracking-wider text-amber-600">
                      {slide.widget2.label}
                    </span>
                    <span className="block text-xs font-extrabold text-[#2c3527] mt-0.5 leading-tight">
                      {slide.widget2.title}
                    </span>
                    <span className="block text-[9px] text-[#72856a] mt-0.5 leading-none">
                      {slide.widget2.sub}
                    </span>
                  </div>
                </motion.div>

                {/* Bottom Bar Widget */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-sm px-4 py-3 rounded-2xl shadow-lg border border-[#e1e8db]/60 flex justify-between items-center z-10 hover:bg-white transition-colors"
                >
                  <div>
                    <span className="block text-[8px] font-bold uppercase tracking-widest text-[#3b142e]">
                      {slide.commitment.label}
                    </span>
                    <span className="block text-xs font-black text-[#2c3527] mt-0.5">
                      {slide.commitment.title}
                    </span>
                  </div>
                  <span className="bg-[#3b142e]/10 text-[#3b142e] border border-[#3b142e]/20 px-2.5 py-1 rounded-md text-[9px] font-bold tracking-wider uppercase">
                    21+ REQUIRED
                  </span>
                </motion.div>

              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </section>
  );
}
