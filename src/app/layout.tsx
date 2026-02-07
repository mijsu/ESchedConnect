import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UniScheduler - Professional University Schedule Management",
  description: "Modern university schedule management system with admin and professor roles. Built with Next.js, TypeScript, and Firebase Firestore.",
  keywords: ["UniScheduler", "University", "Schedule", "Next.js", "TypeScript", "Firebase", "shadcn/ui"],
  authors: [{ name: "UniScheduler Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "UniScheduler",
    description: "Professional university schedule management system",
    url: "https://chat.z.ai",
    siteName: "UniScheduler",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UniScheduler",
    description: "Professional university schedule management system",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
