"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";

export default function ProModal() {
  const { proModalOpen, closeProModal, proModalFeature, user } = useAuth();

  if (!proModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in no-print">
      <div
        className="relative rounded-3xl w-full max-w-lg space-y-5 shadow-2xl border-2 border-amber-500/50 overflow-hidden"
        style={{
          background: "var(--background)",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "1.5rem",
        }}
      >
        {/* Arka plan parlama */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Kapat Butonu */}
        <button
          onClick={closeProModal}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center font-black text-lg cursor-pointer z-10 border transition-colors"
          style={{
            background: "var(--secondary)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          ×
        </button>

        {/* Header */}
        <div className="text-center space-y-2 pt-1 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-300 flex items-center justify-center text-2xl mx-auto shadow-lg shadow-amber-500/30 animate-bounce">
            ⭐
          </div>
          <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-black tracking-wider uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
            PRO ÜYELİK AYRICALIĞI
          </span>
          <h3 className="text-xl sm:text-2xl font-black" style={{ color: "var(--foreground)" }}>
            {proModalFeature ? `${proModalFeature}` : "Bu Özellik Pro Üyelere Özeldir"}
          </h3>
          <p className="text-xs font-semibold max-w-sm mx-auto" style={{ color: "var(--muted-foreground)" }}>
            Ücretsiz sürümde{" "}
            <strong className="text-amber-600 dark:text-amber-400 font-black">en fazla 10 öğrenci</strong>{" "}
            ekleyebilirsiniz. Sınırsız öğrenci ve tüm gelişmiş modüller için PRO üye olun.
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
            <span>ℹ️</span>
            <span>Ücretsiz Plan: <strong>Maksimum 10 Öğrenci</strong></span>
          </div>
        </div>

        {/* FİYAT KARTLARI — tam opak, mobil & PC birebir */}
        <div className="grid grid-cols-2 gap-3 relative z-10">
          {/* Aylık */}
          <div
            className="relative p-3.5 rounded-2xl border-2 border-slate-300 shadow-md space-y-2.5"
            style={{ background: "#ffffff" }}
          >
            <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide">
                Aylık PRO
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300">
                30 Gün
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl font-black text-slate-900">150</span>
                <span className="text-sm font-black text-amber-600">₺</span>
                <span className="text-[10px] font-bold text-slate-500">/ ay</span>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Aylık yenileme</p>
            </div>
            <ul className="space-y-1 text-[11px] font-bold text-slate-800">
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-black">✓</span>
                <span>Sınırsız Öğrenci</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-black">✓</span>
                <span>Tüm PRO Modüller</span>
              </li>
            </ul>
          </div>

          {/* Yıllık */}
          <div
            className="relative p-3.5 rounded-2xl border-2 border-amber-500 shadow-lg space-y-2.5"
            style={{ background: "#fffbeb" }}
          >
            <div className="absolute -top-2.5 right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow">
              🔥 200₺ İndirim
            </div>
            <div className="border-b border-amber-200 pb-2 flex items-center justify-between">
              <span className="text-[11px] font-black text-amber-700 uppercase tracking-wide">
                Yıllık PRO
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                365 Gün
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl font-black text-slate-900">1.600</span>
                <span className="text-sm font-black text-amber-600">₺</span>
                <span className="text-[10px] font-bold text-slate-500">/ yıl</span>
              </div>
              <p className="text-[10px] font-black text-emerald-700 mt-0.5">~133₺/ay • En Popüler</p>
            </div>
            <ul className="space-y-1 text-[11px] font-bold text-slate-800">
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-black">✓</span>
                <span>Sınırsız & Karne</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-black">✓</span>
                <span>1 Yıl Erişim</span>
              </li>
            </ul>
          </div>
        </div>

        {/* PRO Özellikler */}
        <div
          className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 relative z-10"
          style={{ background: "var(--secondary)" }}
        >
          <p
            className="font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5"
            style={{ color: "var(--foreground)" }}
          >
            <span>⭐</span>
            <span>PRO ile Açılan Özellikler:</span>
          </p>
          <div
            className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] font-bold"
            style={{ color: "var(--foreground)" }}
          >
            {[
              "Sınırsız Öğrenci",
              "PDF Karne & Rapor",
              "Sınav & Net Analizi",
              "Ortalama Hesaplama",
              "Aidat Takip (Excel)",
              "Ders & Nöbet Çizelgesi",
              "Veli SMS / WhatsApp",
              "Başarı Grafikleri",
            ].map((f) => (
              <span key={f} className="flex items-center gap-1 truncate">
                <strong className="text-emerald-600 dark:text-emerald-400 shrink-0">✓</strong> {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bilgilendirme & Kapat */}
        <div className="space-y-3 relative z-10">
          {user ? (
            <div className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs space-y-1 bg-indigo-50 dark:bg-indigo-950/40">
              <p className="font-extrabold" style={{ color: "var(--foreground)" }}>
                👤 Hesap:{" "}
                <strong className="text-indigo-600 dark:text-indigo-400">{user.email}</strong>
              </p>
              <p className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
                PRO üyeliğinizi aktif ettirmek için yönetici ile iletişime geçin.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 text-xs space-y-1 bg-amber-50 dark:bg-amber-950/40">
              <p className="font-extrabold text-amber-800 dark:text-amber-300">
                ⚠️ Henüz giriş yapmadınız
              </p>
              <p className="font-semibold" style={{ color: "var(--muted-foreground)" }}>
                Öncelikle sağ üstten <strong>&quot;Giriş Yap&quot;</strong> butonuna tıklayın.
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={closeProModal}
            className="w-full py-3 rounded-xl font-black text-sm text-white hover:opacity-95 active:scale-[0.99] transition-all shadow-xl cursor-pointer"
            style={{ background: "linear-gradient(135deg, #f59e0b, #f97316, #f59e0b)" }}
          >
            Anladım, Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
