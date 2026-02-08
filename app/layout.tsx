import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "オシハピ｜推し買い診断",
  description: "推しグッズの「買う/保留/やめる」を60秒で。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
