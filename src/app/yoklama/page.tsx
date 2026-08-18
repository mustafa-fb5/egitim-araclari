"use client";

import { useState, useEffect, useMemo } from "react";
import { demoOgrenciler, sinifNumaralari, subeler, type Ogrenci } from "@/lib/data";
import { usePersistentState } from "@/lib/use-persistent-state";
import { subscribeOgrenciler, subscribeYoklamalar, saveYoklamaGunu } from "@/lib/firestore-service";

type YoklamaDurum = "var" | "yok" | "izinli";

export default function YoklamaPage() {
  const [secilenSinif, setSecilenSinif] = usePersistentState("egitim_yoklama_sinif", "Tümü");
  const [secilenSube, setSecilenSube] = usePersistentState("egitim_yoklama_sube", "Tümü");
  const [tarih, setTarih] = useState(new Date().toISOString().split("T")[0]);
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>(demoOgrenciler);
  const [yoklamalar, setYoklamalar] = useState<Record<number, YoklamaDurum>>({});
  const [kayitliGunler, setKayitliGunler] = useState<Record<string, Record<number, string>>>({});

  // Firestore Gerçek Zamanlı (Realtime) Abonelik
  useEffect(() => {
    const unsubOgrenciler = subscribeOgrenciler((data) => setOgrenciler(data));
    const unsubYoklamalar = subscribeYoklamalar((data) => {
      setKayitliGunler(data);
    });
    return () => {
      unsubOgrenciler();
      unsubYoklamalar();
    };
  }, []);

  // Tarih, kayıtlar veya öğrenciler güncellendiğinde yoklamaları senkronize et
  useEffect(() => {
    const birlesik: Record<number, YoklamaDurum> = {};
    ogrenciler.forEach((o) => {
      const key = `${o.sinif}${o.sube}-${tarih}`;
      const durum = kayitliGunler[key]?.[o.id];
      if (durum && (durum === "var" || durum === "yok" || durum === "izinli")) {
        birlesik[o.id] = durum as YoklamaDurum;
      }
    });
    setYoklamalar(birlesik);
  }, [tarih, kayitliGunler, ogrenciler]);

  const [kayitDurumu, setKayitDurumu] = useState<"hazir" | "kaydediliyor" | "kaydedildi">("hazir");

  const filtrelenmisOgrenciler = useMemo(() => {
    return ogrenciler.filter((o) => {
      const sinifUygun = secilenSinif === "Tümü" || o.sinif === secilenSinif;
      const subeUygun = secilenSube === "Tümü" || o.sube === secilenSube;
      return sinifUygun && subeUygun;
    });
  }, [ogrenciler, secilenSinif, secilenSube]);

  const durumDegistir = async (ogrenciId: number, durum: YoklamaDurum) => {
    const ayniDurumMu = yoklamalar[ogrenciId] === durum;

    setYoklamalar((prev) => {
      const kopya = { ...prev };
      if (ayniDurumMu) {
        delete kopya[ogrenciId];
      } else {
        kopya[ogrenciId] = durum;
      }
      return kopya;
    });
    setKayitDurumu("kaydediliyor");

    const ogr = ogrenciler.find((o) => o.id === ogrenciId);
    if (ogr) {
      const key = `${ogr.sinif}${ogr.sube}-${tarih}`;
      const guncelKayitlar: Record<number, string> = { ...(kayitliGunler[key] || {}) };
      if (ayniDurumMu) {
        delete guncelKayitlar[ogrenciId];
      } else {
        guncelKayitlar[ogrenciId] = durum;
      }
      setKayitliGunler((prev) => ({ ...prev, [key]: guncelKayitlar }));
      try {
        await saveYoklamaGunu(key, guncelKayitlar);
        setKayitDurumu("kaydedildi");
      } catch (err) {
        console.error("Otomatik kaydetme hatası:", err);
      }
    }
  };

  const tumunuIsaretle = async (durum: YoklamaDurum) => {
    const hepsiAyniMi = filtrelenmisOgrenciler.length > 0 && filtrelenmisOgrenciler.every((o) => yoklamalar[o.id] === durum);

    const yeni: Record<number, YoklamaDurum> = { ...yoklamalar };
    filtrelenmisOgrenciler.forEach((o) => {
      if (hepsiAyniMi) {
        delete yeni[o.id];
      } else {
        yeni[o.id] = durum;
      }
    });
    setYoklamalar(yeni);
    setKayitDurumu("kaydediliyor");

    const sinifGruplari: Record<string, Record<number, string>> = {};
    filtrelenmisOgrenciler.forEach((o) => {
      const key = `${o.sinif}${o.sube}-${tarih}`;
      if (!sinifGruplari[key]) {
        sinifGruplari[key] = { ...(kayitliGunler[key] || {}) };
      }
      if (hepsiAyniMi) {
        delete sinifGruplari[key][o.id];
      } else {
        sinifGruplari[key][o.id] = durum;
      }
    });

    const guncelKayitliGunler = { ...kayitliGunler };
    try {
      for (const [key, kayitlar] of Object.entries(sinifGruplari)) {
        await saveYoklamaGunu(key, kayitlar);
        guncelKayitliGunler[key] = kayitlar;
      }
      setKayitliGunler(guncelKayitliGunler);
      setKayitDurumu("kaydedildi");
    } catch (err) {
      console.error("Toplu kaydetme hatası:", err);
    }
  };

  const durumRenk = (durum?: YoklamaDurum) => {
    switch (durum) {
      case "var": return "bg-emerald-500 text-white";
      case "yok": return "bg-red-500 text-white";
      case "izinli": return "bg-amber-500 text-white";
      default: return "bg-[var(--secondary)] text-[var(--muted-foreground)]";
    }
  };

  const varSayisi = filtrelenmisOgrenciler.filter((o) => yoklamalar[o.id] === "var").length;
  const yokSayisi = filtrelenmisOgrenciler.filter((o) => yoklamalar[o.id] === "yok").length;
  const izinliSayisi = filtrelenmisOgrenciler.filter((o) => yoklamalar[o.id] === "izinli").length;
  const belirsiz = filtrelenmisOgrenciler.length - varSayisi - yokSayisi - izinliSayisi;

  const baslikMetni = useMemo(() => {
    if (secilenSinif === "Tümü" && secilenSube === "Tümü") return "Tüm Öğrenciler";
    if (secilenSinif === "Tümü") return `Tüm ${secilenSube} Şubeleri`;
    if (secilenSube === "Tümü") return `${secilenSinif}. Sınıflar (Tüm Şubeler)`;
    return `${secilenSinif}-${secilenSube} Sınıfı`;
  }, [secilenSinif, secilenSube]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Filtreler */}
      <div className="glass-card rounded-2xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">Sınıf Filtresi</label>
            <select
              value={secilenSinif}
              onChange={(e) => setSecilenSinif(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="Tümü">Tüm Sınıflar (1-12)</option>
              {sinifNumaralari.map((s) => (
                <option key={s} value={s}>{s}. Sınıf</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">Şube Filtresi</label>
            <select
              value={secilenSube}
              onChange={(e) => setSecilenSube(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="Tümü">Tüm Şubeler (A-S)</option>
              {subeler.map((s) => (
                <option key={s} value={s}>{s} Şubesi</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">Tarih</label>
            <input
              type="date"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => tumunuIsaretle("var")} 
              className="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
              title="Görüntülenen tüm öğrencileri Var olarak işaretler ve kaydeder"
            >
              ✅ Tümü Var
            </button>
            <div className="flex items-center justify-center px-3 py-2 rounded-xl bg-[var(--secondary)] border border-[var(--border)] text-xs text-[var(--muted-foreground)] whitespace-nowrap">
              {kayitDurumu === "kaydediliyor" ? (
                <span className="flex items-center gap-1.5 text-amber-500 font-medium animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Kaydediliyor...
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Otomatik Kayıt
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Kompakt İstatistik Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: "Var", sayi: varSayisi, ikon: "✅", renk: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Yok", sayi: yokSayisi, ikon: "❌", renk: "text-red-500", bg: "bg-red-500/10" },
          { label: "İzinli", sayi: izinliSayisi, ikon: "📝", renk: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Belirsiz", sayi: belirsiz, ikon: "❓", renk: "text-gray-400", bg: "bg-gray-500/10" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card rounded-xl px-3.5 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">{stat.ikon}</span>
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">{stat.label}</span>
            </div>
            <span className={`text-lg font-black ${stat.renk}`}>{stat.sayi}</span>
          </div>
        ))}
      </div>

      {/* Yoklama Listesi */}
      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[var(--foreground)]">
            📋 {baslikMetni} Yoklaması ({filtrelenmisOgrenciler.length} Öğrenci)
          </h3>
          <span className="text-xs text-[var(--muted-foreground)]">
            {new Date(tarih).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>

        {filtrelenmisOgrenciler.length === 0 ? (
          <p className="text-center text-[var(--muted-foreground)] py-6 text-sm">Seçilen kriterlere uygun öğrenci bulunamadı.</p>
        ) : (
          <div className="space-y-1.5">
            {filtrelenmisOgrenciler.map((ogrenci, i) => (
              <div
                key={ogrenci.id}
                className={`flex items-center justify-between py-2 px-3.5 rounded-xl border border-[var(--border)] hover:bg-[var(--secondary)]/40 transition-all animate-slide-up stagger-${Math.min(i + 1, 10)}`}
                style={{ opacity: 0 }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {ogrenci.numara}
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <p className="font-semibold text-xs sm:text-sm text-[var(--foreground)] truncate">
                      {ogrenci.ad} {ogrenci.soyad}
                    </p>
                    <span className="badge-info px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0">
                      {ogrenci.sinif}-{ogrenci.sube}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {(["var", "yok", "izinli"] as YoklamaDurum[]).map((durum) => (
                    <button
                      key={durum}
                      onClick={() => durumDegistir(ogrenci.id, durum)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        yoklamalar[ogrenci.id] === durum
                          ? durumRenk(durum)
                          : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:opacity-80"
                      }`}
                    >
                      {durum === "var" ? "VAR" : durum === "yok" ? "YOK" : "İZİNLİ"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
