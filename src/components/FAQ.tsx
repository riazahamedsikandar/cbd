import { useState } from "react";
import { Plus, Minus, HelpCircle } from "lucide-react";
import { FAQ_ITEMS } from "../data";

import { FAQItem } from "../types";

interface FAQProps {
  faqsList?: FAQItem[];
}

export default function FAQ({ faqsList = FAQ_ITEMS }: FAQProps) {
  const [openId, setOpenId] = useState<number | null>(1);

  const toggleFAQ = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section className="py-20 px-4 sm:px-6 md:px-8 lg:px-12 bg-white border-b border-[#e1e8db]">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header Title */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <p className="text-[11px] font-mono tracking-widest text-[#3b142e] uppercase font-bold">
            RESOLVING YOUR DOUBTS
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-[#2c3527]">
            You’ve Any <span className="text-[#3b142e]">Question?</span>
          </h2>
          <p className="text-[#5b6b55] text-xs sm:text-sm">
            Learn more about dosages, compliance, certificates of analysis, and local pickup logistics in our Texas community.
          </p>
        </div>

        {/* Accordion Questions */}
        <div className="space-y-4 font-sans">
          {faqsList.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className={`rounded-2xl border transition-all duration-300 ${
                  isOpen
                    ? "bg-[#f7f9f4] border-[#3b142e]/30 shadow-md"
                    : "bg-white border-[#e1e8db] hover:border-[#3b142e] hover:bg-[#f7f9f4]/50"
                }`}
              >
                {/* Accordion Trigger Header */}
                <button
                  onClick={() => toggleFAQ(faq.id)}
                  className="w-full flex items-center justify-between text-left p-5 sm:p-6 focus:outline-none focus:ring-0 cursor-pointer"
                >
                  <div className="flex items-start gap-3.5 pr-4">
                    <HelpCircle className={`w-5 h-5 shrink-0 mt-0.5 ${isOpen ? "text-[#3b142e]" : "text-[#72856a]"}`} />
                    <span className="text-[#2c3527] text-xs sm:text-sm font-bold tracking-tight">
                      {faq.question}
                    </span>
                  </div>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 transition-all ${
                      isOpen
                        ? "bg-[#3b142e] border-[#3b142e] text-white font-extrabold rotate-180 shadow-sm"
                        : "bg-transparent border-[#e1e8db] text-[#5b6b55]"
                    }`}
                  >
                    {isOpen ? <Minus className="w-3.5 h-3.5 font-bold text-white" /> : <Plus className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {/* Collapsible Content */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? "max-h-[300px] border-t border-[#e1e8db]" : "max-h-0"
                  }`}
                >
                  <div className="p-5 sm:p-6 text-[#5b6b55] text-xs sm:text-sm leading-relaxed animate-fadeIn">
                    {faq.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
