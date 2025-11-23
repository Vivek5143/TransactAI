import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import BackgroundPattern from "@/components/BackgroundPattern";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TransactAI",
  description: "AI-powered transaction categorization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <BackgroundPattern />
          {children}
          <Toaster
            position="top-right"
            expand={true}
            richColors
            toastOptions={{
              style: {
                padding: '16px',
                fontSize: '14px',
              },
              className: 'toast-custom',
              duration: 5000,
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
