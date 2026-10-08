import { Star, MessageSquare } from "lucide-react";
import { TESTIMONIALS } from "../data";

export default function Testimonials() {
  return (
    <section className="py-20 px-4 sm:px-6 md:px-8 lg:px-12 bg-[#f7f9f4] border-b border-[#e1e8db]">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header Title */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <p className="text-[11px] font-mono tracking-widest text-[#3b142e] uppercase font-bold">
            WHAT THEY'RE TALKING
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-[#2c3527]">
            Loved By Our <span className="text-[#3b142e]">Texas Community</span>
          </h2>
          <p className="text-[#5b6b55] text-xs sm:text-sm">
            Hear from our local community about their experiences with our wellness products.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
          {TESTIMONIALS.map((testimonial) => (
            <div
              key={testimonial.id}
              className="p-6 rounded-2xl bg-white border border-[#e1e8db] flex flex-col justify-between relative group hover:border-[#3b142e] hover:shadow-xl transition-all duration-300 shadow-sm"
            >
              {/* Decorative quotation icon */}
              <MessageSquare className="absolute top-5 right-5 w-8 h-8 text-[#e1e8db]/60 group-hover:text-[#3b142e]/10 transition-colors pointer-events-none" />

              {/* Rating stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#c49b1a] text-[#c49b1a]" />
                ))}
              </div>

              {/* Speech */}
              <p className="text-xs sm:text-sm text-[#5b6b55] leading-relaxed italic mb-6">
                "{testimonial.content}"
              </p>

              {/* User Identity Info */}
              <div className="flex items-center gap-3 pt-4 border-t border-[#edf2e8]">
                {/* Simulated Avatar capsule */}
                <div className="w-10 h-10 rounded-full bg-[#f7f9f4] border border-[#e1e8db] flex items-center justify-center font-bold text-xs text-[#3b142e] font-mono uppercase select-none">
                  {testimonial.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#2c3527] leading-none mb-1">
                    {testimonial.name}
                  </h4>
                  <span className="text-[10px] text-[#72856a] font-mono">
                    {testimonial.location}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
