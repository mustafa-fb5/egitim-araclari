"use client";

import { useState, useEffect } from "react";
import { demoOgretmenler as varsayilanOgretmenler, gunler, nobetYerleri } from "@/lib/data";
import {
  subscribeNobetAtamalari,
  saveNobetAtamalari,
  subscribeOgretmenlerListesi,
  saveOgretmenlerListesi,
  type NobetAtamasiData as NobetAtamasi,
  type OgretmenBilgisi,
} from "@/lib/firestore-service";

const varsayilanAtamalar: NobetAtamasi[] = [
  { ogretmenId: 1, gun: "Pazartesi", yer: "Ana Koridor" },
  { ogretmenId: 2, gun: "Pazartesi", yer: "Bahçe" },
  { ogretmenId: 3, gun: "Salı", yer: "Ana Koridor" },
  { ogretmenId: 4, gun: "Salı", yer: "Kantin" },
  { ogretmenId: 5, gun: "Çarşamba", yer: "1. Kat Koridor" },
  { ogretmenId: 6, gun: "Çarşamba", yer: "Bahçe" },
  { ogretmenId: 7, gun: "Perşembe", yer: "Ana Koridor" },
  { ogretmenId: 8, gun: "Perşembe", yer: "Giriş Kapısı" },
  { ogretmenId: 9, gun: "Cuma", yer: "Bahçe" },
  { ogretmenId: 10, gun: "Cuma", yer: "Kantin" },
];

