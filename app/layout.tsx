import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Urlaubsbuchungssystem",
  description: "Internes Urlaubsbeantragungssystem",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
