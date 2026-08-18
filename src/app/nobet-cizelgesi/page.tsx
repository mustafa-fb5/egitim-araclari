"use client";

import { useState, useEffect } from "react";
import { demoPersoneller, gunler, type Personel } from "@/lib/data";
import {
  subscribeNobetAtamalari,
  saveNobetAtamalari,
  subscribePersoneller,
  type NobetAtamasiData as NobetAtamasi,
  type PersonelData,
} from "@/lib/firestore-service";

const varsayilanAtamalar: NobetAtamasi[] = [
  { ogretmenId: 1, gun: "Pazartesi" },
  { ogretmenId: 2, gun: "Pazartesi" },
  { ogretmenId: 3, gun: "Salı" },
  { ogretmenId: 4, gun: "Salı" },
  { ogretmenId: 5, gun: "Çarşamba" },
  { ogretmenId: 6, gun: "Çarşamba" },
  { ogretmenId: 7, gun: "Perşembe" },
  { ogretmenId: 8, gun: "Perşembe" },
  { ogretmenId: 9, gun: "Cuma" },
  { ogretmenId: 10, gun: "Cuma" },
];

export default function NobetCizelgesiPage() {
  const [personeller, setPersoneller] = useState<(Personel | PersonelData)[]>(demoPersoneller);
  const [atamalar, setAtamalar] = useState<NobetAtamasi[]>(varsayilanAtamalar);
  const [yeniAtama, setYeniAtama] = useState({ ogretmenId: 1, gun: "Pazartesi" });

  // Firestore Canlı Senkronizasyon (Atamalar ve Personel Listesi)
  useEffect(() => {
    const unsubAtamalar = subscribeNobetAtamalari((remote) => {
      if (remote && remote.length > 0) {
        setAtamalar(remote);
      }
    });

    const unsubPersonel = subscribePersoneller((remotePersoneller) => {
      if (remotePersoneller && remotePersoneller.length > 0) {
        setPersoneller(remotePersoneller);
      }
    });

    return () => {
      unsubAtamalar();
      unsubPersonel();
    };
  }, []);

  const ekle = async () => {
    const zatenVar = atamalar.some(
      (a) => a.ogretmenId === yeniAtama.ogretmenId && a.gun === yeniAtama.gun
    );
    if (zatenVar) {
      alert("Bu öğretmen bu gün için zaten atanmış!");
      return;
    }
    const guncel = [...atamalar, { ...yeniAtama }];
    setAtamalar(guncel);
    await saveNobetAtamalari(guncel);
  };

  const sil = async (index: number) => {
    const guncel = atamalar.filter((_, i) => i !== index);
    setAtamalar(guncel);
    await saveNobetAtamalari(guncel);
  };

  const temizle = async () => {
    if (confirm("Tüm haftalık nöbet çizelgesini temizlemek istediğinize emin misiniz?")) {
      setAtamalar([]);
      await saveNobetAtamalari([]);
    }
  };

  const otomatikDagit = async () => {
    if (personeller.length === 0) {
      alert("Nöbet dağıtmak için en az 1 öğretmen veya personel bulunmalıdır.");
      return;
    }
    const yeniAtamalar: NobetAtamasi[] = [];
    gunler.forEach((gun, gi) => {
      // Her güne 2 öğretmen dengeli dağıt
      for (let yi = 0; yi < 2; yi++) {
        const idx = (gi * 2 + yi) % personeller.length;
        yeniAtamalar.push({
          ogretmenId: personeller[idx].id,
          gun,
        });
      }
    });

    setAtamalar(yeniAtamalar);
    await saveNobetAtamalari(yeniAtamalar);
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
      <div className="glass-card rounded-2xl p-6 no-print">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
                Öğretmen Seçimi
              </label>
              <select
                value={yeniAtama.ogretmenId}
                onChange={(e) => setYeniAtama({ ...yeniAtama, ogretmenId: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-semibold"
              >
                {personeller.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.adSoyad || `${(o as unknown as { ad: string; soyad: string }).ad || ""} ${(o as unknown as { ad: string; soyad: string }).soyad || ""}`} ({o.brans})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
                Nöbet Günü
              </label>
              <select
                value={yeniAtama.gun}
                onChange={(e) => setYeniAtama({ ...yeniAtama, gun: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-semibold"
              >
                {gunler.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={ekle}
              className="px-4 py-2.5 rounded-xl text-sm font-bold bg-[var(--primary)] text-white hover:opacity-90 transition-all shadow-md flex items-center gap-1"
            >
              <span>➕</span>
              <span>Nöbet Ekle</span>
            </button>
            <button
              onClick={otomatikDagit}
              className="px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white hover:opacity-90 transition-all shadow-lg flex items-center gap-1"
            >
              <span>🔄</span>
              <span>Otomatik Dağıt</span>
            </button>
            <button
              onClick={temizle}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--secondary)] text-[var(--foreground)] hover:bg-red-500 hover:text-white transition-all shadow-sm"
            >
              🗑️ Temizle
            </button>
          </div>
        </div>
      </div>

      {/* Haftalık Nöbet Çizelgesi */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {gunler.map((gun) => {
          const gunAtamalari = atamalar.filter((a) => a.gun === gun);
          return (
            <div
              key={gun}
              className="glass-card rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`bg-gradient-to-r ${gunRenkleri[gun]} p-4 text-white text-center`}>
                <h4 className="font-bold text-sm">{gun}</h4>
                <p className="text-xs text-white/80 mt-0.5 font-medium">{gunAtamalari.length} nöbetçi</p>
              </div>
              <div className="p-3 space-y-2">
                {gunAtamalari.length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)] text-center py-6">Atama yok</p>
                ) : (
                  gunAtamalari.map((atama, i) => {
                    const ogretmen = personeller.find((o) => o.id === atama.ogretmenId);
                    const isim = ogretmen?.adSoyad ||
                      ((ogretmen as unknown as { ad?: string; soyad?: string })?.ad
                        ? `${(ogretmen as unknown as { ad: string; soyad: string }).ad} ${(ogretmen as unknown as { ad: string; soyad: string }).soyad}`
                        : "Bilinmeyen Öğretmen");

                    return (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-[var(--secondary)] group hover:bg-[var(--primary)]/10 transition-all border border-[var(--border)]/50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-[var(--foreground)]">{isim}</p>
                            <p className="text-xs text-[var(--muted-foreground)] font-medium mt-0.5">
                              {ogretmen?.brans || "-"}
                            </p>
                          </div>
                          <button
                            onClick={() => sil(atamalar.indexOf(atama))}
                            className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center text-xs font-bold"
                            title="Bu nöbeti kaldır"
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
        <h3 className="text-base font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <span>📊</span>
          <span>Nöbet Dağılım Özeti</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {personeller.map((ogr) => {
            const nobetSayisi = atamalar.filter((a) => a.ogretmenId === ogr.id).length;
            const isim = ogr.adSoyad ||
              ((ogr as unknown as { ad?: string; soyad?: string })?.ad
                ? `${(ogr as unknown as { ad: string; soyad: string }).ad} ${(ogr as unknown as { ad: string; soyad: string }).soyad}`
                : "Öğretmen");

            return (
              <div
                key={ogr.id}
                className="text-center p-3.5 rounded-xl bg-[var(--secondary)] border border-[var(--border)]"
              >
                <p className="text-xs font-bold text-[var(--foreground)] truncate">{isim}</p>
                <p className="text-[10px] text-[var(--muted-foreground)] truncate">{ogr.brans}</p>
                <p className="text-xl font-black gradient-text mt-1">{nobetSayisi}</p>
                <p className="text-[11px] font-semibold text-[var(--muted-foreground)]">nöbet</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
