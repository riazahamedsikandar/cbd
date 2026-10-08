import React, { useState } from "react";
import {
  Leaf,
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
const logoImg = "/brand-logo.png";

interface FooterProps {
  setView: (view: string) => void;
  setSelectedCategory: (category: string) => void;
  openContactModal: () => void;
  onSelectTopic?: (topic: string) => void;
  onOpenAdmin?: () => void;
  settings?: {
    phone: string;
    email: string;
    hours: string;
    location: string;
  };
}

export default function Footer({
  setView,
  setSelectedCategory,
  openContactModal,
  onSelectTopic,
  settings = {
    phone: "+1 (817) 494-3335",
    email: "",
    hours:
      "Mon - Fri: 10:30 AM - 7:30 PM | Sat: 10:30 AM - 6:30 PM | Sun: 11:00 AM - 6:00 PM",
    location: "730 W Pipeline Rd, Hurst, TX 76053",
  },
}: FooterProps) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() !== "") {
      setSubscribed(true);
      setEmail("");
    }
  };

  const handleCategoryNav = (catId: string) => {
    setSelectedCategory(catId);
    setView("shop");
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  return (
    <footer className="bg-[#3b142e] text-[#eadfe6] font-sans border-t border-[#5d2a49]">
      {/* Top newsletter banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-12 border-b border-[#5d2a49] grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-6 space-y-2">
          <h3 className="text-white font-bold text-lg font-serif">
            Join the Hurst Wellness Club
          </h3>
          <p className="text-xs text-[#d7c6d0]">
            Get early alerts on new lab certificates, limited artisanal gummy
            batches, and local discounts.
          </p>
        </div>
        <div className="md:col-span-6">
          {subscribed ? (
            <div className="p-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 animate-pulse text-[#f0bc37]" />
              <span>
                Awesome! Sourcing insights are traveling to your inbox now.
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your personal email address..."
                className="w-full px-4 py-3 bg-white border border-[#5d2a49] rounded-xl text-[#3b142e] text-xs placeholder-[#72856a]/60 focus:outline-none focus:border-[#f0bc37] focus:ring-1 focus:ring-[#f0bc37]"
              />
              <button
                type="submit"
                className="px-5 rounded-xl bg-[#f0bc37] hover:bg-[#e0a921] text-[#3b142e] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shrink-0 font-sans cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-[#3b142e]" />
                <span>Join</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Main Footer blocks */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Logo and brief */}
        <div className="space-y-4">
          <div className="w-40 h-28">
            <img
              src={logoImg}
              alt="CBD American Shaman of Hurst"
              className="w-full h-full object-contain object-left"
            />
          </div>

          <p className="text-xs text-[#d7c6d0] leading-relaxed">
            Our Hurst, Texas boutique delivers transparently certified
            organic wellness. We help modern families explore legal plant-based
            cannabinoids safely.
          </p>

          <div className="p-3.5 rounded-xl border border-amber-300/25 bg-amber-300/10 text-[10px] text-amber-100 leading-relaxed font-mono flex gap-2">
            <ShieldAlert className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-300" />
            <span>
              <strong>Must be 21+ to Purchase:</strong> All THC/CBD orders
              require legal age validation checks and compliance screens at
              delivery.
            </span>
          </div>
        </div>

        {/* Column 2: Learn Guides (5 CSV Landing Pages) */}
        <div className="space-y-3">
          <h4 className="text-white text-xs font-extrabold uppercase tracking-widest">
            Learn Guides
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <a
                href="/cbd-gummies"
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    if (onSelectTopic) onSelectTopic("cbd-gummies");
                    setView("learn");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="hover:text-[#f0bc37] transition-colors text-left text-[#eadfe6] block cursor-pointer"
              >
                CBD Gummies
              </a>
            </li>
            <li>
              <a
                href="/cbd-oils-tinctures"
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    if (onSelectTopic) onSelectTopic("cbd-oils-tinctures");
                    setView("learn");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="hover:text-[#f0bc37] transition-colors text-left text-[#eadfe6] block cursor-pointer"
              >
                CBD Tinctures
              </a>
            </li>
            <li>
              <a
                href="/cbd-capsules-softgels"
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    if (onSelectTopic) onSelectTopic("cbd-capsules-softgels");
                    setView("learn");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="hover:text-[#f0bc37] transition-colors text-left text-[#eadfe6] block cursor-pointer"
              >
                CBD Capsules
              </a>
            </li>
            <li>
              <a
                href="/cbd-topicals-creams"
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    if (onSelectTopic) onSelectTopic("cbd-topicals-creams");
                    setView("learn");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="hover:text-[#f0bc37] transition-colors text-left text-[#eadfe6] block cursor-pointer"
              >
                CBD Topicals
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3: About / More */}
        <div className="space-y-3">
          <h4 className="text-white text-xs font-extrabold uppercase tracking-widest">
            About / More
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <a
                href="/about"
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    setView("about");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="hover:text-[#f0bc37] transition-colors text-left text-[#eadfe6] cursor-pointer block"
              >
                About Our Store
              </a>
            </li>
            <li>
              <a
                href="/contact"
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    setView("contact");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="hover:text-[#f0bc37] transition-colors text-left text-[#eadfe6] cursor-pointer block"
              >
                Contact / Visit Us
              </a>
            </li>
            <li>
              <a
                href="/blogs"
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    setView("blogs");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="hover:text-[#f0bc37] transition-colors text-left text-[#eadfe6] block cursor-pointer"
              >
                Educational Blogs
              </a>
            </li>
            <li>
              <a
                href="/faq"
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    setView("faq");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="hover:text-[#f0bc37] transition-colors text-left text-[#eadfe6] block cursor-pointer"
              >
                Frequently Asked Questions
              </a>
            </li>
            <li>
              <a
                href="/shop"
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    setView("shop");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="hover:text-[#f0bc37] transition-colors text-left text-[#eadfe6] block cursor-pointer"
              >
                Shop All Products
              </a>
            </li>
          </ul>
        </div>

        {/* Contact info block */}
        <div className="space-y-3">
          <h4 className="text-white text-xs font-extrabold uppercase tracking-widest">
            Direct Storefront
          </h4>
          <ul className="space-y-3 text-xs leading-relaxed text-[#eadfe6]">
            <li className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[#f0bc37] shrink-0 mt-0.5" />
              <span>{settings.location}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-[#f0bc37] shrink-0 mt-0.5" />
              <span>{settings.phone}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-[#f0bc37] shrink-0 mt-0.5" />
              <span>{settings.hours}</span>
            </li>
            {settings.email && (
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-[#f0bc37] shrink-0 mt-0.5" />
                <span>{settings.email}</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* FDA disclaimers and copyrights */}
      <div className="bg-[#2c1023] py-8 text-[11px] text-[#d7c6d0] font-mono border-t border-[#5d2a49]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 space-y-4 text-center sm:text-justify leading-relaxed">
          <p className="pt-2">
            <strong>FDA Disclaimer:</strong> These statements and molecular
            claims have not been verified by the Food and Drug Administration.
            These products are not intended to diagnose, heal, prevent, or treat
            any medical conditions. Please consult with licensed medical and
            clinical supervisors before integrating sublingual tinctures or
            edible cannabinoids into daily regimes if you are pregnant, nursing,
            or carrying chronic heart risks.
          </p>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 border-t border-[#5d2a49] text-xs">
            <span className="text-center md:text-left text-[11px] leading-relaxed max-w-2xl">
              © 2026 CBD American Shaman of Hurst. Sourced strictly
              in compliance with Section 10113 of the 2018 Federal Farm Bill
              under Texas Law.
            </span>
            <div className="flex items-center gap-3 sm:gap-4 shrink-0 font-medium text-[11px] sm:text-xs">
              <a
                href="/terms"
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    setView("terms");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="hover:text-[#f0bc37] transition-colors cursor-pointer whitespace-nowrap"
              >
                Terms
              </a>
              <span className="text-white/40 select-none">•</span>
              <a
                href="/privacy"
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    setView("privacy");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="hover:text-[#f0bc37] transition-colors cursor-pointer whitespace-nowrap"
              >
                Privacy Policies
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
