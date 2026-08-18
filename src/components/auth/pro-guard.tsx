"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

interface ProGuardProps {
  children: React.ReactNode;
  featureName?: string;
}

export default function ProGuard({ children, featureName = "Bu Modül" }: ProGuardProps) {
  const { isPro, loading, openProModal } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="max-w-xl mx-auto my-10 p-6 sm:p-8 glass-card rounded-3xl text-center space-y-5 border-2 border-amber-500/40 shadow-2xl relative overflow-hidden bg-[var(--background)]">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-300 text-white flex items-center justify-center text-3xl mx-auto shadow-lg shadow-amber-500/30 animate-bounce">
          ⭐
        </div>

        <div className="space-y-1.5">
          <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-black uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
            PRO ÜYELİK GEREKLİDİR
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white">
            {featureName} Modülü Pro Üyelere Özeldir
          </h3>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
            Bu gelişmiş araca ve sınırsız öğrenci kapasitesine erişmek için PRO üyelik avantajlarından faydalanabilirsiniz.
          </p>
        </div>

        {/* Fiyatlandırma Kartları (Yüksek Kontrastlı) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {/* Aylık Paket */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-md space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
              <span className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider">
                Aylık PRO
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                30 Gün
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">150</span>
                <span className="text-base font-black text-amber-600 dark:text-amber-400">₺</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">/ ay</span>
              </div>
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-black">✓</span>
              <span>Sınırsız Öğrenci & Modüller</span>
            </p>
          </div>

          {/* Yıllık Paket */}
          <div className="relative p-4 rounded-2xl bg-amber-50/80 dark:bg-slate-900 border-2 border-amber-500 dark:border-amber-400 shadow-lg shadow-amber-500/15 space-y-2">
            <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-900/50 pb-1.5">
              <span className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                Yıllık PRO
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200">
                365 Gün
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">1.600</span>
                <span className="text-base font-black text-amber-600 dark:text-amber-400">₺</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">/ yıl</span>
              </div>
              <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">
                (Aylık ~133 ₺ • 200 ₺ İndirim)
              </p>
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-black">✓</span>
              <span>1 Yıl Kesintisiz Erişim</span>
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => openProModal(featureName)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-xs bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white hover:opacity-95 transition-all shadow-lg shadow-amber-500/25 cursor-pointer"
          >
            ⭐ Tüm Detayları İncele
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-white transition-all text-center"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
