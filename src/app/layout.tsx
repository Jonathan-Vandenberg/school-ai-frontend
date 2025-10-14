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

const APP_NAME = "School AI";
const APP_DEFAULT_TITLE = "School AI - Language Learning Platform";
const APP_TITLE_TEMPLATE = "%s - School AI";
const APP_DESCRIPTION = "AI-powered language learning platform for Japanese International School";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0066cc",
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
    <html lang="en" suppressHydrationWarning>
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
