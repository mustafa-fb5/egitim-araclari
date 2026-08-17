"use client";

import { useState, useEffect } from "react";
import { demoOgrenciler, sinifNumaralari, subeler, type Ogrenci } from "@/lib/data";
import { usePersistentState } from "@/lib/use-persistent-state";
import { subscribeOgrenciler, saveOgrenci, deleteOgrenci as deleteOgrenciFromDb } from "@/lib/firestore-service";

export default function SinifListesiPage() {
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>(demoOgrenciler);
  const [secilenSinif, setSecilenSinif] = usePersistentState("egitim_sinif_listesi_sinif", "Tümü");
  const [secilenSube, setSecilenSube] = usePersistentState("egitim_sinif_listesi_sube", "Tümü");
  const [aramaMetni, setAramaMetni] = useState("");
  const [gorunum, setGorunum] = useState<"tablo" | "kart">("tablo");
  const [yukleniyor, setYukleniyor] = useState(true);

  // Firestore Realtime Subscription
  useEffect(() => {
    const unsubscribe = subscribeOgrenciler((data) => {
      setOgrenciler(data);
      setYukleniyor(false);
    });
    return () => unsubscribe();
  }, []);

  // Düzenleme Modu State'i
  const [duzenlenecekOgrenci, setDuzenlenecekOgrenci] = useState<Ogrenci | null>(null);
  
  const [yeniOgrenci, setYeniOgrenci] = useState<Omit<Ogrenci, "id">>({
    ad: "",
    soyad: "",
    numara: "",
    sinif: "1",
    sube: "A",
    cinsiyet: "E",
    veliTelefon: "",
    veliAd: "",
  });
  const [formAcik, setFormAcik] = useState(false);

  const filtrelenmis = ogrenciler.filter((o) => {
    const sinifUygun = secilenSinif === "Tümü" || o.sinif === secilenSinif;
    const subeUygun = secilenSube === "Tümü" || o.sube === secilenSube;
    const aramaUygun = aramaMetni === "" || 
      `${o.ad} ${o.soyad} ${o.numara}`.toLowerCase().includes(aramaMetni.toLowerCase());
    return sinifUygun && subeUygun && aramaUygun;
  });

  const ekle = async () => {
    if (!yeniOgrenci.ad || !yeniOgrenci.soyad || !yeniOgrenci.numara) {
      alert("Ad, soyad ve numara zorunludur!");
      return;
    }
    const yeniId = ogrenciler.length > 0 ? Math.max(...ogrenciler.map((o) => o.id), 0) + 1 : 1;
    const olusturulan: Ogrenci = { ...yeniOgrenci, id: yeniId };
    
    // Firebase Firestore'a kaydet
    await saveOgrenci(olusturulan);
    setYeniOgrenci({ ad: "", soyad: "", numara: "", sinif: "1", sube: "A", cinsiyet: "E", veliTelefon: "", veliAd: "" });
    setFormAcik(false);
  };

  const guncelle = async () => {
    if (!duzenlenecekOgrenci) return;
    // Firebase Firestore'a güncelle
    await saveOgrenci(duzenlenecekOgrenci);
    setDuzenlenecekOgrenci(null);
  };

  const sil = async (id: number) => {
    if (confirm("Bu öğrenciyi silmek istediğinize emin misiniz?")) {
      // Firebase Firestore'dan sil
      await deleteOgrenciFromDb(id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Filtre & Arama */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Sınıf Filtresi</label>
              <select
                value={secilenSinif}
                onChange={(e) => setSecilenSinif(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="Tümü">Tüm Sınıflar (1-12)</option>
                {sinifNumaralari.map((s) => (
                  <option key={s} value={s}>{s}. Sınıf</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Şube Filtresi</label>
              <select
                value={secilenSube}
                onChange={(e) => setSecilenSube(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="Tümü">Tüm Şubeler (A-S)</option>
                {subeler.map((sube) => (
                  <option key={sube} value={sube}>{sube} Şubesi</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Arama</label>
              <input
                type="text"
                value={aramaMetni}
                onChange={(e) => setAramaMetni(e.target.value)}
                placeholder="Ad, soyad veya numara..."
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={() => setGorunum(gorunum === "tablo" ? "kart" : "tablo")}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-white transition-all"
              >
                {gorunum === "tablo" ? "📇 Kart" : "📋 Tablo"}
              </button>
              <button
                onClick={() => setFormAcik(!formAcik)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-all shadow-md"
              >
                ➕ Yeni Öğrenci
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Öğrenci Düzenleme Modalı */}
      {duzenlenecekOgrenci && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="glass-card bg-[var(--card)] rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl border border-[var(--border)]">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
              <h3 className="text-lg font-bold text-[var(--foreground)]">✏️ Öğrenci Bilgilerini Düzenle</h3>
              <button onClick={() => setDuzenlenecekOgrenci(null)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] font-bold text-xl">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[var(--muted-foreground)] mb-1">Ad</label>
                <input
                  type="text"
                  value={duzenlenecekOgrenci.ad}
                  onChange={(e) => setDuzenlenecekOgrenci({ ...duzenlenecekOgrenci, ad: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--muted-foreground)] mb-1">Soyad</label>
                <input
                  type="text"
                  value={duzenlenecekOgrenci.soyad}
                  onChange={(e) => setDuzenlenecekOgrenci({ ...duzenlenecekOgrenci, soyad: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--muted-foreground)] mb-1">Numara</label>
                <input
                  type="text"
                  value={duzenlenecekOgrenci.numara}
                  onChange={(e) => setDuzenlenecekOgrenci({ ...duzenlenecekOgrenci, numara: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--muted-foreground)] mb-1">Cinsiyet</label>
                <select
                  value={duzenlenecekOgrenci.cinsiyet}
                  onChange={(e) => setDuzenlenecekOgrenci({ ...duzenlenecekOgrenci, cinsiyet: e.target.value as "E" | "K" })}
                  className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)]"
                >
                  <option value="E">Erkek</option>
                  <option value="K">Kız</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[var(--muted-foreground)] mb-1">Sınıf (1-12)</label>
                <select
                  value={duzenlenecekOgrenci.sinif}
                  onChange={(e) => setDuzenlenecekOgrenci({ ...duzenlenecekOgrenci, sinif: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)]"
                >
                  {sinifNumaralari.map((s) => (
                    <option key={s} value={s}>{s}. Sınıf</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[var(--muted-foreground)] mb-1">Şube (A-S)</label>
                <select
                  value={duzenlenecekOgrenci.sube}
                  onChange={(e) => setDuzenlenecekOgrenci({ ...duzenlenecekOgrenci, sube: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)]"
                >
                  {subeler.map((sube) => (
                    <option key={sube} value={sube}>{sube} Şubesi</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[var(--muted-foreground)] mb-1">Veli Adı</label>
                <input
                  type="text"
                  value={duzenlenecekOgrenci.veliAd}
                  onChange={(e) => setDuzenlenecekOgrenci({ ...duzenlenecekOgrenci, veliAd: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--muted-foreground)] mb-1">Veli Telefon</label>
                <input
                  type="text"
                  value={duzenlenecekOgrenci.veliTelefon}
                  onChange={(e) => setDuzenlenecekOgrenci({ ...duzenlenecekOgrenci, veliTelefon: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setDuzenlenecekOgrenci(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--secondary)] text-[var(--foreground)] hover:bg-gray-200 transition-all"
              >
                Vazgeç
              </button>
              <button
                onClick={guncelle}
                className="px-6 py-2 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-all shadow-md"
              >
                💾 Güncelle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yeni Öğrenci Ekleme Formu */}
      {formAcik && (
        <div className="glass-card rounded-2xl p-6 animate-slide-up" style={{ opacity: 0 }}>
          <h3 className="text-base font-bold text-[var(--foreground)] mb-4">➕ Yeni Öğrenci Ekle</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-[var(--muted-foreground)] mb-1">Ad</label>
              <input
                type="text"
                value={yeniOgrenci.ad}
                onChange={(e) => setYeniOgrenci({ ...yeniOgrenci, ad: e.target.value })}
                placeholder="Örn: Ahmet"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted-foreground)] mb-1">Soyad</label>
              <input
                type="text"
                value={yeniOgrenci.soyad}
                onChange={(e) => setYeniOgrenci({ ...yeniOgrenci, soyad: e.target.value })}
                placeholder="Örn: Yılmaz"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted-foreground)] mb-1">Numara</label>
              <input
                type="text"
                value={yeniOgrenci.numara}
                onChange={(e) => setYeniOgrenci({ ...yeniOgrenci, numara: e.target.value })}
                placeholder="Örn: 105"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--muted-foreground)] mb-1">Sınıf (1 - 12)</label>
              <select
                value={yeniOgrenci.sinif}
                onChange={(e) => setYeniOgrenci({ ...yeniOgrenci, sinif: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                {sinifNumaralari.map((s) => (
                  <option key={s} value={s}>{s}. Sınıf</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-[var(--muted-foreground)] mb-1">Şube (A - S)</label>
              <select
                value={yeniOgrenci.sube}
                onChange={(e) => setYeniOgrenci({ ...yeniOgrenci, sube: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                {subeler.map((sube) => (
                  <option key={sube} value={sube}>{sube} Şubesi</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-[var(--muted-foreground)] mb-1">Cinsiyet</label>
              <select
                value={yeniOgrenci.cinsiyet}
                onChange={(e) => setYeniOgrenci({ ...yeniOgrenci, cinsiyet: e.target.value as "E" | "K" })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="E">Erkek</option>
                <option value="K">Kız</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[var(--muted-foreground)] mb-1">Veli Adı</label>
              <input
                type="text"
                value={yeniOgrenci.veliAd}
                onChange={(e) => setYeniOgrenci({ ...yeniOgrenci, veliAd: e.target.value })}
                placeholder="Örn: Mehmet Yılmaz"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--muted-foreground)] mb-1">Veli Telefon</label>
              <input
                type="text"
                value={yeniOgrenci.veliTelefon}
                onChange={(e) => setYeniOgrenci({ ...yeniOgrenci, veliTelefon: e.target.value })}
                placeholder="Örn: 0532 111 2233"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            <div className="md:col-span-4 flex justify-end gap-2 mt-2">
              <button
                onClick={() => setFormAcik(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--secondary)] text-[var(--foreground)] hover:bg-gray-200 transition-all"
              >
                İptal
              </button>
              <button
                onClick={ekle}
                className="px-6 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md"
              >
                ✅ Öğrenciyi Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      {gorunum === "tablo" ? (
        <div className="glass-card rounded-2xl p-6 overflow-x-auto">
          <p className="text-sm text-[var(--muted-foreground)] mb-4">Toplam {filtrelenmis.length} öğrenci listeleniyor</p>
          <table className="w-full table-modern">
            <thead>
              <tr>
                <th className="text-left p-3 rounded-tl-xl">No</th>
                <th className="text-left p-3">Ad Soyad</th>
                <th className="text-center p-3">Sınıf</th>
                <th className="text-center p-3">Şube</th>
                <th className="text-center p-3">Cinsiyet</th>
                <th className="text-left p-3">Veli</th>
                <th className="text-left p-3">Telefon</th>
                <th className="text-center p-3 rounded-tr-xl">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtrelenmis.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[var(--muted-foreground)]">
                    Kriterlere uygun öğrenci bulunamadı.
                  </td>
                </tr>
              ) : (
                filtrelenmis.map((ogr) => (
                  <tr key={ogr.id} className="border-b border-[var(--border)]">
                    <td className="p-3 text-sm font-medium">{ogr.numara}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold">
                          {ogr.ad[0]}{ogr.soyad[0]}
                        </div>
                        <span className="font-medium text-sm">{ogr.ad} {ogr.soyad}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="badge-info px-3 py-1 rounded-lg text-xs font-bold">{ogr.sinif}. Sınıf</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="bg-purple-500/10 text-purple-600 border border-purple-500/20 px-3 py-1 rounded-lg text-xs font-bold">
                        {ogr.sube} Şubesi
                      </span>
                    </td>
                    <td className="p-3 text-center text-sm">{ogr.cinsiyet === "E" ? "👦" : "👧"}</td>
                    <td className="p-3 text-sm text-[var(--muted-foreground)]">{ogr.veliAd}</td>
                    <td className="p-3 text-sm text-[var(--muted-foreground)]">{ogr.veliTelefon}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setDuzenlenecekOgrenci(ogr)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 font-medium transition-all"
                        >
                          ✏️ Düzenle
                        </button>
                        <button onClick={() => sil(ogr.id)} className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 font-medium transition-all">
                          🗑️ Sil
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrelenmis.map((ogr, i) => (
            <div
              key={ogr.id}
              className={`glass-card rounded-2xl p-5 card-hover animate-slide-up stagger-${Math.min(i + 1, 10)}`}
              style={{ opacity: 0 }}
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {ogr.ad[0]}{ogr.soyad[0]}
                </div>
                <div>
                  <p className="font-bold text-[var(--foreground)]">{ogr.ad} {ogr.soyad}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    No: {ogr.numara} • <span className="font-semibold">{ogr.sinif}-{ogr.sube}</span>
                  </p>
                </div>
                <span className="ml-auto text-lg">{ogr.cinsiyet === "E" ? "👦" : "👧"}</span>
              </div>
              <div className="border-t border-[var(--border)] pt-3 space-y-1">
                <p className="text-xs text-[var(--muted-foreground)]">📱 Veli: {ogr.veliAd}</p>
                <p className="text-xs text-[var(--muted-foreground)]">📞 {ogr.veliTelefon}</p>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => setDuzenlenecekOgrenci(ogr)}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 font-medium transition-all"
                >
                  ✏️ Düzenle
                </button>
                <button onClick={() => sil(ogr.id)} className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 font-medium transition-all">
                  🗑️ Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
