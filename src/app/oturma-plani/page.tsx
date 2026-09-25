"use client";

import { useState, useEffect, useMemo } from "react";
import { sinifNumaralari, subeler, type Ogrenci } from "@/lib/data";
import { usePersistentState } from "@/lib/use-persistent-state";
import {
  subscribeOgrenciler,
  subscribeOturmaPlani,
  saveOturmaPlani,
  getInitialOgrenciler,
  type OturmaPlaniVerisi,
} from "@/lib/firestore-service";

type DuzenTipi = "ikili" | "tekli" | "u_duzeni";
type DagitimModu = "rastgele" | "kiz_erkek" | "basari_akran" | "numara_sirasi";

export default function OturmaPlaniPage() {
  const [secilenSinif, setSecilenSinif] = usePersistentState("egitim_oturma_sinif", "8");
  const [secilenSube, setSecilenSube] = usePersistentState("egitim_oturma_sube", "A");
  const [duzenTipi, setDuzenTipi] = useState<DuzenTipi>("ikili");
  const [sutunSayisi, setSutunSayisi] = useState<number>(3); // 3 sıra kolonu (Sol, Orta, Sağ)
  const [siraDerinligi, setSiraDerinligi] = useState<number>(5); // Her kolonda kaç sıra arkaya doğru
  const [dagitimModu, setDagitimModu] = useState<DagitimModu>("kiz_erkek");

  // Öğrenciler ve Yerleşim
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>(getInitialOgrenciler);
  // yerlesim: siraIndex -> [ogrenciId | null, ogrenciId | null]
  const [yerlesim, setYerlesim] = useState<Record<number, (number | null)[]>>({});
  const [kayitDurumu, setKayitDurumu] = useState<"hazir" | "kaydediliyor" | "kaydedildi">("hazir");

  // Sürükle - Bırak veya Yer Değiştirme
  const [seciliKoltuk, setSeciliKoltuk] = useState<{ siraIndex: number; koltukIndex: number; ogrenciId: number | null } | null>(null);

  const sinifSubeKey = `${secilenSinif}${secilenSube}`;

  // Realtime Veri Abonelikleri
  useEffect(() => {
    const unsubOgrenciler = subscribeOgrenciler((data) => setOgrenciler(data));
    const unsubPlani = subscribeOturmaPlani(sinifSubeKey, (data) => {
      if (data) {
        setDuzenTipi(data.duzenTipi || "ikili");
        setSutunSayisi(data.sutunSayisi || 3);
        setSiraDerinligi(data.siraSayisi || 5);
        setYerlesim(data.yerlesim || {});
      } else {
        // Yeni sınıf için sıfır yerleşim
        setYerlesim({});
      }
    });

    return () => {
      unsubOgrenciler();
      unsubPlani();
    };
  }, [sinifSubeKey]);

  // Seçilen Sınıfın Öğrenci Listesi
  const sinifOgrencileri = useMemo(() => {
    return ogrenciler
      .filter((o) => o.sinif === secilenSinif && o.sube === secilenSube)
      .sort((a, b) => Number(a.numara) - Number(b.numara));
  }, [ogrenciler, secilenSinif, secilenSube]);

  // Toplam Sıra Kapasitesi
  const toplamSiraSayisi = sutunSayisi * siraDerinligi;
  const koltukKapasitesi = duzenTipi === "ikili" ? toplamSiraSayisi * 2 : toplamSiraSayisi;

  // Henüz bir sıraya yerleşmemiş öğrenciler
  const yerlesenOgrenciIdleri = useMemo(() => {
    const ids = new Set<number>();
    Object.values(yerlesim).forEach((koltuklar) => {
      koltuklar.forEach((id) => {
        if (id !== null && id !== undefined) ids.add(id);
      });
    });
    return ids;
  }, [yerlesim]);

  const yerlesmemisOgrenciler = useMemo(() => {
    return sinifOgrencileri.filter((o) => !yerlesenOgrenciIdleri.has(o.id));
  }, [sinifOgrencileri, yerlesenOgrenciIdleri]);

  // OTOMATİK AKILLI DAĞITIM MOTORU
  const otomatikDagit = () => {
    const ogrListesi = [...sinifOgrencileri];
    if (ogrListesi.length === 0) return;

    const yeniYerlesim: Record<number, (number | null)[]> = {};

    if (dagitimModu === "rastgele") {
      // Fisher-Yates karıştırma
      for (let i = ogrListesi.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ogrListesi[i], ogrListesi[j]] = [ogrListesi[j], ogrListesi[i]];
      }
    } else if (dagitimModu === "kiz_erkek") {
      // Kız ve Erkekleri dengeli dağıt (Yan yana Kız-Erkek veya dengeli kolon)
      const kizlar = ogrListesi.filter((o) => o.cinsiyet === "K");
      const erkekler = ogrListesi.filter((o) => o.cinsiyet === "E");
      ogrListesi.length = 0;

      const maxLen = Math.max(kizlar.length, erkekler.length);
      for (let i = 0; i < maxLen; i++) {
        if (kizlar[i]) ogrListesi.push(kizlar[i]);
        if (erkekler[i]) ogrListesi.push(erkekler[i]);
      }
    } else if (dagitimModu === "numara_sirasi") {
      ogrListesi.sort((a, b) => Number(a.numara) - Number(b.numara));
    }

    // Sıralara yerleştir
    let ogrIndex = 0;
    for (let s = 0; s < toplamSiraSayisi; s++) {
      if (duzenTipi === "ikili") {
        const solOgr = ogrListesi[ogrIndex++] || null;
        const sagOgr = ogrListesi[ogrIndex++] || null;
        yeniYerlesim[s] = [solOgr ? solOgr.id : null, sagOgr ? sagOgr.id : null];
      } else {
        const ogr = ogrListesi[ogrIndex++] || null;
        yeniYerlesim[s] = [ogr ? ogr.id : null];
      }
    }

    setYerlesim(yeniYerlesim);
    kaydetPlani(yeniYerlesim);
  };

  // Planı Kaydet
  const kaydetPlani = async (guncelYerlesim = yerlesim) => {
    setKayitDurumu("kaydediliyor");
    try {
      const veri: OturmaPlaniVerisi = {
        id: sinifSubeKey,
        sinif: secilenSinif,
        sube: secilenSube,
        duzenTipi,
        siraSayisi: siraDerinligi,
        sutunSayisi,
        yerlesim: guncelYerlesim,
      };
      await saveOturmaPlani(veri);
      setKayitDurumu("kaydedildi");
      setTimeout(() => setKayitDurumu("hazir"), 2000);
    } catch (e) {
      console.error(e);
      setKayitDurumu("hazir");
    }
  };

  // Koltuğa Tıklama (Değiş Tokuş veya Yerleştirme)
  const koltukTikla = (siraIndex: number, koltukIndex: number) => {
    const mevcutId = yerlesim[siraIndex]?.[koltukIndex] || null;

    if (!seciliKoltuk) {
      // İlk koltuğu seç
      setSeciliKoltuk({ siraIndex, koltukIndex, ogrenciId: mevcutId });
    } else {
      // İkinci koltuğa tıklandı -> İki koltuğun yerini değiştir
      const kopya: Record<number, (number | null)[]> = { ...yerlesim };

      // Mevcut koltukları initialize et
      if (!kopya[seciliKoltuk.siraIndex]) {
        kopya[seciliKoltuk.siraIndex] = duzenTipi === "ikili" ? [null, null] : [null];
      }
      if (!kopya[siraIndex]) {
        kopya[siraIndex] = duzenTipi === "ikili" ? [null, null] : [null];
      }

      const temp = kopya[seciliKoltuk.siraIndex][seciliKoltuk.koltukIndex];
      kopya[seciliKoltuk.siraIndex][seciliKoltuk.koltukIndex] = kopya[siraIndex][koltukIndex];
      kopya[siraIndex][koltukIndex] = temp;

      setYerlesim(kopya);
      setSeciliKoltuk(null);
      kaydetPlani(kopya);
    }
  };

  // Boş koltuğa listeden öğrenci atama
  const ogrenciSecKoltugaKoy = (ogrenciId: number) => {
    if (!seciliKoltuk) return;

    const kopya: Record<number, (number | null)[]> = { ...yerlesim };
    if (!kopya[seciliKoltuk.siraIndex]) {
      kopya[seciliKoltuk.siraIndex] = duzenTipi === "ikili" ? [null, null] : [null];
    }
    kopya[seciliKoltuk.siraIndex][seciliKoltuk.koltukIndex] = ogrenciId;

    setYerlesim(kopya);
    setSeciliKoltuk(null);
    kaydetPlani(kopya);
  };

  // Koltuğu Boşalt
  const koltuguBosalt = (siraIndex: number, koltukIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const kopya: Record<number, (number | null)[]> = { ...yerlesim };
    if (kopya[siraIndex]) {
      kopya[siraIndex][koltukIndex] = null;
      setYerlesim(kopya);
      kaydetPlani(kopya);
    }
  };

  // Planı Tamamen Temizle
  const planiTemizle = () => {
    if (confirm("Bu sınıf için mevcut oturma planı sıfırlansın mı?")) {
      setYerlesim({});
      kaydetPlani({});
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Kontroller */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-600 via-emerald-600 to-indigo-700 p-6 md:p-8 text-white shadow-xl print:hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-2">
              <span>🪑</span> Akıllı Pedagojik Oturma Düzeni
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Oturma Planı & Düzenleyici
            </h1>
            <p className="text-white/80 text-sm md:text-base mt-1 max-w-2xl">
              Kız-erkek dengesi, numara sırası veya akıllı algoritmalarla sınıflarınıza saniyeler içinde mükemmel oturma şeması oluşturun.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={otomatikDagit}
              className="px-4 py-2.5 rounded-xl bg-white text-emerald-800 font-bold text-sm shadow-lg hover:bg-white/90 active:scale-95 transition-all flex items-center gap-2"
            >
              <span>⚡</span> Otomatik Dağıt
            </button>

            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-sm font-medium transition-all flex items-center gap-2"
            >
              <span>🖨️</span> PDF / Yazdır
            </button>
          </div>
        </div>

        {/* Dekoratif Arka Plan Işığı */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Kontrol Paneli (Sınıf Seçimi, Sıra Düzeni, Kolon Sayısı) */}
      <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {/* Sınıf & Şube */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-[var(--muted-text)]">Sınıf:</label>
            <select
              value={secilenSinif}
              onChange={(e) => setSecilenSinif(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-sm font-bold"
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
              className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-sm font-bold"
            >
              {subeler.map((sb) => (
                <option key={sb} value={sb}>
                  {sb} Şubesi
                </option>
              ))}
            </select>
          </div>

          <div className="h-6 w-px bg-[var(--border-color)] hidden md:block"></div>

          {/* Sıra Tipi (İkili / Tekli) */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-[var(--muted-text)]">Sıra:</label>
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-[var(--border-color)]">
              <button
                onClick={() => {
                  setDuzenTipi("ikili");
                  setYerlesim({});
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  duzenTipi === "ikili"
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-[var(--muted-text)] hover:text-[var(--foreground)]"
                }`}
              >
                İkili Sıra
              </button>
              <button
                onClick={() => {
                  setDuzenTipi("tekli");
                  setYerlesim({});
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  duzenTipi === "tekli"
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-[var(--muted-text)] hover:text-[var(--foreground)]"
                }`}
              >
                Tekli Sıra
              </button>
            </div>
          </div>

          {/* Kolon Sayısı (Örn: Sol, Orta, Sağ) */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-[var(--muted-text)]">Grup (Kolon):</label>
            <select
              value={sutunSayisi}
              onChange={(e) => setSutunSayisi(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-sm font-semibold"
            >
              <option value={2}>2 Kolon (Sol - Sağ)</option>
              <option value={3}>3 Kolon (Sol - Orta - Sağ)</option>
              <option value={4}>4 Kolon</option>
            </select>
          </div>

          {/* Sıra Derinliği */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-[var(--muted-text)]">Derinlik:</label>
            <select
              value={siraDerinligi}
              onChange={(e) => setSiraDerinligi(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-sm font-semibold"
            >
              {[3, 4, 5, 6, 7].map((num) => (
                <option key={num} value={num}>
                  {num} Sıra Arkaya
                </option>
              ))}
            </select>
          </div>

          {/* Otomatik Dağıtım Algoritması Modu */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-[var(--muted-text)]">Algoritma:</label>
            <select
              value={dagitimModu}
              onChange={(e) => setDagitimModu(e.target.value as DagitimModu)}
              className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-sm font-semibold text-emerald-600 dark:text-emerald-400"
            >
              <option value="kiz_erkek">👫 Kız - Erkek Dengeli</option>
              <option value="rastgele">🎲 Tamamen Rastgele</option>
              <option value="numara_sirasi">🔢 Okul No Sırasına Göre</option>
            </select>
          </div>
        </div>

        {/* Sağ Taraf: Kapasite ve Sıfırlama */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[var(--muted-text)]">
            Öğrenci: <strong className="text-[var(--foreground)]">{sinifOgrencileri.length}</strong> / Kapasite:{" "}
            <strong className="text-[var(--foreground)]">{koltukKapasitesi}</strong>
          </span>

          <button
            onClick={planiTemizle}
            className="text-xs text-rose-500 hover:text-rose-600 font-semibold px-2 py-1"
          >
            Temizle
          </button>
        </div>
      </div>

      {/* Sürükle / Değiştir İpucu Bildirimi */}
      {seciliKoltuk && (
        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <span>🔄</span>
            <span>
              Bir koltuk seçtiniz. Yer değiştirmek için başka bir sıraya tıklayın veya aşağıdaki listeden bir öğrenciye tıklayarak bu koltuğa atayın.
            </span>
          </div>
          <button
            onClick={() => setSeciliKoltuk(null)}
            className="px-2 py-1 rounded-lg bg-amber-500 text-white text-xs font-bold"
          >
            İptal
          </button>
        </div>
      )}

      {/* OTURMA ŞEMASI VE YAZDIRMA ALANI */}
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-6 md:p-8 shadow-sm print:border-none print:shadow-none print:p-0">
        {/* Yazdırma Başlığı */}
        <div className="text-center pb-6 border-b border-[var(--border-color)] mb-8">
          <h2 className="text-xl md:text-2xl font-black text-[var(--foreground)] uppercase tracking-wide">
            {secilenSinif}/{secilenSube} SINIFI OTURMA PLANI
          </h2>
          <p className="text-xs text-[var(--muted-text)] mt-1">
            Öğretmen Kürsüsü & Akıllı Tahta Yönü
          </p>
        </div>

        {/* ÖĞRETMEN KÜRSÜSÜ & TAHTA GÖRSELİ */}
        <div className="flex justify-center mb-10">
          <div className="w-full max-w-md py-2.5 px-6 rounded-2xl bg-slate-800 text-white text-center font-bold text-xs tracking-widest shadow-md flex items-center justify-center gap-2 uppercase">
            <span>🖥️</span> AKILLI TAHTA & ÖĞRETMEN KÜRSÜSÜ <span>👨‍🏫</span>
          </div>
        </div>

        {/* SINIF SIRALARI GRID ALANI */}
        <div
          className="grid gap-6 md:gap-8 justify-center"
          style={{
            gridTemplateColumns: `repeat(${sutunSayisi}, minmax(180px, 1fr))`,
          }}
        >
          {Array.from({ length: sutunSayisi }).map((_, colIndex) => (
            <div key={colIndex} className="flex flex-col gap-4">
              <div className="text-center text-[11px] font-bold uppercase tracking-wider text-[var(--muted-text)] bg-slate-100 dark:bg-slate-800/80 py-1 rounded-xl">
                {colIndex === 0
                  ? "Pencere Kenarı"
                  : colIndex === sutunSayisi - 1
                  ? "Kapı Kenarı"
                  : `Orta Grup ${colIndex}`}
              </div>

              {/* Her kolondaki sıralar (önden arkaya doğru) */}
              {Array.from({ length: siraDerinligi }).map((_, rowIndex) => {
                const siraIndex = colIndex * siraDerinligi + rowIndex;
                const koltuklar = yerlesim[siraIndex] || (duzenTipi === "ikili" ? [null, null] : [null]);

                return (
                  <div
                    key={rowIndex}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border-2 border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col gap-2 relative hover:border-[var(--primary)] transition-all"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-[var(--muted-text)]">
                      <span>{rowIndex + 1}. Sıra</span>
                      <span className="text-[9px] opacity-60">#{siraIndex + 1}</span>
                    </div>

                    {/* Sıra İçindeki Koltuklar */}
                    <div className={`grid ${duzenTipi === "ikili" ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
                      {koltuklar.map((ogrenciId, kIdx) => {
                        const ogrenci = ogrenciId ? ogrenciler.find((o) => o.id === ogrenciId) : null;
                        const isSelected =
                          seciliKoltuk?.siraIndex === siraIndex && seciliKoltuk?.koltukIndex === kIdx;

                        return (
                          <div
                            key={kIdx}
                            onClick={() => koltukTikla(siraIndex, kIdx)}
                            className={`min-h-[56px] p-2 rounded-xl border flex flex-col justify-center items-center text-center cursor-pointer transition-all relative group ${
                              isSelected
                                ? "bg-amber-500/20 border-amber-500 ring-2 ring-amber-400"
                                : ogrenci
                                ? ogrenci.cinsiyet === "K"
                                  ? "bg-rose-500/10 border-rose-400/40 text-[var(--foreground)] hover:border-rose-400"
                                  : "bg-sky-500/10 border-sky-400/40 text-[var(--foreground)] hover:border-sky-400"
                                : "bg-white dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:border-emerald-400"
                            }`}
                          >
                            {ogrenci ? (
                              <>
                                <span className="text-[11px] font-bold leading-tight line-clamp-1">
                                  {ogrenci.ad} {ogrenci.soyad}
                                </span>
                                <span className="text-[10px] text-[var(--muted-text)] mt-0.5">
                                  No: {ogrenci.numara}
                                </span>

                                {/* Boşalt Butonu (Hover'da Çıkar) */}
                                <button
                                  onClick={(e) => koltuguBosalt(siraIndex, kIdx, e)}
                                  title="Bu koltuğu boşalt"
                                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center print:hidden"
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] font-medium text-slate-400">
                                {isSelected ? "Seçildi" : "— Boş —"}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Yazdırma Alt Bilgisi */}
        <div className="mt-12 pt-6 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--muted-text)]">
          <span>Oluşturulma Tarihi: {new Date().toLocaleDateString("tr-TR")}</span>
          <span>Sınıf Rehber Öğretmeni İmza: _______________</span>
        </div>
      </div>

      {/* HENÜZ YERLEŞMEMİŞ ÖĞRENCİLER LİSTESİ */}
      {yerlesmemisOgrenciler.length > 0 && (
        <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm print:hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-[var(--foreground)] flex items-center gap-2">
              <span>⚠️</span> Henüz Sıraya Atanmamış Öğrenciler ({yerlesmemisOgrenciler.length})
            </h3>
            <span className="text-xs text-[var(--muted-text)]">
              Bir koltuğu seçtikten sonra aşağıdaki öğrenciye tıklayarak doğrudan oturtabilirsiniz.
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {yerlesmemisOgrenciler.map((ogr) => (
              <button
                key={ogr.id}
                onClick={() => ogrenciSecKoltugaKoy(ogr.id)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  seciliKoltuk
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white cursor-pointer active:scale-95"
                    : "bg-slate-100 dark:bg-slate-800 border-[var(--border-color)] text-[var(--foreground)] opacity-80"
                }`}
              >
                <span>{ogr.cinsiyet === "K" ? "👧" : "👦"}</span>
                <span>
                  {ogr.ad} {ogr.soyad} (#{ogr.numara})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
