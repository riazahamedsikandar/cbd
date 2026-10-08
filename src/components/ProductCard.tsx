import React from "react";
import { ShoppingCart, Eye, Star, Check, Package } from "lucide-react";
import { Product } from "../types";
import {
  handleImageError,
  normalizeToCleanAsset,
} from "../utils/imageMatching";

interface ProductCardProps {
  key?: string | number;
  product: Product;
  onViewDetails: (product: Product) => void;
  onAddToCart: (product: Product, option: string) => void;
}

export default function ProductCard({
  product,
  onViewDetails,
  onAddToCart,
}: ProductCardProps) {
  const imageSrc = normalizeToCleanAsset(product.image, product.category, product.name);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Default to first packaging option
    const defaultOption = product.options[0] || "Standard Pack";
    onAddToCart(product, defaultOption);
  };

  return (
    <a
      href={`/products/${product.slug || product.id}`.replace(/\/+/g, "/")}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.button === 1) {
          return;
        }
        e.preventDefault();
        onViewDetails(product);
      }}
      className="group relative rounded-xl overflow-hidden bg-white border border-[#e1e8db] transition-all duration-500 hover:border-[#3b142e] hover:shadow-xl flex flex-col cursor-pointer pb-5 shadow-sm text-inherit no-underline block"
    >
      {/* Top badges */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 font-sans pointer-events-none">
        {product.isBestSeller && (
          <span className="px-2.5 py-0.5 rounded text-[9px] font-bold bg-[#f1f4ee] text-[#3b142e] border border-[#e1e8db] tracking-widest uppercase shadow-sm">
            Best Seller
          </span>
        )}
        {product.isNew && (
          <span className="px-2.5 py-0.5 rounded text-[9px] font-bold bg-[#c49b1a] text-white tracking-widest uppercase shadow-sm font-bold">
            New
          </span>
        )}
      </div>

      {/* Product Image Stage */}
      <div className="relative w-full aspect-square bg-[#f7f9f4] overflow-hidden border-b border-[#e1e8db] flex items-center justify-center p-4">
        <img
          src={imageSrc}
          alt={product.name}
          className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-300"
          onError={(e) => handleImageError(e, product.category)}
        />
        {/* Subtle vignette layer */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#3b142e]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        {/* Hover Action Triggers */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(product);
            }}
            className="p-2.5 rounded-full bg-white border border-[#e1e8db] text-[#5b6b55] hover:text-[#2c3527] hover:border-[#3b142e] transition-all shadow-sm"
            title="Quick View"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={handleAddToCart}
            className="p-2.5 rounded-full bg-[#3b142e] text-white hover:bg-[#5d2a49] hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
            title="Add to Cart"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Card Content Description */}
      <div className="px-5 pt-4 flex-grow flex flex-col font-sans">
        {/* Category & Lab Rating Row */}
        <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold text-[#72856a] mb-1">
          <span>{product.categoryLabel}</span>
          <div className="flex items-center gap-0.5 text-[#c49b1a]">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span className="font-mono text-[#2c3527]">
              {(Number(product.rating) || 5.0).toFixed(1)}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-[#2c3527] group-hover:text-[#3b142e] transition-colors line-clamp-1 mb-1.5 font-sans">
          {product.name}
        </h3>

        {/* Short Text */}
        <p className="text-xs text-[#5b6b55] leading-relaxed line-clamp-2 mb-4 flex-grow">
          {product.description}
        </p>

        {/* Bottom Panel Row (THC details & Price) */}
        <div className="flex items-center justify-between pt-3 border-t border-[#edf2e8] mt-auto">
          {/* Active Cannabinoids info */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase tracking-widest text-[#3b142e] font-mono leading-none font-bold">
              {product.cbd}
            </span>
            <span className="text-[8px] uppercase tracking-widest text-[#72856a] font-mono leading-none">
              {product.thc}
            </span>
          </div>

          {/* Pricing capsule */}
          <div className="text-right">
            <span className="text-[10px] text-[#72856a] font-mono">From </span>
            <span className="text-base font-extrabold text-[#2c3527] font-mono">
              ${(Number(product.price) || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
