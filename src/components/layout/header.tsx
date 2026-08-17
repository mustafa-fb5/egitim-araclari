"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, { title: string; description: string }> = {
  "/": { title: "Ana Sayfa", description: "Eğitim araçlarınıza hızlı erişim" },
  "/ortalama-hesaplama": { title: "Ortalama Hesaplama", description: "Ders not ortalaması hesaplayın" },
  "/puan-hesaplama": { title: "Puan Hesaplama", description: "Sınav puanlarını hesaplayın" },
  "/yoklama": { title: "Yoklama", description: "Öğrenci devamsızlık takibi" },
  "/sinav-analiz": { title: "Sınav Analiz", description: "Sınav sonuçlarını analiz edin" },
  "/pdf-karne": { title: "PDF Karne", description: "Öğrenci karnesi oluşturun" },
  "/veli-bilgilendirme": { title: "Veli Bilgilendirme", description: "Velilere mesaj oluşturun" },
  "/ders-programi": { title: "Ders Programı", description: "Haftalık ders programı düzenleyin" },
  "/nobet-cizelgesi": { title: "Nöbet Çizelgesi", description: "Öğretmen nöbet programı" },
  "/sinif-listesi": { title: "Sınıf Listesi", description: "Öğrenci listesi yönetimi" },
  "/ogrenci-basari-grafikleri": { title: "Başarı Grafikleri", description: "Öğrenci başarı trendleri" },
};

export default function Header() {
  const pathname = usePathname();
  const page = pageTitles[pathname] || { title: "Eğitim Araçları", description: "" };

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="pl-12 lg:pl-0">
          <h2 className="text-xl font-bold text-[var(--foreground)]">{page.title}</h2>
          <p className="text-sm text-[var(--muted-foreground)]">{page.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Firebase Aktif</span>
          </div>
          <ThemeToggle />
          <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-white text-sm font-bold shadow-md">
            ÖP
          </div>
        </div>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 rounded-xl border border-[var(--border)] bg-[var(--secondary)] flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] transition-all duration-200 hover:scale-105"
      aria-label="Tema değiştir"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    </button>
  );
}
