import { Geist, Geist_Mono, Space_Grotesk, Instrument_Serif } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";

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
        <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>
      </body>
    </html>
  )
}
