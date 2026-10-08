import { useState } from "react";
import { Tag, Gift, Check } from "lucide-react";

export default function Promo() {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText("BUDZ20");
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <section className="relative py-16 px-4 sm:px-6 md:px-8 lg:px-12 bg-[#f7f9f4] border-b border-[#e1e8db] overflow-hidden">
      {/* Decorative side spotlight orbs */}
      <div className="absolute top-1/2 left-10 -translate-y-1/2 w-64 h-64 rounded-full bg-[#3b142e]/5 blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 right-10 -translate-y-1/2 w-64 h-64 rounded-full bg-[#c49b1a]/5 blur-3xl pointer-events-none"></div>

      <div className="max-w-5xl mx-auto relative z-10 bg-white rounded-3xl p-8 sm:p-12 border border-[#e1e8db] shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center font-sans">
          {/* Left Column: Heading & offer detail */}
          <div className="lg:col-span-7 space-y-4 text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#c49b1a] bg-[#c49b1a]/10 border border-[#c49b1a]/20 px-3.5 py-1.5 rounded-full uppercase tracking-wider">
              <Gift className="w-3.5 h-3.5 text-[#c49b1a]" />
              <span>Limited Offer</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-[#2c3527] leading-tight select-none">
              Claim Your <span className="text-[#3b142e]">20% Discount</span> <br />
              at Our Hurst Store!
            </h2>

            <p className="text-[#5b6b55] text-sm leading-relaxed max-w-xl">
              Visit our Hurst, TX store for current offers on select hemp-derived products. Present the promo code in-store or enter it at checkout.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
              {/* Promo code visual with copy interaction */}
              <button
                onClick={handleCopyCode}
                title="Click to copy promo code"
                className="flex items-center gap-3 bg-[#f7f9f4] hover:bg-[#edf2e8] px-6 py-3.5 rounded-2xl border-2 border-dashed border-[#3b142e]/50 hover:border-[#3b142e] text-[#2c3527] font-mono font-bold text-base tracking-widest relative group shadow-sm transition-all cursor-pointer"
              >
                <Tag className="w-4 h-4 text-[#3b142e]" />
                <span>BUDZ20</span>
                {copied ? (
                  <span className="flex items-center gap-1 bg-[#3b142e] text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <Check className="w-3 h-3" /> COPIED
                  </span>
                ) : (
                  <span className="bg-[#c49b1a] text-white text-[8px] font-mono font-black px-2 py-0.5 rounded uppercase">
                    TAP TO COPY
                  </span>
                )}
              </button>

              <p className="text-[11px] text-[#72856a] font-mono leading-relaxed">
                *Present in-store or apply at checkout. Standard 21+ verification applies.
              </p>
            </div>
          </div>

          {/* Right Column: Storefront Special Privilege (Clean typography, no emojis) */}
          <div className="lg:col-span-5 flex flex-col justify-center p-6 sm:p-8 bg-[#f7f9f4] border border-[#e1e8db] rounded-2xl font-sans shrink-0 shadow-xs space-y-4 text-left">
            <div className="text-xs font-mono text-[#3b142e] uppercase tracking-widest font-bold">
              Storefront Special Privilege
            </div>

            <div className="space-y-4 pt-1">
              <div>
                <h4 className="text-sm font-bold text-[#2c3527]">In-Store &amp; Pickup Ready</h4>
                <p className="text-xs text-[#5b6b55] leading-relaxed mt-0.5">
                  730 W Pipeline Rd, Hurst, TX 76053.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-[#2c3527]">100% Texas Farm-Compliant</h4>
                <p className="text-xs text-[#5b6b55] leading-relaxed mt-0.5">
                  All Delta-9 products strictly verified under 0.3% Δ9-THC limit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
