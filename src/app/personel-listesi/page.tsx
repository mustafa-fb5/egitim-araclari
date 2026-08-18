"use client";

import { useState, useEffect, useMemo } from "react";
import { demoPersoneller, type Personel } from "@/lib/data";
import {
  subscribePersoneller,
  savePersonel,
  deletePersonel as deletePersonelFromDb,
} from "@/lib/firestore-service";

const ONERILEN_BRANSLAR = [
  "Türkçe",
  "Matematik",
  "Fen Bilimleri",
  "Sosyal Bilgiler",
  "İngilizce",
  "Din Kültürü",
  "Müdür",
  "Müdür Yardımcısı",
  "Rehberlik",
  "Beden Eğitimi",
  "Bilişim Teknolojileri",
  "Görsel Sanatlar",
  "Müzik",
  "Teknoloji ve Tasarım",
  "Sınıf Öğretmeni",
  "Özel Eğitim",
  "İdari Personel",
  "Destek Personeli",
];

// Türkçe karakterleri PDF için güvenli formata çevirme
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

export default function PersonelListesiPage() {
  const [personeller, setPersoneller] = useState<Personel[]>(demoPersoneller);
  const [aramaMetni, setAramaMetni] = useState("");
  const [secilenBrans, setSecilenBrans] = useState("Tümü");
  const [gorunum, setGorunum] = useState<"tablo" | "kart">("tablo");
  const [yukleniyor, setYukleniyor] = useState(true);

  // Ekleme / Düzenleme Modal State'leri
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenlenecekPersonel, setDuzenlenecekPersonel] = useState<Personel | null>(null);

  // Form State'i
  const [formAdSoyad, setFormAdSoyad] = useState("");
  const [formTelefon, setFormTelefon] = useState("");
  const [formBrans, setFormBrans] = useState("");

  // Firestore Canlı Senkronizasyon
  useEffect(() => {
    const unsubscribe = subscribePersoneller((data) => {
      if (data && data.length > 0) {
        setPersoneller(data);
      } else {
        setPersoneller(demoPersoneller);
      }
      setYukleniyor(false);
    });
    return () => unsubscribe();
  }, []);

  // Mevcut benzersiz branşlar
  const mevcutBranslar = useMemo(() => {
    const set = new Set<string>();
    personeller.forEach((p) => {
      if (p.brans && p.brans.trim()) set.add(p.brans.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "tr"));
  }, [personeller]);

  // Filtrelenmiş liste
  const filtrelenmisPersoneller = useMemo(() => {
    return personeller.filter((p) => {
      const bransUygun = secilenBrans === "Tümü" || p.brans === secilenBrans;
      const arama = aramaMetni.toLowerCase().trim();
      const aramaUygun =
        arama === "" ||
        p.adSoyad.toLowerCase().includes(arama) ||
        p.telefon.toLowerCase().includes(arama) ||
        p.brans.toLowerCase().includes(arama);
      return bransUygun && aramaUygun;
    });
  }, [personeller, secilenBrans, aramaMetni]);

  // Yeni personel ekleme modalını aç
  const yeniEkleModalAc = () => {
    setDuzenlenecekPersonel(null);
    setFormAdSoyad("");
    setFormTelefon("");
    setFormBrans("");
    setModalAcik(true);
  };

  // Düzenleme modalını aç
  const duzenleModalAc = (p: Personel) => {
    setDuzenlenecekPersonel(p);
    setFormAdSoyad(p.adSoyad);
    setFormTelefon(p.telefon);
    setFormBrans(p.brans);
    setModalAcik(true);
  };

  // Kaydet (Ekle veya Güncelle)
  const formuKaydet = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formAdSoyad.trim()) {
      alert("Lütfen personelin adını ve soyadını giriniz.");
      return;
    }

    if (duzenlenecekPersonel) {
      // Güncelleme
      const guncel: Personel = {
        ...duzenlenecekPersonel,
        adSoyad: formAdSoyad.trim(),
        telefon: formTelefon.trim(),
        brans: formBrans.trim() || "Öğretmen",
      };
      const yeniListe = personeller.map((p) => (p.id === guncel.id ? guncel : p));
      setPersoneller(yeniListe);
      setModalAcik(false);
      await savePersonel(guncel);
    } else {
      // Yeni Ekleme
      const yeniId =
        personeller.length > 0 ? Math.max(...personeller.map((p) => p.id), 0) + 1 : 1;
      const yeni: Personel = {
        id: yeniId,
        adSoyad: formAdSoyad.trim(),
        telefon: formTelefon.trim(),
        brans: formBrans.trim() || "Öğretmen",
      };
      const yeniListe = [...personeller, yeni];
      setPersoneller(yeniListe);
      setModalAcik(false);
      await savePersonel(yeni);
    }
  };

  // Sil
  const personelSil = async (p: Personel) => {
    if (!confirm(`"${p.adSoyad}" isimli personeli silmek istediğinize emin misiniz?`)) return;
    const yeniListe = personeller.filter((item) => item.id !== p.id);
    setPersoneller(yeniListe);
    await deletePersonelFromDb(p.id);
  };

  // Telefon numarasını WhatsApp formatına temizleme
  const getWhatsAppLink = (tel: string) => {
    const digits = tel.replace(/\D/g, "");
    if (!digits) return "#";
    const clean = digits.startsWith("0") ? digits.substring(1) : digits;
    return `https://wa.me/90${clean}`;
  };

  // PDF İndir
  const pdfIndir = async () => {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Başlık
    doc.setFillColor(79, 70, 229);
    doc.rect(14, 10, 182, 6, "F");

    doc.setFontSize(16);
    doc.setTextColor(30, 27, 75);
    doc.text("OKUL PERSONEL VE OGRETMEN LISTESI", 105, 24, { align: "center" });

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Toplam ${filtrelenmisPersoneller.length} Personel | Tarih: ${new Date().toLocaleDateString("tr-TR")}`, 105, 30, { align: "center" });

    const tableData = filtrelenmisPersoneller.map((p, idx) => [
      idx + 1,
      trToEn(p.adSoyad),
      trToEn(p.brans || "-"),
      p.telefon || "-",
    ]);

    autoTable(doc, {
      startY: 35,
      head: [["#", "Ad Soyad", "Brans / Gorev", "Telefon"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontSize: 10,
        halign: "center",
      },
      styles: {
        fontSize: 9,
        cellPadding: 3.5,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 12 },
        1: { fontStyle: "bold", cellWidth: 65 },
        2: { cellWidth: 55 },
        3: { halign: "center", cellWidth: 50 },
      },
      alternateRowStyles: {
        fillColor: [250, 252, 255],
      },
    });

    doc.save("personel_listesi.pdf");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Üst Başlık & Butonlar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black gradient-text flex items-center gap-2">
            <span>👥</span>
            <span>Personel Listesi</span>
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Öğretmen ve okul personellerinin ad, telefon ve branş bilgilerini yönetin, hızlı iletişim sağlayın.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={yeniEkleModalAc}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md flex items-center gap-1.5"
          >
            <span>➕</span>
            <span>Yeni Personel Ekle</span>
          </button>

          <button
            onClick={pdfIndir}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-white transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>📄</span>
            <span>PDF İndir</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-white transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>🖨️</span>
            <span>Yazdır</span>
          </button>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Toplam Personel",
            value: `${personeller.length} Kişi`,
            icon: "👥",
            cls: "text-indigo-600 dark:text-indigo-400",
            bg: "bg-indigo-500/15",
          },
          {
            label: "Farklı Branş",
            value: `${mevcutBranslar.length} Branş`,
            icon: "📚",
            cls: "text-violet-600 dark:text-violet-400",
            bg: "bg-violet-500/15",
          },
          {
            label: "Telefonu Kayıtlı",
            value: `${personeller.filter((p) => p.telefon && p.telefon.trim()).length} Kişi`,
            icon: "📞",
            cls: "text-emerald-500",
            bg: "bg-emerald-500/15",
          },
          {
            label: "Listelenen",
            value: `${filtrelenmisPersoneller.length} Personel`,
            icon: "🔍",
            cls: "text-amber-500",
            bg: "bg-amber-500/15",
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

      {/* Filtre ve Arama Çubuğu */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">
              🔍 Personel Ara
            </label>
            <input
              type="text"
              value={aramaMetni}
              onChange={(e) => setAramaMetni(e.target.value)}
              placeholder="Ad, soyad, telefon veya branş ile ara..."
              className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">
              📚 Branş Filtresi
            </label>
            <select
              value={secilenBrans}
              onChange={(e) => setSecilenBrans(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Tümü">Tüm Branşlar ({personeller.length})</option>
              {mevcutBranslar.map((b) => (
                <option key={b} value={b}>
                  {b} ({personeller.filter((p) => p.brans === b).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Hızlı Görünüm Değiştirici */}
        <div className="flex items-center justify-between border-t border-[var(--border)] mt-4 pt-3 text-xs">
          <span className="text-[var(--muted-foreground)] font-medium">
            {filtrelenmisPersoneller.length} personel listeleniyor
          </span>
          <div className="flex items-center gap-1 bg-[var(--secondary)] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setGorunum("tablo")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                gorunum === "tablo"
                  ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              📋 Tablo
            </button>
            <button
              type="button"
              onClick={() => setGorunum("kart")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                gorunum === "kart"
                  ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              🗂️ Kart
            </button>
          </div>
        </div>
      </div>

      {/* Yazdırma Başlığı (Sadece Baskıda Görünür) */}
      <div className="hidden print:block text-center mb-6 pb-3 border-b-2 border-slate-300">
        <h1 className="text-2xl font-black text-slate-900 uppercase">
          Okul Personel ve Öğretmen Listesi
        </h1>
        <p className="text-sm text-slate-600 mt-1 font-semibold">
          Toplam: {filtrelenmisPersoneller.length} Personel | Tarih: {new Date().toLocaleDateString("tr-TR")}
        </p>
      </div>

      {/* TABLO GÖRÜNÜMÜ */}
      {gorunum === "tablo" ? (
        <div className="glass-card rounded-2xl p-4 sm:p-6 overflow-x-auto print:border-0 print:p-0">
          <table className="w-full table-modern print:border-collapse">
            <thead>
              <tr>
                <th className="text-left p-3 rounded-tl-xl text-[var(--foreground)] font-bold">#</th>
                <th className="text-left p-3 text-[var(--foreground)] font-bold">Personel Adı Soyadı</th>
                <th className="text-left p-3 text-[var(--foreground)] font-bold">Branş / Görev</th>
                <th className="text-center p-3 text-[var(--foreground)] font-bold">Telefon</th>
                <th className="text-center p-3 rounded-tr-xl text-[var(--foreground)] font-bold no-print">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtrelenmisPersoneller.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-[var(--muted-foreground)] text-sm">
                    {aramaMetni || secilenBrans !== "Tümü"
                      ? "Arama kriterlerine uygun personel bulunamadı."
                      : "Henüz kayıtlı personel bulunmuyor. 'Yeni Personel Ekle' butonuyla ekleyebilirsiniz."}
                  </td>
                </tr>
              ) : (
                filtrelenmisPersoneller.map((p, idx) => (
                  <tr key={p.id} className="border-b border-[var(--border)] hover:bg-[var(--secondary)]/40 transition-colors">
                    <td className="p-3 text-xs font-semibold text-[var(--muted-foreground)]">{idx + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center shrink-0 border border-indigo-500/20">
                          {p.adSoyad.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-sm text-[var(--foreground)]">{p.adSoyad}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                        <span>🏷️</span>
                        <span>{p.brans || "Belirtilmedi"}</span>
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {p.telefon ? (
                        <div className="inline-flex items-center gap-2">
                          <a
                            href={`tel:${p.telefon.replace(/\s+/g, "")}`}
                            className="text-xs font-bold text-[var(--foreground)] hover:text-indigo-600 transition-colors"
                          >
                            📞 {p.telefon}
                          </a>
                          <a
                            href={getWhatsAppLink(p.telefon)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center text-xs font-bold no-print"
                            title="WhatsApp Mesajı Gönder"
                          >
                            💬
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)] italic">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center no-print">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => duzenleModalAc(p)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1"
                        >
                          ✏️ Düzenle
                        </button>
                        <button
                          onClick={() => personelSil(p)}
                          className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center text-xs font-bold"
                          title="Sil"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* KART GÖRÜNÜMÜ */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrelenmisPersoneller.length === 0 ? (
            <div className="col-span-full glass-card rounded-2xl p-10 text-center text-[var(--muted-foreground)]">
              Personel bulunamadı.
            </div>
          ) : (
            filtrelenmisPersoneller.map((p) => (
              <div
                key={p.id}
                className="glass-card rounded-2xl p-4 space-y-3 hover:shadow-lg transition-all border border-[var(--border)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-base flex items-center justify-center shadow-md">
                      {p.adSoyad.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base text-[var(--foreground)] leading-snug">
                        {p.adSoyad}
                      </h4>
                      <span className="inline-block mt-0.5 text-xs font-bold text-violet-600 dark:text-violet-400">
                        {p.brans || "Öğretmen"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => duzenleModalAc(p)}
                      className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center text-xs"
                      title="Düzenle"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => personelSil(p)}
                      className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center text-xs"
                      title="Sil"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                    {p.telefon || "Telefon kayıtlı değil"}
                  </span>
                  {p.telefon && (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${p.telefon.replace(/\s+/g, "")}`}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/15 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1"
                      >
                        📞 Ara
                      </a>
                      <a
                        href={getWhatsAppLink(p.telefon)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-1"
                      >
                        💬 WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* PERSONEL EKLE / DÜZENLE MODALI */}
      {modalAcik && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="glass-card rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl border border-[var(--border)] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[var(--foreground)] flex items-center gap-2">
                  <span>{duzenlenecekPersonel ? "✏️ Personel Düzenle" : "➕ Yeni Personel Ekle"}</span>
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Personelin adı, telefonu ve branş/görev bilgilerini doldurun.
                </p>
              </div>
              <button
                onClick={() => setModalAcik(false)}
                className="w-8 h-8 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-500 transition-colors font-bold text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={formuKaydet} className="space-y-4">
              {/* Adı Soyadı */}
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5 uppercase tracking-wide">
                  Personel Adı Soyadı *
                </label>
                <input
                  type="text"
                  value={formAdSoyad}
                  onChange={(e) => setFormAdSoyad(e.target.value)}
                  placeholder="örn: Ahmet Yılmaz"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Telefon */}
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5 uppercase tracking-wide">
                  Telefon Numarası
                </label>
                <input
                  type="tel"
                  value={formTelefon}
                  onChange={(e) => setFormTelefon(e.target.value)}
                  placeholder="örn: 0532 123 4567"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Branş / Görev */}
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5 uppercase tracking-wide">
                  Branş / Görev
                </label>
                <input
                  type="text"
                  value={formBrans}
                  onChange={(e) => setFormBrans(e.target.value)}
                  placeholder="örn: Matematik, Türkçe, Müdür Yardımcısı..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                {/* Hazır Branş Önerileri */}
                <div className="mt-2.5">
                  <span className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1.5 block">
                    Hızlı Seçim:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {ONERILEN_BRANSLAR.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setFormBrans(b)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          formBrans === b
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-[var(--secondary)] text-[var(--foreground)] hover:bg-indigo-500/20"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Butonlar */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setModalAcik(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--secondary)] transition-all"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md flex items-center gap-1.5"
                >
                  <span>✅</span>
                  <span>{duzenlenecekPersonel ? "Güncellemeyi Kaydet" : "Personel Ekle"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
