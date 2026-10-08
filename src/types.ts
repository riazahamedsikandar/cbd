export interface CategoryItem {
  id: string;
  title: string;
  tagline?: string;
  desc?: string;
  image?: string;
  icon?: string;
  showInMenu?: boolean;
  isFeaturedHome?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LabResults {
  purity: string;
  cannabinoids: string;
  solventFree: boolean;
  heavyMetalsPass: boolean;
  pesticidesPass: boolean;
}

export interface Product {
  id: string;
  slug?: string;
  name: string;
  description: string;
  longDescription: string;
  price: number;
  category: string;
  categories?: string[];
  categoryLabel: string;
  rating: number;
  image: string;
  reviewsCount: number;
  thc: string;
  cbd: string;
  options: string[];
  benefits: string[];
  labResults: LabResults;
  isBestSeller?: boolean;
  isFeaturedHome?: boolean;
  isNew?: boolean;
  status?: string;
  // SEO fields
  metaTitle?: string;
  metaDescription?: string;
  tags?: string;
  altText?: string;
  canonicalUrl?: string;
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedOption: string;
}

export interface Testimonial {
  id: number;
  name: string;
  location: string;
  content: string;
  rating: number;
}

export interface BlogPost {
  id: number;
  title: string;
  summary: string;
  content: string;
  date: string;
  category: string;
  image: string;
  author: string;
  slug?: string;
  // SEO fields
  metaTitle?: string;
  metaDescription?: string;
  tags?: string;
  altText?: string;
  canonicalUrl?: string;
  isFeaturedHome?: boolean;
  readTime?: string;
  excerpt?: string;
  faqs?: { question: string; answer: string }[];
}

export interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

export interface OrderItem {
  productName: string;
  selectedOption: string;
  quantity: number;
  price: number;
  image?: string;
  category?: string;
}

export interface Order {
  id: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  deliveryMethod: string;
  paymentMethod: string;
  status: string;
  date: string;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  msg: string;
  status: string;
  date: string;
}

export interface BusinessSettings {
  phone: string;
  email: string;
  hours: string;
  location: string;
  heroBadge?: string;
  heroHeadingLine1?: string;
  heroHeadingLine2?: string;
  heroParagraph?: string;
  heroButtonPrimary?: string;
  heroButtonSecondary?: string;
  heroImage?: string;
  heroVerifiedText?: string;
  heroWidget1Image?: string;
  heroWidget1Label?: string;
  heroWidget1Title?: string;
  heroWidget1Rating?: string;
  heroWidget2Image?: string;
  heroWidget2Label?: string;
  heroWidget2Title?: string;
  heroWidget2Sub?: string;
  heroCommitmentLabel?: string;
  heroCommitmentTitle?: string;
  seoTitleOverride?: string;
  seoDescriptionOverride?: string;
  seoKeywordsOverride?: string;
  [key: string]: any;
}

export interface ReviewItem {
  id: string;
  productId: string;
  productName?: string;
  author: string;
  rating: number;
  comment: string;
  title?: string;
  date: string;
  created_at?: string;
}

export interface StoreBackupData {
  version: string;
  timestamp: string;
  exportDate: string;
  websiteUrl: string;
  websiteName: string;
  products: Product[];
  categories: CategoryItem[];
  blogPosts: BlogPost[];
  faqItems: FAQItem[];
  businessSettings: BusinessSettings;
  pageUrlsAndMenus?: Record<string, any>;
  reviews?: ReviewItem[];
  orders?: Order[];
  inquiries?: Inquiry[];
}

