import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ProviderApollo from "@/components/provider/ApolloProvider";
import { ThemeProvider } from "@/components/provider/theme-provider";
import QueryClientProvider from "@/components/provider/ClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import {  neobrutalism, } from '@clerk/themes'
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FlowGen",
  description: "Automate it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const localAuthBypass =
    process.env.NODE_ENV === "development" &&
    process.env.LOCAL_AUTH_BYPASS === "true";

  const app = (
    <ProviderApollo localAuthBypass={localAuthBypass}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <QueryClientProvider>
          {children}
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    </ProviderApollo>
  );

  return (
    <html lang="en" suppressHydrationWarning suppressContentEditableWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {localAuthBypass ? (
          app
        ) : (
          <ClerkProvider
            afterSignOutUrl="/sign-in"
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/sign-in"
            appearance={{ baseTheme: [neobrutalism] }}
          >
            {app}
          </ClerkProvider>
        )}
      </body>
    </html>
  );
}
