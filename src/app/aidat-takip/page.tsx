"use client";

import { useState, useEffect, useMemo } from "react";
import { demoOgrenciler, sinifNumaralari, subeler, type Ogrenci } from "@/lib/data";
import { usePersistentState } from "@/lib/use-persistent-state";
import { 
  subscribeOgrenciler, 
  subscribeAidatKayitlari, 
  saveAidatKaydi, 
  subscribeGlobalAidat, 
  saveGlobalAidat,
  getInitialOgrenciler,
  type OgrenciAidatData,
  type AyOdemeData
} from "@/lib/firestore-service";

const AYLAR = [
  { key: "eylul", label: "Eylül" },
  { key: "ekim", label: "Ekim" },
  { key: "kasim", label: "Kasım" },
  { key: "aralik", label: "Aralık" },
  { key: "ocak", label: "Ocak" },
  { key: "subat", label: "Şubat" },
  { key: "mart", label: "Mart" },
  { key: "nisan", label: "Nisan" },
  { key: "mayis", label: "Mayıs" },
  { key: "haziran", label: "Haziran" },
];

type AyKey = (typeof AYLAR)[number]["key"];
type OdemeDurumu = "odendi" | "bekliyor" | "gecikti";

interface AyOdeme {
  tutar: number;
  durum: OdemeDurumu;
  odenmeTarihi?: string;
}

interface OgrenciAidat {
  ogrenciId: number;
  aylikAidat: number; // Aylık sabit aidat tutarı
  aylar: Record<AyKey, AyOdeme>;
}

const defaultAylar = (): Record<AyKey, AyOdeme> => {
  const obj: Record<string, AyOdeme> = {};
  for (const ay of AYLAR) {
    obj[ay.key] = { tutar: 0, durum: "bekliyor" };
  }
  return obj as Record<AyKey, AyOdeme>;
};

const durumRenk = (durum: OdemeDurumu) => {
  if (durum === "odendi") return "badge-success";
  if (durum === "gecikti") return "badge-danger";
  return "badge-warning";
};

const durumLabel = (durum: OdemeDurumu) => {
  if (durum === "odendi") return "✅ Ödendi";
  if (durum === "gecikti") return "⏰ Gecikti";
  return "🕐 Bekliyor";
};

