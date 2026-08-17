"use client";

import { useState } from "react";

interface DersSatiri {
  id: number;
  ders: string;
  sinav1: string;
  sinav2: string;
  sinav3: string;
  odev: string;
  performans: string;
}

const harfNotuHesapla = (ortalama: number): string => {
  if (ortalama >= 90) return "AA";
  if (ortalama >= 85) return "BA";
  if (ortalama >= 80) return "BB";
  if (ortalama >= 75) return "CB";
  if (ortalama >= 70) return "CC";
  if (ortalama >= 65) return "DC";
  if (ortalama >= 60) return "DD";
  if (ortalama >= 55) return "FD";
  return "FF";
};

const harfNotuRenk = (harf: string): string => {
  if (["AA", "BA"].includes(harf)) return "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30";
  if (["BB", "CB"].includes(harf)) return "text-blue-600 bg-blue-50 dark:bg-blue-900/30";
  if (["CC", "DC"].includes(harf)) return "text-amber-600 bg-amber-50 dark:bg-amber-900/30";
  return "text-red-600 bg-red-50 dark:bg-red-900/30";
};

export default function OrtalamaHesaplamaPage() {
  const [satirlar, setSatirlar] = useState<DersSatiri[]>([
    { id: 1, ders: "Türkçe", sinav1: "85", sinav2: "78", sinav3: "", odev: "90", performans: "85" },
    { id: 2, ders: "Matematik", sinav1: "92", sinav2: "88", sinav3: "", odev: "95", performans: "90" },
    { id: 3, ders: "Fen Bilimleri", sinav1: "75", sinav2: "82", sinav3: "", odev: "80", performans: "78" },
  ]);

  const [agirliklar, setAgirliklar] = useState({
    sinav: 60,
    odev: 20,
    performans: 20,
  });

  const satirEkle = () => {
    const yeniId = Math.max(...satirlar.map((s) => s.id), 0) + 1;
    setSatirlar([...satirlar, { id: yeniId, ders: "", sinav1: "", sinav2: "", sinav3: "", odev: "", performans: "" }]);
  };

  const satirSil = (id: number) => {
    if (satirlar.length > 1) {
      setSatirlar(satirlar.filter((s) => s.id !== id));
    }
  };

  const guncelle = (id: number, alan: keyof DersSatiri, deger: string) => {
    setSatirlar(satirlar.map((s) => (s.id === id ? { ...s, [alan]: deger } : s)));
  };

  const ortalamaHesapla = (satir: DersSatiri): number => {
    const sinavlar = [satir.sinav1, satir.sinav2, satir.sinav3].filter((s) => s !== "").map(Number);
    const sinavOrt = sinavlar.length > 0 ? sinavlar.reduce((a, b) => a + b, 0) / sinavlar.length : 0;
    const odev = satir.odev ? Number(satir.odev) : 0;
    const perf = satir.performans ? Number(satir.performans) : 0;

    return (sinavOrt * agirliklar.sinav + odev * agirliklar.odev + perf * agirliklar.performans) / 100;
  };

  const genelOrtalama = satirlar.length > 0
    ? satirlar.reduce((acc, s) => acc + ortalamaHesapla(s), 0) / satirlar.length
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Ağırlık Ayarları */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-base font-bold text-[var(--foreground)] mb-4">⚙️ Ağırlık Ayarları</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Sınav Ağırlığı (%)", key: "sinav" as const },
            { label: "Ödev Ağırlığı (%)", key: "odev" as const },
            { label: "Performans Ağırlığı (%)", key: "performans" as const },
          ].map((item) => (
            <div key={item.key}>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">{item.label}</label>
              <input
                type="number"
                value={agirliklar[item.key]}
                onChange={(e) => setAgirliklar({ ...agirliklar, [item.key]: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
                min="0"
                max="100"
              />
            </div>
          ))}
        </div>
        {agirliklar.sinav + agirliklar.odev + agirliklar.performans !== 100 && (
          <p className="text-sm text-red-500 mt-2">⚠️ Ağırlıkların toplamı 100 olmalıdır (Şu an: {agirliklar.sinav + agirliklar.odev + agirliklar.performans})</p>
        )}
      </div>

      {/* Not Tablosu */}
      <div className="glass-card rounded-2xl p-6 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[var(--foreground)]">📝 Not Girişi</h3>
          <button
            onClick={satirEkle}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-all hover:scale-105 shadow-md"
          >
            + Ders Ekle
          </button>
        </div>

        <table className="w-full table-modern">
          <thead>
            <tr>
              <th className="text-left p-3 rounded-tl-xl">Ders</th>
              <th className="text-center p-3">1. Sınav</th>
              <th className="text-center p-3">2. Sınav</th>
              <th className="text-center p-3">3. Sınav</th>
              <th className="text-center p-3">Ödev</th>
              <th className="text-center p-3">Performans</th>
              <th className="text-center p-3">Ortalama</th>
              <th className="text-center p-3">Harf</th>
              <th className="text-center p-3 rounded-tr-xl">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.map((satir) => {
              const ort = ortalamaHesapla(satir);
              const harf = harfNotuHesapla(ort);
              return (
                <tr key={satir.id} className="border-b border-[var(--border)]">
                  <td className="p-2">
                    <input
                      type="text"
                      value={satir.ders}
                      onChange={(e) => guncelle(satir.id, "ders", e.target.value)}
                      placeholder="Ders adı"
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    />
                  </td>
                  {(["sinav1", "sinav2", "sinav3", "odev", "performans"] as const).map((alan) => (
                    <td key={alan} className="p-2">
                      <input
                        type="number"
                        value={satir[alan]}
                        onChange={(e) => guncelle(satir.id, alan, e.target.value)}
                        placeholder="-"
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
                    <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${harfNotuRenk(harf)}`}>
                      {harf}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => satirSil(satir.id)}
                      className="text-red-400 hover:text-red-600 transition-colors p-1"
                      title="Sil"
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

      {/* Genel Ortalama */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">Genel Not Ortalaması</p>
            <p className="text-4xl font-extrabold gradient-text mt-1">{genelOrtalama.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-[var(--muted-foreground)]">Harf Notu</p>
            <p className={`text-3xl font-extrabold mt-1 inline-block px-4 py-2 rounded-xl ${harfNotuRenk(harfNotuHesapla(genelOrtalama))}`}>
              {harfNotuHesapla(genelOrtalama)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-[var(--muted-foreground)]">Durum</p>
            <p className={`text-lg font-bold mt-1 ${genelOrtalama >= 60 ? "text-emerald-500" : "text-red-500"}`}>
              {genelOrtalama >= 60 ? "✅ Başarılı" : "❌ Başarısız"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
