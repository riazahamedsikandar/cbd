import { CategoryItem } from "./types";

export const CURATED_CATEGORIES: CategoryItem[] = [
  {
    id: "drinks",
    title: "Drinks",
    tagline: "Drinks",
    desc: "Refreshing hemp-infused sparkling beverages, tonics, and crisp seltzers.",
    image: "/images/categories/drinks.jpg",
    isFeaturedHome: true,
  },
  {
    id: "edibles-and-gummies",
    title: "Edibles and Gummies",
    tagline: "Delicious Baked Treats",
    desc: "Crispy cereal treats, gourmet chocolates, and artisan baked goods.",
    image: "/images/categories/edibles-and-gummies.jpg",
    isFeaturedHome: false,
  },
  {
    id: "pet",
    title: "Pet",
    tagline: "Pet Wellness",
    desc: "Fast-absorbing full spectrum oils loaded with trace terpenes.",
    image: "/images/categories/pet.jpg",
    isFeaturedHome: false,
  },
  {
    id: "tinctures",
    title: "Tinctures",
    tagline: "Tinctures",
    desc: "Potent sublingual Delta-9 tincture oil formulations.",
    image: "/images/categories/tinctures.jpg",
    isFeaturedHome: true,
  },
  {
    id: "topicals",
    title: "Topicals",
    tagline: "Topicals",
    desc: "Targeted soothing CBD muscle creams, cooling roll-ons, and joint balms.",
    image: "/images/categories/topicals.jpg",
    isFeaturedHome: true,
  },
];
