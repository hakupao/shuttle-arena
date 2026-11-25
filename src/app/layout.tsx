import type { Metadata } from "next";
import { Nunito, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { MainNav } from "@/components/layout/main-nav";
import { Footer } from "@/components/layout/footer";
import { AuthProvider } from "@/lib/auth-context";
import { TournamentProvider } from "@/lib/tournament-context";
import { I18nProvider } from "@/i18n/provider";
import { I18N_BOOT_SCRIPT } from "@/i18n/boot-script";

const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  // No static title: I18nProvider renders a localized <title> (English during prerender).
  description: "Badminton team round-robin tournament manager",
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    shortcut: "/icon",
    apple: "/icon",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: I18N_BOOT_SCRIPT }} />
      </head>
      <body
        className={`${nunito.variable} ${nunitoSans.variable} antialiased min-h-screen flex flex-col bg-background text-foreground court-bg`}
        suppressHydrationWarning
      >
        <I18nProvider>
          <AuthProvider>
            <TournamentProvider>
              <MainNav />
              <main className="container mx-auto px-4 py-6 max-w-7xl flex-1">
                {children}
              </main>
              <Footer />
              <Toaster richColors position="top-center" />
            </TournamentProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
