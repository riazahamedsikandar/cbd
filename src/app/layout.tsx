import React from "react";
import "../index.css";

export const metadata = {
  metadataBase: new URL("https://cbdhurst.com"),
  title: "CBD American Shaman of Hurst | CBD & Hemp Wellness",
  description: "Shop CBD, hemp, Delta-9, and wellness products at CBD American Shaman of Hurst in Hurst, Texas. Explore quality products with third-party lab testing.",
  keywords: "CBD American Shaman of Hurst, CBD Hurst TX, Delta-9 Gummies, Hemp Wellness",
  authors: [{ name: "CBD American Shaman of Hurst" }],
  robots: "index, follow",
  verification: {
    google: "google6e8d6491cc80f400",
  },
  alternates: {
    canonical: "https://cbdhurst.com",
  },
  openGraph: {
    title: "CBD American Shaman of Hurst | CBD & Hemp Wellness",
    description: "Explore CBD, Delta-9, and wellness products at CBD American Shaman of Hurst in Hurst, Texas.",
    url: "https://cbdhurst.com",
    siteName: "CBD American Shaman of Hurst",
    locale: "en_US",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-NMP7CXX6');`,
          }}
        />
        <link rel="canonical" href="https://cbdhurst.com" />
        <link rel="icon" href="/brand-feather.png" type="image/png" sizes="any" />
        <link rel="apple-touch-icon" href="/brand-feather.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="google-site-verification" content="google6e8d6491cc80f400" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-NMP7CXX6"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          ></iframe>
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        {children}
      </body>
    </html>
  );
}
