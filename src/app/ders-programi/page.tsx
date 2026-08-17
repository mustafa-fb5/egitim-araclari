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
    const bos = getEmptyProgram();
    setProgram(bos);
    await saveDersProgrami(secilenSinif, secilenSube, bos);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Kontroller */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Sınıf</label>
              <select
                value={secilenSinif}
                onChange={(e) => setSecilenSinif(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
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
                className="px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                {subeler.map((s) => (
                  <option key={s} value={s}>{s} Şubesi</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={temizle}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--secondary)] text-[var(--foreground)] hover:bg-red-500 hover:text-white transition-all"
            >
              🗑️ Temizle
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-all shadow-md"
            >
              🖨️ Yazdır
            </button>
          </div>
        </div>
      </div>

      {/* Ders Renkleri Legenda */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-wrap gap-2">
          {dersler.map((ders) => (
            <div key={ders.ad} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--secondary)]">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ders.renk }} />
              <span className="text-xs font-medium text-[var(--foreground)]">{ders.ad}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ders Programı Tablosu */}
      <div className="glass-card rounded-2xl p-6 overflow-x-auto">
        <h3 className="text-base font-bold text-[var(--foreground)] mb-4">📅 {secilenSinif}-{secilenSube} Sınıfı - Haftalık Ders Programı</h3>
        <table className="w-full table-modern">
          <thead>
            <tr>
              <th className="text-left p-3 rounded-tl-xl w-36">Saat</th>
              {gunler.map((gun, i) => (
                <th key={gun} className={`text-center p-3 ${i === gunler.length - 1 ? "rounded-tr-xl" : ""}`}>
                  {gun}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dersSaatleri.map((saat, si) => (
              <tr key={saat} className="border-b border-[var(--border)]">
                <td className="p-2">
                  <div className="text-xs font-medium text-[var(--muted-foreground)]">{si + 1}. Ders</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{saat}</div>
                </td>
                {gunler.map((gun) => {
                  const dersAdi = program[gun]?.[saat] || "";
                  return (
                    <td key={gun} className="p-1.5">
                      <select
                        value={dersAdi}
                        onChange={(e) => dersGuncelle(gun, saat, e.target.value)}
                        className="w-full px-2 py-2.5 rounded-lg text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all cursor-pointer"
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
