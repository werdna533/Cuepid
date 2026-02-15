import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cuepid",
  description:
    "Practice and improve your conversation skills with AI-powered scenarios",
  icons: {
    icon: [
      {
        url: "/scenarios/favicon.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],
    shortcut: "/scenarios/favicon.png",
    apple: "/scenarios/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
