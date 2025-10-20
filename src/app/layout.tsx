import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { TenantProvider } from "@/components/providers/tenant-provider";
import { getTenantConfigForHost } from "./lib/tenant";
import { headers } from 'next/headers';
import { ConditionalLayout } from "@/components/conditional-layout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#4f46e5',
};

export const metadata: Metadata = {
  title: "JIS AI Portal",
  description: "AI-powered language learning platform for Japanese International School",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolve tenant on server using incoming host header
  const hdrs = await headers()
  const host = hdrs.get('host') || ''
  const tenant = host ? await getTenantConfigForHost(host) : null
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <TenantProvider tenant={tenant}>
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
          </TenantProvider>
        </Providers>
      </body>
    </html>
  );
}
