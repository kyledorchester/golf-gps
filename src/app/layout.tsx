import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Golf GPS",
  description: "Course GPS distances for golfers",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-white">
        {children}
      </body>
    </html>
  );
}
