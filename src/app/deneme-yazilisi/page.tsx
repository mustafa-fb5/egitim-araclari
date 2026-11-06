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

// ============================================================
// DERS TANIMLARI (6 Temel Ders)
// ============================================================
export type DenemeDersId = keyof DenemeYazilisiNotlar; // "turkce" | "matematik" | "fen" | "sosyal" | "ingilizce" | "din"

interface DersConfig {
  id: DenemeDersId;
  label: string;
  emoji: string;
  bgLight: string;
  borderLight: string;
  textCol: string;
  activeBtnClass: string;
}

const DERSLER: DersConfig[] = [
  { id: "turkce",    label: "Türkçe",         emoji: "📖", bgLight: "bg-blue-500/10",    borderLight: "border-blue-500/30",    textCol: "text-blue-500",    activeBtnClass: "bg-blue-600 text-white shadow-blue-500/25 border-blue-600" },
  { id: "matematik", label: "Matematik",      emoji: "🔢", bgLight: "bg-indigo-500/10",  borderLight: "border-indigo-500/30",  textCol: "text-indigo-500",  activeBtnClass: "bg-indigo-600 text-white shadow-indigo-500/25 border-indigo-600" },
  { id: "fen",       label: "Fen Bilgisi",    emoji: "🔬", bgLight: "bg-teal-500/10",    borderLight: "border-teal-500/30",    textCol: "text-teal-500",    activeBtnClass: "bg-teal-600 text-white shadow-teal-500/25 border-teal-600" },
  { id: "sosyal",    label: "Sosyal Bilgiler",emoji: "🌍", bgLight: "bg-amber-500/10",   borderLight: "border-amber-500/30",   textCol: "text-amber-500",   activeBtnClass: "bg-amber-500 text-white shadow-amber-500/25 border-amber-500" },
  { id: "ingilizce", label: "İngilizce",      emoji: "🇬🇧", bgLight: "bg-emerald-500/10", borderLight: "border-emerald-500/30", textCol: "text-emerald-500", activeBtnClass: "bg-emerald-600 text-white shadow-emerald-500/25 border-emerald-600" },
  { id: "din",       label: "Din Kültürü",    emoji: "🕌", bgLight: "bg-rose-500/10",    borderLight: "border-rose-500/30",    textCol: "text-rose-500",    activeBtnClass: "bg-rose-600 text-white shadow-rose-500/25 border-rose-600" },
];

