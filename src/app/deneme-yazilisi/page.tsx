"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { sinifNumaralari, subeler, type Ogrenci } from "@/lib/data";
import { usePersistentState } from "@/lib/use-persistent-state";
import {
  subscribeOgrenciler,
  getInitialOgrenciler,
  subscribeDenemeYazililari,
  saveDenemeYazilisi,
  deleteDenemeYazilisi,
  type DenemeYazilisiDoc,
  type DenemeYazilisiNotlar,
} from "@/lib/firestore-service";

interface DersConfig {
  id: keyof DenemeYazilisiNotlar;
  label: string;
  emoji: string;
  bgLight: string;
  borderLight: string;
  textCol: string;
  badgeBg: string;
}

const DERSLER: DersConfig[] = [
  { id: "turkce", label: "Türkçe", emoji: "📖", bgLight: "bg-blue-500/10", borderLight: "border-blue-500/30", textCol: "text-blue-500", badgeBg: "bg-blue-500" },
  { id: "matematik", label: "Matematik", emoji: "🔢", bgLight: "bg-indigo-500/10", borderLight: "border-indigo-500/30", textCol: "text-indigo-500", badgeBg: "bg-indigo-500" },
  { id: "fen", label: "Fen Bilgisi", emoji: "🔬", bgLight: "bg-teal-500/10", borderLight: "border-teal-500/30", textCol: "text-teal-500", badgeBg: "bg-teal-500" },
  { id: "sosyal", label: "Sosyal Bilgiler", emoji: "🌍", bgLight: "bg-amber-500/10", borderLight: "border-amber-500/30", textCol: "text-amber-500", badgeBg: "bg-amber-500" },
  { id: "ingilizce", label: "İngilizce", emoji: "🇬🇧", bgLight: "bg-emerald-500/10", borderLight: "border-emerald-500/30", textCol: "text-emerald-500", badgeBg: "bg-emerald-500" },
  { id: "din", label: "Din Kültürü", emoji: "🕌", bgLight: "bg-rose-500/10", borderLight: "border-rose-500/30", textCol: "text-rose-500", badgeBg: "bg-rose-500" },
];