export default function NobetCizelgesiPage() {
  const [ogretmenler, setOgretmenler] = useState<OgretmenBilgisi[]>(varsayilanOgretmenler);
  const [atamalar, setAtamalar] = useState<NobetAtamasi[]>(varsayilanAtamalar);
  const [yeniAtama, setYeniAtama] = useState({ ogretmenId: 1, gun: "Pazartesi", yer: "Ana Koridor" });

  // Modal State'leri
  const [ogretmenModalAcik, setOgretmenModalAcik] = useState(false);
  const [yeniAd, setYeniAd] = useState("");
  const [yeniSoyad, setYeniSoyad] = useState("");
  const [yeniBrans, setYeniBrans] = useState("");

  // Düzenlenen öğretmen state'i
  const [duzenlenenId, setDuzenlenenId] = useState<number | null>(null);
  const [duzenleAd, setDuzenleAd] = useState("");
  const [duzenleSoyad, setDuzenleSoyad] = useState("");
  const [duzenleBrans, setDuzenleBrans] = useState("");

  // Firestore Canlı Senkronizasyon (Atamalar ve Öğretmenler)
  useEffect(() => {
    const unsubAtamalar = subscribeNobetAtamalari((remote) => {
      if (remote && remote.length > 0) {
        setAtamalar(remote);
      }
    });

    const unsubOgretmenler = subscribeOgretmenlerListesi((remoteOgretmenler) => {
      if (remoteOgretmenler && remoteOgretmenler.length > 0) {
        setOgretmenler(remoteOgretmenler);
      }
    });

    return () => {
      unsubAtamalar();
      unsubOgretmenler();
    };
  }, []);

  const ekle = async () => {
    const zatenVar = atamalar.some(
      (a) => a.ogretmenId === yeniAtama.ogretmenId && a.gun === yeniAtama.gun
    );
    if (zatenVar) {
      alert("Bu öğretmen bu gün için zaten atanmış!");
      return;
    }
    const guncel = [...atamalar, { ...yeniAtama }];
    setAtamalar(guncel);
    await saveNobetAtamalari(guncel);
  };

  const sil = async (index: number) => {
    const guncel = atamalar.filter((_, i) => i !== index);
    setAtamalar(guncel);
    await saveNobetAtamalari(guncel);
  };

  const otomatikDagit = async () => {
    if (ogretmenler.length === 0) {
      alert("Nöbet dağıtmak için en az 1 öğretmen olmalıdır.");
      return;
    }
    const yeniAtamalar: NobetAtamasi[] = [];
    gunler.forEach((gun, gi) => {
      const yerler = nobetYerleri.slice(0, 2);
      yerler.forEach((yer, yi) => {
        const idx = (gi * 2 + yi) % ogretmenler.length;
        yeniAtamalar.push({
          ogretmenId: ogretmenler[idx].id,
          gun,
          yer,
        });
      });
    });

    setAtamalar(yeniAtamalar);
    await saveNobetAtamalari(yeniAtamalar);
  };

  // Öğretmen Ekle
  const ogretmenEkle = async () => {
    if (!yeniAd.trim() || !yeniSoyad.trim()) {
      alert("Lütfen ad ve soyad giriniz.");
      return;
    }
    const yeniId = ogretmenler.length > 0 ? Math.max(...ogretmenler.map((o) => o.id)) + 1 : 1;
    const yeniOgretmen: OgretmenBilgisi = {
      id: yeniId,
      ad: yeniAd.trim(),
      soyad: yeniSoyad.trim(),
      brans: yeniBrans.trim() || "Öğretmen",
    };
    const guncel = [...ogretmenler, yeniOgretmen];
    setOgretmenler(guncel);
    setYeniAd("");
    setYeniSoyad("");
    setYeniBrans("");
    await saveOgretmenlerListesi(guncel);
  };

  // Öğretmen Düzenlemeyi Başlat
  const ogretmenDuzenleBaslat = (o: OgretmenBilgisi) => {
    setDuzenlenenId(o.id);
    setDuzenleAd(o.ad);
    setDuzenleSoyad(o.soyad);
    setDuzenleBrans(o.brans);
  };

  // Öğretmen Düzenlemeyi Kaydet
  const ogretmenDuzenleKaydet = async (id: number) => {
    if (!duzenleAd.trim() || !duzenleSoyad.trim()) {
      alert("Ad ve soyad boş bırakılamaz.");
      return;
    }
    const guncel = ogretmenler.map((o) =>
      o.id === id
        ? { ...o, ad: duzenleAd.trim(), soyad: duzenleSoyad.trim(), brans: duzenleBrans.trim() || "Öğretmen" }
        : o
    );
    setOgretmenler(guncel);
    setDuzenlenenId(null);
    await saveOgretmenlerListesi(guncel);
  };

  // Öğretmen Sil
  const ogretmenSil = async (id: number, adSoyad: string) => {
    if (!confirm(`"${adSoyad}" isimli öğretmeni silmek istediğinize emin misiniz?`)) return;
    const guncelOgretmenler = ogretmenler.filter((o) => o.id !== id);
    const guncelAtamalar = atamalar.filter((a) => a.ogretmenId !== id);
    setOgretmenler(guncelOgretmenler);
    setAtamalar(guncelAtamalar);
    await saveOgretmenlerListesi(guncelOgretmenler);
    await saveNobetAtamalari(guncelAtamalar);
  };

  // Öğretmenleri Varsayılana Sıfırla
  const ogretmenleriVarsayilanaDondur = async () => {
    if (!confirm("Tüm öğretmen listesini varsayılan öğretmenlere sıfırlamak istiyor musunuz?")) return;
    setOgretmenler(varsayilanOgretmenler);
    await saveOgretmenlerListesi(varsayilanOgretmenler);
  };

  const gunRenkleri: Record<string, string> = {
    Pazartesi: "from-blue-500 to-blue-600",
    Salı: "from-violet-500 to-violet-600",
    Çarşamba: "from-emerald-500 to-emerald-600",
    Perşembe: "from-amber-500 to-amber-600",
    Cuma: "from-rose-500 to-rose-600",
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Kontroller */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Öğretmen</label>
              <select
                value={yeniAtama.ogretmenId}
                onChange={(e) => setYeniAtama({ ...yeniAtama, ogretmenId: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-semibold"
              >
                {ogretmenler.map((o) => (
                  <option key={o.id} value={o.id}>{o.ad} {o.soyad} ({o.brans})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Gün</label>
              <select
                value={yeniAtama.gun}
                onChange={(e) => setYeniAtama({ ...yeniAtama, gun: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-semibold"
              >
                {gunler.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Nöbet Yeri</label>
              <select
                value={yeniAtama.yer}
                onChange={(e) => setYeniAtama({ ...yeniAtama, yer: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-semibold"
              >
                {nobetYerleri.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setOgretmenModalAcik(true)}
              className="px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>👨‍🏫</span>
              <span>Öğretmenleri Düzenle ({ogretmenler.length})</span>
            </button>
            <button onClick={ekle} className="px-4 py-2.5 rounded-xl text-sm font-bold bg-[var(--primary)] text-white hover:opacity-90 transition-all shadow-md flex items-center gap-1">
              <span>➕</span>
              <span>Ekle</span>
            </button>
            <button onClick={otomatikDagit} className="px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white hover:opacity-90 transition-all shadow-lg flex items-center gap-1">
              <span>🔄</span>
              <span>Otomatik Dağıt</span>
            </button>
          </div>
        </div>
      </div>

      {/* Haftalık Nöbet Çizelgesi */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {gunler.map((gun) => {
          const gunAtamalari = atamalar.filter((a) => a.gun === gun);
          return (
            <div key={gun} className="glass-card rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className={`bg-gradient-to-r ${gunRenkleri[gun]} p-4 text-white text-center`}>
                <h4 className="font-bold text-sm">{gun}</h4>
                <p className="text-xs text-white/80 mt-0.5 font-medium">{gunAtamalari.length} nöbetçi</p>
              </div>
              <div className="p-3 space-y-2">
                {gunAtamalari.length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)] text-center py-6">Atama yok</p>
                ) : (
                  gunAtamalari.map((atama, i) => {
                    const ogretmen = ogretmenler.find((o) => o.id === atama.ogretmenId);
                    return (
                      <div key={i} className="p-3 rounded-xl bg-[var(--secondary)] group hover:bg-[var(--primary)]/10 transition-all border border-[var(--border)]/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-[var(--foreground)]">
                              {ogretmen ? `${ogretmen.ad} ${ogretmen.soyad}` : "Bilinmeyen Öğretmen"}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)] font-medium">{ogretmen?.brans || "-"}</p>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-1">📍 {atama.yer}</p>
                          </div>
                          <button
                            onClick={() => sil(atamalar.indexOf(atama))}
                            className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center text-xs font-bold"
                            title="Bu nöbeti kaldır"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* İstatistikler */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-base font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <span>📊</span>
          <span>Nöbet Dağılım Özeti</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {ogretmenler.map((ogr) => {
            const nobetSayisi = atamalar.filter((a) => a.ogretmenId === ogr.id).length;
            return (
              <div key={ogr.id} className="text-center p-3.5 rounded-xl bg-[var(--secondary)] border border-[var(--border)]">
                <p className="text-xs font-bold text-[var(--foreground)] truncate">{ogr.ad} {ogr.soyad}</p>
                <p className="text-[10px] text-[var(--muted-foreground)] truncate">{ogr.brans}</p>
                <p className="text-xl font-black gradient-text mt-1">{nobetSayisi}</p>
                <p className="text-[11px] font-semibold text-[var(--muted-foreground)]">nöbet</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ÖĞRETMENLERİ DÜZENLE MODALI */}
      {ogretmenModalAcik && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="glass-card rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl border border-[var(--border)] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[var(--foreground)] flex items-center gap-2">
                  <span>👨‍🏫</span>
                  <span>Öğretmen Listesini Düzenle</span>
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Öğretmenlerin ad, soyad ve branşlarını güncelleyebilir, yeni öğretmen ekleyebilirsiniz.
                </p>
              </div>
              <button
                onClick={() => setOgretmenModalAcik(false)}
                className="w-8 h-8 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-500 transition-colors font-bold text-lg"
              >
                ×
              </button>
            </div>

            {/* Yeni Öğretmen Ekle */}
            <div className="bg-[var(--background)]/80 p-3.5 rounded-2xl border border-[var(--border)] space-y-2">
              <label className="block text-xs font-bold text-[var(--foreground)] uppercase tracking-wide">
                ➕ Yeni Öğretmen Ekle
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={yeniAd}
                  onChange={(e) => setYeniAd(e.target.value)}
                  placeholder="Ad (örn. Ahmet)"
                  className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  value={yeniSoyad}
                  onChange={(e) => setYeniSoyad(e.target.value)}
                  placeholder="Soyad (örn. Yılmaz)"
                  className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={yeniBrans}
                    onChange={(e) => setYeniBrans(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && ogretmenEkle()}
                    placeholder="Branş (örn. Matematik)"
                    className="flex-1 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={ogretmenEkle}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md shrink-0"
                  >
                    + Ekle
                  </button>
                </div>
              </div>
            </div>

            {/* Kayıtlı Öğretmenler Listesi */}
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[45vh] pr-1">
              <span className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wide block mb-1">
                Kayıtlı Öğretmenler ({ogretmenler.length})
              </span>
              <div className="space-y-2">
                {ogretmenler.map((o) => {
                  const duzenleniyor = duzenlenenId === o.id;
                  return (
                    <div
                      key={o.id}
                      className="p-3 rounded-xl border border-[var(--border)] bg-[var(--background)]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      {duzenleniyor ? (
                        /* Düzenleme Modu */
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                          <input
                            type="text"
                            value={duzenleAd}
                            onChange={(e) => setDuzenleAd(e.target.value)}
                            placeholder="Ad"
                            className="px-2.5 py-1.5 rounded-lg border border-indigo-500 bg-[var(--background)] text-sm font-bold text-[var(--foreground)] focus:outline-none"
                          />
                          <input
                            type="text"
                            value={duzenleSoyad}
                            onChange={(e) => setDuzenleSoyad(e.target.value)}
                            placeholder="Soyad"
                            className="px-2.5 py-1.5 rounded-lg border border-indigo-500 bg-[var(--background)] text-sm font-bold text-[var(--foreground)] focus:outline-none"
                          />
                          <input
                            type="text"
                            value={duzenleBrans}
                            onChange={(e) => setDuzenleBrans(e.target.value)}
                            placeholder="Branş"
                            className="px-2.5 py-1.5 rounded-lg border border-indigo-500 bg-[var(--background)] text-sm font-bold text-[var(--foreground)] focus:outline-none"
                          />
                        </div>
                      ) : (
                        /* Normal Görüntüleme */
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center shrink-0">
                            {o.ad.charAt(0)}{o.soyad.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[var(--foreground)]">
                              {o.ad} {o.soyad}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)]">{o.brans}</p>
                          </div>
                        </div>
                      )}

                      {/* İşlem Butonları */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        {duzenleniyor ? (
                          <>
                            <button
                              type="button"
                              onClick={() => ogretmenDuzenleKaydet(o.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm"
                            >
                              ✓ Kaydet
                            </button>
                            <button
                              type="button"
                              onClick={() => setDuzenlenenId(null)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--secondary)] transition-all"
                            >
                              İptal
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => ogretmenDuzenleBaslat(o)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1"
                            >
                              ✏️ Düzenle
                            </button>
                            <button
                              type="button"
                              onClick={() => ogretmenSil(o.id, `${o.ad} ${o.soyad}`)}
                              className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center font-bold text-xs"
                              title="Öğretmeni Sil"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Alt Butonları */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={ogretmenleriVarsayilanaDondur}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--secondary)] transition-all"
                title="İlk varsayılan 10 öğretmene sıfırla"
              >
                🔄 Varsayılana Sıfırla
              </button>

              <button
                type="button"
                onClick={() => setOgretmenModalAcik(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md"
              >
                Tamamla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

