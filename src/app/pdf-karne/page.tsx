"use client";

import { useState, useEffect, useMemo } from "react";
import { demoOgrenciler, sinifNumaralari, subeler, type Ogrenci } from "@/lib/data";
import { usePersistentState } from "@/lib/use-persistent-state";
import { 
  subscribeOgrenciler, 
  subscribeSinavlar, 
  type SinavData as Sinav 
} from "@/lib/firestore-service";

// ==========================================
// 1. OKUL NOTLARI MODELİ
// ==========================================
interface OkulKarneNotu {
  ders: string;
  sinav1: string;
  sinav2: string;
  performans: string;
  proje: string;
}

const varsayilanOkulNotlari: OkulKarneNotu[] = [
  { ders: "Türkçe", sinav1: "85", sinav2: "80", performans: "90", proje: "85" },
  { ders: "Matematik", sinav1: "90", sinav2: "88", performans: "95", proje: "90" },
  { ders: "Fen Bilimleri", sinav1: "78", sinav2: "82", performans: "85", proje: "80" },
  { ders: "Sosyal Bilgiler", sinav1: "85", sinav2: "90", performans: "90", proje: "95" },
  { ders: "İngilizce", sinav1: "92", sinav2: "95", performans: "100", proje: "95" },
  { ders: "Din Kültürü ve Ahlak Bilgisi", sinav1: "95", sinav2: "90", performans: "95", proje: "100" },
  { ders: "Beden Eğitimi ve Spor", sinav1: "100", sinav2: "100", performans: "100", proje: "100" },
  { ders: "Görsel Sanatlar / Müzik", sinav1: "95", sinav2: "95", performans: "95", proje: "95" },
];

// ==========================================
// 2. SINAV ANALİZİ MODELİ & DERSLERİ
// ==========================================
const standartSinavDersleri = [
  { id: "turkce", ad: "Türkçe", soruSayisi: 20, katsayi: 4 },
  { id: "matematik", ad: "Matematik", soruSayisi: 20, katsayi: 4 },
  { id: "fen", ad: "Fen Bilgisi", soruSayisi: 20, katsayi: 4 },
  { id: "sosyal", ad: "Sosyal Bilgiler", soruSayisi: 10, katsayi: 1 },
  { id: "din", ad: "Din Kültürü", soruSayisi: 10, katsayi: 1 },
  { id: "ingilizce", ad: "İngilizce", soruSayisi: 10, katsayi: 1 },
];

interface SinavDersAnalizi {
  id: string;
  ders: string;
  soruSayisi: number;
  dogru: number;
  yanlis: number;
  bos: number;
  katsayi: number;
}

// Türkçe karakterleri PDF güvenli karakterlere çevirme
const trToEn = (str: string): string => {
  if (!str) return "";
  return str
    .replace(/Ğ/g, "G")
    .replace(/ğ/g, "g")
    .replace(/Ü/g, "U")
    .replace(/ü/g, "u")
    .replace(/Ş/g, "S")
    .replace(/ş/g, "s")
    .replace(/İ/g, "I")
    .replace(/ı/g, "i")
    .replace(/Ö/g, "O")
    .replace(/ö/g, "o")
    .replace(/Ç/g, "C")
    .replace(/ç/g, "c");
};

