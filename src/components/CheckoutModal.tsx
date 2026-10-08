import React, { useState } from "react";
import { X, CheckCircle, ShieldAlert, Sparkles, CreditCard, ChevronRight, Truck, Store, Receipt, PhoneCall, MailCheck, Send } from "lucide-react";
import { CartItem } from "../types";
import { getApiUrl } from "../utils/supabaseClient";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  clearCart: () => void;
  setView: (view: string) => void;
  onOrderPlaced?: (order: any) => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  clearCart,
  setView,
  onOrderPlaced,
}: CheckoutModalProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "Hurst",
    state: "Texas",
    zipCode: "75028",
    agreeToTerms: false,
    deliveryMethod: "delivery", // delivery or pickup
    paymentMethod: "card", // card or cash
  });

  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [showCallShortly, setShowCallShortly] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

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

  const subtotal = cartItems.reduce((acc, item) => acc + getItemPrice(item) * item.quantity, 0);
  const tax = subtotal * 0.0825;
  const shipping = formData.deliveryMethod === "pickup" || subtotal > 50 ? 0 : 5.99;
  const total = subtotal + tax + shipping;

  const triggerEmailNotification = async (orderIdVal: string, orderData: any) => {
    try {
      const apiUrl = getApiUrl();
      fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_order_email",
          data: orderData,
        }),
      }).catch((e) => console.log("Silent order email trigger log:", e));
    } catch (e) {
      console.warn("Email dispatch error:", e);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agreeToTerms) {
      alert("Please confirm you are 21+ years of age to proceed with this order.");
      return;
    }

    setLoading(true);

    // Simulate safe order processing with loading states
    setTimeout(() => {
      setLoading(false);
      setOrderComplete(true);
      setShowCallShortly(true);
      // Generate a random high-fidelity order number
      const randomId = "BUDZ-" + Math.floor(100000 + Math.random() * 900000);
      setOrderId(randomId);

      const orderObj = {
        id: randomId,
        customer: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
        },
        customerName: `${formData.firstName} ${formData.lastName}`.trim(),
        customerEmail: formData.email,
        customerPhone: formData.phone,
        shippingAddress: formData.deliveryMethod === "pickup"
          ? "In-Store Pickup (Hurst Front Counter)"
          : `${formData.address}, ${formData.city}, ${formData.state} ${formData.zipCode}`,
        items: cartItems.map((item) => ({
          productName: item.product.name,
          selectedOption: item.selectedOption,
          quantity: item.quantity,
          price: getItemPrice(item),
          image: item.product.image || "",
          category: item.product.category || "",
        })),
        subtotal,
        tax,
        shipping,
        total,
        totalAmount: total,
        deliveryMethod: formData.deliveryMethod,
        paymentMethod: formData.paymentMethod,
        status: "pending",
        date: new Date().toLocaleString("en-US", { 
          month: "short", 
          day: "numeric", 
          year: "numeric", 
          hour: "2-digit", 
          minute: "2-digit" 
        }),
      };

      // Trigger automatic mail dispatch to Customer & Owner
      triggerEmailNotification(randomId, orderObj);

      // Trigger the custom callback if supplied
      if (onOrderPlaced) {
        onOrderPlaced(orderObj);
      }
    }, 2000);
  };

  const handleCompleteClose = () => {
    clearCart();
    setOrderComplete(false);
    onClose();
    setView("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-fadeIn" onClick={onClose} />

      <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-3xl bg-white border border-[#e1e8db] rounded-2xl max-h-[92vh] overflow-y-auto text-[#5b6b55] shadow-2xl relative animate-zoomIn flex flex-col">
          
          {/* Absolute close trigger */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white text-[#5b6b55] hover:text-[#2c3527] flex items-center justify-center hover:border-[#3b142e] border border-[#e1e8db] transition-all z-20 focus:outline-none cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {loading && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center z-50 rounded-2xl gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#3b142e] animate-spin"></div>
              <h3 className="text-[#2c3527] text-base font-bold tracking-tight">Securing Your Order Invoice...</h3>
              <p className="text-[#72856a] font-mono text-xs">Generating certificates...</p>
            </div>
          )}

          {orderComplete ? (
            /* Order Success screens */
            <div className="p-8 sm:p-12 text-center space-y-6 flex flex-col items-center animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-[#3b142e]/10 border border-[#3b142e]/30 flex items-center justify-center text-[#3b142e] mb-2 shadow-sm">
                <CheckCircle className="w-10 h-10 animate-bounce" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono tracking-widest text-[#c49b1a] uppercase font-bold">
                  TRANSACTION SECURED • TEXAS STATE HC-03
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#2c3527] leading-tight tracking-tight">
                  Order Successfully Registered!
                </h2>
              </div>

              <p className="text-xs sm:text-sm text-[#5b6b55] leading-relaxed max-w-xl">
                Thanks, <strong className="text-[#2c3527]">{formData.firstName}</strong>! Your order is secured and recorded under order ID:{" "}
                <strong className="text-[#3b142e] font-mono tracking-wider">{orderId}</strong>. A discrete verification receipt has been emailed to you.
              </p>

              {/* Order specifics cards */}
              <div className="w-full p-5 rounded-2xl border border-[#e1e8db] bg-[#f7f9f4] max-w-md text-left space-y-4 text-xs font-sans shadow-sm">
                <div className="pb-3 border-b border-[#e1e8db] flex justify-between items-center text-[10px] uppercase font-mono tracking-wider text-[#72856a]">
                  <span>Registered Details</span>
                  <span className="text-[#c49b1a] font-bold">Payment due on hand</span>
                </div>

                <div className="grid grid-cols-2 gap-y-2 text-[#5b6b55]">
                  <span className="text-[#72856a]">Support Client:</span>
                  <span className="font-semibold text-right text-[#2c3527]">
                    {formData.firstName} {formData.lastName}
                  </span>

                  <span className="text-[#72856a]">Pickup Location:</span>
                  <span className="font-semibold text-right text-[#2c3527]">
                    {formData.deliveryMethod === "pickup"
                      ? "In-Store (Hurst Front Counter)"
                      : `${formData.address}, ${formData.city}`}
                  </span>

                  <span className="text-[#72856a] font-bold border-t border-[#e1e8db] pt-2 mt-1">Total Paid:</span>
                  <span className="font-mono text-sm font-black text-[#3b142e] text-right border-t border-[#e1e8db] pt-2 mt-1">
                    ${(Number(total) || 0).toFixed(2)}
                  </span>
                </div>

                {formData.deliveryMethod === "pickup" && (
                  <p className="p-3 rounded-lg bg-[#c49b1a]/5 border border-[#c49b1a]/20 text-[11px] text-[#72856a] leading-relaxed font-mono">
                    *Pickup items are ready inside 30 minutes. Direct packaging is discrete. Our store is located in Hurst, Texas. Present 21+ valid government ID cards to receive items!
                  </p>
                )}
              </div>

              <button
                onClick={handleCompleteClose}
                className="px-8 py-3.5 rounded-full bg-[#3b142e] hover:bg-[#5d2a49] text-white text-xs font-black uppercase tracking-wider transition-all shadow-sm mt-4 font-sans cursor-pointer"
              >
                Return to Homepage
              </button>
            </div>
          ) : (
            /* Main Input checkout form */
            <form onSubmit={handleSubmit} className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-12 gap-8 overflow-y-auto">
              {/* Left detail columns */}
              <div className="md:col-span-7 space-y-6">
                <div className="space-y-1">
                  <h1 className="text-xl sm:text-2xl font-serif font-black text-[#2c3527] leading-tight font-sans">
                    Secure Delivery Checkout
                  </h1>
                  <p className="text-xs text-[#72856a] leading-none">
                    Complete your details below to finalize order registration.
                  </p>
                </div>

                {/* Core Age limit warning */}
                <div className="p-4 rounded-xl border border-[#c49b1a]/25 bg-[#c49b1a]/5 flex gap-3 text-xs leading-relaxed text-[#72856a] font-mono shadow-inner animate-fadeIn">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-[#c49b1a]" />
                  <div>
                    <strong className="text-[#2c3527] block font-sans font-bold">MANDATORY 21+ AGE PROTOCOL</strong>
                    Under provisions of the Texas Hemp Bill, we must verify the recipient's legal identity card at doorstep or storefront pickup.
                  </div>
                </div>

                {/* Delivery Options switcher */}
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      formData.deliveryMethod === "delivery"
                        ? "bg-[#f7f9f4] border-[#3b142e]/40 text-[#2c3527]"
                        : "bg-white border-[#e1e8db] hover:border-[#3b142e]/35 text-[#5b6b55]"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                      <Truck className="w-4 h-4" />
                      <span>Local Delivery</span>
                    </div>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="delivery"
                      checked={formData.deliveryMethod === "delivery"}
                      onChange={handleInputChange}
                      className="accent-[#3b142e] w-3.5 h-3.5 focus:ring-0 cursor-pointer"
                    />
                  </label>

                  <label
                    className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      formData.deliveryMethod === "pickup"
                        ? "bg-[#f7f9f4] border-[#3b142e]/40 text-[#2c3527]"
                        : "bg-white border-[#e1e8db] hover:border-[#3b142e]/35 text-[#5b6b55]"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                      <Store className="w-4 h-4" />
                      <span>Store Pickup</span>
                    </div>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="pickup"
                      checked={formData.deliveryMethod === "pickup"}
                      onChange={handleInputChange}
                      className="accent-[#3b142e] w-3.5 h-3.5 focus:ring-0 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Input Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1.5">
                      <label className="text-[#72856a] font-bold uppercase tracking-wide font-sans">First Name *</label>
                      <input
                        type="text"
                        required
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="Sarah"
                        className="w-full p-3 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-[#2c3527] placeholder:text-[#72856a]/45 focus:outline-none focus:border-[#3b142e]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[#72856a] font-bold uppercase tracking-wide font-sans">Last Name *</label>
                      <input
                        type="text"
                        required
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Jenkins"
                        className="w-full p-3 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-[#2c3527] placeholder:text-[#72856a]/45 focus:outline-none focus:border-[#3b142e]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1.5">
                      <label className="text-[#72856a] font-bold uppercase tracking-wide font-sans">Email *</label>
                      <input
                        type="email"
                        required
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="sarah@j.com"
                        className="w-full p-3 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-[#2c3527] placeholder:text-[#72856a]/45 focus:outline-none focus:border-[#3b142e]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[#72856a] font-bold uppercase tracking-wide font-sans">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="(817) 555-1212"
                        className="w-full p-3 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-[#2c3527] placeholder:text-[#72856a]/45 focus:outline-none focus:border-[#3b142e]"
                      />
                    </div>
                  </div>

                  {formData.deliveryMethod === "delivery" && (
                    <div className="space-y-1.5 text-xs animate-fadeIn">
                      <label className="text-[#72856a] font-bold uppercase tracking-wide font-sans">Street Address *</label>
                      <input
                        type="text"
                        required
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="1200 Cross Timbers Rd"
                        className="w-full p-3 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-[#2c3527] placeholder:text-[#72856a]/45 focus:outline-none focus:border-[#3b142e]"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="space-y-1.5">
                      <label className="text-[#72856a] font-bold uppercase tracking-wide font-sans">City</label>
                      <input
                        type="text"
                        disabled
                        name="city"
                        value={formData.city}
                        className="w-full p-3 bg-[#edf2e8] border border-[#e1e8db] rounded-xl text-[#72856a] cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[#72856a] font-bold uppercase tracking-wide font-sans">State</label>
                      <input
                        type="text"
                        disabled
                        name="state"
                        value={formData.state}
                        className="w-full p-3 bg-[#edf2e8] border border-[#e1e8db] rounded-xl text-[#72856a] cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[#72856a] font-bold uppercase tracking-wide font-sans">Zip Code *</label>
                      <input
                        type="text"
                        required
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        placeholder="75028"
                        className="w-full p-3 bg-[#f7f9f4] border border-[#e1e8db] rounded-xl text-[#2c3527] focus:outline-none focus:border-[#3b142e]"
                      />
                    </div>
                  </div>
                </div>

                {/* Age confirmation check box block */}
                <label className="flex items-start gap-3 p-4 rounded-xl border border-[#e1e8db] bg-[#edf2e8]/30 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    className="accent-[#3b142e] w-4 h-4 mt-0.5 pointer-events-auto"
                  />
                  <span className="text-[11px] leading-relaxed text-[#5b6b55]">
                    I explicitly confirm that <strong className="text-[#c49b1a]">I am 21 years of age or older</strong>, and verify that recipient government identification cards will be checked at delivery or storefront counter according to state safety criteria.
                  </span>
                </label>
              </div>

              {/* Right Order Review columns */}
              <div className="md:col-span-5 p-6 rounded-2xl bg-[#edf2e8] border border-[#e1e8db] flex flex-col justify-between self-start space-y-6 shadow-sm">
                <div className="space-y-4">
                  <h3 className="text-[#2c3527] text-xs font-extrabold uppercase tracking-widest pb-3 border-b border-[#e1e8db] flex items-center gap-1.5">
                    <Receipt className="w-4.5 h-4.5 text-[#3b142e]" />
                    <span>Order Review</span>
                  </h3>

                  {/* Tiny list of cart elements review */}
                  <div className="space-y-3 max-h-[180px] overflow-y-auto pr-2">
                    {cartItems.map((item) => (
                      <div key={`${item.product.id}-${item.selectedOption}`} className="flex justify-between items-start gap-2 text-xs">
                        <div>
                          <strong className="text-[#2c3527] block line-clamp-1 font-sans">{item.product.name}</strong>
                          <span className="text-[10px] text-[#72856a] font-mono">
                            Qty: {item.quantity} • {item.selectedOption}
                          </span>
                        </div>
                        <span className="font-mono text-[#2c3527] font-semibold shrink-0">
                          ${(Number(getItemPrice(item) * item.quantity) || 0).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Summary math */}
                  <div className="pt-4 border-t border-[#e1e8db] space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-[#72856a]">
                      <span>Subtotal:</span>
                      <span className="text-[#2c3527] font-semibold">${(Number(subtotal) || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#72856a]">
                      <span>Texas Sales Tax:</span>
                      <span className="text-[#2c3527] font-semibold">${(Number(tax) || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[#72856a]">
                      <span>Discrete Shipping:</span>
                      {shipping === 0 ? (
                        <span className="text-[#3b142e] font-bold">FREE</span>
                      ) : (
                        <span className="text-[#2c3527] font-semibold">${(Number(shipping) || 0).toFixed(2)}</span>
                      )}
                    </div>
                    <div className="flex justify-between text-[#3b142e] text-sm font-black pt-3 border-t border-[#e1e8db] leading-none">
                      <span>TOTAL DUE:</span>
                      <span className="text-[#3b142e] text-base font-black">${(Number(total) || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Submitting button controls */}
                <button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-[#3b142e] hover:bg-[#5d2a49] text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <span>Complete Secure Order</span>
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {showCallShortly && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border-2 border-[#3b142e]/30 rounded-3xl p-6 sm:p-10 w-full max-w-md text-center space-y-6 shadow-2xl relative animate-zoomIn">
            
            {/* Phone Call ringing animation */}
            <div className="relative mx-auto w-20 h-20 bg-[#edf2e8] border-2 border-[#3b142e]/20 rounded-full flex items-center justify-center text-[#3b142e]">
              <span className="absolute inset-0 rounded-full bg-[#3b142e]/10 animate-ping" />
              <PhoneCall className="w-10 h-10 animate-pulse relative z-10" />
            </div>

            <div className="space-y-2 font-sans">
              <span className="text-[10px] font-mono tracking-widest text-[#3b142e] uppercase font-black">
                Order Dispatched Successfully
              </span>
              <h3 className="text-2xl font-serif font-black text-[#2c3527] leading-tight tracking-tight">
                We Will Call You Shortly!
              </h3>
            </div>

            <div className="p-4 rounded-2xl bg-[#f7f9f4] border border-[#e1e8db] text-left text-xs space-y-3 font-sans">
              <p className="text-[#5b6b55] leading-relaxed">
                Hi <strong className="text-[#2c3527]">{formData.firstName}</strong>, your order <strong className="text-[#3b142e] font-mono">{orderId}</strong> has been secured and logged into the Admin Panel!
              </p>
              <p className="text-[#5b6b55] leading-relaxed">
                An automated order notification has been sent to the store team:
              </p>
              <div className="bg-white p-2.5 rounded-xl border border-gray-100 font-mono text-[10px] text-[#3b142e] space-y-0.5 select-all">
                <div>• CBD American Shaman of Hurst</div>
                <div>• cbdsouthlake@gmail.com</div>
                <div>• Hurst, TX</div>
              </div>
              <p className="text-[#72856a] leading-relaxed italic font-semibold">
                * A certified wellness consultant will ring you shortly at <span className="text-[#2c3527] underline decoration-wavy decoration-[#3b142e] font-sans font-bold">{formData.phone}</span> to coordinate your delivery/pickup details. Keep your phone close!
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setShowCallShortly(false);
                }}
                className="w-full py-3.5 bg-[#3b142e] hover:bg-[#5d2a49] text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 cursor-pointer font-sans"
              >
                Awesome, thank you!
              </button>
              
              <button
                onClick={() => {
                  // Fallback manually trigger email client if needed
                  const itemsText = cartItems.map(item => `- ${item.product.name} x${item.quantity}`).join("\n");
                  const mailtoRecipients = "info@twobudz.com,cbdsouthlake@gmail.com,twobudzcbd@gmail.com";
                  const subject = `New Order Placed - ID: ${orderId}`;
                  const body = `Order ${orderId}\nCustomer: ${formData.firstName} ${formData.lastName}\nPhone: ${formData.phone}\nEmail: ${formData.email}\nProducts:\n${itemsText}`;
                  window.location.href = `mailto:${mailtoRecipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                }}
                className="text-[10px] text-[#72856a] hover:text-[#3b142e] font-mono hover:underline uppercase block mx-auto pt-1 cursor-pointer"
              >
                Dispatch manual backup copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