export default function DenemeYazilisiPage() {
  const [secilenSinif, setSecilenSinif] = usePersistentState("egitim_deneme_yazilisi_sinif", "8");
  const [secilenSube, setSecilenSube] = usePersistentState("egitim_deneme_yazilisi_sube", "A");

  // Öğrenci listesi
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>(getInitialOgrenciler);
  useEffect(() => {
    const unsub = subscribeOgrenciler((list) => setOgrenciler(list));
    return unsub;
  }, []);

  const sinifOgrencileri = useMemo(() => {
    return ogrenciler
      .filter((o) => o.sinif === secilenSinif && o.sube === secilenSube)
      .sort((a, b) => Number(a.numara) - Number(b.numara));
  }, [ogrenciler, secilenSinif, secilenSube]);

  // Deneme Sınavları / Yazılıları
  const [denemeler, setDenemeler] = useState<DenemeYazilisiDoc[]>([]);
  const [aktifDenemeId, setAktifDenemeId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeDenemeYazililari(secilenSinif, secilenSube, (list) => {
      setDenemeler(list);
      if (list.length > 0) {
        setAktifDenemeId((prev) => {
          if (prev && list.some((d) => d.id === prev)) return prev;
          return list[0].id;
        });
      } else {
        setAktifDenemeId(null);
      }
    });
    return unsub;
  }, [secilenSinif, secilenSube]);

  const aktifDeneme = useMemo(
    () => denemeler.find((d) => d.id === aktifDenemeId) || null,
    [denemeler, aktifDenemeId]
  );

  // Yeni Deneme Yazılısı Ekleme Modalı
  const [yeniModalAcik, setYeniModalAcik] = useState(false);
  const [yeniBaslik, setYeniBaslik] = useState("");
  const [yeniTarih, setYeniTarih] = useState(() => new Date().toISOString().split("T")[0]);

  // Arama & Filtreleme
  const [aramaMetni, setAramaMetni] = useState("");

  // Hızlı not girişi yerel state'i (aktif deneme seçili iken debounce veya doğrudan güncelleme için)
  const [kayitDurumu, setKayitDurumu] = useState<"idle" | "saving" | "saved">("idle");
  const kaydetZamanlayici = useRef<NodeJS.Timeout | null>(null);

  const yeniDenemeOlustur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yeniBaslik.trim()) {
      alert("Lütfen deneme yazılısı için bir başlık giriniz.");
      return;
    }

    const yeniId = "dy_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const yeniDoc: DenemeYazilisiDoc = {
      id: yeniId,
      baslik: yeniBaslik.trim(),
      sinif: secilenSinif,
      sube: secilenSube,
      tarih: yeniTarih,
      ogrenciNotlari: {},
    };

    await saveDenemeYazilisi(yeniDoc);
    setAktifDenemeId(yeniId);
    setYeniBaslik("");
    setYeniModalAcik(false);
  };

  const denemeSil = async (id: string, baslik: string) => {
    if (confirm(`"${baslik}" deneme yazılısını ve girilen tüm notları silmek istediğinize emin misiniz?`)) {
      await deleteDenemeYazilisi(id);
    }
  };

  // Not değişikliği işleyicisi (0-100 kontrolü)
  const handleNotDegisikligi = (ogrenciId: number, dersId: keyof DenemeYazilisiNotlar, degerStr: string) => {
    if (!aktifDeneme) return;

    let parsedVal: number | "" = "";
    if (degerStr !== "") {
      const num = parseInt(degerStr, 10);
      if (isNaN(num)) return;
      parsedVal = Math.max(0, Math.min(100, num));
    }

    const guncelOgrenciNotlari = {
      ...(aktifDeneme.ogrenciNotlari || {}),
      [ogrenciId]: {
        ...(aktifDeneme.ogrenciNotlari?.[ogrenciId] || {
          turkce: "",
          matematik: "",
          fen: "",
          sosyal: "",
          ingilizce: "",
          din: "",
        }),
        [dersId]: parsedVal,
      },
    };

    const guncelDeneme: DenemeYazilisiDoc = {
      ...aktifDeneme,
      ogrenciNotlari: guncelOgrenciNotlari,
    };

    // UI'da anında göster
    setDenemeler((prev) => prev.map((d) => (d.id === aktifDeneme.id ? guncelDeneme : d)));
    setKayitDurumu("saving");

    if (kaydetZamanlayici.current) clearTimeout(kaydetZamanlayici.current);
    kaydetZamanlayici.current = setTimeout(async () => {
      try {
        await saveDenemeYazilisi(guncelDeneme);
        setKayitDurumu("saved");
        setTimeout(() => setKayitDurumu("idle"), 1500);
      } catch (err) {
        console.error("Not kaydedilirken hata oluştu:", err);
        setKayitDurumu("idle");
      }
    }, 400);
  };

  // İstatistikler (Aktif deneme için)
  const istatistikler = useMemo(() => {
    if (!aktifDeneme) return null;

    const dersToplamlari: Record<keyof DenemeYazilisiNotlar, { toplam: number; sayi: number }> = {
      turkce: { toplam: 0, sayi: 0 },
      matematik: { toplam: 0, sayi: 0 },
      fen: { toplam: 0, sayi: 0 },
      sosyal: { toplam: 0, sayi: 0 },
      ingilizce: { toplam: 0, sayi: 0 },
      din: { toplam: 0, sayi: 0 },
    };

    let genelToplam = 0;
    let genelGirisSayisi = 0;

    sinifOgrencileri.forEach((ogr) => {
      const notlar = aktifDeneme.ogrenciNotlari?.[ogr.id];
      if (!notlar) return;

      DERSLER.forEach((d) => {
        const val = notlar[d.id];
        if (typeof val === "number" && !isNaN(val)) {
          dersToplamlari[d.id].toplam += val;
          dersToplamlari[d.id].sayi += 1;
          genelToplam += val;
          genelGirisSayisi += 1;
        }
      });
    });

    const ortalamalar: Record<keyof DenemeYazilisiNotlar, number | null> = {
      turkce: dersToplamlari.turkce.sayi > 0 ? Number((dersToplamlari.turkce.toplam / dersToplamlari.turkce.sayi).toFixed(1)) : null,
      matematik: dersToplamlari.matematik.sayi > 0 ? Number((dersToplamlari.matematik.toplam / dersToplamlari.matematik.sayi).toFixed(1)) : null,
      fen: dersToplamlari.fen.sayi > 0 ? Number((dersToplamlari.fen.toplam / dersToplamlari.fen.sayi).toFixed(1)) : null,
      sosyal: dersToplamlari.sosyal.sayi > 0 ? Number((dersToplamlari.sosyal.toplam / dersToplamlari.sosyal.sayi).toFixed(1)) : null,
      ingilizce: dersToplamlari.ingilizce.sayi > 0 ? Number((dersToplamlari.ingilizce.toplam / dersToplamlari.ingilizce.sayi).toFixed(1)) : null,
      din: dersToplamlari.din.sayi > 0 ? Number((dersToplamlari.din.toplam / dersToplamlari.din.sayi).toFixed(1)) : null,
    };

    const genelOrt = genelGirisSayisi > 0 ? Number((genelToplam / genelGirisSayisi).toFixed(1)) : null;

    return { ortalamalar, genelOrt, genelGirisSayisi };
  }, [aktifDeneme, sinifOgrencileri]);

  // Öğrenci bazlı ortalama hesaplama
  const ogrenciOrtalamaHesapla = (notlar?: DenemeYazilisiNotlar): number | null => {
    if (!notlar) return null;
    const girilenler: number[] = [];
    DERSLER.forEach((d) => {
      const v = notlar[d.id];
      if (typeof v === "number" && !isNaN(v)) {
        girilenler.push(v);
      }
    });
    if (girilenler.length === 0) return null;
    const t = girilenler.reduce((acc, curr) => acc + curr, 0);
    return Number((t / girilenler.length).toFixed(1));
  };

  // Filtrelenmiş öğrenci listesi
  const filtrelenmisOgrenciler = useMemo(() => {
    if (!aramaMetni.trim()) return sinifOgrencileri;
    const q = aramaMetni.toLowerCase();
    return sinifOgrencileri.filter(
      (o) =>
        o.ad.toLowerCase().includes(q) ||
        o.soyad.toLowerCase().includes(q) ||
        o.numara.includes(q)
    );
  }, [sinifOgrencileri, aramaMetni]);

  // Yazdır / PDF İşlevi
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Üst Başlık & Kontroller */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-xs">
              ✍️
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Deneme Yazılısı
              </h1>
              <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                Türkçe, Matematik, Fen, Sosyal, İngilizce ve Din Kültürü yazılı puanlarını girin ve analiz edin.
              </p>
            </div>
          </div>
        </div>

        {/* Aksiyonlar & Sınıf Seçiciler */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sınıf & Şube */}
          <div className="flex items-center gap-1.5 bg-[var(--card)] p-1.5 rounded-xl border border-[var(--border)] shadow-xs">
            <select
              value={secilenSinif}
              onChange={(e) => setSecilenSinif(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[var(--background)] text-sm font-semibold border border-[var(--border)] focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {sinifNumaralari.map((s) => (
                <option key={s} value={s}>
                  {s}. Sınıf
                </option>
              ))}
            </select>
            <select
              value={secilenSube}
              onChange={(e) => setSecilenSube(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[var(--background)] text-sm font-semibold border border-[var(--border)] focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {subeler.map((sb) => (
                <option key={sb} value={sb}>
                  {sb} Şubesi
                </option>
              ))}
            </select>
          </div>

          {/* Yeni Yazılı Ekle Butonu */}
          <button
            onClick={() => setYeniModalAcik(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <span>➕</span>
            <span>Yeni Deneme Yazılısı</span>
          </button>

          {/* Yazdır Butonu */}
          {aktifDeneme && (
            <button
              onClick={handlePrint}
              className="p-2 px-3 rounded-xl bg-[var(--card)] hover:bg-[var(--accent)] border border-[var(--border)] text-sm font-medium transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Sonuç Tablosunu Yazdır"
            >
              <span>🖨️</span>
              <span className="hidden sm:inline">Yazdır</span>
            </button>
          )}
        </div>
      </div>

      {/* Deneme Yazılısı Seçim Sekmeleri */}
      {denemeler.length > 0 ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {denemeler.map((d) => {
            const isSelected = d.id === aktifDenemeId;
            return (
              <div
                key={d.id}
                onClick={() => setAktifDenemeId(d.id)}
                className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-all whitespace-nowrap shadow-xs ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/20 shadow-md"
                    : "bg-[var(--card)] hover:bg-[var(--accent)] text-[var(--foreground)] border-[var(--border)]"
                }`}
              >
                <span>✍️</span>
                <span className="font-semibold">{d.baslik}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-md ${
                    isSelected ? "bg-white/20 text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                  }`}
                >
                  {d.tarih}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    denemeSil(d.id, d.baslik);
                  }}
                  className={`opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500 hover:text-white rounded-md transition-all ${
                    isSelected ? "text-white/80" : "text-red-500"
                  }`}
                  title="Bu deneme yazılısını sil"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center bg-[var(--card)] rounded-2xl border border-dashed border-[var(--border)]">
          <div className="text-4xl mb-3">📝</div>
          <h3 className="text-lg font-bold">Henüz Deneme Yazılısı Eklenmemiş</h3>
          <p className="text-sm text-[var(--muted-foreground)] max-w-md mx-auto mt-1 mb-4">
            {secilenSinif}/{secilenSube} sınıfı için henüz kayıtlı bir deneme yazılısı bulunmuyor. Yeni bir deneme ekleyerek 6 temel dersin notlarını kolayca girebilirsiniz.
          </p>
          <button
            onClick={() => setYeniModalAcik(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md cursor-pointer"
          >
            + İlk Deneme Yazılısını Ekle
          </button>
        </div>
      )}

      {/* Aktif Deneme Detayı & Not Giriş Tablosu */}
      {aktifDeneme && (
        <div className="space-y-6">
          {/* İstatistik Özet Kartları */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {/* Genel Ortalama */}
            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-transparent border border-indigo-500/30 flex flex-col justify-between">
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                Genel Sınıf Ort.
              </span>
              <div className="text-2xl font-black mt-1 text-indigo-600 dark:text-indigo-400">
                {istatistikler?.genelOrt !== null ? istatistikler?.genelOrt : "-"}
              </div>
              <span className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                {istatistikler?.genelGirisSayisi || 0} not girildi
              </span>
            </div>

            {/* 6 Dersin Ortalamaları */}
            {DERSLER.map((d) => {
              const ort = istatistikler?.ortalamalar[d.id];
              return (
                <div
                  key={d.id}
                  className={`p-3.5 rounded-2xl ${d.bgLight} border ${d.borderLight} flex flex-col justify-between`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--foreground)] truncate">
                      {d.label}
                    </span>
                    <span className="text-sm">{d.emoji}</span>
                  </div>
                  <div className={`text-2xl font-black mt-1 ${d.textCol}`}>
                    {ort !== null ? ort : "-"}
                  </div>
                  <span className="text-[10px] text-[var(--muted-foreground)]">Ortalama Puan</span>
                </div>
              );
            })}
          </div>

          {/* Tablo Araç Çubuğu (Arama & Durum) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--card)] p-3 rounded-2xl border border-[var(--border)] shadow-xs">
            <div className="relative flex-1 max-w-sm">
              <span className="absolute left-3 top-2.5 text-sm text-[var(--muted-foreground)]">🔍</span>
              <input
                type="text"
                placeholder="Öğrenci adı, soyadı veya no ile ara..."
                value={aramaMetni}
                onChange={(e) => setAramaMetni(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-xl bg-[var(--background)] border border-[var(--border)] focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 text-xs">
              {kayitDurumu === "saving" && (
                <span className="flex items-center gap-1.5 text-amber-500 font-medium animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Kaydediliyor...
                </span>
              )}
              {kayitDurumu === "saved" && (
                <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
                  <span>✓</span> Değişiklikler kaydedildi
                </span>
              )}
              {kayitDurumu === "idle" && (
                <span className="text-[var(--muted-foreground)]">
                  Notları 0-100 arasında doğrudan yazabilirsiniz (otomatik kaydedilir).
                </span>
              )}
            </div>
          </div>

          {/* Not Giriş Tablosu */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[var(--muted)]/50 border-b border-[var(--border)]">
                    <th className="py-3 px-4 font-bold w-14 text-center">No</th>
                    <th className="py-3 px-4 font-bold min-w-[180px]">Öğrenci</th>
                    {DERSLER.map((d) => (
                      <th key={d.id} className="py-3 px-3 font-bold text-center min-w-[100px]">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{d.emoji}</span>
                          <span>{d.label}</span>
                        </div>
                      </th>
                    ))}
                    <th className="py-3 px-4 font-bold text-center w-28 bg-indigo-500/5">Ortalama</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filtrelenmisOgrenciler.length === 0 ? (
                    <tr>
                      <td colSpan={2 + DERSLER.length + 1} className="py-8 text-center text-[var(--muted-foreground)]">
                        {sinifOgrencileri.length === 0
                          ? `${secilenSinif}/${secilenSube} sınıfında kayıtlı öğrenci bulunamadı. "Sınıf Listesi" menüsünden öğrenci ekleyebilirsiniz.`
                          : "Aramanıza uygun öğrenci bulunamadı."}
                      </td>
                    </tr>
                  ) : (
                    filtrelenmisOgrenciler.map((ogr) => {
                      const ogrNotlar = aktifDeneme.ogrenciNotlari?.[ogr.id];
                      const ort = ogrenciOrtalamaHesapla(ogrNotlar);

                      return (
                        <tr key={ogr.id} className="hover:bg-[var(--accent)]/30 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-center text-xs text-[var(--muted-foreground)]">
                            {ogr.numara}
                          </td>
                          <td className="py-2.5 px-4 font-semibold">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                                {ogr.ad.charAt(0)}
                              </span>
                              <span>
                                {ogr.ad} {ogr.soyad}
                              </span>
                            </div>
                          </td>
                          {DERSLER.map((d) => {
                            const val = ogrNotlar?.[d.id] ?? "";
                            return (
                              <td key={d.id} className="py-2 px-2 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  placeholder="-"
                                  value={val}
                                  onChange={(e) => handleNotDegisikligi(ogr.id, d.id, e.target.value)}
                                  className="w-16 mx-auto text-center font-bold text-sm py-1.5 px-2 rounded-xl border border-[var(--border)] bg-[var(--background)] focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-[var(--muted-foreground)]/40"
                                />
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-4 text-center bg-indigo-500/5">
                            {ort !== null ? (
                              <span
                                className={`inline-flex items-center justify-center px-2.5 py-1 rounded-xl text-xs font-bold ${
                                  ort >= 85
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                    : ort >= 70
                                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                                    : ort >= 50
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                }`}
                              >
                                {ort}
                              </span>
                            ) : (
                              <span className="text-xs text-[var(--muted-foreground)]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Yeni Deneme Yazılısı Ekleme Modalı */}
      {yeniModalAcik && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-2xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span>✍️</span> Yeni Deneme Yazılısı
              </h3>
              <button
                onClick={() => setYeniModalAcik(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--accent)] text-[var(--muted-foreground)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={yeniDenemeOlustur} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                  Yazılı Başlığı / Adı
                </label>
                <input
                  type="text"
                  required
                  placeholder="örn: 1. Dönem 1. Deneme Yazılısı"
                  value={yeniBaslik}
                  onChange={(e) => setYeniBaslik(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--background)] border border-[var(--border)] focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                  Uygulama Tarihi
                </label>
                <input
                  type="date"
                  required
                  value={yeniTarih}
                  onChange={(e) => setYeniTarih(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--background)] border border-[var(--border)] focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 bg-[var(--muted)]/50 rounded-xl text-xs space-y-1 text-[var(--muted-foreground)]">
                <p>
                  <strong>Sınıf:</strong> {secilenSinif}. Sınıf / {secilenSube} Şubesi
                </p>
                <p>
                  <strong>İçerik:</strong> Türkçe, Matematik, Fen Bilgisi, Sosyal Bilgiler, İngilizce, Din Kültürü (0-100 Puan)
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setYeniModalAcik(false)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-[var(--border)] hover:bg-[var(--accent)] cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-md"
                >
                  Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

