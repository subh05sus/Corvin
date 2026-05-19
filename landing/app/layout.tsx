import { Geist_Mono, Space_Grotesk, Instrument_Serif } from "next/font/google"
import type { Metadata } from "next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  metadataBase: new URL('https://usecorvin.space'),

  title: 'Corvin — The bug is in the code.',
  description:
    'Corvin wraps your services, reads logs and source code in real-time, and traces every failure down to the file and line number.',

  authors: {
    name: 'Corvin',
  },

  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
    ],
  },

  openGraph: {
    title: 'Corvin — The bug is in the code.',
    description:
      'Corvin wraps your services, reads logs and source code in real-time, and traces every failure down to the file and line number.',
    url: 'https://usecorvin.space',
    siteName: 'Corvin',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Corvin — AI-powered debugging agent',
      },
    ],
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Corvin — The bug is in the code.',
    description:
      'Corvin wraps your services, reads logs and source code in real-time, and traces every failure down to the file and line number.',
    images: '/og-image.png',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  keywords: [
    'Corvin',
    'AI debugging',
    'log analysis',
    'error tracing',
    'developer tools',
    'MCP server',
    'real-time debugging',
    'source code analysis',
    'CLI tool',
    'npm package',
    'corvin-cli',
    'AI agent',
    'software debugging',
    'log monitoring',
    'stack trace',
  ],

  alternates: {
    canonical: 'https://usecorvin.space/',
  },

  other: {
    'application/ld+json': JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Corvin',
      url: 'https://usecorvin.space',
      image: 'https://usecorvin.space/og-image.png',
      description:
        'Corvin wraps your services, reads logs and source code in real-time, and traces every failure down to the file and line number.',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    }),
  },
};

const instrumentSerifHeading = Instrument_Serif({ weight: "400", subsets: ['latin'], variable: '--font-heading' });

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-sans' })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", spaceGrotesk.variable, instrumentSerifHeading.variable)}
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              itemListElement: [
                {
                  '@type': 'SiteNavigationElement',
                  position: 1,
                  name: 'Documentation',
                  url: 'https://usecorvin.space/docs',
                },
                {
                  '@type': 'SiteNavigationElement',
                  position: 2,
                  name: 'MCP Integration',
                  url: 'https://usecorvin.space/mcp',
                },
              ],
            }),
          }}
        />
        <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>
      </body>
    </html>
  )
}
