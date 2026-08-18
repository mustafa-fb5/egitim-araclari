"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";

export default function ProModal() {
  const { proModalOpen, closeProModal, proModalFeature, user } = useAuth();

  if (!proModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in no-print">
      <div className="relative glass-card rounded-3xl w-full max-w-lg p-6 sm:p-7 space-y-5 shadow-2xl border-2 border-amber-500/40 bg-[var(--background)] overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Arka plan parlama efekti */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Kapat Butonu */}
        <button
          onClick={closeProModal}
          className="absolute top-5 right-5 w-8 h-8 rounded-xl bg-[var(--secondary)] flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-red-500 transition-colors font-black text-lg cursor-pointer z-10 border border-[var(--border)]"
        >
          ×
        </button>

        {/* Header */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-300 flex items-center justify-center text-2xl mx-auto shadow-lg shadow-amber-500/30 animate-bounce">
            ⭐
          </div>
          <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-black tracking-wider uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
            PRO ÜYELİK AYRICALIĞI
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white">
            {proModalFeature ? `${proModalFeature}` : "Bu Özellik Pro Üyelere Özeldir"}
          </h3>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
            Ücretsiz sürümde <strong className="text-amber-700 dark:text-amber-300 font-black">en fazla 10 öğrenci</strong> ekleyebilirsiniz. Sınırsız öğrenci ve tüm gelişmiş analiz/karne modülleri için PRO üye olun.
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold mt-1">
            <span>ℹ️</span>
            <span>Ücretsiz Plan: <strong>Maksimum 10 Öğrenci</strong></span>
          </div>
        </div>

        {/* FİYATLANDIRMA KARTLARI (Masaüstü ve Telefinda Birebir Net Görünüm) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {/* Aylık Paket */}
          <div className="relative p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider">
                Aylık PRO
              </span>
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                30 Gün
              </span>
            </div>
            
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-950 dark:text-white">150</span>
                <span className="text-base font-black text-amber-600 dark:text-amber-400">₺</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">/ ay</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Standart aylık yenileme
              </p>
            </div>

            <ul className="space-y-1.5 text-xs font-bold text-slate-900 dark:text-white pt-1">
              <li className="flex items-center gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 text-sm font-black">✓</span>
                <span>Sınırsız Öğrenci</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 text-sm font-black">✓</span>
                <span>Tüm PRO Modüller</span>
              </li>
            </ul>
          </div>

          {/* Yıllık Paket (Avantajlı) */}
          <div className="relative p-4 rounded-2xl bg-amber-50/90 dark:bg-slate-900 border-2 border-amber-500 dark:border-amber-400 shadow-lg shadow-amber-500/15 space-y-3">
            <div className="absolute -top-3 right-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md">
              🔥 200 ₺ İndirimli
            </div>
            
            <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-900/50 pb-2">
              <span className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                Yıllık PRO
              </span>
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-amber-200/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                365 Gün
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-950 dark:text-white">1.600</span>
                <span className="text-base font-black text-amber-600 dark:text-amber-400">₺</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">/ yıl</span>
              </div>
              <p className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                (Aylık ~133 ₺ • En Popüler)
              </p>
            </div>

            <ul className="space-y-1.5 text-xs font-bold text-slate-900 dark:text-white pt-1">
              <li className="flex items-center gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 text-sm font-black">✓</span>
                <span>Sınırsız Öğrenci & Karne</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 text-sm font-black">✓</span>
                <span>1 Yıl Kesintisiz Erişim</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Dahil Olan Özellikler (Yüksek Kontrastlı & 2 Sütun Düzeni) */}
        <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
          <p className="font-black text-slate-950 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
            <span>⭐</span>
            <span>PRO Üyelik İle Açılan Özellikler:</span>
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <span className="flex items-center gap-1.5 truncate">
              <strong className="text-emerald-600 dark:text-emerald-400">✓</strong> Sınırsız Öğrenci
            </span>
            <span className="flex items-center gap-1.5 truncate">
              <strong className="text-emerald-600 dark:text-emerald-400">✓</strong> PDF Karne & Rapor
            </span>
            <span className="flex items-center gap-1.5 truncate">
              <strong className="text-emerald-600 dark:text-emerald-400">✓</strong> Sınav & Net Analizi
            </span>
            <span className="flex items-center gap-1.5 truncate">
              <strong className="text-emerald-600 dark:text-emerald-400">✓</strong> Ortalama Hesaplama
            </span>
            <span className="flex items-center gap-1.5 truncate">
              <strong className="text-emerald-600 dark:text-emerald-400">✓</strong> Aidat Takip (Excel)
            </span>
            <span className="flex items-center gap-1.5 truncate">
              <strong className="text-emerald-600 dark:text-emerald-400">✓</strong> Ders & Nöbet Çizelgesi
            </span>
            <span className="flex items-center gap-1.5 truncate">
              <strong className="text-emerald-600 dark:text-emerald-400">✓</strong> Veli SMS / WhatsApp
            </span>
            <span className="flex items-center gap-1.5 truncate">
              <strong className="text-emerald-600 dark:text-emerald-400">✓</strong> Başarı Grafikleri
            </span>
          </div>
        </div>

        {/* Bilgilendirme ve Aktivasyon */}
        <div className="space-y-3 text-center">
          {user ? (
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1">
              <p className="font-extrabold text-slate-900 dark:text-slate-100">
                👤 Giriş Yapılan Hesap: <strong className="text-indigo-600 dark:text-indigo-400">{user.email}</strong>
              </p>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                PRO üyeliğinizi aktif ettirmek için sistem yöneticisi ile iletişime geçebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs space-y-1">
              <p className="font-extrabold text-amber-800 dark:text-amber-300">
                ⚠️ Henüz giriş yapmadınız
              </p>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Öncelikle sağ üstteki <strong>"Giriş Yap"</strong> butonundan hesabınıza giriş yapınız veya kayıt olunuz.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={closeProModal}
            className="w-full py-3 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white hover:opacity-95 active:scale-[0.99] transition-all shadow-xl shadow-amber-500/25 cursor-pointer"
          >
            Anladım, Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
