"use client";

import { useState, useEffect, useMemo } from "react";
import { demoOgrenciler, sinifNumaralari, subeler, type Ogrenci } from "@/lib/data";
import { usePersistentState } from "@/lib/use-persistent-state";
import { 
  subscribeOgrenciler, 
  subscribeTumOgrenciNotlari, 
  saveOgrenciNotlari,
  getInitialOgrenciler,
} from "@/lib/firestore-service";

export interface MebDersSatiri {
  id: number;
  ders: string;
  dersSaati: number; // Haftalık ders saati (ağırlık katsayısı)
  sinav1: string;
  sinav2: string;
  performans1: string; // 1. Ders İçi Katılım
  performans2: string; // 2. Ders İçi Katılım
  proje: string;       // Proje Notu (varsa)
}

const varsayilanMebDersler: MebDersSatiri[] = [
  { id: 1, ders: "Türkçe", dersSaati: 6, sinav1: "85", sinav2: "80", performans1: "90", performans2: "85", proje: "" },
  { id: 2, ders: "Matematik", dersSaati: 5, sinav1: "90", sinav2: "88", performans1: "95", performans2: "90", proje: "95" },
  { id: 3, ders: "Fen Bilimleri", dersSaati: 4, sinav1: "78", sinav2: "82", performans1: "85", performans2: "80", proje: "" },
  { id: 4, ders: "Sosyal Bilgiler", dersSaati: 3, sinav1: "85", sinav2: "90", performans1: "90", performans2: "95", proje: "" },
  { id: 5, ders: "İngilizce", dersSaati: 3, sinav1: "92", sinav2: "95", performans1: "100", performans2: "95", proje: "" },
  { id: 6, ders: "Din Kültürü ve Ahlak Bilgisi", dersSaati: 2, sinav1: "95", sinav2: "90", performans1: "95", performans2: "100", proje: "" },
  { id: 7, ders: "Beden Eğitimi ve Spor", dersSaati: 2, sinav1: "100", sinav2: "100", performans1: "100", performans2: "100", proje: "" },
  { id: 8, ders: "Görsel Sanatlar", dersSaati: 1, sinav1: "90", sinav2: "95", performans1: "95", performans2: "95", proje: "" },
  { id: 9, ders: "Müzik", dersSaati: 1, sinav1: "90", sinav2: "90", performans1: "95", performans2: "95", proje: "" },
  { id: 10, ders: "Bilişim Teknolojileri ve Yazılım", dersSaati: 2, sinav1: "85", sinav2: "90", performans1: "90", performans2: "95", proje: "" },
];

const bosMebMufredatDersleri: MebDersSatiri[] = [
  { id: 1, ders: "Türkçe", dersSaati: 6, sinav1: "", sinav2: "", performans1: "", performans2: "", proje: "" },
  { id: 2, ders: "Matematik", dersSaati: 5, sinav1: "", sinav2: "", performans1: "", performans2: "", proje: "" },
  { id: 3, ders: "Fen Bilimleri", dersSaati: 4, sinav1: "", sinav2: "", performans1: "", performans2: "", proje: "" },
  { id: 4, ders: "Sosyal Bilgiler", dersSaati: 3, sinav1: "", sinav2: "", performans1: "", performans2: "", proje: "" },
  { id: 5, ders: "İngilizce", dersSaati: 3, sinav1: "", sinav2: "", performans1: "", performans2: "", proje: "" },
  { id: 6, ders: "Din Kültürü ve Ahlak Bilgisi", dersSaati: 2, sinav1: "", sinav2: "", performans1: "", performans2: "", proje: "" },
  { id: 7, ders: "Beden Eğitimi ve Spor", dersSaati: 2, sinav1: "", sinav2: "", performans1: "", performans2: "", proje: "" },
  { id: 8, ders: "Görsel Sanatlar", dersSaati: 1, sinav1: "", sinav2: "", performans1: "", performans2: "", proje: "" },
  { id: 9, ders: "Müzik", dersSaati: 1, sinav1: "", sinav2: "", performans1: "", performans2: "", proje: "" },
  { id: 10, ders: "Bilişim Teknolojileri ve Yazılım", dersSaati: 2, sinav1: "", sinav2: "", performans1: "", performans2: "", proje: "" },
];

