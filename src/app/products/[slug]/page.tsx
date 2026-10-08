import React from "react";
import ClientPage from "../../ClientPage";
import { CURATED_40_PRODUCTS } from "../../../curatedProducts";

const ADMIN_PREVIEW_PRODUCT_SLUGS = [
  "test",
  "test1",
  "sample-product",
  "demo-product",
];

export default function ProductDetailPage() {
  return <ClientPage />;
}

export function generateStaticParams() {
  const slugs = new Set<string>();

  CURATED_40_PRODUCTS.forEach((product) => {
    if (product.slug) slugs.add(product.slug);
  });

  ADMIN_PREVIEW_PRODUCT_SLUGS.forEach((slug) => slugs.add(slug));

  return Array.from(slugs).map((slug) => ({ slug }));
}
