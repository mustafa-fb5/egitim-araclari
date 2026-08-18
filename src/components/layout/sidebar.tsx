"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

// Ücretsiz erişilebilen sayfalar
export const freeRoutes = ["/", "/sinif-listesi", "/yoklama", "/personel-listesi"];

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
  const { isPro, isAdmin, openProModal } = useAuth();

  const handleProClick = (e: React.MouseEvent, label: string) => {
    e.preventDefault();
    openProModal(label);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Hamburger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        aria-label="Menüyü aç/kapat"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
          className="fixed inset-0 bg-black/50 z-30 lg:hidden animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 z-40 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } liquid-glass`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/20 dark:border-indigo-500/20">
          <Link href="/" className="flex items-center gap-3 group" onClick={() => setIsOpen(false)}>
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-105 transition-transform">
              E
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">Eğitim Araçları</h1>
              <p className="text-xs text-[var(--muted-foreground)]">Öğretmen Paneli</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {defaultMenuItems.map((item) => {
            const isActive = pathname === item.href;
            const requiresPro = !freeRoutes.includes(item.href);
            const isLocked = requiresPro && !isPro;

            if (isLocked) {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={(e) => handleProClick(e, item.label)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group border bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/10 dark:border-indigo-500/15 opacity-55 hover:opacity-85 hover:bg-amber-500/10 hover:border-amber-500/25 cursor-pointer backdrop-blur-sm sidebar-nav-link text-left"
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
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group border ${
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
        <div className="p-4 border-t border-white/20 dark:border-indigo-500/20">
          <div className="glass rounded-xl p-3 text-center border border-white/40 dark:border-white/10 shadow-sm">
            <p className="text-xs text-[var(--muted-foreground)] font-medium">
              📚 Eğitim Araçları v1.0
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              2026-2027 Eğitim Yılı
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
