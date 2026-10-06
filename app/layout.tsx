import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Suspense } from "react";
import { BottomNav } from "@/components/BottomNav";
import { CookieNotice } from "@/components/CookieNotice";
import { ExitPrompt } from "@/components/ExitPrompt";
import { Nav } from "@/components/Nav";
import { ScrollTop } from "@/components/ScrollTop";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentUser } from "@/lib/auth";
import { siteUrl } from "@/lib/seo";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "GeroForge", template: "%s · GeroForge" },
  description: "A swipeable shelf of public videos, reels, news, and short original notes. Each item links back to its source.",
  applicationName: "GeroForge",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  openGraph: {
    type: "website",
    siteName: "GeroForge",
    title: "GeroForge",
    description: "Public videos, reels, news, and short original notes, linked back to the source.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={sans.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{if("scrollRestoration"in history)history.scrollRestoration="manual";window.scrollTo(0,0);}catch(e){}})();(function(){try{var p=JSON.parse(localStorage.getItem("forge_a11y")||"null");if(!p)return;var r=document.documentElement;var text=p.text;if(text==="sm"||text==="md"||text==="lg"||text==="xl")r.dataset.text=text;r.dataset.contrast=p.contrast==="high"?"high":"default";r.dataset.links=p.links?"on":"off";r.dataset.motion=p.motion?"reduce":"off";r.dataset.leading=p.leading==="relaxed"?"relaxed":"normal";r.dataset.tracking=p.tracking==="wide"?"wide":"normal";r.dataset.font=p.font==="readable"?"readable":"default";r.dataset.focus=p.focus?"on":"off";}catch(e){}})();',
          }}
        />
        <ScrollTop />
        <Nav user={user ? { name: user.name, email: user.email, karma: user.karma, avatarUrl: user.avatarUrl } : null} />
        <div className="page-shell pb-[calc(5.4rem+env(safe-area-inset-bottom))] sm:pb-8">
          <main className="mx-auto min-h-[70vh] max-w-6xl px-3 py-3 sm:px-6 sm:py-4">{children}</main>
          <SiteFooter />
        </div>
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
        <CookieNotice />
        <ExitPrompt />
      </body>
    </html>
  );
}