export default function AidatTakipPage() {
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>(getInitialOgrenciler);
  const [secilenSinif, setSecilenSinif] = usePersistentState("egitim_aidat_sinif", "Tümü");
  const [secilenSube, setSecilenSube] = usePersistentState("egitim_aidat_sube", "Tümü");
  const [aramaMetni, setAramaMetni] = useState("");
  const [secilenOgrenciId, setSecilenOgrenciId] = useState<number | null>(null);
  const [gorunumModu, setGorunumModu] = useState<"liste" | "detay">("liste");
  const [globalAylikAidat, setGlobalAylikAidat] = usePersistentState("egitim_aidat_global", 200);

  // Aidat kayıtları: { [ogrenciId]: OgrenciAidat }
  const [aidatKayitlari, setAidatKayitlari] = usePersistentState<Record<string, OgrenciAidat>>(
    "egitim_aidat_kayitlari",
    {}
  );

  // Firestore senkronizasyonu (Öğrenciler, Aidat Kayıtları ve Global Ayarlar)
  useEffect(() => {
    const unsubOgrenciler = subscribeOgrenciler((data) => setOgrenciler(data));
    const unsubAidatlar = subscribeAidatKayitlari((remoteData) => {
      if (remoteData && Object.keys(remoteData).length > 0) {
        setAidatKayitlari((prev) => ({ ...prev, ...(remoteData as unknown as Record<string, OgrenciAidat>) }));
      }
    });
    const unsubGlobal = subscribeGlobalAidat((val) => {
      if (val && val > 0) setGlobalAylikAidat(val);
    });

    return () => {
      unsubOgrenciler();
      unsubAidatlar();
      unsubGlobal();
    };
  }, []);

  // Öğrenci için aidat kaydı getir (yoksa oluştur)
  const getOgrenciAidat = (ogrenciId: number): OgrenciAidat => {
    if (aidatKayitlari[String(ogrenciId)]) {
      return aidatKayitlari[String(ogrenciId)];
    }
    return {
      ogrenciId,
      aylikAidat: globalAylikAidat,
      aylar: defaultAylar(),
    };
  };

  // Aidat kaydını güncelle ve Firestore buluta kaydet
  const setOgrenciAidat = (ogrenciId: number, aidat: OgrenciAidat) => {
    setAidatKayitlari((prev) => ({
      ...prev,
      [String(ogrenciId)]: aidat,
    }));
    saveAidatKaydi(ogrenciId, aidat as unknown as OgrenciAidatData).catch(console.warn);
  };

  // Ay ödemesi güncelle
  const ayOdemeGuncelle = (
    ogrenciId: number,
    ayKey: AyKey,
    alan: keyof AyOdeme,
    deger: string | number | OdemeDurumu
  ) => {
    const aidat = getOgrenciAidat(ogrenciId);
    const yeniAylar = {
      ...aidat.aylar,
      [ayKey]: {
        ...aidat.aylar[ayKey],
        [alan]: deger,
        ...(alan === "durum" && deger === "odendi" && !aidat.aylar[ayKey].odenmeTarihi
          ? { odenmeTarihi: new Date().toLocaleDateString("tr-TR") }
          : {}),
      },
    };
    setOgrenciAidat(ogrenciId, { ...aidat, aylar: yeniAylar });
  };

  // Aylık aidat tutarı güncelle
  const aylikAidatGuncelle = (ogrenciId: number, tutar: number) => {
    const aidat = getOgrenciAidat(ogrenciId);
    // Tüm aylardaki tutarı da güncelle
    const yeniAylar = { ...aidat.aylar };
    for (const ay of AYLAR) {
      yeniAylar[ay.key as AyKey] = {
        ...yeniAylar[ay.key as AyKey],
        tutar,
      };
    }
    setOgrenciAidat(ogrenciId, { ...aidat, aylikAidat: tutar, aylar: yeniAylar });
  };

  // Tümünü ödenmiş işaretle
  const tumunuOdendi = (ogrenciId: number) => {
    const aidat = getOgrenciAidat(ogrenciId);
    const bugun = new Date().toLocaleDateString("tr-TR");
    const yeniAylar = { ...aidat.aylar };
    for (const ay of AYLAR) {
      yeniAylar[ay.key as AyKey] = {
        ...yeniAylar[ay.key as AyKey],
        durum: "odendi",
        odenmeTarihi: yeniAylar[ay.key as AyKey].odenmeTarihi || bugun,
      };
    }
    setOgrenciAidat(ogrenciId, { ...aidat, aylar: yeniAylar });
  };

  // İstatistikler
  const ogrenciIstatistik = (ogrenciId: number) => {
    const aidat = getOgrenciAidat(ogrenciId);
    const aylikTutar = aidat.aylikAidat || globalAylikAidat;
    const toplam = AYLAR.length * aylikTutar;
    const odenen = AYLAR.filter((a) => aidat.aylar[a.key as AyKey]?.durum === "odendi").length * aylikTutar;
    const geciken = AYLAR.filter((a) => aidat.aylar[a.key as AyKey]?.durum === "gecikti").length;
    const kalan = toplam - odenen;
    const odenenAySayisi = AYLAR.filter((a) => aidat.aylar[a.key as AyKey]?.durum === "odendi").length;
    return { toplam, odenen, kalan, geciken, odenenAySayisi, aylikTutar };
  };

  // Filtrelenmiş öğrenciler
  const filtrelenmisOgrenciler = useMemo(() => {
    return ogrenciler.filter((o) => {
      const sinifUygun = secilenSinif === "Tümü" || o.sinif === secilenSinif;
      const subeUygun = secilenSube === "Tümü" || o.sube === secilenSube;
      const aramaUygun =
        aramaMetni === "" ||
        `${o.ad} ${o.soyad} ${o.numara}`.toLowerCase().includes(aramaMetni.toLowerCase());
      return sinifUygun && subeUygun && aramaUygun;
    });
  }, [ogrenciler, secilenSinif, secilenSube, aramaMetni]);

  // Sınıf geneli toplam istatistik
  const genelIstatistik = useMemo(() => {
    let toplamToplam = 0;
    let toplamOdenen = 0;
    let toplamKalan = 0;
    let gecikme = 0;
    for (const ogr of filtrelenmisOgrenciler) {
      const ist = ogrenciIstatistik(ogr.id);
      toplamToplam += ist.toplam;
      toplamOdenen += ist.odenen;
      toplamKalan += ist.kalan;
      gecikme += ist.geciken;
    }
    return { toplamToplam, toplamOdenen, toplamKalan, gecikme };
  }, [filtrelenmisOgrenciler, aidatKayitlari, globalAylikAidat]);

  // Detay sayfasındaki öğrenci
  const detayOgrenci = secilenOgrenciId !== null
    ? ogrenciler.find((o) => o.id === secilenOgrenciId) || null
    : null;
  const detayAidat = secilenOgrenciId !== null ? getOgrenciAidat(secilenOgrenciId) : null;

  // Excel (.xls / .xlsx) İndirme Fonksiyonu - Tamamen Beyaz Arka Plan ve Net Görünüm
  const excelIndir = () => {
    let tabloHtml = "";
    let dosyaAdi = "aidat_takip_listesi.xls";

    if (gorunumModu === "detay" && detayOgrenci && detayAidat) {
      // Tek Öğrenci Detay Raporu
      dosyaAdi = `aidat_detay_${detayOgrenci.sinif}${detayOgrenci.sube}_${detayOgrenci.ad}_${detayOgrenci.soyad}.xls`;
      const ist = ogrenciIstatistik(detayOgrenci.id);

      tabloHtml = `
        <table border="1" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; background-color: #ffffff; color: #000000;">
          <thead>
            <tr>
              <th colspan="5" style="background-color: #4f46e5; color: #ffffff; font-size: 16px; font-weight: bold; padding: 12px; text-align: center;">
                ÖĞRENCİ AİDAT DETAY RAPORU
              </th>
            </tr>
            <tr style="background-color: #f8fafc; color: #000000;">
              <td colspan="5" style="padding: 10px; background-color: #f8fafc; color: #000000; border: 1px solid #cbd5e1;">
                <b>Öğrenci:</b> ${detayOgrenci.ad} ${detayOgrenci.soyad} | 
                <b>No:</b> ${detayOgrenci.numara} | 
                <b>Sınıf/Şube:</b> ${detayOgrenci.sinif}-${detayOgrenci.sube} | 
                <b>Aylık Aidat:</b> ${ist.aylikTutar} ₺ | 
                <b>Toplam:</b> ${ist.toplam} ₺ | 
                <b>Ödenen:</b> <span style="color: #16a34a; font-weight: bold;">${ist.odenen} ₺</span> | 
                <b>Kalan Borç:</b> <span style="color: #d97706; font-weight: bold;">${ist.kalan} ₺</span>
              </td>
            </tr>
            <tr style="background-color: #f1f5f9; color: #0f172a; font-weight: bold; text-align: center;">
              <th style="padding: 8px; border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #000000; width: 50px;">#</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #000000; width: 150px;">Ay</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #000000; width: 120px;">Tutar (₺)</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #000000; width: 140px;">Ödeme Durumu</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #000000; width: 160px;">Ödenme Tarihi</th>
            </tr>
          </thead>
          <tbody>
            ${AYLAR.map((ay, index) => {
              const odeme = detayAidat.aylar[ay.key as AyKey];
              const durum = odeme?.durum;
              let durumBg = "#ffffff";
              let durumColor = "#000000";
              let durumMetin = "Bekliyor";

              if (durum === "odendi") {
                durumBg = "#dcfce7";
                durumColor = "#15803d";
                durumMetin = "✓ Ödendi";
              } else if (durum === "gecikti") {
                durumBg = "#fee2e2";
                durumColor = "#b91c1c";
                durumMetin = "⚠ Gecikti";
              }

              return `
                <tr style="background-color: #ffffff; color: #000000;">
                  <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background-color: #ffffff; color: #000000;">${index + 1}</td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; background-color: #ffffff; color: #000000;">${ay.label}</td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background-color: #ffffff; color: #000000;">${(odeme?.tutar || ist.aylikTutar).toLocaleString("tr-TR")} ₺</td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background-color: ${durumBg}; color: ${durumColor}; font-weight: bold;">${durumMetin}</td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background-color: #ffffff; color: #000000;">${odeme?.odenmeTarihi || "-"}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      `;
    } else {
      // Toplu Liste (Filtrelenmiş veya Tüm Öğrenciler)
      dosyaAdi = `aidat_takip_listesi_${secilenSinif !== "Tümü" ? secilenSinif + "-" + secilenSube : "tum_siniflar"}.xls`;

      tabloHtml = `
        <table border="1" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; background-color: #ffffff; color: #000000;">
          <thead>
            <tr>
              <th colspan="${10 + AYLAR.length}" style="background-color: #4f46e5; color: #ffffff; font-size: 16px; font-weight: bold; padding: 12px; text-align: center;">
                AİDAT TAKİP VE ÖDEME LİSTESİ (${secilenSinif !== "Tümü" ? secilenSinif + ". Sınıf / " + secilenSube : "Tüm Sınıflar"})
              </th>
            </tr>
            <tr style="background-color: #f1f5f9; color: #0f172a; font-weight: bold; text-align: center; font-size: 12px;">
              <th style="padding: 8px; border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #000000; width: 40px;">#</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #000000; width: 80px;">Öğr. No</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #000000; width: 160px; text-align: left;">Adı Soyadı</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #000000; width: 80px;">Sınıf/Şube</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #000000; width: 90px;">Aylık (₺)</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #000000; width: 100px;">Toplam (₺)</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #000000; width: 100px;">Ödenen (₺)</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #000000; width: 100px;">Kalan (₺)</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #000000; width: 80px;">Ödenen Ay</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; background-color: #f1f5f9; color: #000000; width: 110px;">Genel Durum</th>
              ${AYLAR.map((ay) => `<th style="padding: 8px; border: 1px solid #cbd5e1; background-color: #e2e8f0; color: #000000; width: 85px;">${ay.label}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${filtrelenmisOgrenciler.map((ogr, index) => {
              const aidat = getOgrenciAidat(ogr.id);
              const ist = ogrenciIstatistik(ogr.id);
              const tamOdendi = ist.odenen >= ist.toplam && ist.toplam > 0;
              const geciktiVar = ist.geciken > 0;

              let durumBg = "#ffffff";
              let durumColor = "#000000";
              let durumStr = "Devam Ediyor";

              if (tamOdendi) {
                durumBg = "#dcfce7";
                durumColor = "#15803d";
                durumStr = "Tamamlandı";
              } else if (geciktiVar) {
                durumBg = "#fee2e2";
                durumColor = "#b91c1c";
                durumStr = "Gecikmiş";
              }

              return `
                <tr style="background-color: #ffffff; color: #000000; font-size: 12px;">
                  <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center; background-color: #ffffff; color: #000000;">${index + 1}</td>
                  <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center; background-color: #ffffff; color: #000000; font-weight: bold;">${ogr.numara}</td>
                  <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: left; background-color: #ffffff; color: #000000; font-weight: bold;">${ogr.ad} ${ogr.soyad}</td>
                  <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center; background-color: #ffffff; color: #000000;">${ogr.sinif}-${ogr.sube}</td>
                  <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; background-color: #ffffff; color: #000000;">${ist.aylikTutar.toLocaleString("tr-TR")} ₺</td>
                  <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; background-color: #ffffff; color: #000000;">${ist.toplam.toLocaleString("tr-TR")} ₺</td>
                  <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; background-color: #ffffff; color: #16a34a; font-weight: bold;">${ist.odenen.toLocaleString("tr-TR")} ₺</td>
                  <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; background-color: #ffffff; color: #d97706; font-weight: bold;">${ist.kalan.toLocaleString("tr-TR")} ₺</td>
                  <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center; background-color: #ffffff; color: #000000;">${ist.odenenAySayisi} / ${AYLAR.length}</td>
                  <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center; background-color: ${durumBg}; color: ${durumColor}; font-weight: bold;">${durumStr}</td>
                  ${AYLAR.map((ay) => {
                    const ayOdeme = aidat.aylar[ay.key as AyKey];
                    let ayBg = "#ffffff";
                    let ayColor = "#64748b";
                    let ayTxt = "Bekliyor";

                    if (ayOdeme?.durum === "odendi") {
                      ayBg = "#dcfce7";
                      ayColor = "#15803d";
                      ayTxt = "Ödendi";
                    } else if (ayOdeme?.durum === "gecikti") {
                      ayBg = "#fee2e2";
                      ayColor = "#b91c1c";
                      ayTxt = "Gecikti";
                    }

                    return `<td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center; background-color: ${ayBg}; color: ${ayColor}; font-weight: bold;">${ayTxt}</td>`;
                  }).join("")}
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      `;
    }

    // Tamamen beyaz ve temiz XML/HTML Excel Şablonu
    const excelDosyaIcerigi = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Aidat Takip</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            body, table, td, th {
              background-color: #ffffff !important;
              color: #000000 !important;
              font-family: Calibri, Arial, sans-serif;
            }
          </style>
        </head>
        <body style="background-color: #ffffff; color: #000000;">
          ${tabloHtml}
        </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + excelDosyaIcerigi], { type: "application/vnd.ms-excel;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = dosyaAdi;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold gradient-text">💰 Aidat Takip</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Öğrenci bazlı aylık aidat takibi yapın, ödeme durumlarını ve kalan borçları yönetin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={excelIndir}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <span>📊</span>
            <span>Excel İndir (.xlsx)</span>
          </button>

          {gorunumModu === "detay" && (
            <button
              onClick={() => { setGorunumModu("liste"); setSecilenOgrenciId(null); }}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--primary)] hover:text-white transition-all"
            >
              ← Listeye Dön
            </button>
          )}
        </div>
      </div>

      {/* Filtre & Arama */}
      <div className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">Sınıf</label>
            <select
              value={secilenSinif}
              onChange={(e) => setSecilenSinif(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="Tümü">Tüm Sınıflar (1-12)</option>
              {sinifNumaralari.map((s) => (
                <option key={s} value={s}>{s}. Sınıf</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">Şube</label>
            <select
              value={secilenSube}
              onChange={(e) => setSecilenSube(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="Tümü">Tüm Şubeler (A-S)</option>
              {subeler.map((s) => (
                <option key={s} value={s}>{s} Şubesi</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">Arama</label>
            <input
              type="text"
              value={aramaMetni}
              onChange={(e) => setAramaMetni(e.target.value)}
              placeholder="Ad, soyad veya no..."
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">Aylık Aidat (₺)</label>
            <input
              type="number"
              value={globalAylikAidat}
              onChange={(e) => {
                const val = Number(e.target.value);
                setGlobalAylikAidat(val);
                saveGlobalAidat(val).catch(console.warn);
              }}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-bold text-sm"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Genel İstatistik Kartları (Kompakt) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Toplam Aidat",
            value: `${genelIstatistik.toplamToplam.toLocaleString("tr-TR")} ₺`,
            icon: "💰",
            cls: "text-indigo-600 dark:text-indigo-400",
            bg: "bg-indigo-500/15",
          },
          {
            label: "Toplam Ödenen",
            value: `${genelIstatistik.toplamOdenen.toLocaleString("tr-TR")} ₺`,
            icon: "✅",
            cls: "text-emerald-500",
            bg: "bg-emerald-500/15",
          },
          {
            label: "Kalan Borç",
            value: `${genelIstatistik.toplamKalan.toLocaleString("tr-TR")} ₺`,
            icon: "⏳",
            cls: "text-amber-500",
            bg: "bg-amber-500/15",
          },
          {
            label: "Gecikmiş Öğrenci",
            value: `${filtrelenmisOgrenciler.filter((o) => ogrenciIstatistik(o.id).geciken > 0).length} Öğrenci`,
            icon: "⚠️",
            cls: "text-red-500",
            bg: "bg-red-500/15",
          },
        ].map((k) => (
          <div key={k.label} className="glass-card rounded-xl p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center text-lg shrink-0`}>
              {k.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-[var(--muted-foreground)] truncate">{k.label}</p>
              <p className={`text-base sm:text-lg font-black truncate leading-tight mt-0.5 ${k.cls}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {gorunumModu === "liste" ? (
        /* Öğrenci Listesi */
        <div className="glass-card rounded-2xl p-6 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[var(--foreground)]">
              📋 Öğrenci Aidat Listesi ({filtrelenmisOgrenciler.length} Öğrenci)
            </h3>
          </div>

          <table className="w-full table-modern">
            <thead>
              <tr>
                <th className="text-left p-3 rounded-tl-xl text-[var(--foreground)] font-semibold">Öğrenci</th>
                <th className="text-center p-3 text-[var(--foreground)] font-semibold">Sınıf/Şube</th>
                <th className="text-center p-3 text-[var(--foreground)] font-semibold">Aylık Aidat</th>
                <th className="text-center p-3 text-[var(--foreground)] font-semibold">Toplam</th>
                <th className="text-center p-3 text-[var(--foreground)] font-semibold">Ödenen</th>
                <th className="text-center p-3 text-[var(--foreground)] font-semibold">Kalan</th>
                <th className="text-center p-3 text-[var(--foreground)] font-semibold">Durum</th>
                <th className="text-center p-3 rounded-tr-xl text-[var(--foreground)] font-semibold">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtrelenmisOgrenciler.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[var(--muted-foreground)]">
                    Kriterlere uygun öğrenci bulunamadı.
                  </td>
                </tr>
              ) : (
                filtrelenmisOgrenciler.map((ogr) => {
                  const ist = ogrenciIstatistik(ogr.id);
                  const odemeYuzdesi = ist.toplam > 0 ? (ist.odenen / ist.toplam) * 100 : 0;
                  const tamOdendi = ist.kalan === 0 && ist.toplam > 0;
                  const geciktiVar = ist.geciken > 0;

                  return (
                    <tr key={ogr.id} className="border-b border-[var(--border)]">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold">
                            {ogr.ad[0]}{ogr.soyad[0]}
                          </div>
                          <div>
                            <span className="font-medium text-sm text-[var(--foreground)]">{ogr.ad} {ogr.soyad}</span>
                            <p className="text-xs text-[var(--muted-foreground)]">No: {ogr.numara}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="badge-info px-3 py-1 rounded-lg text-xs font-bold">
                          {ogr.sinif}-{ogr.sube}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          value={ist.aylikTutar}
                          onChange={(e) => aylikAidatGuncelle(ogr.id, Number(e.target.value))}
                          className="w-24 px-2 py-1 rounded-lg border border-[var(--border)] bg-transparent text-sm text-center text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-semibold"
                          min="0"
                        />
                        <span className="text-xs text-[var(--muted-foreground)] ml-1">₺</span>
                      </td>
                      <td className="p-3 text-center font-bold text-[var(--foreground)]">
                        {ist.toplam.toLocaleString("tr-TR")} ₺
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-500">
                        {ist.odenen.toLocaleString("tr-TR")} ₺
                      </td>
                      <td className="p-3 text-center font-bold text-amber-500">
                        {ist.kalan.toLocaleString("tr-TR")} ₺
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-20 bg-[var(--muted)] rounded-full h-1.5">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(odemeYuzdesi, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            tamOdendi
                              ? "badge-success"
                              : geciktiVar
                              ? "badge-danger"
                              : "badge-warning"
                          }`}>
                            {tamOdendi ? "Tamamlandı" : geciktiVar ? "Gecikmiş" : "Devam Ediyor"}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setSecilenOgrenciId(ogr.id);
                            setGorunumModu("detay");
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-all shadow-sm"
                        >
                          📋 Detay
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Öğrenci Detay Görünümü */
        detayOgrenci && detayAidat && (
          <div className="space-y-5">
            {/* Öğrenci Özet Kartı */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center text-white text-xl font-black shadow-lg">
                    {detayOgrenci.ad[0]}{detayOgrenci.soyad[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--foreground)]">{detayOgrenci.ad} {detayOgrenci.soyad}</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      No: {detayOgrenci.numara} • {detayOgrenci.sinif}-{detayOgrenci.sube} • {detayOgrenci.cinsiyet === "E" ? "👦 Erkek" : "👧 Kız"}
                    </p>
                  </div>
                </div>

                {/* İstatistik Özeti */}
                {(() => {
                  const ist = ogrenciIstatistik(detayOgrenci.id);
                  return (
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-[var(--muted-foreground)]">Toplam</p>
                        <p className="text-lg font-extrabold text-[var(--foreground)]">{ist.toplam.toLocaleString("tr-TR")} ₺</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--muted-foreground)]">Ödenen</p>
                        <p className="text-lg font-extrabold text-emerald-500">{ist.odenen.toLocaleString("tr-TR")} ₺</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--muted-foreground)]">Kalan</p>
                        <p className="text-lg font-extrabold text-amber-500">{ist.kalan.toLocaleString("tr-TR")} ₺</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Aylık Aidat Tutarı Düzenleme */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)] mb-1">⚙️ Aidat Ayarları</h3>
                  <p className="text-xs text-[var(--muted-foreground)]">Bu öğrenciye özel aylık aidat tutarını belirleyin.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Aylık Aidat (₺)</label>
                    <input
                      type="number"
                      value={detayAidat.aylikAidat || globalAylikAidat}
                      onChange={(e) => aylikAidatGuncelle(detayOgrenci.id, Number(e.target.value))}
                      className="w-32 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-bold text-center"
                      min="0"
                    />
                  </div>
                  <button
                    onClick={() => tumunuOdendi(detayOgrenci.id)}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md mt-5"
                  >
                    ✅ Tümünü Ödendi İşaretle
                  </button>
                </div>
              </div>
            </div>

            {/* Aylık Ödeme Tablosu */}
            <div className="glass-card rounded-2xl p-6 overflow-x-auto">
              <h3 className="text-base font-bold text-[var(--foreground)] mb-4">📅 Aylık Ödeme Takibi</h3>

              <table className="w-full table-modern">
                <thead>
                  <tr>
                    <th className="text-left p-3 rounded-tl-xl text-[var(--foreground)] font-semibold">Ay</th>
                    <th className="text-center p-3 text-[var(--foreground)] font-semibold">Tutar (₺)</th>
                    <th className="text-center p-3 text-[var(--foreground)] font-semibold">Ödeme Durumu</th>
                    <th className="text-center p-3 text-[var(--foreground)] font-semibold">Ödeme Tarihi</th>
                    <th className="text-center p-3 rounded-tr-xl text-[var(--foreground)] font-semibold">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {AYLAR.map((ay) => {
                    const ayObj = detayAidat.aylar[ay.key as AyKey] || { tutar: 0, durum: "bekliyor" as OdemeDurumu };
                    const aylikTutar = detayAidat.aylikAidat || globalAylikAidat;

                    return (
                      <tr key={ay.key} className="border-b border-[var(--border)]">
                        <td className="p-3 font-semibold text-[var(--foreground)]">{ay.label}</td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            value={ayObj.tutar || aylikTutar}
                            onChange={(e) => ayOdemeGuncelle(detayOgrenci.id, ay.key as AyKey, "tutar", Number(e.target.value))}
                            className="w-28 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-transparent text-sm text-center text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-semibold"
                            min="0"
                          />
                          <span className="text-xs text-[var(--muted-foreground)] ml-1">₺</span>
                        </td>
                        <td className="p-3 text-center">
                          <select
                            value={ayObj.durum}
                            onChange={(e) => ayOdemeGuncelle(detayOgrenci.id, ay.key as AyKey, "durum", e.target.value as OdemeDurumu)}
                            className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                          >
                            <option value="bekliyor">🕐 Bekliyor</option>
                            <option value="odendi">✅ Ödendi</option>
                            <option value="gecikti">⏰ Gecikti</option>
                          </select>
                        </td>
                        <td className="p-3 text-center">
                          {ayObj.durum === "odendi" ? (
                            <input
                              type="text"
                              value={ayObj.odenmeTarihi || ""}
                              onChange={(e) => ayOdemeGuncelle(detayOgrenci.id, ay.key as AyKey, "odenmeTarihi", e.target.value)}
                              placeholder="GG.AA.YYYY"
                              className="w-32 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-transparent text-xs text-center text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                            />
                          ) : (
                            <span className="text-xs text-[var(--muted-foreground)]">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {ayObj.durum !== "odendi" && (
                              <button
                                onClick={() => {
                                  ayOdemeGuncelle(detayOgrenci.id, ay.key as AyKey, "durum", "odendi");
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"
                              >
                                ✓ Ödendi
                              </button>
                            )}
                            {ayObj.durum === "odendi" && (
                              <button
                                onClick={() => {
                                  ayOdemeGuncelle(detayOgrenci.id, ay.key as AyKey, "durum", "bekliyor");
                                  ayOdemeGuncelle(detayOgrenci.id, ay.key as AyKey, "odenmeTarihi", "");
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-all"
                              >
                                ✕ Geri Al
                              </button>
                            )}
                            {ayObj.durum === "bekliyor" && (
                              <button
                                onClick={() => ayOdemeGuncelle(detayOgrenci.id, ay.key as AyKey, "durum", "gecikti")}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white transition-all"
                              >
                                ⏰ Gecikti
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Özet Alt Bar */}
              {(() => {
                const ist = ogrenciIstatistik(detayOgrenci.id);
                return (
                  <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-6 text-sm">
                      <span className="text-[var(--muted-foreground)]">
                        Ödenen: <strong className="text-emerald-500">{ist.odenenAySayisi} / {AYLAR.length} Ay</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-4 font-bold text-sm">
                      <span className="text-[var(--foreground)]">
                        Toplam: <span className="text-[var(--primary)]">{ist.toplam.toLocaleString("tr-TR")} ₺</span>
                      </span>
                      <span className="text-[var(--foreground)]">
                        Ödenen: <span className="text-emerald-500">{ist.odenen.toLocaleString("tr-TR")} ₺</span>
                      </span>
                      <span className="text-[var(--foreground)]">
                        Kalan: <span className="text-amber-500">{ist.kalan.toLocaleString("tr-TR")} ₺</span>
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )
      )}
    </div>
  );
}
