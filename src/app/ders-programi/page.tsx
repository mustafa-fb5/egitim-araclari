"use client";

import { useState, useEffect } from "react";
import {
  gunler,
  dersSaatleri as varsayilanDersSaatleri,
  dersler as varsayilanDersler,
  sinifNumaralari,
  subeler,
} from "@/lib/data";
import { usePersistentState } from "@/lib/use-persistent-state";
import {
  saveDersProgrami,
  subscribeDersProgrami,
  subscribeDersSaatleri,
  saveDersSaatleri,
  subscribeDersler,
  saveDersler,
  type DersBilgisi,
} from "@/lib/firestore-service";

type DersProgrami = Record<string, Record<string, string>>;

const getEmptyProgram = (saatler: string[]): DersProgrami => {
  const init: DersProgrami = {};
  gunler.forEach((gun) => {
    init[gun] = {};
    saatler.forEach((saat) => {
      init[gun][saat] = "";
    });
  });
  return init;
};

// Renk paleti hazır seçenekleri
const RENK_PALETI = [
  "#3B82F6", // Mavi
  "#8B5CF6", // Mor
  "#06B6D4", // Camgöbeği
  "#F59E0B", // Kehribar
  "#10B981", // Zümrüt Yeşili
  "#EF4444", // Kırmızı
  "#EC4899", // Pembe
  "#F97316", // Turuncu
  "#14B8A6", // Turkuaz
  "#6366F1", // İndigo
  "#84CC16", // Limon Yeşili
  "#E11D48", // Gül Kurusu
  "#0284C7", // Gökyüzü
  "#7C3AED", // Menekşe
];

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

