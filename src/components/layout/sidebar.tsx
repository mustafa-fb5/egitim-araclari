"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

// Ücretsiz erişilebilen sayfalar
export const freeRoutes = ["/", "/sinif-listesi", "/yoklama", "/personel-listesi", "/iletisim"];

export const defaultMenuItems = [
  { href: "/", label: "Ana Sayfa", icon: "🏠" },
  { href: "/sinif-listesi", label: "Sınıf Listesi", icon: "📋" },
  { href: "/yoklama", label: "Yoklama", icon: "✅" },
  { href: "/ortalama-hesaplama", label: "Ortalama Hesaplama", icon: "📊" },
  { href: "/testler", label: "Testler", icon: "📝" },
  { href: "/sinav-analiz", label: "Sınav Analiz", icon: "📈" },
  { href: "/pdf-karne", label: "PDF Karne", icon: "📄" },
  { href: "/veli-bilgilendirme", label: "Veli Bilgilendirme", icon: "💬" },
  { href: "/ders-programi", label: "Ders Programı", icon: "📅" },
  { href: "/nobet-cizelgesi", label: "Nöbet Çizelgesi", icon: "🔄" },
  { href: "/ogrenci-basari-grafikleri", label: "Başarı Grafikleri", icon: "📉" },
  { href: "/aidat-takip", label: "Aidat Takip", icon: "💰" },
  { href: "/personel-listesi", label: "Personel Listesi", icon: "👥" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [iletisimAcik, setIletisimAcik] = useState(false);
  const { isPro, isAdmin } = useAuth();

  // Sayfa değiştiğinde mobil menüyü otomatik kapat (Sayfaya tıklamama sorununu çözer)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Mobil menü açıkken arka plan kaydırmasını engelle
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);



  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-3 left-3 z-50 lg:hidden w-11 h-11 rounded-2xl bg-[var(--primary)] text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20 touch-manipulation"
        aria-label="Menüyü aç/kapat"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          {isOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden animate-fade-in touch-none"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 z-40 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } bg-[var(--sidebar)] border-r border-[var(--border)] shadow-xl lg:shadow-sm`}
      >
        {/* Logo (Hamburger butonunun üst üste binmesini önlemek için mobilde pl-14 eklendi) */}
        <div className="p-4 sm:p-5 border-b border-[var(--border)] pl-16 lg:pl-5">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-md group-hover:scale-105 transition-transform bg-white/5 p-1 border border-[var(--border)] flex items-center justify-center shrink-0">
              <img
                src="/logo.png"
                alt="Eğitim Araçları Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold gradient-text truncate">Eğitim Araçları</h1>
              <p className="text-[11px] font-semibold text-[var(--muted-foreground)] truncate">Öğretmen & Yönetici Paneli</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {defaultMenuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            const requiresPro = !freeRoutes.includes(item.href);
            const isLocked = requiresPro && !isPro;

            if (isLocked) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  prefetch={true}
                  className="flex items-center gap-3 px-4 py-3.5 sm:py-3 rounded-xl text-sm font-bold transition-all duration-200 group border bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/10 dark:border-indigo-500/15 opacity-60 hover:opacity-90 hover:bg-amber-500/10 hover:border-amber-500/25 backdrop-blur-sm sidebar-nav-link touch-manipulation cursor-pointer"
                >
                  <span className="text-lg grayscale group-hover:grayscale-0 transition-all">
                    {item.icon}
                  </span>
                  <span className="truncate font-bold sidebar-nav-link">
                    {item.label}
                  </span>
                  <span className="ml-auto px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 shadow-sm">
                    <span>🔒</span>
                    <span>PRO</span>
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                prefetch={true}
                className={`flex items-center gap-3 px-4 py-3.5 sm:py-3 rounded-xl text-sm font-bold transition-all duration-200 group border touch-manipulation active:scale-[0.98] cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 border-indigo-400/40 scale-[1.02]"
                    : "bg-indigo-500/10 dark:bg-indigo-500/15 border-indigo-500/15 dark:border-indigo-500/20 hover:bg-indigo-500/20 dark:hover:bg-indigo-500/25 hover:border-indigo-500/30 backdrop-blur-sm sidebar-nav-link"
                }`}
              >
                <span className={`text-lg transition-transform duration-200 ${!isActive ? "group-hover:scale-110" : ""}`}>
                  {item.icon}
                </span>
                <span className={`truncate font-bold ${isActive ? "text-white" : "sidebar-nav-link"}`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-sm" />
                )}
              </Link>
            );
          })}

          {/* Sadece Yönetici Giriş Yapmışsa Görünür */}
          {isAdmin && (
            <div className="pt-2">
              <Link
                href="/admin"
                prefetch={true}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black transition-all duration-200 border ${
                  pathname === "/admin"
                    ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 border-amber-400 scale-[1.02]"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500 hover:text-white"
                }`}
              >
                <span className="text-lg">👑</span>
                <span className="truncate">Yönetici Paneli</span>
                <span className="ml-auto text-[10px] bg-amber-500/30 text-white px-1.5 py-0.5 rounded font-black">
                  ADMİN
                </span>
              </Link>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)] space-y-2">
          {/* İletişim Butonu */}
          <button
            type="button"
            onClick={() => setIletisimAcik(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 transition-all hover:scale-[1.01] cursor-pointer shadow-sm"
          >
            <span className="text-sm">📞</span>
            <span>İletişim & Destek</span>
          </button>

          <div className="glass-card rounded-xl p-2.5 text-center border border-[var(--border)] shadow-sm">
            <p className="text-[11px] text-[var(--muted-foreground)] font-semibold">
              📚 Eğitim Araçları v1.0
            </p>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
              2026-2027 Eğitim Yılı
            </p>
          </div>
        </div>
      </aside>

      {/* İletişim Modal Pop-up */}
      {iletisimAcik && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="relative glass-card rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl border-2 border-indigo-500/30 bg-[var(--background)]">
            {/* Kapat Butonu */}
            <button
              onClick={() => setIletisimAcik(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-[var(--secondary)] flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-red-500 transition-colors font-black text-lg cursor-pointer border border-[var(--border)]"
            >
              ×
            </button>

            {/* Başlık */}
            <div className="text-center space-y-1.5 pt-1">
              <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center text-2xl mx-auto shadow-lg shadow-indigo-500/30">
                💬
              </div>
              <h3 className="text-xl font-black text-[var(--foreground)]">
                İletişim & Destek
              </h3>
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">
                Soru, öneri ve PRO üyelik işlemleri için bize ulaşabilirsiniz.
              </p>
            </div>

            {/* İletişim Kanalları */}
            <div className="space-y-3 pt-1">
              {/* WhatsApp */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xl shadow-md shrink-0">
                  📱
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    WhatsApp Hattı
                  </p>
                  <p className="text-sm font-black text-[var(--foreground)] truncate">
                    dmrbs53
                  </p>
                </div>
              </div>

              {/* E-Posta */}
              <a
                href="mailto:mustafademirbas0053@gmail.com"
                className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center gap-3.5 hover:bg-indigo-500/15 transition-colors group block"
              >
                <div className="flex items-center gap-3.5 w-full">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-md shrink-0 group-hover:scale-105 transition-transform">
                    ✉️
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      E-Posta Adresi
                    </p>
                    <p className="text-xs sm:text-sm font-black text-[var(--foreground)] truncate select-all">
                      mustafademirbas0053@gmail.com
                    </p>
                  </div>
                </div>
              </a>
            </div>

            {/* Kapat Butonu */}
            <button
              type="button"
              onClick={() => setIletisimAcik(false)}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-white transition-all cursor-pointer border border-[var(--border)]"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </>
  );
}
