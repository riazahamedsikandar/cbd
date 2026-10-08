import React, { useState } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  Navigation
} from "lucide-react";
import { BusinessSettings } from "../types";

interface ContactPageProps {
  setView?: (view: string) => void;
  settings?: BusinessSettings;
  onInquirySubmitted?: (e: React.FormEvent<HTMLFormElement>) => void;
}

export default function ContactPage({
  setView,
  settings = {
    phone: "+1 (817) 494-3335",
    email: "",
    hours: "Monday - Friday: 10:30am - 7:30 pm | Saturday: 10:30am - 6:30 pm | Sunday: 11:00 am - 6:00 pm",
    location: "730 W Pipeline Rd, Hurst, TX 76053",
    heroBadge: "",
    heroHeadingLine1: "",
    heroHeadingLine2: "",
    heroParagraph: "",
    heroButtonPrimary: "",
    heroButtonSecondary: "",
    heroImage: "",
    heroVerifiedText: "",
    heroWidget1Image: "",
    heroWidget1Label: "",
    heroWidget1Title: "",
    heroWidget1Rating: "",
    heroWidget2Image: "",
    heroWidget2Label: "",
    heroWidget2Title: "",
    heroWidget2Sub: "",
    heroCommitmentLabel: "",
    heroCommitmentTitle: "",
    seoTitleOverride: "",
    seoDescriptionOverride: "",
    seoKeywordsOverride: ""
  },
  onInquirySubmitted
}: ContactPageProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "Product Inquiry",
    message: ""
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onInquirySubmitted) {
      onInquirySubmitted(e);
    }
    setSubmitted(true);
    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: "Product Inquiry",
      message: ""
    });
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    settings.location || "730 W Pipeline Rd, Hurst, TX 76053"
  )}`;

  return (
    <div className="animate-fadeIn min-h-screen bg-[#fcfdfe] flex flex-col font-sans pb-24 text-[#5b6b55]">
      {/* Header Banner */}
      <div className="w-full bg-[#3b142e] text-white py-14 sm:py-20 border-b border-[#e1e8db] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#27101f] via-[#3b142e] to-[#27101f] opacity-90" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#3b142e] text-white text-[11px] font-mono font-bold uppercase tracking-wider shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Direct Storefront & Wellness Support</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black text-white leading-tight tracking-tight">
            Contact CBD American Shaman of Hurst <br className="hidden sm:inline" />
            <span className="text-[#f0bc37]">Hurst, Texas</span>
          </h1>

          <p className="text-xs sm:text-sm text-[#cbd5c2] max-w-2xl leading-relaxed">
            Stop by our Hurst storefront or connect with our certified botanical consultants for personalized cannabinoid guidance, batch lab metrics, and store pickup options.
          </p>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-10 sm:py-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Direct Info Cards & Hours */}
          <div className="lg:col-span-5 space-y-6">
            {/* Store Card */}
            <div className="bg-white border border-[#e1e8db] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center gap-3 border-b border-[#edf2e8] pb-4">
                <div className="w-10 h-10 rounded-2xl bg-[#3b142e]/10 border border-[#3b142e]/20 flex items-center justify-center text-[#3b142e]">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2c3527] font-serif">
                    Physical Storefront
                  </h3>
                  <p className="text-xs text-[#72856a]">
                    Hurst, Tarrant County, Texas
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-[#5b6b55]">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#3b142e] shrink-0 mt-1" />
                  <div>
                    <strong className="text-[#2c3527] block">Address:</strong>
                    <span>{settings.location}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#3b142e] shrink-0 mt-1" />
                  <div>
                    <strong className="text-[#2c3527] block">Direct Phone:</strong>
                    <a
                      href={`tel:${settings.phone.replace(/[^0-9+]/g, "")}`}
                      className="text-[#3b142e] hover:underline font-semibold"
                    >
                      {settings.phone}
                    </a>
                  </div>
                </div>

                {settings.email && <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#3b142e] shrink-0 mt-1" />
                  <div>
                    <strong className="text-[#2c3527] block">Direct Email:</strong>
                    <a
                      href={`mailto:${settings.email}`}
                      className="text-[#3b142e] hover:underline font-semibold"
                    >
                      {settings.email}
                    </a>
                  </div>
                </div>}
              </div>

              <div className="pt-2">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-2xl bg-[#2c3527] hover:bg-black text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <Navigation className="w-4 h-4 text-[#f0bc37]" />
                  <span>Get Directions on Google Maps ↗</span>
                </a>
              </div>
            </div>

            {/* Hours Card */}
            <div className="bg-[#edf2e8] border border-[#cbd5c2] rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white border border-[#cbd5c2] flex items-center justify-center text-[#3b142e]">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2c3527] font-serif">
                    Operational Clocks
                  </h3>
                  <p className="text-xs text-[#72856a]">
                    Open 7 Days a Week
                  </p>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-[#5b6b55] pt-2 border-t border-[#cbd5c2]/60">
                <li className="flex justify-between items-center py-1 border-b border-[#cbd5c2]/30">
                  <span className="font-semibold text-[#2c3527]">Monday – Friday:</span>
                  <span className="font-mono text-[#3b142e] font-bold">10:30 AM – 7:30 PM</span>
                </li>
                <li className="flex justify-between items-center py-1 border-b border-[#cbd5c2]/30">
                  <span className="font-semibold text-[#2c3527]">Saturday:</span>
                  <span className="font-mono text-[#3b142e] font-bold">10:30 AM – 6:30 PM</span>
                </li>
                <li className="flex justify-between items-center py-1">
                  <span className="font-semibold text-[#2c3527]">Sunday:</span>
                  <span className="font-mono text-[#3b142e] font-bold">11:00 AM – 6:00 PM</span>
                </li>
              </ul>
            </div>

            {/* Compliance Badge Card */}
            <div className="bg-white border border-[#e1e8db] rounded-3xl p-6 shadow-xs flex items-center gap-4">
              <ShieldCheck className="w-8 h-8 text-[#3b142e] shrink-0" />
              <div className="text-xs text-[#72856a] leading-relaxed">
                <strong className="text-[#2c3527] block">Texas Farm Bill Certified:</strong>
                All products compliant under Section 10113 (0.3% THC limit). Age 21+ required.
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Secure Message Form */}
          <div className="lg:col-span-7 bg-white border border-[#e1e8db] rounded-3xl p-6 sm:p-10 md:p-12 shadow-xs space-y-6">
            <div className="space-y-2 border-b border-[#edf2e8] pb-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#3b142e]">
                <MessageSquare className="w-4 h-4" />
                <span>Send Secure Inquiries</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#2c3527]">
                Connect with our Hurst Specialists
              </h2>
              <p className="text-xs sm:text-sm text-[#5b6b55] leading-relaxed">
                Have a question regarding product strength, batch lab reports, or store recommendations? Send us a message and our team will respond within 4 business hours.
              </p>
            </div>

            {submitted ? (
              <div className="p-8 bg-[#f7f9f4] border border-[#3b142e]/30 rounded-2xl text-center space-y-4 animate-fadeIn">
                <div className="w-14 h-14 bg-[#3b142e]/10 border border-[#3b142e]/30 text-[#3b142e] rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-8 h-8 text-[#3b142e]" />
                </div>
                <h3 className="text-lg font-serif font-bold text-[#2c3527]">
                  Inquiry Dispatched Successfully!
                </h3>
                <p className="text-xs sm:text-sm text-[#5b6b55] max-w-md mx-auto leading-relaxed">
                  Thank you for contacting CBD American Shaman of Hurst. Our team will review your message and follow up shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-6 py-2.5 rounded-xl bg-[#2c3527] text-white text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors cursor-pointer"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-xs">
                    <label className="text-[#2c3527] font-bold uppercase tracking-wider text-[10px]">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full px-4 py-3 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-xs text-[#2c3527] focus:outline-none focus:border-[#3b142e] focus:bg-white transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <label className="text-[#2c3527] font-bold uppercase tracking-wider text-[10px]">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. sarah@example.com"
                      className="w-full px-4 py-3 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-xs text-[#2c3527] focus:outline-none focus:border-[#3b142e] focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-xs">
                    <label className="text-[#2c3527] font-bold uppercase tracking-wider text-[10px]">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (214) 000-0000"
                      className="w-full px-4 py-3 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-xs text-[#2c3527] focus:outline-none focus:border-[#3b142e] focus:bg-white transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <label className="text-[#2c3527] font-bold uppercase tracking-wider text-[10px]">
                      Inquiry Topic *
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-xs text-[#2c3527] focus:outline-none focus:border-[#3b142e] focus:bg-white transition-colors"
                    >
                      <option value="Product Inquiry">Product Inquiry / Dosing Guidance</option>
                      <option value="Store Pickup">Store Pickup & Availability</option>
                      <option value="Lab Testing / COA">Lab Testing & COA Verification</option>
                      <option value="Wholesale / Partnership">Wholesale & Business Inquiries</option>
                      <option value="General Support">General Wellness Question</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <label className="text-[#2c3527] font-bold uppercase tracking-wider text-[10px]">
                    Detailed Message *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Describe how we can assist your wellness goals or product selection..."
                    className="w-full px-4 py-3 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-xs text-[#2c3527] focus:outline-none focus:border-[#3b142e] focus:bg-white transition-colors resize-none leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-[#3b142e] hover:bg-[#5d2a49] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <Send className="w-4 h-4 text-white" />
                  <span>Send Secure Inquiry to CBD American Shaman of Hurst</span>
                </button>
              </form>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
