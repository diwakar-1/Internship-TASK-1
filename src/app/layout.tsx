import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/hooks/useApp";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "FormCraft — Build Beautiful Forms in Minutes",
  description: "Create, customize, and share dynamic interactive forms with real-time response collection.",
  keywords: ["form builder", "survey", "questionnaire", "form creator", "online forms"],
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AppProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </AppProvider>
      </body>
    </html>
  );
}
