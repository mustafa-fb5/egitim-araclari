import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import FloatingBubbles from "@/components/ui/floating-bubbles";

export const metadata: Metadata = {
  title: "Eğitim Araçları - Öğretmen Paneli",
  description: "Öğretmenler için kapsamlı eğitim araçları platformu. Ortalama hesaplama, yoklama, sınav analiz, karne ve daha fazlası.",
  keywords: "eğitim, öğretmen, ortalama hesaplama, yoklama, sınav analiz, karne, ders programı",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[var(--background)] relative">
        <FloatingBubbles count={28} />
        <div className="flex min-h-screen relative z-10">
          <Sidebar />
          <div className="flex-1 lg:ml-72 flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 p-4 md:p-6 lg:p-8 mesh-gradient">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
