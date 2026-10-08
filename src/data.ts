import { CURATED_40_PRODUCTS } from "./curatedProducts";
import { CURATED_BLOG_POSTS } from "./curatedBlogs";
import { CURATED_CATEGORIES } from "./curatedCategories";

export const IMAGES = {
  heroBg:
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'></svg>",
  cbdDropper: "/images/cbd_dropper_1779557730794.png",
  thcGummies: "/images/thc_gummies_pack_1779557751523.png",
  // Local folder category backdrops instead of stock Unsplash images
  cbdFlower: "/images/northern-lights-live-rosin-thc-gummies-indica.webp",
  cannabisPreRoll: "/images/northern-lights-live-rosin-thc-gummies-indica.webp",
  cbdCream: "/images/cbd-roll-on-cooling-2000mg.webp",
  petCbd: "/images/wyld-thc-free-peach-cbd-gummies.webp",
  beverage: "/images/sparkling-thc-iced-tea-lemonade.webp",
};

export const DEFAULT_CATEGORIES: CategoryItem[] = CURATED_CATEGORIES;

export const PRODUCTS: Product[] = CURATED_40_PRODUCTS;

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    name: "Sarah Jenkins",
    location: "Hurst, TX",
    content:
      "CBD American Shaman of Hurst has completely changed how I deal with daily anxiety. Their Full Spectrum CBD Oil helps me stay focused and calm during stressful corporate meetings, and the taste is remarkably clean. The Hurst community is so lucky to have them!",
    rating: 5,
  },
  {
    id: 2,
    name: "Marcus Ramirez",
    location: "Grapevine, TX",
    content:
      "The Delta-9 Gummies are incredibly reliable! They give a peaceful body relaxation that helps me wind down after intense heavy workouts without any morning fog. I appreciated the expert guidance in store that helped me select the exact right dosage.",
    rating: 5,
  },
  {
    id: 3,
    name: "Evelyn Carter",
    location: "Lewisville, TX",
    content:
      "I'm 68 years old and struggled with severe arthritic knee stiffness for a decade. The 1000mg muscle cream works within five minutes. It provides a beautiful cooling sensation and genuine flexibility. This is real relief, organic and top quality.",
    rating: 5,
  },
];

export const BLOG_POSTS: BlogPost[] = CURATED_BLOG_POSTS;

export const FAQ_ITEMS: FAQItem[] = [
  {
    id: 1,
    question: "What is CBD, and how does it support everyday wellness?",
    answer:
      "CBD (cannabidiol) is a natural, non-psychoactive botanical compound found in high density within industrial hemp. It works by stimulating your body's native endocannabinoid system (ECS), which governs core functions like sleep regulation, systemic inflammation responses, cognitive focus, and mood stability, keeping you in a natural state of balanced wellness.",
  },
  {
    id: 2,
    question:
      "Are your premium products double-tested by independent laboratories?",
    answer:
      "Absolutely! Every product on CBD American Shaman of Hurst' shelves is verified by third-party, ISO-certified state laboratories. We rigorously monitor purity, heavy metals, harmful pesticides, residual industrial solvents, and exact milligram potency. Transparent COA test results are readily accessible for every customer block.",
  },
  {
    id: 3,
    question: "Are Delta-9 and hemp-derived cannabinoids legal under Texas and Federal law?",
    answer:
      "Yes, 100%! Under both the Texas House Bill 1325 and the Federal Agriculture Improvement Act (Farm Bill), hemp-derived cannabinoids, including Delta-9 THC and CBD, are completely legal to purchase and enjoy, provided they are sourced from industrial hemp and contain less than 0.3% Delta-9 THC by dry weight.",
  },
  {
    id: 4,
    question: "What is the correct dosing advice for a cannabidiol freshman?",
    answer:
      "We strongly recommend a simple 'low and slow' onboarding rhythm. Start with a conservative dose—such as half a gummy (5mg-12.5mg) or five drops of tincture (roughly 10mg)—and allow up to two full hours to assess baseline somatic feelings before introducing secondary doses. Our Hurst in-store staff can guide you individually.",
  },
  {
    id: 5,
    question: "Can I pick up orders directly in your Hurst store?",
    answer:
      "Yes! You can purchase online directly through this applet and select 'In-Store Pickup' at our main boutique counter in Hurst, TX. Most community orders are processed and ready for discrete packaging inside 30 minutes, or we support rapid local shipping across the entire state of Texas.",
  },
];

export const MARION_THEME = {
  colors: {
    bgDark: "#0d0f0c", // Dark charcoal base with earthy touch
    bgCard: "#141712", // Secondary dark container bg
    accentGreen: "#3b142e",
    accentGreenHover: "#5d2a49",
    borderDark: "#262b21", // Subtle border forest-grey
    textMuted: "#9ea899", // Dusty sage grey text
    accentGold: "#f0bc37",
  },
};