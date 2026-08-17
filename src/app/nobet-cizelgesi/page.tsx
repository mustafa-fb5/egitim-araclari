"use client";

import { useState } from "react";
import { demoOgretmenler, gunler, nobetYerleri } from "@/lib/data";

interface NobetAtamasi {
  ogretmenId: number;
  gun: string;
  yer: string;
}

export default function NobetCizelgesiPage() {
  const [atamalar, setAtamalar] = useState<NobetAtamasi[]>([
    { ogretmenId: 1, gun: "Pazartesi", yer: "Ana Koridor" },
    { ogretmenId: 2, gun: "Pazartesi", yer: "Bahçe" },
    { ogretmenId: 3, gun: "Salı", yer: "Ana Koridor" },
    { ogretmenId: 4, gun: "Salı", yer: "Kantin" },
    { ogretmenId: 5, gun: "Çarşamba", yer: "1. Kat Koridor" },
    { ogretmenId: 6, gun: "Çarşamba", yer: "Bahçe" },
    { ogretmenId: 7, gun: "Perşembe", yer: "Ana Koridor" },
    { ogretmenId: 8, gun: "Perşembe", yer: "Giriş Kapısı" },
    { ogretmenId: 9, gun: "Cuma", yer: "Bahçe" },
    { ogretmenId: 10, gun: "Cuma", yer: "Kantin" },
  ]);

  const [yeniAtama, setYeniAtama] = useState({ ogretmenId: 1, gun: "Pazartesi", yer: "Ana Koridor" });

  const ekle = () => {
    const zatenVar = atamalar.some(
      (a) => a.ogretmenId === yeniAtama.ogretmenId && a.gun === yeniAtama.gun
    );
    if (zatenVar) {
      alert("Bu öğretmen bu gün için zaten atanmış!");
      return;
    }
    setAtamalar([...atamalar, { ...yeniAtama }]);
  };

  const sil = (index: number) => {
    setAtamalar(atamalar.filter((_, i) => i !== index));
  };

  const otomatikDagit = () => {
    const yeniAtamalar: NobetAtamasi[] = [];
    const ogretmenler = [...demoOgretmenler];

    gunler.forEach((gun, gi) => {
      const yerler = nobetYerleri.slice(0, 2);
      yerler.forEach((yer, yi) => {
        const idx = (gi * 2 + yi) % ogretmenler.length;
        yeniAtamalar.push({
          ogretmenId: ogretmenler[idx].id,
          gun,
          yer,
        });
      });
    });

    setAtamalar(yeniAtamalar);
  };

  const gunRenkleri: Record<string, string> = {
    Pazartesi: "from-blue-500 to-blue-600",
    Salı: "from-violet-500 to-violet-600",
    Çarşamba: "from-emerald-500 to-emerald-600",
    Perşembe: "from-amber-500 to-amber-600",
    Cuma: "from-rose-500 to-rose-600",
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Kontroller */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Öğretmen</label>
              <select
                value={yeniAtama.ogretmenId}
                onChange={(e) => setYeniAtama({ ...yeniAtama, ogretmenId: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                {demoOgretmenler.map((o) => (
                  <option key={o.id} value={o.id}>{o.ad} {o.soyad} ({o.brans})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Gün</label>
              <select
                value={yeniAtama.gun}
                onChange={(e) => setYeniAtama({ ...yeniAtama, gun: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                {gunler.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Nöbet Yeri</label>
              <select
                value={yeniAtama.yer}
                onChange={(e) => setYeniAtama({ ...yeniAtama, yer: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                {nobetYerleri.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={ekle} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-all shadow-md">
              ➕ Ekle
            </button>
            <button onClick={otomatikDagit} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white hover:opacity-90 transition-all shadow-lg">
              🔄 Otomatik Dağıt
            </button>
          </div>
        </div>
      </div>

      {/* Haftalık Nöbet Çizelgesi */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {gunler.map((gun) => {
          const gunAtamalari = atamalar.filter((a) => a.gun === gun);
          return (
            <div key={gun} className="glass-card rounded-2xl overflow-hidden">
              <div className={`bg-gradient-to-r ${gunRenkleri[gun]} p-4 text-white text-center`}>
                <h4 className="font-bold text-sm">{gun}</h4>
                <p className="text-xs text-white/70 mt-0.5">{gunAtamalari.length} nöbetçi</p>
              </div>
              <div className="p-3 space-y-2">
                {gunAtamalari.length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)] text-center py-4">Atama yok</p>
                ) : (
                  gunAtamalari.map((atama, i) => {
                    const ogretmen = demoOgretmenler.find((o) => o.id === atama.ogretmenId);
                    return (
                      <div key={i} className="p-3 rounded-xl bg-[var(--secondary)] group hover:bg-[var(--primary)]/10 transition-all">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-[var(--foreground)]">
                              {ogretmen?.ad} {ogretmen?.soyad}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)]">{ogretmen?.brans}</p>
                            <p className="text-xs text-[var(--primary)] font-medium mt-1">📍 {atama.yer}</p>
                          </div>
                          <button
                            onClick={() => sil(atamalar.indexOf(atama))}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all text-sm"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* İstatistikler */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-base font-bold text-[var(--foreground)] mb-4">📊 Nöbet Dağılım Özeti</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {demoOgretmenler.slice(0, 10).map((ogr) => {
            const nobetSayisi = atamalar.filter((a) => a.ogretmenId === ogr.id).length;
            return (
              <div key={ogr.id} className="text-center p-3 rounded-xl bg-[var(--secondary)]">
                <p className="text-xs text-[var(--muted-foreground)] truncate">{ogr.ad} {ogr.soyad}</p>
                <p className="text-xl font-extrabold gradient-text mt-1">{nobetSayisi}</p>
                <p className="text-xs text-[var(--muted-foreground)]">nöbet</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
