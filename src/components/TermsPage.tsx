import React from "react";
import { ShieldAlert, Scale, CheckCircle2, FileText, MapPin, Phone, Mail } from "lucide-react";

export default function TermsPage({ setView }: { setView?: (view: string) => void }) {
  return (
    <div className="min-h-screen bg-[#fcfdfe] text-[#5b6b55] font-sans pb-24 animate-fadeIn">
      {/* Header Banner */}
      <div className="w-full bg-[#3b142e] text-white py-16 sm:py-20 relative overflow-hidden border-b border-[#5d2a49]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#3b142e]/20 border border-[#3b142e]/40 text-[#f0bc37] text-xs font-mono font-bold uppercase tracking-widest">
            <Scale className="w-4 h-4 text-[#3b142e]" />
            <span>Store Policy & Legal Compliance</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-black text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs sm:text-sm font-mono text-[#cbd5c2]">
            Last Updated: August 2026 • CBD American Shaman of Hurst • Hurst, TX
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 text-xs sm:text-sm leading-relaxed">
        {/* Important 21+ Age Requirement Box */}
        <div className="bg-[#f7f9f4] border border-[#3b142e]/30 rounded-2xl p-6 sm:p-8 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-[#3b142e] font-mono text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <span>Strict Age Verification Requirement (21+)</span>
          </div>
          <p className="text-[#2c3527] font-bold">
            You must be at least twenty-one (21) years of age to purchase products from CBD American Shaman of Hurst, enter our storefront, or browse our online platform.
          </p>
          <p className="text-[#5b6b55]">
            By accessing our store, placing an order, or creating an account, you legally affirm that you are at least 21 years old. Age verification screens and valid government-issued photo ID checks are strictly required upon order delivery or in-store pickup.
          </p>
        </div>

        {/* Section 1 */}
        <div className="space-y-3 bg-white p-6 sm:p-8 rounded-2xl border border-[#e1e8db] shadow-2xs">
          <h2 className="text-lg sm:text-xl font-serif font-bold text-[#2c3527] pb-2 border-b border-[#edf2e8]">
            1. Federal & State Hemp Compliance
          </h2>
          <p>
            All botanical formulas, tinctures, edibles, gummies, topicals, and sparkling beverages sold by CBD American Shaman of Hurst are derived exclusively from industrial hemp cultivated and produced in strict accordance with the <strong>2018 Federal Farm Bill (Section 10113)</strong> and <strong>Texas House Bill 1325 (Texas Agriculture Code Chapter 121)</strong>.
          </p>
          <p>
            Every product contains a total Delta-9 Tetrahydrocannabinol (Δ9-THC) concentration that does not exceed <strong>0.3% on a dry weight basis</strong>. Independent Certificates of Analysis (COAs) are publicly available for every batch.
          </p>
        </div>

        {/* Section 2 */}
        <div className="space-y-3 bg-white p-6 sm:p-8 rounded-2xl border border-[#e1e8db] shadow-2xs">
          <h2 className="text-lg sm:text-xl font-serif font-bold text-[#2c3527] pb-2 border-b border-[#edf2e8]">
            2. FDA & Health Disclaimer
          </h2>
          <p>
            The products and statements on this website have not been evaluated or approved by the Food and Drug Administration (FDA). These products are not intended to diagnose, treat, cure, or prevent any disease or medical condition.
          </p>
          <p>
            Cannabinoid supplements should be used only as directed on the label. Always consult with a licensed healthcare practitioner prior to use if you have a serious medical condition, take prescription medications, are pregnant, or are nursing.
          </p>
        </div>

        {/* Section 3 */}
        <div className="space-y-3 bg-white p-6 sm:p-8 rounded-2xl border border-[#e1e8db] shadow-2xs">
          <h2 className="text-lg sm:text-xl font-serif font-bold text-[#2c3527] pb-2 border-b border-[#edf2e8]">
            3. Ordering, Local Pickup & Hurst Delivery
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-[#5b6b55]">
            <li><strong>In-Store Pickup:</strong> Orders placed for pickup at 730 W Pipeline Rd, Hurst, TX 76053 are held for up to 48 hours. Photo ID is mandatory.</li>
            <li><strong>Local Delivery:</strong> Same-day and scheduled local delivery is available in Hurst and surrounding DFW communities. The recipient must be present with valid ID.</li>
            <li><strong>Shipping:</strong> We ship strictly to jurisdictions where industrial hemp products are legally permitted under local municipal laws.</li>
          </ul>
        </div>

        {/* Section 4 */}
        <div className="space-y-3 bg-white p-6 sm:p-8 rounded-2xl border border-[#e1e8db] shadow-2xs">
          <h2 className="text-lg sm:text-xl font-serif font-bold text-[#2c3527] pb-2 border-b border-[#edf2e8]">
            4. Returns, Exchanges & Satisfaction Guarantee
          </h2>
          <p>
            Your satisfaction and wellness experience are our highest priorities. Unopened products in their original manufacturer-sealed packaging may be returned within <strong>14 days of purchase</strong> for a full refund or store exchange.
          </p>
          <p>
            If a product arrives damaged or defective, please notify our team within 48 hours of delivery with photographic evidence for immediate replacement.
          </p>
        </div>

        {/* Section 5 */}
        <div className="space-y-3 bg-white p-6 sm:p-8 rounded-2xl border border-[#e1e8db] shadow-2xs">
          <h2 className="text-lg sm:text-xl font-serif font-bold text-[#2c3527] pb-2 border-b border-[#edf2e8]">
            5. Governing Law & Dispute Resolution
          </h2>
          <p>
            These Terms of Service and any separate agreements whereby we provide you services shall be governed by and construed in accordance with the laws of the <strong>State of Texas</strong>. Any dispute arising out of or relating to these terms shall be subject to the exclusive jurisdiction of the state and federal courts located in <strong>Denton County, Texas</strong>.
          </p>
        </div>

        {/* Contact info box */}
        <div className="bg-[#edf2e8] p-6 rounded-2xl border border-[#cbd5c2] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <div>
            <h4 className="font-bold text-[#2c3527]">Questions regarding our Terms?</h4>
            <p className="text-[#72856a]">Contact our store management team anytime during operating hours.</p>
          </div>
          <div className="flex gap-3">
            <a href="tel:+18174943335" className="px-4 py-2 rounded-xl bg-[#3b142e] text-white font-bold hover:bg-[#5d2a49] transition-colors">
              Call Store
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