// MEB e-Okul Tekil Ders Puanı Hesaplama: Girilen notların Aritmetik Ortalaması
export const mebDersPuaniHesapla = (satir: MebDersSatiri): number => {
  const notlar = [satir.sinav1, satir.sinav2, satir.performans1, satir.performans2, satir.proje]
    .filter((n) => n !== "" && !isNaN(Number(n)))
    .map(Number);

  if (notlar.length === 0) return 0;
  const toplam = notlar.reduce((a, b) => a + b, 0);
  return toplam / notlar.length;
};

// MEB e-Okul Belge ve Başarı Durumu Kontrolü
export const mebBelgeDurumu = (
  agirlikliOrtalama: number, 
  dersler: MebDersSatiri[]
): { durum: string; badgeClass: string; detay: string } => {
  if (dersler.length === 0 || agirlikliOrtalama === 0) {
    return { durum: "Hesaplanmadı", badgeClass: "badge-info", detay: "Not girişi bekleniyor" };
  }

  // MEB Kriteri: Takdir veya Teşekkür için hiçbir dersin dönem puanı 50.00'nin altında olmamalıdır
  const zayifDersler = dersler.filter((d) => {
    const p = mebDersPuaniHesapla(d);
    return p > 0 && p < 50;
  });

  const turkceDersi = dersler.find((d) => d.ders.toLowerCase().includes("türkçe"));
  const turkcePuani = turkceDersi ? mebDersPuaniHesapla(turkceDersi) : 100;
  const turkceBarajAltinda = turkcePuani > 0 && turkcePuani < 70; // İlköğretim Türkçe 70 barajı

  if (agirlikliOrtalama >= 85.00) {
    if (zayifDersler.length > 0) {
      return { 
        durum: "Belge Alamaz (Zayıf Ders Var)", 
        badgeClass: "badge-warning", 
        detay: `${zayifDersler.length} dersten 50 altı not var` 
      };
    }
    if (turkceBarajAltinda) {
      return { 
        durum: "Belge Alamaz (Türkçe < 70)", 
        badgeClass: "badge-warning", 
        detay: "Türkçe baraj puanı (70) sağlanamadı" 
      };
    }
    return { durum: "🏆 Takdir Belgesi", badgeClass: "badge-success", detay: "85.00 ve üzeri ağırlıklı ortalama" };
  }

  if (agirlikliOrtalama >= 70.00) {
    if (zayifDersler.length > 0) {
      return { 
        durum: "Belge Alamaz (Zayıf Ders Var)", 
        badgeClass: "badge-warning", 
        detay: `${zayifDersler.length} dersten 50 altı not var` 
      };
    }
    if (turkceBarajAltinda) {
      return { 
        durum: "Belge Alamaz (Türkçe < 70)", 
        badgeClass: "badge-warning", 
        detay: "Türkçe baraj puanı (70) sağlanamadı" 
      };
    }
    return { durum: "🎖️ Teşekkür Belgesi", badgeClass: "badge-success", detay: "70.00 - 84.99 arası ağırlıklı ortalama" };
  }

  if (agirlikliOrtalama >= 50.00) {
    return { durum: "✅ Doğrudan Geçti", badgeClass: "badge-info", detay: "50.00 ve üzeri başarılı geçiş" };
  }

  return { durum: "❌ Sınıf Tekrarı / Başarısız", badgeClass: "badge-danger", detay: "50.00 altı dönem ortalaması" };
};

