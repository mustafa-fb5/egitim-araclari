"use client";

import { useState } from "react";
import { dersler, sinifNumaralari, subeler } from "@/lib/data";
import { usePersistentState } from "@/lib/use-persistent-state";

interface KarneNotu {
  ders: string;
  sinav1: string;
  sinav2: string;
  performans: string;
  proje: string;
}

export default function PdfKarnePage() {
  const [ogrenciBilgi, setOgrenciBilgi] = usePersistentState("egitim_pdf_karne_ogrenci_bilgi", {
    ad: "Ahmet",
    soyad: "Yılmaz",
    sinif: "5",
    sube: "A",
    numara: "101",
    okulAdi: "Atatürk Ortaokulu",
    donem: "2026-2027 / 2. Dönem",
  });

  const [notlar, setNotlar] = useState<KarneNotu[]>(
    dersler.slice(0, 8).map((d) => ({
      ders: d.ad,
      sinav1: String(Math.floor(Math.random() * 40) + 60),
      sinav2: String(Math.floor(Math.random() * 40) + 60),
      performans: String(Math.floor(Math.random() * 30) + 70),
      proje: String(Math.floor(Math.random() * 20) + 80),
    }))
  );

  const notGuncelle = (index: number, alan: keyof KarneNotu, deger: string) => {
    const yeni = [...notlar];
    yeni[index] = { ...yeni[index], [alan]: deger };
    setNotlar(yeni);
  };

  const ortalamaHesapla = (not: KarneNotu): number => {
    const s1 = Number(not.sinav1) || 0;
    const s2 = Number(not.sinav2) || 0;
    const p = Number(not.performans) || 0;
    const pr = Number(not.proje) || 0;
    return (s1 * 0.3 + s2 * 0.3 + p * 0.2 + pr * 0.2);
  };

  const genelOrtalama = notlar.length > 0
    ? notlar.reduce((acc, n) => acc + ortalamaHesapla(n), 0) / notlar.length
    : 0;

  const pdfIndir = async () => {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();

    // Başlık
    doc.setFontSize(18);
    doc.setTextColor(99, 102, 241);
    doc.text(ogrenciBilgi.okulAdi, 105, 20, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("OGRENCI KARNESI", 105, 30, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(ogrenciBilgi.donem, 105, 37, { align: "center" });

    // Öğrenci bilgileri
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Ad Soyad: ${ogrenciBilgi.ad} ${ogrenciBilgi.soyad}`, 20, 50);
    doc.text(`Sinif/Sube: ${ogrenciBilgi.sinif}-${ogrenciBilgi.sube}`, 120, 50);
    doc.text(`Numara: ${ogrenciBilgi.numara}`, 20, 57);

    // Not tablosu
    const tableData = notlar.map((n) => [
      n.ders,
      n.sinav1,
      n.sinav2,
      n.performans,
      n.proje,
      ortalamaHesapla(n).toFixed(1),
      ortalamaHesapla(n) >= 50 ? "Gecti" : "Kaldi",
    ]);

    autoTable(doc, {
      startY: 65,
      head: [["Ders", "1. Sinav", "2. Sinav", "Performans", "Proje", "Ortalama", "Durum"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [99, 102, 241],
        textColor: 255,
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 255],
      },
    });

    // Genel ortalama
    const docWithAutoTable = doc as unknown as { lastAutoTable?: { finalY?: number } };
    const finalY = docWithAutoTable.lastAutoTable?.finalY || 180;
    doc.setFontSize(12);
    doc.setTextColor(99, 102, 241);
    doc.text(`Genel Ortalama: ${genelOrtalama.toFixed(2)}`, 20, finalY + 15);

    // İmza alanı
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Sinif Ogretmeni", 30, finalY + 40);
    doc.text("Okul Muduru", 150, finalY + 40);
    doc.line(20, finalY + 35, 70, finalY + 35);
    doc.line(140, finalY + 35, 190, finalY + 35);

    doc.save(`karne_${ogrenciBilgi.ad}_${ogrenciBilgi.soyad}.pdf`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Öğrenci Bilgileri */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-base font-bold text-[var(--foreground)] mb-4">👨‍🎓 Öğrenci Bilgileri</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Ad</label>
            <input
              type="text"
              value={ogrenciBilgi.ad}
              onChange={(e) => setOgrenciBilgi({ ...ogrenciBilgi, ad: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Soyad</label>
            <input
              type="text"
              value={ogrenciBilgi.soyad}
              onChange={(e) => setOgrenciBilgi({ ...ogrenciBilgi, soyad: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Numara</label>
            <input
              type="text"
              value={ogrenciBilgi.numara}
              onChange={(e) => setOgrenciBilgi({ ...ogrenciBilgi, numara: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Sınıf</label>
            <select
              value={ogrenciBilgi.sinif}
              onChange={(e) => setOgrenciBilgi({ ...ogrenciBilgi, sinif: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              {sinifNumaralari.map((s) => (
                <option key={s} value={s}>{s}. Sınıf</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Şube</label>
            <select
              value={ogrenciBilgi.sube}
              onChange={(e) => setOgrenciBilgi({ ...ogrenciBilgi, sube: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              {subeler.map((s) => (
                <option key={s} value={s}>{s} Şubesi</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Okul Adı</label>
            <input
              type="text"
              value={ogrenciBilgi.okulAdi}
              onChange={(e) => setOgrenciBilgi({ ...ogrenciBilgi, okulAdi: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
        </div>
      </div>

      {/* Not Tablosu */}
      <div className="glass-card rounded-2xl p-6 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[var(--foreground)]">📝 Not Girişi</h3>
          <button
            onClick={pdfIndir}
            className="px-6 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white hover:opacity-90 transition-all hover:scale-105 shadow-lg"
          >
            📄 PDF İndir
          </button>
        </div>

        <table className="w-full table-modern">
          <thead>
            <tr>
              <th className="text-left p-3 rounded-tl-xl">Ders</th>
              <th className="text-center p-3">1. Sınav</th>
              <th className="text-center p-3">2. Sınav</th>
              <th className="text-center p-3">Performans</th>
              <th className="text-center p-3">Proje</th>
              <th className="text-center p-3">Ortalama</th>
              <th className="text-center p-3 rounded-tr-xl">Durum</th>
            </tr>
          </thead>
          <tbody>
            {notlar.map((not, i) => {
              const ort = ortalamaHesapla(not);
              return (
                <tr key={i} className="border-b border-[var(--border)]">
                  <td className="p-2">
                    <span className="font-medium text-sm">{not.ders}</span>
                  </td>
                  {(["sinav1", "sinav2", "performans", "proje"] as const).map((alan) => (
                    <td key={alan} className="p-2">
                      <input
                        type="number"
                        value={not[alan]}
                        onChange={(e) => notGuncelle(i, alan, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        min="0"
                        max="100"
                      />
                    </td>
                  ))}
                  <td className="p-2 text-center">
                    <span className="text-base font-bold text-[var(--primary)]">{ort.toFixed(1)}</span>
                  </td>
                  <td className="p-2 text-center">
                    <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${ort >= 50 ? "badge-success" : "badge-danger"}`}>
                      {ort >= 50 ? "Geçti" : "Kaldı"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Genel Ortalama */}
      <div className="glass-card rounded-2xl p-6 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">Genel Not Ortalaması</p>
        <p className="text-5xl font-extrabold gradient-text mt-2">{genelOrtalama.toFixed(2)}</p>
        <p className={`text-lg font-bold mt-2 ${genelOrtalama >= 50 ? "text-emerald-500" : "text-red-500"}`}>
          {genelOrtalama >= 85 ? "🏆 Pekiyi" : genelOrtalama >= 70 ? "👏 İyi" : genelOrtalama >= 50 ? "👍 Orta" : "📚 Geçmez"}
        </p>
      </div>
    </div>
  );
}