export default function PdfKarnePage() {
  const [karneTuru, setKarneTuru] = useState<"toplu_sinav_gecmis" | "sinav_analiz" | "okul_notlari">("toplu_sinav_gecmis");
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>(demoOgrenciler);
  const [sinavlar, setSinavlar] = useState<Sinav[]>([]);
  const [secilenSinavId, setSecilenSinavId] = useState<string>("otomatik");

  // Filtreler
  const [secilenSinif, setSecilenSinif] = usePersistentState("egitim_pdf_karne_sinif", "8");
  const [secilenSube, setSecilenSube] = usePersistentState("egitim_pdf_karne_sube", "A");
  const [secilenOgrenciId, setSecilenOgrenciId] = usePersistentState<string>("egitim_pdf_karne_ogrenci_id", "1");

  // Genel Okul / Belge Bilgileri
  const [okulBilgi, setOkulBilgi] = usePersistentState("egitim_pdf_karne_okul_bilgi", {
    okulAdi: "Atatürk Ortaokulu",
    donem: "2026-2027 Eğitim Öğretim Yılı / 2. Dönem",
    ogretmenAdi: "Sınıf Rehber Öğretmeni",
    mudurAdi: "Okul Müdürü",
  });

  // Not State'leri
  const [okulNotlari, setOkulNotlari] = useState<OkulKarneNotu[]>(varsayilanOkulNotlari);
  const [manuelSinavDersleri, setManuelSinavDersleri] = useState<SinavDersAnalizi[]>([]);

  // Firestore Realtime Senkronizasyonu
  useEffect(() => {
    const unsubOgrenciler = subscribeOgrenciler((data) => setOgrenciler(data));
    const unsubSinavlar = subscribeSinavlar((data) => setSinavlar(data));
    return () => {
      unsubOgrenciler();
      unsubSinavlar();
    };
  }, []);

  // Filtreli öğrenciler
  const filtrelenmisOgrenciler = useMemo(() => {
    return ogrenciler.filter((o) => {
      const sinifUygun = secilenSinif === "Tümü" || o.sinif === secilenSinif;
      const subeUygun = secilenSube === "Tümü" || o.sube === secilenSube;
      return sinifUygun && subeUygun;
    });
  }, [ogrenciler, secilenSinif, secilenSube]);

  // Sınıfa ait mevcut sınavlar
  const filtrelenmisSinavlar = useMemo(() => {
    if (sinavlar.length === 0) return [];
    return sinavlar.filter((s) => {
      const sinifUygun = secilenSinif === "Tümü" || s.sinif === secilenSinif;
      const subeUygun = secilenSube === "Tümü" || s.sube === secilenSube;
      return sinifUygun && subeUygun;
    });
  }, [sinavlar, secilenSinif, secilenSube]);

  // Aktif Seçili Sınav (Tek Sınav Modu İçin)
  const aktifSinav = useMemo(() => {
    if (sinavlar.length === 0) return null;
    if (secilenSinavId !== "otomatik") {
      return sinavlar.find((s) => String(s.id) === secilenSinavId) || sinavlar[0];
    }
    return filtrelenmisSinavlar[0] || sinavlar[0] || null;
  }, [sinavlar, filtrelenmisSinavlar, secilenSinavId]);

  // Aktif Seçili Öğrenci
  const seciliOgrenci = useMemo(() => {
    return ogrenciler.find((o) => String(o.id) === secilenOgrenciId) || filtrelenmisOgrenciler[0] || ogrenciler[0] || {
      id: 1,
      ad: "Ahmet",
      soyad: "Yılmaz",
      numara: "101",
      sinif: "8",
      sube: "A",
      cinsiyet: "E",
      veliTelefon: "",
      veliAd: "",
    };
  }, [ogrenciler, filtrelenmisOgrenciler, secilenOgrenciId]);

  // Net Hesaplama Yardımcısı
  const netHesapla = (d: { dogru?: number | ""; yanlis?: number | "" } | undefined) => {
    if (!d) return 0;
    const dSayisi = typeof d.dogru === "number" ? d.dogru : 0;
    const ySayisi = typeof d.yanlis === "number" ? d.yanlis : 0;
    const net = dSayisi - ySayisi / 3;
    return Math.max(0, parseFloat(net.toFixed(2)));
  };

  // Puan Hesaplama Yardımcısı
  const lgsPuanHesapla = (notlar: Record<string, { dogru?: number | ""; yanlis?: number | "" }> | undefined, sinifSeviyesi = seciliOgrenci.sinif) => {
    if (!notlar) return 0;

    const turkceNet = netHesapla(notlar["turkce"]);
    const matNet = netHesapla(notlar["matematik"]);
    const fenNet = netHesapla(notlar["fen"]);
    const sosNet = netHesapla(notlar["sosyal"]);
    const dinNet = netHesapla(notlar["din"]);
    const ingNet = netHesapla(notlar["ingilizce"]);

    const toplamNet = turkceNet + matNet + fenNet + sosNet + dinNet + ingNet;
    if (toplamNet === 0) return 0;

    if (sinifSeviyesi === "8") {
      const puan = 194.76 + (turkceNet * 4.32) + (matNet * 4.28) + (fenNet * 4.07) + (sosNet * 1.68) + (dinNet * 1.84) + (ingNet * 1.58);
      return Math.min(500, parseFloat(puan.toFixed(3)));
    }

    const maxAglNet = (20 * 4) + (20 * 4) + (20 * 4) + (10 * 1) + (10 * 1) + (10 * 1);
    const ogrenciAglNet = (turkceNet * 4) + (matNet * 4) + (fenNet * 4) + (sosNet * 1) + (dinNet * 1) + (ingNet * 1);
    const yuzlukPuan = (ogrenciAglNet / maxAglNet) * 100;
    return parseFloat(yuzlukPuan.toFixed(2));
  };

  // =========================================================================
  // TOPLU SINAV GEÇMİŞİ VERİLERİ (TÜM SINAVLAR)
  // =========================================================================
  const ogrenciTumSinavlari = useMemo(() => {
    const list: {
      sinavId: number;
      sinavAdi: string;
      tarih: string;
      sinif: string;
      sube: string;
      turkceNet: number;
      matNet: number;
      fenNet: number;
      sosNet: number;
      dinNet: number;
      ingNet: number;
      toplamNet: number;
      puan: number;
    }[] = [];

    sinavlar.forEach((s) => {
      const ogrNot = s.ogrenciNotlari?.[seciliOgrenci.id];
      if (ogrNot) {
        const tNet = netHesapla(ogrNot["turkce"]);
        const mNet = netHesapla(ogrNot["matematik"]);
        const fNet = netHesapla(ogrNot["fen"]);
        const sNet = netHesapla(ogrNot["sosyal"]);
        const dNet = netHesapla(ogrNot["din"]);
        const iNet = netHesapla(ogrNot["ingilizce"]);
        const topNet = parseFloat((tNet + mNet + fNet + sNet + dNet + iNet).toFixed(2));
        const puan = lgsPuanHesapla(ogrNot, s.sinif);

        list.push({
          sinavId: s.id,
          sinavAdi: s.ad,
          tarih: s.tarih,
          sinif: s.sinif,
          sube: s.sube,
          turkceNet: tNet,
          matNet: mNet,
          fenNet: fNet,
          sosNet: sNet,
          dinNet: dNet,
          ingNet: iNet,
          toplamNet: topNet,
          puan,
        });
      }
    });

    return list.sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime());
  }, [seciliOgrenci, sinavlar]);

  // Toplu Sınav İstatistikleri
  const topluSinavIstatistik = useMemo(() => {
    if (ogrenciTumSinavlari.length === 0) {
      return { ortalamaPuan: 0, enYuksekPuan: 0, enDusukPuan: 0, ortalamaNet: 0 };
    }

    const puanlar = ogrenciTumSinavlari.map((s) => s.puan).filter((p) => p > 0);
    const netler = ogrenciTumSinavlari.map((s) => s.toplamNet);

    const ortalamaPuan = puanlar.length > 0 ? puanlar.reduce((a, b) => a + b, 0) / puanlar.length : 0;
    const enYuksekPuan = puanlar.length > 0 ? Math.max(...puanlar) : 0;
    const enDusukPuan = puanlar.length > 0 ? Math.min(...puanlar) : 0;
    const ortalamaNet = netler.length > 0 ? netler.reduce((a, b) => a + b, 0) / netler.length : 0;

    return {
      ortalamaPuan: parseFloat(ortalamaPuan.toFixed(2)),
      enYuksekPuan: parseFloat(enYuksekPuan.toFixed(2)),
      enDusukPuan: parseFloat(enDusukPuan.toFixed(2)),
      ortalamaNet: parseFloat(ortalamaNet.toFixed(2)),
    };
  }, [ogrenciTumSinavlari]);

  // Tek Sınav Modu Ders Verisi
  const cekilenSinavDersleri = useMemo((): SinavDersAnalizi[] => {
    if (!aktifSinav) {
      return standartSinavDersleri.map((d) => ({
        id: d.id,
        ders: d.ad,
        soruSayisi: d.soruSayisi,
        dogru: Math.floor(d.soruSayisi * 0.8),
        yanlis: Math.floor(d.soruSayisi * 0.15),
        bos: Math.max(0, d.soruSayisi - Math.floor(d.soruSayisi * 0.8) - Math.floor(d.soruSayisi * 0.15)),
        katsayi: d.katsayi,
      }));
    }

    const ogrNotKaydi = aktifSinav.ogrenciNotlari?.[seciliOgrenci.id];

    return standartSinavDersleri.map((d) => {
      const kayit = ogrNotKaydi?.[d.id];
      const dogru = kayit && typeof kayit.dogru === "number" ? kayit.dogru : 0;
      const yanlis = kayit && typeof kayit.yanlis === "number" ? kayit.yanlis : 0;
      const bos = Math.max(0, d.soruSayisi - (dogru + yanlis));

      return {
        id: d.id,
        ders: d.ad,
        soruSayisi: d.soruSayisi,
        dogru,
        yanlis,
        bos,
        katsayi: d.katsayi,
      };
    });
  }, [aktifSinav, seciliOgrenci]);

  const aktifSinavDersleri = useMemo(() => {
    if (manuelSinavDersleri.length > 0) return manuelSinavDersleri;
    return cekilenSinavDersleri;
  }, [manuelSinavDersleri, cekilenSinavDersleri]);

  useEffect(() => {
    setManuelSinavDersleri([]);
  }, [seciliOgrenci.id, secilenSinavId]);

  const sinavHesapla = (d: SinavDersAnalizi) => {
    const net = Math.max(0, d.dogru - d.yanlis / 3);
    const basariYuzdesi = d.soruSayisi > 0 ? (net / d.soruSayisi) * 100 : 0;
    return { net, basariYuzdesi };
  };

  const sinavOzet = useMemo(() => {
    let toplamSoru = 0;
    let toplamDogru = 0;
    let toplamYanlis = 0;
    let toplamBos = 0;
    let toplamNet = 0;
    let toplamAgirlikliPuan = 0;
    let toplamKatsayi = 0;

    aktifSinavDersleri.forEach((d) => {
      const { net } = sinavHesapla(d);
      toplamSoru += d.soruSayisi;
      toplamDogru += d.dogru;
      toplamYanlis += d.yanlis;
      toplamBos += d.bos;
      toplamNet += net;
      toplamAgirlikliPuan += net * d.katsayi;
      toplamKatsayi += d.katsayi * d.soruSayisi;
    });

    const lgsTabanPuan = 100;
    const hesaplananPuan = toplamKatsayi > 0 ? lgsTabanPuan + (toplamAgirlikliPuan / (toplamKatsayi / 4)) * 100 : 0;
    const genelBasari = toplamSoru > 0 ? (toplamNet / toplamSoru) * 100 : 0;

    return {
      toplamSoru,
      toplamDogru,
      toplamYanlis,
      toplamBos,
      toplamNet,
      hesaplananPuan: Math.min(500, Math.max(100, hesaplananPuan)),
      genelBasari,
    };
  }, [aktifSinavDersleri]);

  // Okul Notu Hesaplamaları
  const okulDersOrtalama = (n: OkulKarneNotu): number => {
    const s1 = Number(n.sinav1) || 0;
    const s2 = Number(n.sinav2) || 0;
    const p = Number(n.performans) || 0;
    const pr = Number(n.proje) || 0;
    const notlar = [s1, s2, p, pr].filter((v) => v > 0);
    return notlar.length > 0 ? notlar.reduce((a, b) => a + b, 0) / notlar.length : 0;
  };

  const okulGenelOrtalama = useMemo(() => {
    if (okulNotlari.length === 0) return 0;
    const toplam = okulNotlari.reduce((acc, n) => acc + okulDersOrtalama(n), 0);
    return toplam / okulNotlari.length;
  }, [okulNotlari]);

  // =========================================================================
  // 1. PDF İNDİR: TOPLU SINAV GEÇMİŞİ VE BAŞARI KARNESİ
  // =========================================================================
  const pdfTopluSinavGecmisiIndir = async () => {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Üst Banner
    doc.setFillColor(99, 102, 241);
    doc.rect(14, 10, 269, 7, "F");

    doc.setFontSize(16);
    doc.setTextColor(30, 27, 75);
    doc.text("TUM SINAVLAR TOPLU BASARI VE GELISIM KARNESI", 148, 24, { align: "center" });

    // Öğrenci Bilgi Kutusu
    doc.setDrawColor(220, 220, 240);
    doc.setFillColor(248, 250, 255);
    doc.roundedRect(14, 30, 269, 18, 3, 3, "FD");

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Ogrenci: ${trToEn(seciliOgrenci.ad)} ${trToEn(seciliOgrenci.soyad)}`, 20, 37);
    doc.text(`Okul No: ${seciliOgrenci.numara}  •  Sinif / Sube: ${seciliOgrenci.sinif}-${seciliOgrenci.sube}`, 20, 44);

    doc.text(`Girdigi Sinav Sayisi: ${ogrenciTumSinavlari.length}`, 115, 37);
    doc.text(`Ortalama Puan: ${topluSinavIstatistik.ortalamaPuan}`, 115, 44);

    doc.text(`En Yuksek Puan: ${topluSinavIstatistik.enYuksekPuan}`, 200, 37);
    doc.text(`Rapor Tarihi: ${new Date().toLocaleDateString("tr-TR")}`, 200, 44);

    // Tablo Verisi
    const tableData = ogrenciTumSinavlari.map((s, idx) => {
      const oncekiPuan = idx > 0 ? ogrenciTumSinavlari[idx - 1].puan : s.puan;
      const fark = idx > 0 ? parseFloat((s.puan - oncekiPuan).toFixed(2)) : 0;
      const degisim = idx === 0 ? "Ilk Sinav" : fark > 0 ? `+${fark}` : fark < 0 ? `${fark}` : "Ayni";

      return [
        trToEn(s.sinavAdi),
        s.tarih,
        String(s.turkceNet),
        String(s.matNet),
        String(s.fenNet),
        String(s.sosNet),
        String(s.dinNet),
        String(s.ingNet),
        String(s.toplamNet),
        String(s.puan),
        degisim,
      ];
    });

    autoTable(doc, {
      startY: 52,
      head: [["Sinav Adi", "Tarih", "Turkce", "Mat", "Fen", "Sosyal", "Din", "Ing", "Top. Net", "Puan", "Degisim"]],
      body: tableData.length > 0 ? tableData : [["Kayitli sinav bulunamadi", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"]],
      theme: "grid",
      headStyles: {
        fillColor: [99, 102, 241],
        textColor: 255,
        fontSize: 9,
        halign: "center",
      },
      styles: {
        fontSize: 8.5,
        halign: "center",
        cellPadding: 3,
      },
      columnStyles: {
        0: { halign: "left", fontStyle: "bold", cellWidth: 60 },
        1: { cellWidth: 24 },
        8: { fontStyle: "bold", fillColor: [240, 245, 255] },
        9: { fontStyle: "bold", fillColor: [245, 240, 255] },
      },
      alternateRowStyles: {
        fillColor: [250, 252, 255],
      },
    });

    const docWithAutoTable = doc as unknown as { lastAutoTable?: { finalY?: number } };
    const finalY = docWithAutoTable.lastAutoTable?.finalY || 150;

    // İmza Alanları
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(trToEn(okulBilgi.ogretmenAdi), 50, finalY + 25, { align: "center" });
    doc.text("Sinif Rehber Ogretmeni", 50, finalY + 30, { align: "center" });
    doc.line(25, finalY + 20, 75, finalY + 20);

    doc.text(trToEn(okulBilgi.mudurAdi), 240, finalY + 25, { align: "center" });
    doc.text("Okul Muduru", 240, finalY + 30, { align: "center" });
    doc.line(215, finalY + 20, 265, finalY + 20);

    doc.save(`tum_sinavlar_karnesi_${seciliOgrenci.ad}_${seciliOgrenci.soyad}.pdf`);
  };

  // =========================================================================
  // 2. PDF İNDİR: TEK SINAV ANALİZ KARNESİ
  // =========================================================================
  const pdfSinavAnalizIndir = async () => {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    const sinavAdi = aktifSinav ? aktifSinav.ad : "LGS DENEME SINAVI";
    const sinavTarihi = aktifSinav?.tarih || new Date().toLocaleDateString("tr-TR");

    doc.setFillColor(14, 165, 233);
    doc.rect(14, 12, 182, 8, "F");

    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(trToEn(sinavAdi.toUpperCase()), 105, 28, { align: "center" });

    doc.setFontSize(11);
    doc.setTextColor(14, 165, 233);
    doc.text("OGRENCI SINAV ANALIZ VE SONUC KARNESI", 105, 35, { align: "center" });

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Sinav Tarihi: ${sinavTarihi}`, 105, 41, { align: "center" });

    doc.setDrawColor(220, 220, 240);
    doc.setFillColor(248, 250, 255);
    doc.roundedRect(14, 46, 182, 22, 3, 3, "FD");

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Ogrenci Adi Soyadi: ${trToEn(seciliOgrenci.ad)} ${trToEn(seciliOgrenci.soyad)}`, 20, 54);
    doc.text(`Okul Numarasi: ${seciliOgrenci.numara}`, 20, 62);
    doc.text(`Sinif / Sube: ${seciliOgrenci.sinif}-${seciliOgrenci.sube}`, 120, 54);
    doc.text(`Hesaplanan Puan: ${sinavOzet.hesaplananPuan.toFixed(2)}`, 120, 62);

    const tableData = aktifSinavDersleri.map((d) => {
      const { net, basariYuzdesi } = sinavHesapla(d);
      return [
        trToEn(d.ders),
        String(d.soruSayisi),
        String(d.dogru),
        String(d.yanlis),
        String(d.bos),
        net.toFixed(2),
        `%${basariYuzdesi.toFixed(1)}`,
      ];
    });

    tableData.push([
      "GENEL TOPLAM",
      String(sinavOzet.toplamSoru),
      String(sinavOzet.toplamDogru),
      String(sinavOzet.toplamYanlis),
      String(sinavOzet.toplamBos),
      sinavOzet.toplamNet.toFixed(2),
      `%${sinavOzet.genelBasari.toFixed(1)}`,
    ]);

    autoTable(doc, {
      startY: 72,
      head: [["Ders / Bolum", "Soru", "Dogru", "Yanlis", "Bos", "Net", "Basari %"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [14, 165, 233],
        textColor: 255,
        fontSize: 9,
        halign: "center",
      },
      columnStyles: {
        0: { halign: "left" },
        1: { halign: "center" },
        2: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "center" },
        5: { halign: "center", fontStyle: "bold" },
        6: { halign: "center", fontStyle: "bold" },
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 255],
      },
    });

    const docWithAutoTable = doc as unknown as { lastAutoTable?: { finalY?: number } };
    const finalY = docWithAutoTable.lastAutoTable?.finalY || 180;

    doc.setFillColor(240, 249, 255);
    doc.roundedRect(14, finalY + 8, 182, 22, 2, 2, "F");

    doc.setFontSize(11);
    doc.setTextColor(14, 165, 233);
    doc.text(`Toplam Net: ${sinavOzet.toplamNet.toFixed(2)} / ${sinavOzet.toplamSoru}`, 20, finalY + 18);
    doc.text(`Toplam Basari: %${sinavOzet.genelBasari.toFixed(1)}`, 20, finalY + 25);

    doc.setTextColor(15, 23, 42);
    doc.text(`Hesaplanan Puan: ${sinavOzet.hesaplananPuan.toFixed(2)}`, 120, finalY + 18);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("3 Yanlis 1 Dogruyu Goturur Formulu", 120, finalY + 25);

    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(trToEn(okulBilgi.ogretmenAdi), 40, finalY + 48, { align: "center" });
    doc.text("Danisman Ogretmen", 40, finalY + 53, { align: "center" });
    doc.line(20, finalY + 43, 60, finalY + 43);

    doc.text(trToEn(okulBilgi.mudurAdi), 160, finalY + 48, { align: "center" });
    doc.text("Okul Muduru", 160, finalY + 53, { align: "center" });
    doc.line(140, finalY + 43, 180, finalY + 43);

    doc.save(`tek_sinav_karnesi_${seciliOgrenci.ad}_${seciliOgrenci.soyad}.pdf`);
  };

  // =========================================================================
  // 3. PDF İNDİR: OKUL NOTLARI DÖNEM KARNESİ
  // =========================================================================
  const pdfOkulNotlariIndir = async () => {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();

    doc.setFillColor(79, 70, 229);
    doc.rect(14, 12, 182, 8, "F");

    doc.setFontSize(16);
    doc.setTextColor(30, 27, 75);
    doc.text("OGRENCI DONEM KARNESI", 105, 28, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(trToEn(okulBilgi.donem), 105, 36, { align: "center" });

    doc.setDrawColor(220, 220, 240);
    doc.setFillColor(248, 250, 255);
    doc.roundedRect(14, 42, 182, 22, 3, 3, "FD");

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Ogrenci Adi Soyadi: ${trToEn(seciliOgrenci.ad)} ${trToEn(seciliOgrenci.soyad)}`, 20, 50);
    doc.text(`Okul Numarasi: ${seciliOgrenci.numara}`, 20, 58);
    doc.text(`Sinif / Sube: ${seciliOgrenci.sinif}-${seciliOgrenci.sube}`, 120, 50);
    doc.text(`Duzenleme Tarihi: ${new Date().toLocaleDateString("tr-TR")}`, 120, 58);

    const tableData = okulNotlari.map((n) => {
      const ort = okulDersOrtalama(n);
      return [
        trToEn(n.ders),
        n.sinav1 || "-",
        n.sinav2 || "-",
        n.performans || "-",
        n.proje || "-",
        ort > 0 ? ort.toFixed(1) : "-",
        ort >= 50 ? "GECTI" : "KALDI",
      ];
    });

    autoTable(doc, {
      startY: 68,
      head: [["Ders Adi", "1. Sinav", "2. Sinav", "Performans", "Proje", "Ortalama", "Sonuc"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontSize: 9,
        halign: "center",
      },
      columnStyles: {
        0: { halign: "left" },
        1: { halign: "center" },
        2: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "center" },
        5: { halign: "center", fontStyle: "bold" },
        6: { halign: "center" },
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 255],
      },
    });

    const docWithAutoTable = doc as unknown as { lastAutoTable?: { finalY?: number } };
    const finalY = docWithAutoTable.lastAutoTable?.finalY || 180;

    const belgeMetni = okulGenelOrtalama >= 85 ? "TAKDIR BELGESI" : okulGenelOrtalama >= 70 ? "TESEKKUR BELGESI" : okulGenelOrtalama >= 50 ? "DOGRUDAN GECTI" : "SINIF TEKRARI";

    doc.setFillColor(240, 243, 255);
    doc.roundedRect(14, finalY + 8, 182, 18, 2, 2, "F");
    doc.setFontSize(11);
    doc.setTextColor(79, 70, 229);
    doc.text(`Donem Genel Not Ortalamasi: ${okulGenelOrtalama.toFixed(2)}`, 20, finalY + 20);
    doc.setTextColor(30, 27, 75);
    doc.text(`Basari Durumu: ${belgeMetni}`, 120, finalY + 20);

    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(trToEn(okulBilgi.ogretmenAdi), 40, finalY + 45, { align: "center" });
    doc.text("Sinif Rehber Ogretmeni", 40, finalY + 50, { align: "center" });
    doc.line(20, finalY + 40, 60, finalY + 40);

    doc.text(trToEn(okulBilgi.mudurAdi), 160, finalY + 45, { align: "center" });
    doc.text("Okul Muduru", 160, finalY + 50, { align: "center" });
    doc.line(140, finalY + 40, 180, finalY + 40);

    doc.save(`okul_karnesi_${seciliOgrenci.ad}_${seciliOgrenci.soyad}.pdf`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Üst Başlık & 3'lü Karne Türü Seçici */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold gradient-text">📄 PDF Karne & Sonuç Raporları</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Öğrencinin tüm sınav geçmişi, tekil sınav analizi veya okul notları karnesini indirin.
          </p>
        </div>

        {/* 3'lü Karne Seçim Butonları */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[var(--background)] p-1.5 rounded-2xl border border-[var(--border)]">
          <button
            onClick={() => setKarneTuru("toplu_sinav_gecmis")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              karneTuru === "toplu_sinav_gecmis"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                : "text-[var(--foreground)] hover:text-indigo-600"
            }`}
          >
            <span>📊</span>
            <span>Tüm Sınavlar Geçmiş Karnesi</span>
          </button>
          <button
            onClick={() => setKarneTuru("sinav_analiz")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              karneTuru === "sinav_analiz"
                ? "bg-sky-600 text-white shadow-md shadow-sky-500/25"
                : "text-[var(--foreground)] hover:text-sky-600"
            }`}
          >
            <span>📈</span>
            <span>Tek Sınav Analiz Karnesi</span>
          </button>
          <button
            onClick={() => setKarneTuru("okul_notlari")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              karneTuru === "okul_notlari"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-[var(--foreground)] hover:text-emerald-600"
            }`}
          >
            <span>📑</span>
            <span>Okul Notları Karnesi</span>
          </button>
        </div>
      </div>

      {/* Sınıf, Şube ve Öğrenci Seçim Paneli */}
      <div className="glass-card rounded-2xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Sınıf</label>
            <select
              value={secilenSinif}
              onChange={(e) => setSecilenSinif(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-semibold text-sm"
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
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-semibold text-sm"
            >
              <option value="Tümü">Tüm Şubeler (A-S)</option>
              {subeler.map((s) => (
                <option key={s} value={s}>{s} Şubesi</option>
              ))}
            </select>
          </div>

          {karneTuru === "sinav_analiz" ? (
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
                Çekilecek Sınav
              </label>
              <select
                value={secilenSinavId}
                onChange={(e) => setSecilenSinavId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-sky-500/40 bg-[var(--background)] text-sky-600 dark:text-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold text-sm"
              >
                {sinavlar.length === 0 ? (
                  <option value="otomatik">✨ Örnek Sınav Analizi</option>
                ) : (
                  sinavlar.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      🎯 {s.ad} ({s.sinif}-{s.sube})
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Dönem Bilgisi</label>
              <input
                type="text"
                value={okulBilgi.donem}
                onChange={(e) => setOkulBilgi({ ...okulBilgi, donem: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">
              Öğrenci Seçin ({filtrelenmisOgrenciler.length})
            </label>
            <select
              value={secilenOgrenciId}
              onChange={(e) => setSecilenOgrenciId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-bold text-sm"
            >
              {filtrelenmisOgrenciler.map((o) => (
                <option key={o.id} value={String(o.id)}>
                  No: {o.numara} - {o.ad} {o.soyad} ({o.sinif}-{o.sube})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. SEÇENEK: TÜM SINAVLAR TOPLU GEÇMİŞ KARNESİ (YENİ) */}
      {/* ========================================================= */}
      {karneTuru === "toplu_sinav_gecmis" && (
        <div className="space-y-6 animate-fade-in">
          {/* Öğrenci Özet Kartı & İndir Butonu */}
          <div className="glass-card rounded-2xl p-5 border-l-4 border-l-indigo-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center text-white text-lg font-black shadow-md">
                {seciliOgrenci.ad[0]}{seciliOgrenci.soyad[0]}
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  {seciliOgrenci.ad} {seciliOgrenci.soyad} — Tüm Sınavlar Başarı Karnesi
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  No: <strong>{seciliOgrenci.numara}</strong> • {seciliOgrenci.sinif}-{seciliOgrenci.sube} • Toplam <strong>{ogrenciTumSinavlari.length}</strong> Sınav Kaydı
                </p>
              </div>
            </div>

            <button
              onClick={pdfTopluSinavGecmisiIndir}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all hover:scale-105 shadow-lg flex items-center gap-2 shrink-0"
            >
              <span>📊</span>
              <span>Tüm Sınavlar Karnesini İndir (PDF)</span>
            </button>
          </div>

          {/* İstatistik Rozetleri */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-card rounded-2xl p-4 text-center">
              <p className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase">Ortalama Puan</p>
              <p className="text-2xl font-black gradient-text mt-1">{topluSinavIstatistik.ortalamaPuan}</p>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Tüm Sınavlar</p>
            </div>

            <div className="glass-card rounded-2xl p-4 text-center">
              <p className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase">En Yüksek Puan</p>
              <p className="text-2xl font-black text-emerald-500 mt-1">{topluSinavIstatistik.enYuksekPuan}</p>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Zirve Sonuç</p>
            </div>

            <div className="glass-card rounded-2xl p-4 text-center">
              <p className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase">En Düşük Puan</p>
              <p className="text-2xl font-black text-amber-500 mt-1">{topluSinavIstatistik.enDusukPuan}</p>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Taban Sonuç</p>
            </div>

            <div className="glass-card rounded-2xl p-4 text-center">
              <p className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase">Ortalama Net</p>
              <p className="text-2xl font-black text-indigo-500 mt-1">{topluSinavIstatistik.ortalamaNet}</p>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Dersler Toplamı</p>
            </div>
          </div>

          {/* Toplu Sınav Geçmiş Tablosu */}
          <div className="glass-card rounded-2xl p-6 overflow-x-auto">
            <h3 className="text-base font-bold text-[var(--foreground)] mb-4">
              📅 Kronolojik Sınav Puanları ve Ders Netleri
            </h3>

            <table className="w-full table-modern">
              <thead>
                <tr>
                  <th className="text-left p-3 rounded-tl-xl">Sınav Adı</th>
                  <th className="text-center p-3">Tarih</th>
                  <th className="text-center p-3">Türkçe Net</th>
                  <th className="text-center p-3">Mat. Net</th>
                  <th className="text-center p-3">Fen Net</th>
                  <th className="text-center p-3">Sosyal Net</th>
                  <th className="text-center p-3">Din Net</th>
                  <th className="text-center p-3">İng. Net</th>
                  <th className="text-center p-3 bg-blue-500/10 text-blue-600">Toplam Net</th>
                  <th className="text-center p-3 bg-purple-500/10 text-purple-600">Alınan Puan</th>
                  <th className="text-center p-3 rounded-tr-xl">Değişim</th>
                </tr>
              </thead>
              <tbody>
                {ogrenciTumSinavlari.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-[var(--muted-foreground)] font-medium">
                      Bu öğrenci için Sınav Analizi bölümünde henüz kayıtlı sınav bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  ogrenciTumSinavlari.map((s, idx) => {
                    const oncekiPuan = idx > 0 ? ogrenciTumSinavlari[idx - 1].puan : s.puan;
                    const fark = idx > 0 ? parseFloat((s.puan - oncekiPuan).toFixed(2)) : 0;

                    return (
                      <tr key={s.sinavId} className="border-b border-[var(--border)]">
                        <td className="p-3 font-bold text-sm text-[var(--foreground)]">
                          🎯 {s.sinavAdi}
                        </td>
                        <td className="p-3 text-center text-xs text-[var(--muted-foreground)]">
                          {new Date(s.tarih).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="p-3 text-center text-xs font-semibold">{s.turkceNet}</td>
                        <td className="p-3 text-center text-xs font-semibold">{s.matNet}</td>
                        <td className="p-3 text-center text-xs font-semibold">{s.fenNet}</td>
                        <td className="p-3 text-center text-xs font-semibold">{s.sosNet}</td>
                        <td className="p-3 text-center text-xs font-semibold">{s.dinNet}</td>
                        <td className="p-3 text-center text-xs font-semibold">{s.ingNet}</td>
                        <td className="p-3 text-center font-extrabold text-blue-600 text-sm bg-blue-500/5">
                          {s.toplamNet}
                        </td>
                        <td className="p-3 text-center font-black text-purple-600 text-sm bg-purple-500/5">
                          {s.puan > 0 ? s.puan : "-"}
                        </td>
                        <td className="p-3 text-center text-xs font-bold">
                          {idx === 0 ? (
                            <span className="text-gray-400">İlk Sınav</span>
                          ) : fark > 0 ? (
                            <span className="text-emerald-500 font-bold">▲ +{fark}</span>
                          ) : fark < 0 ? (
                            <span className="text-red-500 font-bold">▼ {fark}</span>
                          ) : (
                            <span className="text-gray-400">— Aynı</span>
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
      )}

      {/* ========================================================= */}
      {/* 2. SEÇENEK: TEK SINAV ANALİZ KARNESİ */}
      {/* ========================================================= */}
      {karneTuru === "sinav_analiz" && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-card rounded-2xl p-5 border-l-4 border-l-sky-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 text-xs font-bold">
                  {aktifSinav ? `Sınav: ${aktifSinav.ad}` : "Standart LGS Sınav Şablonu"}
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">
                  • Tarih: {aktifSinav?.tarih || new Date().toLocaleDateString("tr-TR")}
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--foreground)] mt-1">
                👨‍🎓 {seciliOgrenci.ad} {seciliOgrenci.soyad} (No: {seciliOgrenci.numara} • {seciliOgrenci.sinif}-{seciliOgrenci.sube})
              </h3>
            </div>

            <button
              onClick={pdfSinavAnalizIndir}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-sky-600 text-white hover:bg-sky-700 transition-all hover:scale-105 shadow-lg flex items-center gap-2 shrink-0"
            >
              <span>📊</span>
              <span>Tek Sınav Analiz Karnesi İndir (PDF)</span>
            </button>
          </div>

          <div className="glass-card rounded-2xl p-6 overflow-x-auto">
            <h3 className="text-base font-bold text-[var(--foreground)] mb-4">
              📈 Ders Bazlı Soru, Net ve Doğruluk Analizi
            </h3>

            <table className="w-full table-modern">
              <thead>
                <tr>
                  <th className="text-left p-3 rounded-tl-xl text-[var(--foreground)] font-semibold">Ders / Bölüm</th>
                  <th className="text-center p-3 text-[var(--foreground)] font-semibold">Toplam Soru</th>
                  <th className="text-center p-3 text-[var(--foreground)] font-semibold">Doğru</th>
                  <th className="text-center p-3 text-[var(--foreground)] font-semibold">Yanlış</th>
                  <th className="text-center p-3 text-[var(--foreground)] font-semibold">Boş</th>
                  <th className="text-center p-3 text-[var(--foreground)] font-semibold">Net</th>
                  <th className="text-center p-3 rounded-tr-xl text-[var(--foreground)] font-semibold">Başarı %</th>
                </tr>
              </thead>
              <tbody>
                {aktifSinavDersleri.map((d, i) => {
                  const { net, basariYuzdesi } = sinavHesapla(d);
                  return (
                    <tr key={d.id} className="border-b border-[var(--border)]">
                      <td className="p-2.5 font-semibold text-[var(--foreground)]">
                        {d.ders}
                      </td>
                      <td className="p-2.5 text-center font-semibold text-[var(--muted-foreground)]">
                        {d.soruSayisi}
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          value={d.dogru}
                          onChange={(e) => {
                            const guncel = [...aktifSinavDersleri];
                            const dogru = Math.min(d.soruSayisi, Math.max(0, Number(e.target.value)));
                            guncel[i] = {
                              ...guncel[i],
                              dogru,
                              bos: Math.max(0, d.soruSayisi - dogru - guncel[i].yanlis),
                            };
                            setManuelSinavDersleri(guncel);
                          }}
                          className="w-16 px-2 py-1 rounded-lg border border-[var(--border)] bg-transparent text-sm text-center font-bold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                          min="0"
                          max={d.soruSayisi}
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          value={d.yanlis}
                          onChange={(e) => {
                            const guncel = [...aktifSinavDersleri];
                            const yanlis = Math.min(d.soruSayisi - d.dogru, Math.max(0, Number(e.target.value)));
                            guncel[i] = {
                              ...guncel[i],
                              yanlis,
                              bos: Math.max(0, d.soruSayisi - guncel[i].dogru - yanlis),
                            };
                            setManuelSinavDersleri(guncel);
                          }}
                          className="w-16 px-2 py-1 rounded-lg border border-[var(--border)] bg-transparent text-sm text-center font-bold text-red-600 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                          min="0"
                          max={d.soruSayisi}
                        />
                      </td>
                      <td className="p-2.5 text-center font-semibold text-[var(--muted-foreground)]">
                        {d.bos}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="text-base font-black text-sky-600">
                          {net.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                          basariYuzdesi >= 70 ? "badge-success" : basariYuzdesi >= 50 ? "badge-info" : "badge-danger"
                        }`}>
                          %{basariYuzdesi.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. SEÇENEK: OKUL NOTLARI KARNESİ */}
      {/* ========================================================= */}
      {karneTuru === "okul_notlari" && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-card rounded-2xl p-6 overflow-x-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  📑 {seciliOgrenci.ad} {seciliOgrenci.soyad} - Dönem Notları
                </h3>
                <p className="text-xs text-[var(--muted-foreground)]">Karnede yer alacak ders notlarını kontrol edin veya düzenleyin.</p>
              </div>

              <button
                onClick={pdfOkulNotlariIndir}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <span>📄</span>
                <span>Okul Notları Karnesi İndir (PDF)</span>
              </button>
            </div>

            <table className="w-full table-modern">
              <thead>
                <tr>
                  <th className="text-left p-3 rounded-tl-xl text-[var(--foreground)] font-semibold">Ders Adı</th>
                  <th className="text-center p-3 text-[var(--foreground)] font-semibold">1. Sınav</th>
                  <th className="text-center p-3 text-[var(--foreground)] font-semibold">2. Sınav</th>
                  <th className="text-center p-3 text-[var(--foreground)] font-semibold">Performans</th>
                  <th className="text-center p-3 text-[var(--foreground)] font-semibold">Proje</th>
                  <th className="text-center p-3 text-[var(--foreground)] font-semibold">Ortalama</th>
                  <th className="text-center p-3 rounded-tr-xl text-[var(--foreground)] font-semibold">Durum</th>
                </tr>
              </thead>
              <tbody>
                {okulNotlari.map((not, i) => {
                  const ort = okulDersOrtalama(not);
                  return (
                    <tr key={i} className="border-b border-[var(--border)]">
                      <td className="p-2">
                        <input
                          type="text"
                          value={not.ders}
                          onChange={(e) => {
                            const y = [...okulNotlari];
                            y[i].ders = e.target.value;
                            setOkulNotlari(y);
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-[var(--border)] bg-transparent text-sm font-medium text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        />
                      </td>
                      {(["sinav1", "sinav2", "performans", "proje"] as const).map((alan) => (
                        <td key={alan} className="p-2">
                          <input
                            type="number"
                            value={not[alan]}
                            onChange={(e) => {
                              const y = [...okulNotlari];
                              y[i][alan] = e.target.value;
                              setOkulNotlari(y);
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border border-[var(--border)] bg-transparent text-sm text-center font-bold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                            min="0"
                            max="100"
                          />
                        </td>
                      ))}
                      <td className="p-2 text-center">
                        <span className="text-base font-bold text-emerald-600">
                          {ort > 0 ? ort.toFixed(1) : "-"}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${
                          ort >= 50 ? "badge-success" : "badge-danger"
                        }`}>
                          {ort >= 50 ? "Geçti" : "Kaldı"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Genel Sonuç Kartı */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-center sm:text-left">
                <p className="text-sm text-[var(--muted-foreground)]">Dönem Not Ortalaması</p>
                <p className="text-4xl font-extrabold gradient-text mt-1">{okulGenelOrtalama.toFixed(2)}</p>
              </div>

              <div className="text-center sm:text-right">
                <p className="text-sm text-[var(--muted-foreground)]">Karne Belge Durumu</p>
                <p className={`text-xl font-black mt-1 ${okulGenelOrtalama >= 50 ? "text-emerald-500" : "text-red-500"}`}>
                  {okulGenelOrtalama >= 85 ? "🏆 Takdir Belgesi" : okulGenelOrtalama >= 70 ? "🎖️ Teşekkür Belgesi" : okulGenelOrtalama >= 50 ? "✅ Doğrudan Geçti" : "❌ Sınıf Tekrarı"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