export default function OrtalamaHesaplamaPage() {
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>(getInitialOgrenciler);
  const [secilenSinif, setSecilenSinif] = usePersistentState("egitim_ortalama_sinif", "5");
  const [secilenSube, setSecilenSube] = usePersistentState("egitim_ortalama_sube", "A");
  const [secilenOgrenciId, setSecilenOgrenciId] = usePersistentState<string>("egitim_ortalama_ogrenci_id", "1");
  const [gorunumModu, setGorunumModu] = useState<"ogrenci" | "sinif_ozet">("ogrenci");

  // Öğrenci bazlı MEB not kayıtları
  const [tumNotlar, setTumNotlar] = usePersistentState<Record<string, MebDersSatiri[]>>("egitim_meb_ogrenci_notlari", {
    "1": varsayilanMebDersler,
    "2": [
      { id: 1, ders: "Türkçe", dersSaati: 6, sinav1: "95", sinav2: "90", performans1: "95", performans2: "100", proje: "" },
      { id: 2, ders: "Matematik", dersSaati: 5, sinav1: "95", sinav2: "92", performans1: "100", performans2: "95", proje: "100" },
      { id: 3, ders: "Fen Bilimleri", dersSaati: 4, sinav1: "88", sinav2: "92", performans1: "95", performans2: "90", proje: "" },
      { id: 4, ders: "Sosyal Bilgiler", dersSaati: 3, sinav1: "90", sinav2: "95", performans1: "95", performans2: "100", proje: "" },
      { id: 5, ders: "İngilizce", dersSaati: 3, sinav1: "100", sinav2: "98", performans1: "100", performans2: "100", proje: "" },
      { id: 6, ders: "Din Kültürü ve Ahlak Bilgisi", dersSaati: 2, sinav1: "100", sinav2: "95", performans1: "100", performans2: "100", proje: "" },
    ],
    "3": [
      { id: 1, ders: "Türkçe", dersSaati: 6, sinav1: "70", sinav2: "75", performans1: "80", performans2: "75", proje: "" },
      { id: 2, ders: "Matematik", dersSaati: 5, sinav1: "65", sinav2: "70", performans1: "75", performans2: "80", proje: "" },
      { id: 3, ders: "Fen Bilimleri", dersSaati: 4, sinav1: "75", sinav2: "80", performans1: "85", performans2: "75", proje: "" },
      { id: 4, ders: "Sosyal Bilgiler", dersSaati: 3, sinav1: "80", sinav2: "75", performans1: "80", performans2: "80", proje: "" },
      { id: 5, ders: "İngilizce", dersSaati: 3, sinav1: "70", sinav2: "68", performans1: "75", performans2: "70", proje: "" },
      { id: 6, ders: "Din Kültürü ve Ahlak Bilgisi", dersSaati: 2, sinav1: "85", sinav2: "90", performans1: "85", performans2: "90", proje: "" },
    ],
  });

  // Firestore Senkronizasyonu
  useEffect(() => {
    const unsubOgrenciler = subscribeOgrenciler((data) => {
      setOgrenciler(data);
    });
    const unsubNotlar = subscribeTumOgrenciNotlari((remoteNotlar) => {
      if (remoteNotlar && Object.keys(remoteNotlar).length > 0) {
        setTumNotlar((prev) => ({ ...prev, ...(remoteNotlar as unknown as Record<string, MebDersSatiri[]>) }));
      }
    });
    return () => {
      unsubOgrenciler();
      unsubNotlar();
    };
  }, [setTumNotlar]);

  // Filtrelenmiş öğrenci listesi
  const filtrelenmisOgrenciler = useMemo(() => {
    return ogrenciler.filter((o) => {
      const sinifUygun = secilenSinif === "Tümü" || o.sinif === secilenSinif;
      const subeUygun = secilenSube === "Tümü" || o.sube === secilenSube;
      return sinifUygun && subeUygun;
    });
  }, [ogrenciler, secilenSinif, secilenSube]);

  // Aktif öğrenci
  const seciliOgrenci = useMemo(() => {
    if (secilenOgrenciId === "serbest") {
      return {
        id: 0,
        ad: "Serbest",
        soyad: "Hesaplama",
        numara: "---",
        sinif: secilenSinif !== "Tümü" ? secilenSinif : "5",
        sube: secilenSube !== "Tümü" ? secilenSube : "A",
        cinsiyet: "E" as const,
        veliTelefon: "",
        veliAd: "",
      };
    }
    return ogrenciler.find((o) => String(o.id) === secilenOgrenciId) || ogrenciler[0] || null;
  }, [ogrenciler, secilenOgrenciId, secilenSinif, secilenSube]);

  // Aktif öğrencinin dersleri
  const aktifSatirlar: MebDersSatiri[] = useMemo(() => {
    const idKey = seciliOgrenci ? String(seciliOgrenci.id) : "serbest";
    return tumNotlar[idKey] || varsayilanMebDersler;
  }, [tumNotlar, seciliOgrenci]);

  // MEB e-Okul Resmi Dönem Ağırlıklı Not Ortalaması Hesaplama:
  // Σ (Ders Puanı * Haftalık Ders Saati) / Σ (Haftalık Ders Saati)
  const ogrenciAgirlikliOrtalamasi = (ogrenciId: string | number): number => {
    const dersler = tumNotlar[String(ogrenciId)];
    if (!dersler || dersler.length === 0) return 0;

    let toplamAgirlikliPuan = 0;
    let toplamDersSaati = 0;

    for (const d of dersler) {
      if (d.ders.trim() === "") continue;
      const puan = mebDersPuaniHesapla(d);
      const saat = Number(d.dersSaati) > 0 ? Number(d.dersSaati) : 1;
      
      if (puan > 0) {
        toplamAgirlikliPuan += puan * saat;
        toplamDersSaati += saat;
      }
    }

    if (toplamDersSaati === 0) return 0;
    return toplamAgirlikliPuan / toplamDersSaati;
  };

  // Aktif öğrencinin genel ağırlıklı ortalaması
  const aktifAgirlikliOrtalama = useMemo(() => {
    let toplamAgirlikliPuan = 0;
    let toplamDersSaati = 0;

    for (const d of aktifSatirlar) {
      if (d.ders.trim() === "") continue;
      const puan = mebDersPuaniHesapla(d);
      const saat = Number(d.dersSaati) > 0 ? Number(d.dersSaati) : 1;
      
      if (puan > 0) {
        toplamAgirlikliPuan += puan * saat;
        toplamDersSaati += saat;
      }
    }

    if (toplamDersSaati === 0) return 0;
    return toplamAgirlikliPuan / toplamDersSaati;
  }, [aktifSatirlar]);

  const toplamHaftalikSaat = useMemo(() => {
    return aktifSatirlar.reduce((acc, d) => acc + (Number(d.dersSaati) || 0), 0);
  }, [aktifSatirlar]);

  // Not güncelleme
  const guncelle = (id: number, alan: keyof MebDersSatiri, deger: string | number) => {
    const idKey = seciliOgrenci ? String(seciliOgrenci.id) : "serbest";
    const guncel = aktifSatirlar.map((s) => (s.id === id ? { ...s, [alan]: deger } : s));
    
    setTumNotlar((prev) => ({
      ...prev,
      [idKey]: guncel,
    }));

    saveOgrenciNotlari(idKey, guncel as any).catch(console.warn);
  };

  // Ders ekleme
  const satirEkle = () => {
    const idKey = seciliOgrenci ? String(seciliOgrenci.id) : "serbest";
    const yeniId = Math.max(...aktifSatirlar.map((s) => s.id), 0) + 1;
    const guncel = [
      ...aktifSatirlar, 
      { id: yeniId, ders: "", dersSaati: 2, sinav1: "", sinav2: "", performans1: "", performans2: "", proje: "" }
    ];
    setTumNotlar((prev) => ({ ...prev, [idKey]: guncel }));
    saveOgrenciNotlari(idKey, guncel as any).catch(console.warn);
  };

  // Ders silme
  const satirSil = (id: number) => {
    const idKey = seciliOgrenci ? String(seciliOgrenci.id) : "serbest";
    if (aktifSatirlar.length > 1) {
      const guncel = aktifSatirlar.filter((s) => s.id !== id);
      setTumNotlar((prev) => ({ ...prev, [idKey]: guncel }));
      saveOgrenciNotlari(idKey, guncel as any).catch(console.warn);
    }
  };

  // Standart MEB müfredat derslerini yükle
  const standartMebDersleriYukle = () => {
    const idKey = seciliOgrenci ? String(seciliOgrenci.id) : "serbest";
    setTumNotlar((prev) => ({ ...prev, [idKey]: bosMebMufredatDersleri }));
    saveOgrenciNotlari(idKey, bosMebMufredatDersleri as any).catch(console.warn);
  };

  // Notları sıfırla
  const notlariTemizle = () => {
    if (confirm("Bu öğrencinin tüm notlarını sıfırlamak istediğinize emin misiniz?")) {
      const idKey = seciliOgrenci ? String(seciliOgrenci.id) : "serbest";
      const temiz = aktifSatirlar.map((s) => ({ ...s, sinav1: "", sinav2: "", performans1: "", performans2: "", proje: "" }));
      setTumNotlar((prev) => ({ ...prev, [idKey]: temiz }));
      saveOgrenciNotlari(idKey, temiz as any).catch(console.warn);
    }
  };

  // Önceki / Sonraki öğrenci gezinmesi
  const aktifIndex = filtrelenmisOgrenciler.findIndex((o) => String(o.id) === secilenOgrenciId);

  const oncekiOgrenci = () => {
    if (aktifIndex > 0) {
      setSecilenOgrenciId(String(filtrelenmisOgrenciler[aktifIndex - 1].id));
    }
  };

  const sonrakiOgrenci = () => {
    if (aktifIndex < filtrelenmisOgrenciler.length - 1) {
      setSecilenOgrenciId(String(filtrelenmisOgrenciler[aktifIndex + 1].id));
    }
  };

  const belge = mebBelgeDurumu(aktifAgirlikliOrtalama, aktifSatirlar);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Üst Başlık */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold gradient-text">📊 MEB e-Okul Ortalama Hesaplama</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Resmi MEB e-Okul yönetmeliği: Sınav & Performans aritmetik ortalaması ve haftalık ders saatine göre ağırlıklı dönem ortalaması.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[var(--background)] p-1.5 rounded-2xl border border-[var(--border)]">
          <button
            onClick={() => setGorunumModu("ogrenci")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              gorunumModu === "ogrenci"
                ? "bg-[var(--primary)] text-white shadow-md"
                : "text-[var(--foreground)] hover:text-[var(--primary)]"
            }`}
          >
            👤 Öğrenci Not Girişi
          </button>
          <button
            onClick={() => setGorunumModu("sinif_ozet")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              gorunumModu === "sinif_ozet"
                ? "bg-[var(--primary)] text-white shadow-md"
                : "text-[var(--foreground)] hover:text-[var(--primary)]"
            }`}
          >
            📋 Sınıf Not Çizelgesi
          </button>
        </div>
      </div>

      {/* Sınıf, Şube ve Öğrenci Seçim Paneli */}
      <div className="glass-card rounded-2xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Sınıf</label>
            <select
              value={secilenSinif}
              onChange={(e) => setSecilenSinif(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="Tümü">Tüm Sınıflar (1-12)</option>
              {sinifNumaralari.map((s) => (
                <option key={s} value={s}>{s}. Sınıf</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Şube</label>
            <select
              value={secilenSube}
              onChange={(e) => setSecilenSube(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="Tümü">Tüm Şubeler (A-S)</option>
              {subeler.map((sube) => (
                <option key={sube} value={sube}>{sube} Şubesi</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
              Öğrenci ({filtrelenmisOgrenciler.length} Öğrenci)
            </label>
            <div className="flex items-center gap-2">
              <select
                value={secilenOgrenciId}
                onChange={(e) => {
                  setSecilenOgrenciId(e.target.value);
                  setGorunumModu("ogrenci");
                }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-semibold"
              >
                <optgroup label="Kayıtlı Öğrenciler">
                  {filtrelenmisOgrenciler.map((o) => {
                    const ort = ogrenciAgirlikliOrtalamasi(o.id);
                    return (
                      <option key={o.id} value={String(o.id)}>
                        No: {o.numara} - {o.ad} {o.soyad} ({o.sinif}-{o.sube}) {ort > 0 ? `| MEB Ort: ${ort.toFixed(2)}` : ""}
                      </option>
                    );
                  })}
                </optgroup>
                <optgroup label="Özel Giriş">
                  <option value="serbest">⚡ Bağımsız / Serbest Hesaplama</option>
                </optgroup>
              </select>

              {secilenOgrenciId !== "serbest" && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={oncekiOgrenci}
                    disabled={aktifIndex <= 0}
                    title="Önceki Öğrenci"
                    className="p-2.5 rounded-xl bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--primary)] hover:text-white disabled:opacity-40 transition-all"
                  >
                    ◀
                  </button>
                  <button
                    onClick={sonrakiOgrenci}
                    disabled={aktifIndex >= filtrelenmisOgrenciler.length - 1}
                    title="Sonraki Öğrenci"
                    className="p-2.5 rounded-xl bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--primary)] hover:text-white disabled:opacity-40 transition-all"
                  >
                    ▶
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {gorunumModu === "ogrenci" ? (
        <>
          {/* MEB Bilgilendirme ve Kural Kartı */}
          <div className="glass-card rounded-2xl p-5 border-l-4 border-l-[var(--primary)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-[var(--muted-foreground)]">
              <div>
                <span className="font-bold text-[var(--foreground)]">📌 MEB e-Okul Hesaplama Standartları:</span>
                <p className="mt-0.5">
                  • <strong>Ders Notu:</strong> Yazılı Sınavlar + Ders İçi Katılım (Performans) + Proje notlarının <u>Aritmetik Ortalamasıdır</u>.
                </p>
                <p>
                  • <strong>Dönem Not Ortalaması:</strong> Her dersin puanı <u>Haftalık Ders Saati</u> ile çarpılarak ağırlıklı toplam ders saatine bölünür.
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)] font-bold">
                  Toplam Haftalık Ders: {toplamHaftalikSaat} Saat
                </span>
              </div>
            </div>
          </div>

          {/* e-Okul Not Giriş Tablosu */}
          <div className="glass-card rounded-2xl p-6 overflow-x-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  📝 {seciliOgrenci?.ad} {seciliOgrenci?.soyad} - e-Okul Not Çizelgesi
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={standartMebDersleriYukle}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--primary)] hover:text-white transition-all"
                >
                  📚 Standart MEB Dersleri
                </button>
                <button
                  onClick={notlariTemizle}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-all"
                >
                  🗑️ Notları Temizle
                </button>
                <button
                  onClick={satirEkle}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-all shadow-md"
                >
                  + Ders Ekle
                </button>
              </div>
            </div>

            <table className="w-full table-modern">
              <thead>
                <tr>
                  <th className="text-left p-3 rounded-tl-xl text-[var(--foreground)] font-semibold">Ders Adı</th>
                  <th className="text-center p-3 text-[var(--foreground)] font-semibold" title="Haftalık Ders Saati">Haftalık Saat</th>
                  <th className="text-center p-3 text-[var(--foreground)] font-semibold">1. Yazılı</th>
                  <th className="text-center p-3 text-[var(--foreground)] font-semibold">2. Yazılı</th>
                  <th className="text-center p-3 text-[var(--foreground)] font-semibold">1. Performans</th>
                  <th className="text-center p-3 text-[var(--foreground)] font-semibold">2. Performans</th>
                  <th className="text-center p-3 text-[var(--foreground)] font-semibold">Proje</th>
                  <th className="text-center p-3 text-[var(--foreground)] font-semibold">Ders Puanı</th>
                  <th className="text-center p-3 rounded-tr-xl text-[var(--foreground)] font-semibold">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {aktifSatirlar.map((satir) => {
                  const dersPuani = mebDersPuaniHesapla(satir);
                  return (
                    <tr key={satir.id} className="border-b border-[var(--border)]">
                      <td className="p-2">
                        <input
                          type="text"
                          value={satir.ders}
                          onChange={(e) => guncelle(satir.id, "ders", e.target.value)}
                          placeholder="Ders adı"
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-medium"
                        />
                      </td>
                      <td className="p-2 text-center w-24">
                        <input
                          type="number"
                          value={satir.dersSaati}
                          onChange={(e) => guncelle(satir.id, "dersSaati", Math.max(1, Number(e.target.value)))}
                          title="Haftalık ders saati"
                          className="w-full px-2 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm text-center text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-bold"
                          min="1"
                          max="12"
                        />
                      </td>
                      {(["sinav1", "sinav2", "performans1", "performans2", "proje"] as const).map((alan) => (
                        <td key={alan} className="p-2">
                          <input
                            type="number"
                            value={satir[alan]}
                            onChange={(e) => guncelle(satir.id, alan, e.target.value)}
                            placeholder="-"
                            className="w-full px-2 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm text-center text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-semibold"
                            min="0"
                            max="100"
                          />
                        </td>
                      ))}
                      <td className="p-2 text-center">
                        <span className={`text-base font-bold ${dersPuani >= 50 ? "text-[var(--primary)]" : dersPuani > 0 ? "text-red-500" : "text-[var(--muted-foreground)]"}`}>
                          {dersPuani > 0 ? dersPuani.toFixed(2) : "-"}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => satirSil(satir.id)}
                          className="text-red-400 hover:text-red-600 transition-colors p-1 font-bold"
                          title="Dersi Sil"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MEB e-Okul Dönem Sonu Sonuç Kartı */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-center sm:text-left">
                <p className="text-sm text-[var(--muted-foreground)]">MEB Ağırlıklı Dönem Not Ortalaması</p>
                <p className="text-4xl font-extrabold gradient-text mt-1">{aktifAgirlikliOrtalama.toFixed(2)}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Toplam {toplamHaftalikSaat} haftalık ders saati üzerinden hesaplandı
                </p>
              </div>

              <div className="text-center sm:text-right">
                <p className="text-sm text-[var(--muted-foreground)]">MEB Belge & Geçme Durumu</p>
                <div className="mt-1">
                  <span className={`inline-block px-4 py-2 rounded-xl text-base font-bold ${belge.badgeClass}`}>
                    {belge.durum}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">{belge.detay}</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Tüm Sınıf MEB Not Çizelgesi */
        <div className="glass-card rounded-2xl p-6 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[var(--foreground)]">
              📋 {secilenSinif !== "Tümü" ? `${secilenSinif}. Sınıf` : "Tüm Sınıflar"} {secilenSube !== "Tümü" ? `${secilenSube} Şubesi` : ""} - MEB Dönem Not Çizelgesi
            </h3>
            <span className="text-xs text-[var(--muted-foreground)]">
              Toplam {filtrelenmisOgrenciler.length} Öğrenci
            </span>
          </div>

          <table className="w-full table-modern">
            <thead>
              <tr>
                <th className="text-left p-3 rounded-tl-xl text-[var(--foreground)] font-semibold">No</th>
                <th className="text-left p-3 text-[var(--foreground)] font-semibold">Öğrenci</th>
                <th className="text-center p-3 text-[var(--foreground)] font-semibold">Sınıf/Şube</th>
                <th className="text-center p-3 text-[var(--foreground)] font-semibold">Dönem Ağırlıklı Ortalaması</th>
                <th className="text-center p-3 text-[var(--foreground)] font-semibold">MEB Belge Durumu</th>
                <th className="text-center p-3 rounded-tr-xl text-[var(--foreground)] font-semibold">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtrelenmisOgrenciler.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[var(--muted-foreground)]">
                    Kayıtlı öğrenci bulunamadı.
                  </td>
                </tr>
              ) : (
                filtrelenmisOgrenciler.map((ogr) => {
                  const ort = ogrenciAgirlikliOrtalamasi(ogr.id);
                  const ogrDersler = tumNotlar[String(ogr.id)] || [];
                  const blg = mebBelgeDurumu(ort, ogrDersler);

                  return (
                    <tr key={ogr.id} className="border-b border-[var(--border)]">
                      <td className="p-3 text-sm font-medium text-[var(--foreground)]">{ogr.numara}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold">
                            {ogr.ad[0]}{ogr.soyad[0]}
                          </div>
                          <span className="font-medium text-sm text-[var(--foreground)]">{ogr.ad} {ogr.soyad}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="badge-info px-3 py-1 rounded-lg text-xs font-bold">
                          {ogr.sinif}-{ogr.sube}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-base font-bold text-[var(--primary)]">
                          {ort > 0 ? ort.toFixed(2) : "-"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${blg.badgeClass}`}>
                          {blg.durum}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setSecilenOgrenciId(String(ogr.id));
                            setGorunumModu("ogrenci");
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-all shadow-sm"
                        >
                          ✏️ Not Gir
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
