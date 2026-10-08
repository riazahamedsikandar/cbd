import React from "react";
import ClientPage from "../../ClientPage";
import { CURATED_BLOG_POSTS } from "../../../curatedBlogs";
import { LEARN_PAGES } from "../../../learnPages";

export const dynamicParams = false;

export default function BlogDetailPage() {
  return <ClientPage />;
}

const ALL_KNOWN_BLOG_SLUGS = [
  "how-to-choose-the-best-cbd-products-in-flower-mound-tx",
  "how-to-incorporate-cbd-into-your-daily-wellness-routine",
  "senior-pet-care-enhancing-playtime-and-healing-rest-with-cbd",
  "full-spectrum-vs-broad-spectrum-vs-cbd-isolate",
  "cbd-gummies-vs-cbd-oil-which-one-is-better-for-you",
  "cbd-gummies-vs-cbd-oil-whats-the-difference-and-which-one-is-right-for-you",
  "what-first-time-cbd-buyers-in-flower-mound-should-know",
  "cbd-vs-melatonin-for-sleep",
  "top-cbd-myths-debunked-for-flower-mound-shoppers",
  "top-rated-cbd-products-in-flower-mound-for-pain-and-stress-relief",
  "common-mistakes-to-avoid-when-buying-cbd-products",
  "cbd-for-stress-and-anxiety-what-science-and-customers-say",
  "cbd-for-stress-and-anxiety-science-research",
  "what-is-thca-flower-a-beginner-friendly-guide",
  "is-cbd-safe-flower-mound-first-time-users-guide",
  "how-much-cbd-should-a-beginner-take",
  "hemp-seed-oil-dosage-for-dogs-a-pet-owners-guide",
  "how-to-read-cbd-lab-report-coa-explained",
  "what-makes-tinctures-different-from-other-cbd-products",
  "how-to-use-cbd-tinctures-a-step-by-step-guide-for-new-users",
  "what-is-cbg-the-cannabinoid-people-are-asking-about-in-2026",
  "will-it-make-me-feel-weird-the-honest-answer-for-first-time-cbd-users",
  "how-to-get-through-stressful-workday-without-burning-out",
  "how-to-build-a-morning-that-does-not-start-with-anxiety",
  "what-does-it-mean-when-a-product-has-03-thc",
  "cbd-for-beginners-the-complete-guide-for-2026",
  "is-cbd-legal-in-texas-everything-you-need-to-know-in-2026",
  "how-to-choose-the-right-cbd-dosage-a-beginners-complete-guide",
  "how-does-cbd-work-in-the-body",
  "ultimate-guide-to-cbd-for-sleep-benefits-dosage-best-products-in-2026",
  "shatter-what-is-it-and-how-do-you-use-it",
  "sore-tired-and-restless-after-the-gym-what-helps-recovery-in-flower-mound",
  "cbd-gummies",
  "cbd-oils-tinctures",
  "cbd-topicals-creams",
  "cbd-capsules-softgels"
];

export function generateStaticParams() {
  const unique = new Map<string, { slug: string }>();

  CURATED_BLOG_POSTS.forEach((b) => {
    if (b.slug) unique.set(b.slug, { slug: b.slug });
  });

  LEARN_PAGES.forEach((lp) => {
    const s = lp.slug.replace(/^\//, "");
    if (s) unique.set(s, { slug: s });
  });

  ALL_KNOWN_BLOG_SLUGS.forEach((slug) => {
    if (slug) unique.set(slug, { slug });
  });

  return Array.from(unique.values());
}
