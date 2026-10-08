import React from "react";
import { X, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { CartItem } from "../types";
import { getCategoryFallbackImage, handleImageError } from "../utils/imageMatching";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (id: string, option: string, delta: number) => void;
  onRemoveItem: (id: string, option: string) => void;
  onProceedToCheckout: () => void;
  setView: (view: string) => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  setView,
}: CartDrawerProps) {
  if (!isOpen) return null;

  // Calculate pricing modifier based on chosen bundle size
  const getItemPrice = (item: CartItem) => {
    let base = item.product.price;
    const opt = item.selectedOption;
    if (opt.includes("Double Pack") || opt.includes("30 Gummies") || opt.includes("7 Grams")) {
      return base * 1.7;
    } else if (opt.includes("14 Grams") || opt.includes("4000mg") || opt.includes("Value Pack")) {
      return base * 3.2;
    }
    return base;
  };

  const getSubtotal = () => {
    return cartItems.reduce((acc, item) => acc + getItemPrice(item) * item.quantity, 0);
  };

  const subtotal = getSubtotal();
  const tax = subtotal * 0.0825; // Texas State Sales Tax standard 8.25%
  const shipping = subtotal > 50 ? 0 : 5.99; // Free shipping above $50
  const grandTotal = subtotal + tax + shipping;

  const handleShopRedirect = () => {
    setView("shop");
    onClose();
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Background overlay */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        {/* Drawer panel */}
        <div className="w-screen max-w-md bg-white border-l border-[#e1e8db] text-[#5b6b55] shadow-2xl flex flex-col justify-between h-full animate-slideLeft">
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#e1e8db] flex items-center justify-between bg-[#f7f9f4]">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#3b142e]" />
              <h2 className="text-sm uppercase tracking-widest font-extrabold text-[#2c3527]">
                Your Wellness Bag
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-[#e1e8db] bg-white hover:border-[#3b142e] hover:text-[#3b142e] text-[#5b6b55] transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cart items list */}
          <div className="flex-grow overflow-y-auto py-6 px-6 space-y-5 bg-[#f7f9f4]">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                <div className="w-16 h-16 rounded-full bg-white border border-[#e1e8db] flex items-center justify-center text-[#3b142e] shadow-md">
                  <ShoppingBag className="w-6 h-6 animate-bounce" />
                </div>
                <h3 className="text-[#2c3527] text-base font-bold">Your Bag is Empty</h3>
                <p className="text-[#5b6b55] text-xs leading-relaxed max-w-xs">
                  Soothe your needs! Select lab-compliant, organic CBD oils and artisanal gummies on our store index.
                </p>
                <button
                  onClick={handleShopRedirect}
                  className="px-6 py-2.5 rounded-full bg-[#3b142e] hover:bg-[#5d2a49] text-white font-extrabold text-xs uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              cartItems.map((item) => {
                const itemPrice = getItemPrice(item);
                return (
                  <div
                    key={`${item.product.id}-${item.selectedOption}`}
                    className="p-4 rounded-xl bg-white border border-[#e1e8db] flex gap-4 relative group shadow-sm"
                  >
                    {/* Tiny delete icon */}
                    <button
                      onClick={() => onRemoveItem(item.product.id, item.selectedOption)}
                      className="absolute top-4 right-4 text-[#72856a] hover:text-red-500 transition-colors cursor-pointer"
                      title="Remove product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Image stage */}
                    <div className="w-16 h-16 rounded-lg bg-[#f7f9f4] border border-[#e1e8db] overflow-hidden flex items-center justify-center p-2 shrink-0">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-contain"
                        onError={(e) => handleImageError(e, item.product.category)}
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Meta description text */}
                    <div className="flex-grow space-y-1.5 pr-6">
                      <span className="text-[9px] uppercase font-mono font-bold text-[#3b142e] bg-[#3b142e]/10 px-2 py-0.5 rounded">
                        {item.product.categoryLabel}
                      </span>
                      <h4 className="text-xs font-bold text-[#2c3527] leading-tight">
                        {item.product.name}
                      </h4>
                      <p className="text-[10px] text-[#72856a] font-mono">
                        Pack: {item.selectedOption}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        {/* Quantity controls */}
                        <div className="flex items-center bg-[#f7f9f4] border border-[#e1e8db] rounded-lg py-1 px-1.5">
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, item.selectedOption, -1)}
                            className="w-5 h-5 flex items-center justify-center font-bold font-mono text-[#72856a] hover:text-[#2c3527] cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-bold font-mono text-xs text-[#2c3527]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, item.selectedOption, 1)}
                            className="w-5 h-5 flex items-center justify-center font-bold font-mono text-[#3b142e] hover:text-[#5d2a49] cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Price */}
                        <span className="text-xs font-bold font-mono text-[#2c3527]">
                          ${(Number(itemPrice * item.quantity) || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Checkout Totals summary and checkout button */}
          {cartItems.length > 0 && (
            <div className="p-6 bg-white border-t border-[#e1e8db] space-y-4 shrink-0 shadow-sm">
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center text-[#72856a]">
                  <span>Subtotal</span>
                  <span className="text-[#2c3527] font-bold">${(Number(subtotal) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-[#72856a]">
                  <span>Texas State Tax (8.25%)</span>
                  <span className="text-[#2c3527] font-bold">${(Number(tax) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-[#72856a]">
                  <span>Shipping & discrete delivery</span>
                  {shipping === 0 ? (
                    <span className="text-[#3b142e] font-bold uppercase">FREE</span>
                  ) : (
                    <span className="text-[#2c3527] font-bold">${(Number(shipping) || 0).toFixed(2)}</span>
                  )}
                </div>
                {shipping > 0 && (
                  <p className="text-[10px] text-[#3b142e]/90 text-right leading-none pb-1 font-bold font-mono">
                    *Add ${(Number(50 - subtotal) || 0).toFixed(2)} more to claim Free Shipping!
                  </p>
                )}
                <div className="flex justify-between items-center text-sm font-bold border-t border-[#e1e8db] pt-3 text-[#2c3527]">
                  <span>Total Due</span>
                  <span className="text-lg text-[#3b142e] font-black">${(Number(grandTotal) || 0).toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={onProceedToCheckout}
                className="w-full h-12 rounded-xl bg-[#3b142e] hover:bg-[#5d2a49] text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] border-0 cursor-pointer"
              >
                <span>Proceed to Secure Checkout</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>

              <p className="text-[9px] text-[#72856a] font-mono text-center leading-relaxed">
                Discrete shipping across Texas inside solid protective cardboard boxes. Full 21+ age identification checking at doorstep.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