export default function DersProgramiPage() {
  const [dersSaatleri, setDersSaatleri] = useState<string[]>(varsayilanDersSaatleri);
  const [dersListesi, setDersListesi] = useState<DersBilgisi[]>(varsayilanDersler);

  // Firestore'dan canlı ders saatlerini çek
  useEffect(() => {
    const unsubSaatler = subscribeDersSaatleri((guncelSaatler) => {
      if (guncelSaatler && guncelSaatler.length > 0) {
        setDersSaatleri(guncelSaatler);
      }
    });
    const unsubDersler = subscribeDersler((guncelDersler) => {
      if (guncelDersler && guncelDersler.length > 0) {
        setDersListesi(guncelDersler);
      }
    });
    return () => {
      unsubSaatler();
      unsubDersler();
    };
  }, []);

  const [program, setProgram] = useState<DersProgrami>(() => {
    const init = getEmptyProgram(varsayilanDersSaatleri);
    init["Pazartesi"]["08:30 - 09:10"] = "Türkçe";
    init["Pazartesi"]["09:20 - 10:00"] = "Türkçe";
    init["Pazartesi"]["10:10 - 10:50"] = "Matematik";
    init["Pazartesi"]["11:00 - 11:40"] = "Fen Bilimleri";
    init["Pazartesi"]["12:30 - 13:10"] = "İngilizce";
    return init;
  });

  const [secilenSinif, setSecilenSinif] = usePersistentState("egitim_ders_programi_sinif", "5");
  const [secilenSube, setSecilenSube] = usePersistentState("egitim_ders_programi_sube", "A");

  // Saat düzenleme modal state'leri
  const [saatModalAcik, setSaatModalAcik] = useState(false);
  const [geciciSaatler, setGeciciSaatler] = useState<string[]>(varsayilanDersSaatleri);

  // Ders düzenleme modal state'leri
  const [dersModalAcik, setDersModalAcik] = useState(false);
  const [yeniDersAdi, setYeniDersAdi] = useState("");
  const [yeniDersRenk, setYeniDersRenk] = useState("#3B82F6");

  const saatDuzenleModalAc = () => {
    setGeciciSaatler([...dersSaatleri]);
    setSaatModalAcik(true);
  };

  const saatDegistir = (index: number, yeniDeger: string) => {
    const yeni = [...geciciSaatler];
    yeni[index] = yeniDeger;
    setGeciciSaatler(yeni);
  };

  const saatEkle = () => {
    const sonSaat = geciciSaatler[geciciSaatler.length - 1];
    let yeniSaat = "16:00 - 16:40";
    if (sonSaat && sonSaat.includes("-")) {
      const parts = sonSaat.split("-").map((s) => s.trim());
      if (parts.length === 2) {
        const [basH, basM] = parts[1].split(":").map(Number);
        if (!isNaN(basH) && !isNaN(basM)) {
          const yeniBasDakika = basH * 60 + basM + 10;
          const yeniBitDakika = yeniBasDakika + 40;
          const fmt = (dk: number) => {
            const h = Math.floor(dk / 60) % 24;
            const m = dk % 60;
            return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
          };
          yeniSaat = `${fmt(yeniBasDakika)} - ${fmt(yeniBitDakika)}`;
        }
      }
    }
    setGeciciSaatler([...geciciSaatler, yeniSaat]);
  };

  const saatSil = (index: number) => {
    if (geciciSaatler.length <= 1) {
      alert("En az 1 ders saati bulunmalıdır.");
      return;
    }
    setGeciciSaatler(geciciSaatler.filter((_, i) => i !== index));
  };

  const saatleriVarsayilanaDondur = () => {
    setGeciciSaatler([...varsayilanDersSaatleri]);
  };

  const saatleriKaydet = async () => {
    const filtrelenmis = geciciSaatler.map((s) => s.trim()).filter(Boolean);
    if (filtrelenmis.length === 0) {
      alert("Lütfen en az bir geçerli ders saati girin.");
      return;
    }

    const yeniProgram: DersProgrami = {};
    gunler.forEach((gun) => {
      yeniProgram[gun] = {};
      filtrelenmis.forEach((yeniSaat, idx) => {
        const eskiSaat = dersSaatleri[idx];
        yeniProgram[gun][yeniSaat] = eskiSaat ? (program[gun]?.[eskiSaat] || "") : "";
      });
    });

    setDersSaatleri(filtrelenmis);
    setProgram(yeniProgram);
    setSaatModalAcik(false);

    await saveDersSaatleri(filtrelenmis);
    await saveDersProgrami(secilenSinif, secilenSube, yeniProgram);
  };

  // Ders ekleme
  const dersEkle = async () => {
    const isim = yeniDersAdi.trim();
    if (!isim) return;
    if (dersListesi.some((d) => d.ad.toLowerCase() === isim.toLowerCase())) {
      alert("Bu ders adı zaten mevcut!");
      return;
    }
    const guncel = [...dersListesi, { ad: isim, renk: yeniDersRenk }];
    setDersListesi(guncel);
    setYeniDersAdi("");
    await saveDersler(guncel);
  };

  // Ders silme
  const dersSil = async (dersAdi: string) => {
    if (!confirm(`"${dersAdi}" dersini listeden silmek istediğinize emin misiniz?`)) return;
    const guncel = dersListesi.filter((d) => d.ad !== dersAdi);
    setDersListesi(guncel);
    await saveDersler(guncel);
  };

  // Dersleri varsayılana sıfırla
  const dersleriVarsayilanaDondur = async () => {
    if (!confirm("Tüm dersleri ilk varsayılan listeye sıfırlamak istediğinize emin misiniz?")) return;
    setDersListesi(varsayilanDersler);
    await saveDersler(varsayilanDersler);
  };

  // Sınıf veya şube değiştiğinde Firestore'dan ders programını canlı getir
  useEffect(() => {
    const unsub = subscribeDersProgrami(secilenSinif, secilenSube, (kayitli) => {
      if (kayitli) {
        setProgram(kayitli);
      }
    });
    return () => unsub();
  }, [secilenSinif, secilenSube]);

  const dersRenk = (dersAdi: string): string => {
    const ders = dersListesi.find((d) => d.ad === dersAdi);
    return ders?.renk || "#94a3b8";
  };

  const dersGuncelle = async (gun: string, saat: string, dersAdi: string) => {
    const guncel = {
      ...program,
      [gun]: { ...program[gun], [saat]: dersAdi },
    };
    setProgram(guncel);
    await saveDersProgrami(secilenSinif, secilenSube, guncel);
  };

  const temizle = async () => {
    if (confirm("Bu sınıfın haftalık ders programını temizlemek istediğinize emin misiniz?")) {
      const bos = getEmptyProgram(dersSaatleri);
      setProgram(bos);
      await saveDersProgrami(secilenSinif, secilenSube, bos);
    }
  };

  // Doğrudan PDF İndirme (jsPDF Landscape Formatı)
  const pdfIndir = async () => {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Başlık
    doc.setFillColor(79, 70, 229);
    doc.rect(14, 10, 269, 7, "F");

    doc.setFontSize(16);
    doc.setTextColor(30, 27, 75);
    doc.text(`${secilenSinif}-${secilenSube} SINIFI HAFTALIK DERS PROGRAMI`, 148, 24, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("2026-2027 Egitim Ogretim Yili", 148, 30, { align: "center" });

    // Tablo Verisi Hazırlama
    const tableData = dersSaatleri.map((saat, si) => {
      const row = [`${si + 1}. Ders\n${saat}`];
      gunler.forEach((gun) => {
        const ders = program[gun]?.[saat] || "-";
        row.push(trToEn(ders));
      });
      return row;
    });

    const headRow = ["Ders Saati", ...gunler.map((g) => trToEn(g).toUpperCase())];

    autoTable(doc, {
      startY: 36,
      head: [headRow],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontSize: 10,
        halign: "center",
        cellPadding: 3,
      },
      styles: {
        fontSize: 9,
        halign: "center",
        valign: "middle",
        cellPadding: 4,
      },
      columnStyles: {
        0: { halign: "center", fontStyle: "bold", cellWidth: 35, fillColor: [245, 245, 255] },
        1: { cellWidth: 46 },
        2: { cellWidth: 46 },
        3: { cellWidth: 46 },
        4: { cellWidth: 46 },
        5: { cellWidth: 46 },
      },
      alternateRowStyles: {
        fillColor: [250, 252, 255],
      },
    });

    const docWithAutoTable = doc as unknown as { lastAutoTable?: { finalY?: number } };
    const finalY = docWithAutoTable.lastAutoTable?.finalY || 170;

    // Alt Bilgi
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Egitim Araclari Ogretmen Paneli tarafindan olusturulmustur.", 14, finalY + 10);
    doc.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`, 280, finalY + 10, { align: "right" });

    doc.save(`ders_programi_${secilenSinif}_${secilenSube}.pdf`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Kontroller (Baskıda Gizlenir) */}
      <div className="glass-card rounded-2xl p-6 no-print">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Sınıf</label>
              <select
                value={secilenSinif}
                onChange={(e) => setSecilenSinif(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-semibold"
              >
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
                className="px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-semibold"
              >
                {subeler.map((s) => (
                  <option key={s} value={s}>{s} Şubesi</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDersModalAcik(true)}
              className="px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>📚</span>
              <span>Dersleri Düzenle ({dersListesi.length} Ders)</span>
            </button>
            <button
              onClick={saatDuzenleModalAc}
              className="px-4 py-2.5 rounded-xl text-sm font-bold bg-violet-600/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 hover:bg-violet-600 hover:text-white transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>⏰</span>
              <span>Saatleri Düzenle ({dersSaatleri.length} Ders)</span>
            </button>
            <button
              onClick={temizle}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--secondary)] text-[var(--foreground)] hover:bg-red-500 hover:text-white transition-all shadow-sm"
            >
              🗑️ Temizle
            </button>
            <button
              onClick={pdfIndir}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2"
            >
              <span>📄</span>
              <span>PDF İndir</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[var(--primary)] text-white hover:opacity-90 transition-all shadow-md flex items-center gap-2"
            >
              <span>🖨️</span>
              <span>Yazdır</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ders Renkleri Legenda (Baskıda Gizlenir) */}
      <div className="glass-card rounded-2xl p-4 no-print">
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <span className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wide">
            🎨 Ders Listesi & Renkler
          </span>
          <button
            onClick={() => setDersModalAcik(true)}
            className="text-xs font-bold text-emerald-600 hover:underline"
          >
            + Yeni Ders Ekle / Sil
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {dersListesi.map((ders) => (
            <div key={ders.ad} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--secondary)]">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ders.renk }} />
              <span className="text-xs font-medium text-[var(--foreground)]">{ders.ad}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Yazdırma Başlığı (Sadece Baskıda / Print Preview'da Görünür) */}
      <div className="hidden print:block text-center mb-6 pb-3 border-b-2 border-slate-300">
        <h1 className="text-2xl font-black text-slate-900 uppercase">
          {secilenSinif}-{secilenSube} Sınıfı Haftalık Ders Programı
        </h1>
        <p className="text-sm text-slate-600 mt-1 font-semibold">
          2026-2027 Eğitim Öğretim Yılı
        </p>
      </div>

      {/* Ders Programı Tablosu */}
      <div className="glass-card rounded-2xl p-6 overflow-x-auto print:border-0 print:p-0">
        <h3 className="text-base font-bold text-[var(--foreground)] mb-4 print:hidden">
          📅 {secilenSinif}-{secilenSube} Sınıfı - Haftalık Ders Programı
        </h3>
        <table className="w-full table-modern print:border-collapse">
          <thead>
            <tr>
              <th className="text-left p-3 rounded-tl-xl w-36 font-bold print:bg-slate-100 print:text-black print:text-center">
                Ders Saati
              </th>
              {gunler.map((gun, i) => (
                <th 
                  key={gun} 
                  className={`text-center p-3 font-bold print:bg-slate-100 print:text-black ${i === gunler.length - 1 ? "rounded-tr-xl" : ""}`}
                >
                  {gun}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dersSaatleri.map((saat, si) => (
              <tr key={saat} className="border-b border-[var(--border)]">
                <td className="p-2 text-center">
                  <div className="text-xs font-bold text-[var(--foreground)] print:text-black">{si + 1}. Ders</div>
                  <div className="text-xs text-[var(--muted-foreground)] print:text-slate-600">{saat}</div>
                </td>
                {gunler.map((gun) => {
                  const dersAdi = program[gun]?.[saat] || "";
                  return (
                    <td key={gun} className="p-1.5 text-center">
                      {/* Ekranda Etkileşimli Select Kutusu */}
                      <select
                        value={dersAdi}
                        onChange={(e) => dersGuncelle(gun, saat, e.target.value)}
                        className="w-full px-2 py-2.5 rounded-lg text-xs font-semibold border-0 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all cursor-pointer print:hidden"
                        style={{
                          backgroundColor: dersAdi ? `${dersRenk(dersAdi)}20` : "var(--secondary)",
                          color: dersAdi ? dersRenk(dersAdi) : "var(--muted-foreground)",
                          borderLeft: dersAdi ? `3px solid ${dersRenk(dersAdi)}` : "3px solid transparent",
                        }}
                      >
                        <option value="">—</option>
                        {dersListesi.map((d) => (
                          <option key={d.ad} value={d.ad}>{d.ad}</option>
                        ))}
                      </select>

                      {/* Yazdırmada / Baskı Önizlemede Görünen Net Metin */}
                      <div className="hidden print:block py-2 px-1 text-xs font-bold text-slate-900">
                        {dersAdi || "—"}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DERSLERİ DÜZENLE MODALI (DERS EKLE / ÇIKAR) */}
      {dersModalAcik && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="glass-card rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl border border-[var(--border)] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[var(--foreground)] flex items-center gap-2">
                  <span>📚</span>
                  <span>Dersleri Düzenle (Ekle / Çıkar)</span>
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Ders programında kullanacağınız dersleri ekleyebilir veya silebilirsiniz.
                </p>
              </div>
              <button
                onClick={() => setDersModalAcik(false)}
                className="w-8 h-8 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-500 transition-colors font-bold text-lg"
              >
                ×
              </button>
            </div>

            {/* Yeni Ders Ekleme Formu */}
            <div className="bg-[var(--background)]/80 p-3.5 rounded-2xl border border-[var(--border)] space-y-3">
              <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wide">
                ➕ Yeni Ders Ekle
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={yeniDersAdi}
                  onChange={(e) => setYeniDersAdi(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && dersEkle()}
                  placeholder="örn: Rehberlik, Almanca, Kodlama..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={dersEkle}
                  disabled={!yeniDersAdi.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shrink-0"
                >
                  + Ekle
                </button>
              </div>

              {/* Renk Seçici & Hazır Palet */}
              <div>
                <span className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1.5 block">
                  Ders Rengi:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {RENK_PALETI.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setYeniDersRenk(r)}
                      className={`w-6 h-6 rounded-full transition-transform border-2 ${
                        yeniDersRenk === r ? "scale-125 border-white shadow-md ring-2 ring-emerald-500" : "border-transparent hover:scale-110"
                      }`}
                      style={{ backgroundColor: r }}
                    />
                  ))}
                  <input
                    type="color"
                    value={yeniDersRenk}
                    onChange={(e) => setYeniDersRenk(e.target.value)}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                    title="Özel Renk Seç"
                  />
                </div>
              </div>
            </div>

            {/* Mevcut Dersler Listesi */}
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[40vh] pr-1">
              <span className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wide block mb-1">
                Kayıtlı Dersler ({dersListesi.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {dersListesi.map((d) => (
                  <div
                    key={d.ad}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)]/60"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: d.renk }} />
                      <span className="text-xs font-bold text-[var(--foreground)] truncate">{d.ad}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => dersSil(d.ad)}
                      className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center font-bold text-xs shrink-0"
                      title="Dersi Sil"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Alt Butonları */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={dersleriVarsayilanaDondur}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--secondary)] transition-all"
                title="Tüm dersleri standart MEB ders listesine sıfırla"
              >
                🔄 Varsayılana Sıfırla
              </button>

              <button
                type="button"
                onClick={() => setDersModalAcik(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md"
              >
                Tamamla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DERS SAATLERİNİ DÜZENLE MODALI */}
      {saatModalAcik && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="glass-card rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl border border-[var(--border)] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[var(--foreground)] flex items-center gap-2">
                  <span>⏰</span>
                  <span>Ders Saatlerini Düzenle</span>
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Ders saat aralıklarını değiştirebilir, yeni ders ekleyip silebilirsiniz.
                </p>
              </div>
              <button
                onClick={() => setSaatModalAcik(false)}
                className="w-8 h-8 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-500 transition-colors font-bold text-lg"
              >
                ×
              </button>
            </div>

            {/* Saat Listesi */}
            <div className="space-y-2.5 overflow-y-auto flex-1 pr-1 max-h-[55vh]">
              {geciciSaatler.map((saat, index) => (
                <div key={index} className="flex items-center gap-2 bg-[var(--background)]/70 p-2.5 rounded-xl border border-[var(--border)]">
                  <span className="w-16 text-xs font-black text-indigo-600 dark:text-indigo-400 shrink-0">
                    {index + 1}. Ders:
                  </span>
                  <input
                    type="text"
                    value={saat}
                    onChange={(e) => saatDegistir(index, e.target.value)}
                    placeholder="08:30 - 09:10"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => saatSil(index)}
                    className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center font-bold text-xs shrink-0"
                    title="Bu ders saatini sil"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>

            {/* Butonlar */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border)]">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saatEkle}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1"
                >
                  <span>➕</span>
                  <span>Ders Saati Ekle</span>
                </button>
                <button
                  type="button"
                  onClick={saatleriVarsayilanaDondur}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--secondary)] transition-all"
                  title="İlk varsayılan 8 ders saatine sıfırla"
                >
                  🔄 Sıfırla
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSaatModalAcik(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--secondary)] transition-all"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={saatleriKaydet}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md"
                >
                  ✅ Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


