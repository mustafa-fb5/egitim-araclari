"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import AuthModal from "@/components/auth/auth-modal";

const pageTitles: Record<string, { title: string; description: string }> = {
  "/": { title: "Ana Sayfa", description: "Eğitim araçlarınıza hızlı erişim" },
  "/sinif-listesi": { title: "Sınıf Listesi", description: "Öğrenci listesi yönetimi" },
  "/personel-listesi": { title: "Personel Listesi", description: "Öğretmen ve okul personeli rehberi" },
  "/yoklama": { title: "Yoklama", description: "Öğrenci devamsızlık takibi" },
  "/ortalama-hesaplama": { title: "Ortalama Hesaplama", description: "Ders not ortalaması hesaplayın" },
  "/testler": { title: "Testler & Net Takibi", description: "Konu bazlı branş testleri ve net analizi" },
  "/sinav-analiz": { title: "Sınav Analiz", description: "LGS ve deneme sınavı sonuç analizi" },
  "/pdf-karne": { title: "PDF Karne", description: "Öğrenci karnesi oluşturun ve yazdırın" },
  "/veli-bilgilendirme": { title: "Veli Bilgilendirme", description: "Velilere SMS ve WhatsApp mesajları" },
  "/ders-programi": { title: "Ders Programı", description: "Haftalık ders programı düzenleyin" },
  "/nobet-cizelgesi": { title: "Nöbet Çizelgesi", description: "Öğretmen haftalık nöbet programı" },
  "/ogrenci-basari-grafikleri": { title: "Başarı Grafikleri", description: "Öğrenci başarı trendleri ve grafikleri" },
  "/aidat-takip": { title: "Aidat Takip", description: "Öğrenci aylık aidat ödemeleri ve Excel raporu" },
  "/admin": { title: "👑 Yönetici Paneli", description: "Kullanıcı yönetimi ve Pro üyelik kontrolü" },
};

export default function Header() {
  const pathname = usePathname();
  const page = pageTitles[pathname] || { title: "Eğitim Araçları", description: "" };

  const { user, isAdmin, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<"login" | "register">("login");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Dışarı tıklandığında dropdown kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openAuth = (tab: "login" | "register") => {
    setInitialTab(tab);
    setModalOpen(true);
  };

  const getInitials = (name: string) => {
    if (!name) return "ÖP";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5">
          {/* Sol: Başlık */}
          <div className="pl-14 sm:pl-16 lg:pl-0">
            <h2 className="text-base sm:text-xl font-black text-[var(--foreground)] truncate">{page.title}</h2>
            <p className="text-xs text-[var(--muted-foreground)] hidden sm:block">{page.description}</p>
          </div>

          {/* Sağ: Durum, Tema & Kullanıcı Girişi */}
          <div className="flex items-center gap-2.5">
            {/* Firebase Rozeti */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Bulut Senkronize</span>
            </div>

            {/* Tema Butonu */}
            <ThemeToggle />

            {/* Kullanıcı Durumu (Mounted kontrolü ile Hydration Mismatch önlenir) */}
            {!mounted ? (
              <div className="w-24 h-8 rounded-xl bg-[var(--secondary)] animate-pulse" />
            ) : !user ? (
              <button
                onClick={() => openAuth("login")}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--primary)] text-white hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <span>🔑</span>
                <span>Giriş Yap</span>
              </button>
            ) : (
              /* Kullanıcı Giriş Yapmışsa */
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-2xl hover:bg-[var(--secondary)] border border-[var(--border)] transition-all cursor-pointer"
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-md ${
                      isAdmin
                        ? "bg-gradient-to-br from-amber-500 to-orange-600"
                        : user.isPro
                        ? "bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600"
                        : "gradient-bg"
                    }`}
                  >
                    {isAdmin ? "👑" : user.isPro ? "⭐" : getInitials(user.displayName)}
                  </div>
                  <div className="text-left hidden sm:block pr-2">
                    <p className="text-xs font-bold text-[var(--foreground)] leading-tight truncate max-w-[120px]">
                      {user.displayName}
                    </p>
                    <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                      {isAdmin ? "👑 Yönetici" : user.isPro ? `⭐ PRO (${user.proDaysLeft ?? 0} Gün)` : "🆓 Standart"}
                    </p>
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-[var(--muted-foreground)] hidden sm:block"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {/* Dropdown Menü */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 glass-card rounded-2xl p-3 shadow-2xl border border-[var(--border)] bg-[var(--background)] z-50 animate-slide-up space-y-2.5">
                    <div className="p-2.5 rounded-xl bg-[var(--secondary)] border border-[var(--border)] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--foreground)] truncate max-w-[140px]">
                          {user.displayName}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                            isAdmin
                              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              : user.isPro
                              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                          }`}
                        >
                          {isAdmin ? "👑 Yönetici" : user.isPro ? "⭐ PRO Üye" : "🆓 Standart"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--muted-foreground)] truncate">{user.email}</p>
                      {user.isPro && !isAdmin && (
                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          ⏳ Kalan Süre: {user.proDaysLeft ?? 0} Gün
                        </p>
                      )}
                    </div>

                    {/* Admin Paneli Butonu (Sadece Admin) */}
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full py-2 px-3 rounded-xl text-xs font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center gap-1.5 border border-amber-500/30"
                      >
                        <span>👑</span>
                        <span>Yönetici Paneline Git</span>
                      </Link>
                    )}

                    <div className="pt-1 border-t border-[var(--border)]">
                      <button
                        onClick={async () => {
                          await logout();
                          setDropdownOpen(false);
                        }}
                        className="w-full py-2 px-3 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>🚪</span>
                        <span>Oturumu Kapat</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Giriş & Kayıt Modalı */}
      <AuthModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialTab={initialTab}
      />
    </>
  );
}

function ThemeToggle() {
  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 rounded-xl border border-[var(--border)] bg-[var(--secondary)] flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] transition-all duration-200 hover:scale-105 cursor-pointer"
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