export default function DenemeYazilisiPage() {
  // Sınıf, Şube ve Aktif Ders (Kalıcı)
  const [secilenSinif, setSecilenSinif] = usePersistentState("egitim_deneme_yazilisi_sinif", "8");
  const [secilenSube, setSecilenSube]   = usePersistentState("egitim_deneme_yazilisi_sube", "A");
  const [secilenDers, setSecilenDers]   = usePersistentState<DenemeDersId>("egitim_deneme_yazilisi_secilen_ders", "turkce");

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

  const seciliDersDetay = useMemo(
    () => DERSLER.find((d) => d.id === secilenDers) || DERSLER[0],
    [secilenDers]
  );

  // Yeni Deneme Yazılısı Ekleme Modalı
  const [yeniModalAcik, setYeniModalAcik] = useState(false);
  const [yeniBaslik, setYeniBaslik] = useState("");
  const [yeniTarih, setYeniTarih] = useState(() => new Date().toISOString().split("T")[0]);

  // Önizleme Modalı State'i (Testler bölümündeki gibi)
  const [onizlemeModalAcik, setOnizlemeModalAcik] = useState(false);

  // Arama & Filtreleme
  const [aramaMetni, setAramaMetni] = useState("");

  // Otomatik kaydetme durumu
  const [kayitDurumu, setKayitDurumu] = useState<"idle" | "saving" | "saved">("idle");
  const kaydetZamanlayici = useRef<NodeJS.Timeout | null>(null);

  // Yeni deneme yazılısı oluştur
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
  const handleNotDegisikligi = (ogrenciId: number, degerStr: string) => {
    if (!aktifDeneme) return;

    let parsedVal: number | "" = "";
    if (degerStr !== "") {
      const num = parseInt(degerStr, 10);
      if (isNaN(num)) return;
      parsedVal = Math.max(0, Math.min(100, num));
    }

    const ogrMevcutNotlar = aktifDeneme.ogrenciNotlari?.[ogrenciId] || {
      turkce: "",
      matematik: "",
      fen: "",
      sosyal: "",
      ingilizce: "",
      din: "",
    };

    const guncelOgrenciNotlari = {
      ...(aktifDeneme.ogrenciNotlari || {}),
      [ogrenciId]: {
        ...ogrMevcutNotlar,
        [secilenDers]: parsedVal,
      },
    };

    const guncelDeneme: DenemeYazilisiDoc = {
      ...aktifDeneme,
      ogrenciNotlari: guncelOgrenciNotlari,
    };

    // UI'da anında güncelle
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

  // Seçili derse göre sıralı öğrenci listesi (Yüksek nottan düşüğe, girilmemişler sona)
  const siraliOgrenciler = useMemo(() => {
    return [...sinifOgrencileri].sort((a, b) => {
      const notA = aktifDeneme?.ogrenciNotlari?.[a.id]?.[secilenDers];
      const notB = aktifDeneme?.ogrenciNotlari?.[b.id]?.[secilenDers];

      const hasA = typeof notA === "number" && !isNaN(notA);
      const hasB = typeof notB === "number" && !isNaN(notB);

      if (!hasA && !hasB) return Number(a.numara) - Number(b.numara);
      if (!hasA) return 1;
      if (!hasB) return -1;
      return (notB as number) - (notA as number);
    });
  }, [sinifOgrencileri, aktifDeneme, secilenDers]);

  // Tabloda gösterilecek filtrelenmiş öğrenci listesi (numara sırasına göre)
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

  // Seçili dersin istatistikleri
  const seciliDersIstatistikleri = useMemo(() => {
    if (!aktifDeneme) return { ortalama: null, girisSayisi: 0, enYuksek: null, enDusuk: null };

    const notlar: number[] = [];
    sinifOgrencileri.forEach((ogr) => {
      const val = aktifDeneme.ogrenciNotlari?.[ogr.id]?.[secilenDers];
      if (typeof val === "number" && !isNaN(val)) {
        notlar.push(val);
      }
    });

    if (notlar.length === 0) return { ortalama: null, girisSayisi: 0, enYuksek: null, enDusuk: null };

    const toplam = notlar.reduce((a, b) => a + b, 0);
    const ortalama = Number((toplam / notlar.length).toFixed(1));
    const enYuksek = Math.max(...notlar);
    const enDusuk = Math.min(...notlar);

    return { ortalama, girisSayisi: notlar.length, enYuksek, enDusuk };
  }, [aktifDeneme, sinifOgrencileri, secilenDers]);

  // Ders bazlı not giriş sayısı
  const dersGirisSayilari = useMemo(() => {
    const sayilar: Record<DenemeDersId, number> = {
      turkce: 0,
      matematik: 0,
      fen: 0,
      sosyal: 0,
      ingilizce: 0,
      din: 0,
    };
    if (!aktifDeneme) return sayilar;

    sinifOgrencileri.forEach((ogr) => {
      const ogrNotlar = aktifDeneme.ogrenciNotlari?.[ogr.id];
      if (!ogrNotlar) return;
      DERSLER.forEach((d) => {
        const val = ogrNotlar[d.id];
        if (typeof val === "number" && !isNaN(val)) {
          sayilar[d.id] += 1;
        }
      });
    });
    return sayilar;
  }, [aktifDeneme, sinifOgrencileri]);

  // Not durumuna göre renk etiketi
  const notRenkEtiketi = (puan: number) => {
    if (puan >= 85) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    if (puan >= 70) return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
    if (puan >= 50) return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
    return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Üst Başlık & Kontroller */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-xs">
              ✍️
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight gradient-text">
                Deneme Yazılısı
              </h1>
              <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                Ders bazlı deneme yazılısı sonuçlarını girin, sıralamaları ve başarı analizlerini inceleyin.
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
        </div>
      </div>

      {/* DERS SEÇİM SEKMELERİ (TESTLER BÖLÜMÜNDEKİ GİBİ ÜSTTE) */}
      <div className="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
            📚 Branş / Ders Seçimi (Önce dersi seçin, ardından notları girin)
          </span>
          <span className="text-xs font-medium text-indigo-500">
            Aktif Ders: <strong>{seciliDersDetay.emoji} {seciliDersDetay.label}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {DERSLER.map((d) => {
            const isActive = secilenDers === d.id;
            const girisSayisi = dersGirisSayilari[d.id] || 0;

            return (
              <button
                key={d.id}
                onClick={() => setSecilenDers(d.id)}
                className={`flex flex-col items-start justify-between p-3 rounded-xl font-bold transition-all border cursor-pointer ${
                  isActive
                    ? `${d.activeBtnClass} shadow-md scale-[1.02]`
                    : "bg-[var(--background)] hover:bg-[var(--accent)] text-[var(--foreground)] border-[var(--border)]"
                }`}
              >
                <div className="flex items-center gap-2 w-full justify-between">
                  <span className="text-base">{d.emoji}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                    }`}
                  >
                    {girisSayisi}/{sinifOgrencileri.length}
                  </span>
                </div>
                <span className="text-sm font-extrabold mt-1.5">{d.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Deneme Yazılısı Seçim Sekmeleri */}
      {denemeler.length > 0 ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
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
            {secilenSinif}/{secilenSube} sınıfı için henüz kayıtlı bir deneme yazılısı bulunmuyor. Yeni bir deneme ekleyerek branş bazında notları girebilirsiniz.
          </p>
          <button
            onClick={() => setYeniModalAcik(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md cursor-pointer"
          >
            + İlk Deneme Yazılısını Ekle
          </button>
        </div>
      )}

      {/* Aktif Deneme Detayı & Not Giriş Alanı */}
      {aktifDeneme && (
        <div className="space-y-4">
          {/* Başlık Kartı, Önizleme Butonu & Özet İstatistikler */}
          <div className="bg-[var(--card)] rounded-2xl p-4 sm:p-5 border border-[var(--border)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className={`text-3xl p-2.5 rounded-2xl ${seciliDersDetay.bgLight} border ${seciliDersDetay.borderLight}`}>
                {seciliDersDetay.emoji}
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-600 text-white">
                    {secilenSinif}-{secilenSube}
                  </span>
                  <span className={`text-xs font-extrabold ${seciliDersDetay.textCol}`}>
                    {seciliDersDetay.label} Dersi
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    📅 {aktifDeneme.tarih}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[var(--foreground)] mt-0.5">
                  {aktifDeneme.baslik}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {sinifOgrencileri.length} Öğrenci • Doğrudan 0-100 arası yazılı notu girin
                </p>
              </div>
            </div>

            {/* İstatistikler & Önizleme Butonu */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Mini İstatistik Kutuları */}
              <div className="flex items-center gap-2 bg-[var(--background)] px-3 py-2 rounded-xl border border-[var(--border)] text-xs">
                <div>
                  <span className="text-[var(--muted-foreground)] block text-[10px]">Ders Ortalaması</span>
                  <span className="font-extrabold text-sm text-indigo-500">
                    {seciliDersIstatistikleri.ortalama !== null ? `${seciliDersIstatistikleri.ortalama} Puan` : "-"}
                  </span>
                </div>
                <div className="h-6 w-px bg-[var(--border)] mx-1"></div>
                <div>
                  <span className="text-[var(--muted-foreground)] block text-[10px]">Giriş Yapılan</span>
                  <span className="font-bold text-sm">
                    {seciliDersIstatistikleri.girisSayisi}/{sinifOgrencileri.length}
                  </span>
                </div>
              </div>

              {/* TESTLER BÖLÜMÜNDEKİ GİBİ: SONUÇLARI ÖNİZLE BUTONU */}
              <button
                onClick={() => setOnizlemeModalAcik(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                title="Sonuçları önizleme tablosu ve sıralama olarak görüntüle"
              >
                <span>👁️</span>
                <span>Sonuçları Önizle</span>
              </button>
            </div>
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
                <span className="text-[var(--muted-foreground)] hidden sm:inline">
                  Öğrencinin <strong>{seciliDersDetay.label}</strong> notunu yazıp Enter veya Tab ile geçebilirsiniz.
                </span>
              )}
            </div>
          </div>

          {/* Not Giriş Tablosu (Sadece Seçili Dersin Notları) */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[var(--muted)]/50 border-b border-[var(--border)]">
                    <th className="py-3 px-4 font-bold w-16 text-center">No</th>
                    <th className="py-3 px-4 font-bold">Öğrenci Adı Soyadı</th>
                    <th className="py-3 px-4 font-bold text-center w-40">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{seciliDersDetay.emoji}</span>
                        <span>{seciliDersDetay.label} Notu</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 font-bold text-center w-32">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filtrelenmisOgrenciler.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[var(--muted-foreground)]">
                        {sinifOgrencileri.length === 0
                          ? `${secilenSinif}/${secilenSube} sınıfında kayıtlı öğrenci bulunamadı. "Sınıf Listesi" menüsünden öğrenci ekleyebilirsiniz.`
                          : "Aramanıza uygun öğrenci bulunamadı."}
                      </td>
                    </tr>
                  ) : (
                    filtrelenmisOgrenciler.map((ogr) => {
                      const notVal = aktifDeneme.ogrenciNotlari?.[ogr.id]?.[secilenDers] ?? "";
                      const hasPuan = typeof notVal === "number" && !isNaN(notVal);

                      return (
                        <tr key={ogr.id} className="hover:bg-[var(--accent)]/30 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-center text-xs text-[var(--muted-foreground)]">
                            {ogr.numara}
                          </td>
                          <td className="py-2.5 px-4 font-semibold">
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                                {ogr.ad.charAt(0)}
                              </span>
                              <span>
                                {ogr.ad} {ogr.soyad}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-4 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              placeholder="-"
                              value={notVal}
                              onChange={(e) => handleNotDegisikligi(ogr.id, e.target.value)}
                              className="w-24 mx-auto text-center font-black text-base py-1.5 px-3 rounded-xl border border-[var(--border)] bg-[var(--background)] focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-[var(--muted-foreground)]/40"
                            />
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {hasPuan ? (
                              <span
                                className={`inline-flex items-center justify-center px-3 py-1 rounded-xl text-xs font-extrabold border ${notRenkEtiketi(
                                  notVal as number
                                )}`}
                              >
                                {notVal >= 85
                                  ? "Pekiyi"
                                  : notVal >= 70
                                  ? "İyi"
                                  : notVal >= 50
                                  ? "Orta"
                                  : "Geliştirilmeli"}
                              </span>
                            ) : (
                              <span className="text-xs text-[var(--muted-foreground)] italic">
                                Girilmedi
                              </span>
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

      {/* ============================================================ */}
      {/* TESTLER BÖLÜMÜNDEKİ GİBİ: SONUÇLARI ÖNİZLEME MODALI          */}
      {/* ============================================================ */}
      {onizlemeModalAcik && aktifDeneme && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="bg-[var(--card)] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border border-[var(--border)] overflow-hidden">
            
            {/* Sade ve Şık Başlık */}
            <div className="p-4 sm:p-5 border-b border-[var(--border)] bg-gradient-to-b from-indigo-500/5 to-transparent flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-black px-2 py-0.5 rounded-md bg-indigo-600 text-white">
                    {secilenSinif}-{secilenSube} Sınıfı
                  </span>
                  <span className={`text-xs font-bold ${seciliDersDetay.textCol}`}>
                    {seciliDersDetay.emoji} {seciliDersDetay.label} Dersi
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-[var(--foreground)] truncate">
                  {aktifDeneme.baslik} Sonuçları
                </h3>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => window.print()}
                  className="p-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] hover:border-indigo-500 text-xs font-bold transition-all cursor-pointer"
                  title="Yazdır"
                >
                  🖨️
                </button>
                <button
                  onClick={() => setOnizlemeModalAcik(false)}
                  className="w-8 h-8 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-500 transition-all font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Sade Sonuç Listesi - Sıralı Gösterim */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
              {siraliOgrenciler.map((ogr, idx) => {
                const notVal = aktifDeneme.ogrenciNotlari?.[ogr.id]?.[secilenDers];
                const hasPuan = typeof notVal === "number" && !isNaN(notVal);

                return (
                  <div
                    key={ogr.id}
                    className={`flex items-center justify-between p-3 sm:px-4 hover:bg-[var(--background)]/60 transition-colors ${
                      idx === 0 && hasPuan ? "bg-amber-500/5" : ""
                    }`}
                  >
                    {/* Sol: Sıra + İsim Soyisim */}
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                          idx === 0 && hasPuan
                            ? "bg-amber-400 text-white"
                            : idx === 1 && hasPuan
                            ? "bg-slate-400 text-white"
                            : idx === 2 && hasPuan
                            ? "bg-orange-600 text-white"
                            : "bg-[var(--background)] text-[var(--muted-foreground)] border border-[var(--border)]"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--foreground)] truncate">
                          {ogr.ad} {ogr.soyad}
                        </p>
                        <p className="text-[11px] text-[var(--muted-foreground)]">
                          {secilenSinif}-{secilenSube} • No: {ogr.numara}
                        </p>
                      </div>
                    </div>

                    {/* Sağ: Puan */}
                    <div className="flex items-center gap-3 shrink-0 text-right">
                      {hasPuan ? (
                        <div className="min-w-[64px]">
                          <span
                            className={`px-3 py-1 rounded-lg font-black text-sm border inline-block ${notRenkEtiketi(
                              notVal as number
                            )}`}
                          >
                            {notVal} Puan
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)] italic pr-2">
                          Girilmedi
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {sinifOgrencileri.length === 0 && (
                <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
                  Kayıtlı öğrenci bulunamadı.
                </div>
              )}
            </div>

            {/* Alt Kısım */}
            <div className="p-3 sm:p-4 border-t border-[var(--border)] bg-[var(--background)]/60 flex items-center justify-between">
              <span className="text-[11px] text-[var(--muted-foreground)]">
                Toplam <strong>{sinifOgrencileri.length}</strong> öğrenci • Puana göre sıralı
              </span>
              <button
                onClick={() => setOnizlemeModalAcik(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all cursor-pointer"
              >
                Kapat
              </button>
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
                  <strong>Dersler:</strong> Türkçe, Matematik, Fen Bilgisi, Sosyal Bilgiler, İngilizce, Din Kültürü (Ayrı ayrı seçilerek girilebilir)
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
