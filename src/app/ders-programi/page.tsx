"use client";

import { useState, useEffect } from "react";
import { gunler, dersSaatleri, dersler, sinifNumaralari, subeler } from "@/lib/data";
import { usePersistentState } from "@/lib/use-persistent-state";
import { fetchDersProgrami, saveDersProgrami } from "@/lib/firestore-service";

type DersProgrami = Record<string, Record<string, string>>;

const getEmptyProgram = (): DersProgrami => {
  const init: DersProgrami = {};
  gunler.forEach((gun) => {
    init[gun] = {};
    dersSaatleri.forEach((saat) => {
      init[gun][saat] = "";
    });
  });
  return init;
};

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
  const [program, setProgram] = useState<DersProgrami>(() => {
    const init = getEmptyProgram();
    init["Pazartesi"]["08:30 - 09:10"] = "Türkçe";
    init["Pazartesi"]["09:20 - 10:00"] = "Türkçe";
    init["Pazartesi"]["10:10 - 10:50"] = "Matematik";
    init["Pazartesi"]["11:00 - 11:40"] = "Fen Bilimleri";
    init["Pazartesi"]["12:30 - 13:10"] = "İngilizce";
    return init;
  });

  const [secilenSinif, setSecilenSinif] = usePersistentState("egitim_ders_programi_sinif", "5");
  const [secilenSube, setSecilenSube] = usePersistentState("egitim_ders_programi_sube", "A");

  // Sınıf veya şube değiştiğinde Firestore'dan ders programını getir
  useEffect(() => {
    fetchDersProgrami(secilenSinif, secilenSube).then((kayitli) => {
      if (kayitli) {
        setProgram(kayitli);
      }
    });
  }, [secilenSinif, secilenSube]);

  const dersRenk = (dersAdi: string): string => {
    const ders = dersler.find((d) => d.ad === dersAdi);
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
      const bos = getEmptyProgram();
      setProgram(bos);
      await saveDersProgrami(secilenSinif, secilenSube, bos);
    }
  };

  // Doğrudan PDF İndirme (jsPDF Landscape Formatı)
  const pdfIndir = async () => {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    // Yatay A4 formatı (Landscape)
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
        <div className="flex flex-wrap gap-2">
          {dersler.map((ders) => (
            <div key={ders.ad} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--secondary)]">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ders.renk }} />
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
                        {dersler.map((d) => (
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
    </div>
  );
}
