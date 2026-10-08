import React from "react";
import { ShieldCheck, Lock, Eye, FileText, Server, UserCheck } from "lucide-react";

export default function PrivacyPage({ setView }: { setView?: (view: string) => void }) {
  return (
    <div className="min-h-screen bg-[#fcfdfe] text-[#5b6b55] font-sans pb-24 animate-fadeIn">
      {/* Header Banner */}
      <div className="w-full bg-[#3b142e] text-white py-16 sm:py-20 relative overflow-hidden border-b border-[#5d2a49]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#3b142e]/20 border border-[#3b142e]/40 text-[#f0bc37] text-xs font-mono font-bold uppercase tracking-widest">
            <Lock className="w-4 h-4 text-[#3b142e]" />
            <span>Data Security & Customer Trust</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-black text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm font-mono text-[#cbd5c2]">
            Effective Date: August 2026 • CBD American Shaman of Hurst • Hurst, TX
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 text-xs sm:text-sm leading-relaxed">
        {/* Core Principles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#e1e8db] space-y-1.5 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-[#3b142e]/10 flex items-center justify-center text-[#3b142e] mb-2">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-[#2c3527] text-xs uppercase tracking-wider">End-to-End Encryption</h3>
            <p className="text-[#5b6b55] text-xs">All checkout sessions and client interactions use 256-bit SSL encryption.</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e1e8db] space-y-1.5 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-[#3b142e]/10 flex items-center justify-center text-[#3b142e] mb-2">
              <Eye className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-[#2c3527] text-xs uppercase tracking-wider">We Never Sell Data</h3>
            <p className="text-[#5b6b55] text-xs">Your personal details and order history are never monetized or sold to third parties.</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e1e8db] space-y-1.5 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-[#3b142e]/10 flex items-center justify-center text-[#3b142e] mb-2">
              <UserCheck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-[#2c3527] text-xs uppercase tracking-wider">Texas Privacy Compliant</h3>
            <p className="text-[#5b6b55] text-xs">Full compliance with the Texas Data Privacy and Security Act (TDPSA).</p>
          </div>
        </div>

        {/* Section 1 */}
        <div className="space-y-3 bg-white p-6 sm:p-8 rounded-2xl border border-[#e1e8db] shadow-2xs">
          <h2 className="text-lg sm:text-xl font-serif font-bold text-[#2c3527] pb-2 border-b border-[#edf2e8]">
            1. Information We Collect
          </h2>
          <p>
            When you visit our store, place an order, or subscribe to our newsletter, we may collect the following categories of information:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-[#5b6b55]">
            <li><strong>Contact Information:</strong> Name, billing address, local delivery address, email address, and phone number.</li>
            <li><strong>Age & Identity Verification:</strong> Date of birth and government-issued ID data strictly to verify 21+ legal compliance.</li>
            <li><strong>Payment Information:</strong> Credit/debit card information processed securely via tokenized, PCI-DSS compliant merchant gateways. We never store raw card numbers on our servers.</li>
            <li><strong>Technical Data:</strong> Browser type, device characteristics, IP address, and cookie identifiers to improve site navigation and performance.</li>
          </ul>
        </div>

        {/* Section 2 */}
        <div className="space-y-3 bg-white p-6 sm:p-8 rounded-2xl border border-[#e1e8db] shadow-2xs">
          <h2 className="text-lg sm:text-xl font-serif font-bold text-[#2c3527] pb-2 border-b border-[#edf2e8]">
            2. How We Use Your Information
          </h2>
          <p>
            We process your information strictly for legitimate commercial and wellness service purposes:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-[#5b6b55]">
            <li>Fulfilling, packaging, and delivering your online orders and local Hurst drop-offs.</li>
            <li>Sending automated order confirmations, delivery tracking updates, and receipt copies.</li>
            <li>Complying with Texas Department of State Health Services (DSHS) retail hemp regulations and mandatory age verification.</li>
            <li>Delivering educational wellness updates and promotional discounts (with one-click opt-out anytime).</li>
          </ul>
        </div>

        {/* Section 3 */}
        <div className="space-y-3 bg-white p-6 sm:p-8 rounded-2xl border border-[#e1e8db] shadow-2xs">
          <h2 className="text-lg sm:text-xl font-serif font-bold text-[#2c3527] pb-2 border-b border-[#edf2e8]">
            3. Data Sharing & Security Safeguards
          </h2>
          <p>
            We do not sell, rent, or trade your personal data. We only share information with trusted third-party service providers who assist us in operating our storefront (e.g., payment processors, local logistics partners, and age verification providers). All partners are bound by strict confidentiality and data protection agreements.
          </p>
        </div>

        {/* Section 4 */}
        <div className="space-y-3 bg-white p-6 sm:p-8 rounded-2xl border border-[#e1e8db] shadow-2xs">
          <h2 className="text-lg sm:text-xl font-serif font-bold text-[#2c3527] pb-2 border-b border-[#edf2e8]">
            4. Your Rights Under Texas Law (TDPSA)
          </h2>
          <p>
            As a Texas resident, you have the right to request access to the personal data we hold about you, request corrections to inaccuracies, or request the deletion of your account data (subject to statutory recordkeeping requirements).
          </p>
          <p>
            To exercise your privacy rights, please call us at <a href="tel:+18174943335" className="text-[#3b142e] font-bold underline">(817) 494-3335</a> or visit our storefront in Hurst, TX.
          </p>
        </div>

        {/* Contact info box */}
        <div className="bg-[#edf2e8] p-6 rounded-2xl border border-[#cbd5c2] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <div>
            <h4 className="font-bold text-[#2c3527]">CBD American Shaman of Hurst Privacy & Compliance Team</h4>
            <p className="text-[#72856a]">730 W Pipeline Rd, Hurst, TX 76053</p>
          </div>
          <a href="tel:+18174943335" className="px-5 py-2.5 rounded-xl bg-[#3b142e] text-white font-bold hover:bg-[#5d2a49] transition-colors">
            Contact Privacy Officer
          </a>
        </div>
      </div>
    </div>
  );
}
