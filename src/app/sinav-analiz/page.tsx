"use client";

import { useState, useEffect } from "react";
import { demoOgrenciler, sinifNumaralari, subeler, type Ogrenci } from "@/lib/data";
import { usePersistentState } from "@/lib/use-persistent-state";
import { 
  subscribeSinavlar, 
  saveSinav, 
  deleteSinav as deleteSinavFromDb, 
  subscribeOgrenciler,
  type SinavData as Sinav 
} from "@/lib/firestore-service";

interface SoruSonuc {
  dogru: number | "";
  yanlis: number | "";
  bos: number;
}

// Sınav Ders Yapısı (LGS Standartları: Türkçe:20, Mat:20, Fen:20, Sosyal:10, Din:10, İng:10)
const dersListesi = [
  { id: "turkce", ad: "Türkçe", soruSayisi: 20, katsayi: 4 },
  { id: "matematik", ad: "Matematik", soruSayisi: 20, katsayi: 4 },
  { id: "fen", ad: "Fen Bilgisi", soruSayisi: 20, katsayi: 4 },
  { id: "sosyal", ad: "Sosyal Bilgiler", soruSayisi: 10, katsayi: 1 },
  { id: "din", ad: "Din Kültürü", soruSayisi: 10, katsayi: 1 },
  { id: "ingilizce", ad: "İngilizce", soruSayisi: 10, katsayi: 1 },
];

export default function SinavAnalizPage() {
  const [secilenSinif, setSecilenSinif] = usePersistentState("egitim_sinav_analiz_sinif", "8");
  const [secilenSube, setSecilenSube] = usePersistentState("egitim_sinav_analiz_sube", "A");
  
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>(demoOgrenciler);
  const [sinavlar, setSinavlar] = useState<Sinav[]>([]);
  const [secilenSinavId, setSecilenSinifId] = useState<number | null>(null);
  const [yeniSinavAdi, setYeniSinavAdi] = useState("");
  const [sinavModalAcik, setSinavModalAcik] = useState(false);

  // Firestore Realtime Subscription (Öğrenciler & Sınavlar)
  useEffect(() => {
    const unsubOgrenciler = subscribeOgrenciler((data) => setOgrenciler(data));
    const unsubSinavlar = subscribeSinavlar((data) => {
      setSinavlar(data);
      if (data.length > 0 && secilenSinavId === null) {
        setSecilenSinifId(data[0].id);
      }
    });
    return () => {
      unsubOgrenciler();
      unsubSinavlar();
    };
  }, []);

  // Sınav Düzenleme State'leri
  const [duzenlenecekSinav, setDuzenlenecekSinav] = useState<Sinav | null>(null);
  const [duzenleSinavAdi, setDuzenleSinavAdi] = useState("");

  // Not Girişi Modalı State'leri
  const [aktifOgrenci, setAktifOgrenci] = useState<Ogrenci | null>(null);
  const [geciciNotlar, setGeciciNotlar] = useState<Record<string, SoruSonuc>>({});

  // Seçilen Sınıf ve Şubedeki Öğrenciler
  const sinifOgrencileri = ogrenciler.filter(
    (o) => o.sinif === secilenSinif && o.sube === secilenSube
  );

  // Seçilen Sınıf ve Şubedeki Sınavlar
  const filtreliSinavlar = sinavlar.filter(
    (s) => s.sinif === secilenSinif && s.sube === secilenSube
  );

  const aktifSinav = sinavlar.find((s) => s.id === secilenSinavId) || (filtreliSinavlar.length > 0 ? filtreliSinavlar[0] : undefined);

  // Yeni Sınav Ekleme
  const sinavEkle = async () => {
    if (!yeniSinavAdi.trim()) {
      alert("Lütfen sınav adı giriniz!");
      return;
    }
    const yeniId = sinavlar.length > 0 ? Math.max(...sinavlar.map((s) => s.id), 0) + 1 : 1;
    const yeniSinav: Sinav = {
      id: yeniId,
      ad: yeniSinavAdi,
      sinif: secilenSinif,
      sube: secilenSube,
      tarih: new Date().toISOString().split("T")[0],
      ogrenciNotlari: {},
    };

    await saveSinav(yeniSinav);
    setSecilenSinifId(yeniId);
    setYeniSinavAdi("");
    setSinavModalAcik(false);
  };

  // Sınav Adı Düzenleme Başlatma
  const sinavDuzenleAc = (e: React.MouseEvent, sinav: Sinav) => {
    e.stopPropagation();
    setDuzenlenecekSinav(sinav);
    setDuzenleSinavAdi(sinav.ad);
  };

  // Sınav Adını Kaydetme
  const sinavAdiniGuncelle = async () => {
    if (!duzenlenecekSinav || !duzenleSinavAdi.trim()) return;

    const guncel = { ...duzenlenecekSinav, ad: duzenleSinavAdi };
    await saveSinav(guncel);
    setDuzenlenecekSinav(null);
  };

  // Sınav Silme
  const sinavSil = async (e: React.MouseEvent, sinavId: number) => {
    e.stopPropagation();
    if (confirm("Bu sınavı ve sınava ait tüm notları silmek istediğinize emin misiniz?")) {
      await deleteSinavFromDb(sinavId);
      const kalanlar = sinavlar.filter((s) => s.id !== sinavId);
      if (secilenSinavId === sinavId) {
        setSecilenSinifId(kalanlar.length > 0 ? kalanlar[0].id : null);
      }
    }
  };

  // Öğrenci Notu Düzenleme Penceresini Açma
  const ogrenciNotuAc = (ogrenci: Ogrenci) => {
    setAktifOgrenci(ogrenci);
    if (aktifSinav && aktifSinav.ogrenciNotlari[ogrenci.id]) {
      setGeciciNotlar(JSON.parse(JSON.stringify(aktifSinav.ogrenciNotlari[ogrenci.id])));
    } else {
      // Varsayılan boş notlar (Kutucuklar boş gelsin)
      const bos: Record<string, SoruSonuc> = {};
      dersListesi.forEach((d) => {
        bos[d.id] = { dogru: "", yanlis: "", bos: d.soruSayisi };
      });
      setGeciciNotlar(bos);
    }
  };

  // Doğru/Yanlış Girişinde Otomatik Boş Hesaplama
  const notGuncelle = (dersId: string, alan: "dogru" | "yanlis", degerStr: string) => {
    const dersInfo = dersListesi.find((d) => d.id === dersId);
    if (!dersInfo) return;

    const mevcut = geciciNotlar[dersId] || { dogru: "", yanlis: "", bos: dersInfo.soruSayisi };
    
    let yeniDeger: number | "" = degerStr === "" ? "" : parseInt(degerStr);
    if (typeof yeniDeger === "number" && isNaN(yeniDeger)) yeniDeger = "";

    let yeniDogru = alan === "dogru" ? yeniDeger : mevcut.dogru;
    let yeniYanlis = alan === "yanlis" ? yeniDeger : mevcut.yanlis;

    const dSayisi = typeof yeniDogru === "number" ? yeniDogru : 0;
    const ySayisi = typeof yeniYanlis === "number" ? yeniYanlis : 0;

    const yeniBos = Math.max(0, dersInfo.soruSayisi - (dSayisi + ySayisi));

    setGeciciNotlar({
      ...geciciNotlar,
      [dersId]: { dogru: yeniDogru, yanlis: yeniYanlis, bos: yeniBos },
    });
  };

  // Öğrenci Notunu Kaydetme
  const ogrenciNotuKaydet = async () => {
    if (!aktifSinav || !aktifOgrenci) return;

    const guncelSinav: Sinav = {
      ...aktifSinav,
      ogrenciNotlari: {
        ...aktifSinav.ogrenciNotlari,
        [aktifOgrenci.id]: geciciNotlar,
      },
    };

    await saveSinav(guncelSinav);
    setAktifOgrenci(null);
  };

  // 3 Yanlış 1 Doğruyu Götürecek Şekilde Net Hesaplama
  const netHesapla = (d: SoruSonuc | undefined) => {
    if (!d) return 0;
    const dSayisi = typeof d.dogru === "number" ? d.dogru : 0;
    const ySayisi = typeof d.yanlis === "number" ? d.yanlis : 0;
    const net = dSayisi - ySayisi / 3;
    return Math.max(0, parseFloat(net.toFixed(2)));
  };

  // LGS Puan Hesaplama Modülü
  const lgsPuanHesapla = (notlar: Record<string, SoruSonuc> | undefined) => {
    if (!notlar) return 0;

    const turkceNet = netHesapla(notlar["turkce"]);
    const matNet = netHesapla(notlar["matematik"]);
    const fenNet = netHesapla(notlar["fen"]);
    const sosNet = netHesapla(notlar["sosyal"]);
    const dinNet = netHesapla(notlar["din"]);
    const ingNet = netHesapla(notlar["ingilizce"]);

    const toplamNet = turkceNet + matNet + fenNet + sosNet + dinNet + ingNet;
    if (toplamNet === 0) return 0;

    // 8. Sınıf ise LGS 500'lük Puan Formülü
    if (secilenSinif === "8") {
      const puan = 194.76 + (turkceNet * 4.32) + (matNet * 4.28) + (fenNet * 4.07) + (sosNet * 1.68) + (dinNet * 1.84) + (ingNet * 1.58);
      return Math.min(500, parseFloat(puan.toFixed(3)));
    }

    // Diğer Sınıflar İçin 100 Üzerinden Ağırlıklı Puan
    const maxAglNet = (20 * 4) + (20 * 4) + (20 * 4) + (10 * 1) + (10 * 1) + (10 * 1); // 270
    const ogrenciAglNet = (turkceNet * 4) + (matNet * 4) + (fenNet * 4) + (sosNet * 1) + (dinNet * 1) + (ingNet * 1);
    const yuzlukPuan = (ogrenciAglNet / maxAglNet) * 100;
    return parseFloat(yuzlukPuan.toFixed(2));
  };

  const toplamNetBul = (notlar: Record<string, SoruSonuc> | undefined) => {
    if (!notlar) return 0;
    let t = 0;
    dersListesi.forEach((d) => {
      t += netHesapla(notlar[d.id]);
    });
    return parseFloat(t.toFixed(2));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. ADIM: Sınıf, Şube ve Sınav Seçimi Barı */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">🏫 Sınıf Seçimi</label>
              <select
                value={secilenSinif}
                onChange={(e) => {
                  setSecilenSinif(e.target.value);
                  setSecilenSinavId(null);
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] font-medium focus:ring-2 focus:ring-[var(--ring)]"
              >
                {sinifNumaralari.map((s) => (
                  <option key={s} value={s}>{s}. Sınıf</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">🅰️ Şube Seçimi</label>
              <select
                value={secilenSube}
                onChange={(e) => {
                  setSecilenSube(e.target.value);
                  setSecilenSinavId(null);
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] font-medium focus:ring-2 focus:ring-[var(--ring)]"
              >
                {subeler.map((sube) => (
                  <option key={sube} value={sube}>{sube} Şubesi</option>
                ))}
              </select>
            </div>

            {/* Sınavlar Dropdown (Açılır Ok) */}
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">📝 Sınav Seçimi</label>
              <select
                value={secilenSinavId || ""}
                onChange={(e) => setSecilenSinavId(e.target.value ? parseInt(e.target.value) : null)}
                disabled={filtreliSinavlar.length === 0}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] font-bold focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50"
              >
                {filtreliSinavlar.length === 0 ? (
                  <option value="">(Bu sınıfa ait sınav yok)</option>
                ) : (
                  filtreliSinavlar.map((s) => (
                    <option key={s.id} value={s.id}>
                      📄 {s.ad} ({s.tarih})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <button
              onClick={() => setSinavModalAcik(true)}
              className="px-6 py-2.5 rounded-xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white hover:opacity-90 transition-all shadow-lg hover:scale-105 flex items-center gap-2"
            >
              ➕ Yeni Sınav
            </button>
          </div>
        </div>
      </div>

      {/* 2. ADIM: Sınıftaki Öğrencilerin Not Tablosu */}
      {aktifSinav ? (
        <div className="glass-card rounded-2xl p-6 overflow-x-auto space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border)] pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-[var(--foreground)] flex items-center gap-2">
                  <span>🎓 {aktifSinav.ad}</span>
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Not girmek veya düzenlemek için listedeki öğrencinin üzerine tıklayın.
                </p>
              </div>

              {/* Sınav Adını Değiştir ve Sil Butonları Başlığın Yanında */}
              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={(e) => sinavDuzenleAc(e, aktifSinav)}
                  className="px-3 py-1.5 bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-[var(--border)]"
                  title="Sınav Adını Değiştir"
                >
                  ✏️ Adı Değiştir
                </button>
                <button
                  onClick={(e) => sinavSil(e, aktifSinav.id)}
                  className="px-3 py-1.5 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-red-500/20"
                  title="Sınavı Sil"
                >
                  🗑️ Sil
                </button>
              </div>
            </div>

            {secilenSinif === "8" && (
              <span className="px-3 py-1.5 bg-purple-500/10 text-purple-600 border border-purple-500/20 font-bold rounded-xl text-xs whitespace-nowrap">
                🏆 LGS 500 Puan Sistemi Aktif
              </span>
            )}
          </div>

          <table className="w-full table-modern">
            <thead>
              <tr>
                <th className="text-left p-3 rounded-tl-xl">No</th>
                <th className="text-left p-3">Öğrenci Ad Soyad</th>
                <th className="text-center p-3">Türkçe (20)</th>
                <th className="text-center p-3">Matematik (20)</th>
                <th className="text-center p-3">Fen Bilgisi (20)</th>
                <th className="text-center p-3">Sosyal B. (10)</th>
                <th className="text-center p-3">Din K. (10)</th>
                <th className="text-center p-3">İngilizce (10)</th>
                <th className="text-center p-3 bg-blue-500/10 text-blue-600">Toplam Net</th>
                <th className="text-center p-3 bg-purple-500/10 text-purple-600 rounded-tr-xl">
                  {secilenSinif === "8" ? "LGS Puanı" : "Puan (100)"}
                </th>
              </tr>
            </thead>
            <tbody>
              {sinifOgrencileri.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[var(--muted-foreground)]">
                    Bu sınıf ve şubede henüz kayıtlı öğrenci yok. Sınıf Listesi modülünden öğrenci ekleyebilirsiniz.
                  </td>
                </tr>
              ) : (
                sinifOgrencileri.map((ogr) => {
                  const notlar = aktifSinav.ogrenciNotlari[ogr.id];
                  const puan = lgsPuanHesapla(notlar);
                  const topNet = toplamNetBul(notlar);

                  return (
                    <tr
                      key={ogr.id}
                      onClick={() => ogrenciNotuAc(ogr)}
                      className="border-b border-[var(--border)] cursor-pointer hover:bg-[var(--primary)]/10 transition-colors group"
                    >
                      <td className="p-3 font-semibold text-sm">{ogr.numara}</td>
                      <td className="p-3 font-bold text-sm text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                        <div className="flex items-center gap-2">
                          <span>{ogr.ad} {ogr.soyad}</span>
                          <span className="text-xs opacity-0 group-hover:opacity-100 text-[var(--primary)]">✏️ Not Gir</span>
                        </div>
                      </td>

                      {dersListesi.map((d) => {
                        const dn = notlar?.[d.id];
                        const net = netHesapla(dn);
                        const dStr = dn?.dogru === "" || dn?.dogru === undefined ? "-" : `${dn.dogru}D`;
                        const yStr = dn?.yanlis === "" || dn?.yanlis === undefined ? "-" : `${dn.yanlis}Y`;

                        return (
                          <td key={d.id} className="p-3 text-center text-xs">
                            {dn ? (
                              <div>
                                <span className="font-bold text-[var(--foreground)]">{net} Net</span>
                                <div className="text-[10px] text-[var(--muted-foreground)]">
                                  {dStr} {yStr} {dn.bos}B
                                </div>
                              </div>
                            ) : (
                              <span className="text-[var(--muted-foreground)]">-</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="p-3 text-center bg-blue-500/5 font-extrabold text-blue-600 text-sm">
                        {topNet}
                      </td>

                      <td className="p-3 text-center bg-purple-500/5 font-extrabold text-purple-600 text-sm">
                        {puan > 0 ? puan : "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-12 text-center text-[var(--muted-foreground)] space-y-3">
          <span className="text-4xl block">📝</span>
          <p className="text-base font-bold text-[var(--foreground)]">Henüz Bir Sınav Seçilmedi</p>
          <p className="text-sm max-w-md mx-auto">
            Yukarıdaki <strong>"Sınav Seçimi"</strong> açılır menüsünden (ok) mevcut bir sınavı seçebilir veya <strong>"➕ Yeni Sınav"</strong> butonuyla yenisini ekleyebilirsiniz.
          </p>
        </div>
      )}

      {/* MODAL 1: Yeni Sınav Ekleme Pencerisi */}
      {sinavModalAcik && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="glass-card bg-[var(--card)] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-[var(--border)]">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
              <h3 className="text-lg font-bold text-[var(--foreground)]">➕ Yeni Sınav Oluştur</h3>
              <button onClick={() => setSinavModalAcik(false)} className="text-[var(--muted-foreground)] font-bold">✕</button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">Hedef Sınıf / Şube</label>
              <div className="p-3 rounded-xl bg-[var(--secondary)] font-bold text-sm text-[var(--foreground)]">
                {secilenSinif}. Sınıf / {secilenSube} Şubesi
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">Sınav Adı</label>
              <input
                type="text"
                value={yeniSinavAdi}
                onChange={(e) => setYeniSinavAdi(e.target.value)}
                placeholder="Örn: 2. LGS Deneme Sınavı"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSinavModalAcik(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--secondary)] text-[var(--foreground)]"
              >
                İptal
              </button>
              <button
                onClick={sinavEkle}
                className="px-6 py-2 rounded-xl text-sm font-bold bg-[var(--primary)] text-white shadow-md hover:opacity-90"
              >
                Sınavı Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Sınav Adı Düzenleme Pencerisi */}
      {duzenlenecekSinav && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="glass-card bg-[var(--card)] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-[var(--border)]">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
              <h3 className="text-lg font-bold text-[var(--foreground)]">✏️ Sınav Adını Düzenle</h3>
              <button onClick={() => setDuzenlenecekSinav(null)} className="text-[var(--muted-foreground)] font-bold">✕</button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">Sınav Adı</label>
              <input
                type="text"
                value={duzenleSinavAdi}
                onChange={(e) => setDuzenleSinavAdi(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDuzenlenecekSinav(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--secondary)] text-[var(--foreground)]"
              >
                İptal
              </button>
              <button
                onClick={sinavAdiniGuncelle}
                className="px-6 py-2 rounded-xl text-sm font-bold bg-[var(--primary)] text-white shadow-md hover:opacity-90"
              >
                💾 Güncelle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Öğrenci Notu Giriş Penceresi */}
      {aktifOgrenci && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="glass-card bg-[var(--card)] rounded-2xl p-6 max-w-3xl w-full space-y-5 shadow-2xl border border-[var(--border)] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[var(--foreground)]">
                  ✏️ {aktifOgrenci.ad} {aktifOgrenci.soyad} — Not Girişi
                </h3>
                <p className="text-xs text-[var(--muted-foreground)]">Sınav: {aktifSinav?.ad}</p>
              </div>
              <button onClick={() => setAktifOgrenci(null)} className="text-[var(--muted-foreground)] font-bold text-xl">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dersListesi.map((ders) => {
                const dn = geciciNotlar[ders.id] || { dogru: "", yanlis: "", bos: ders.soruSayisi };
                const net = netHesapla(dn);

                return (
                  <div key={ders.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)] space-y-3">
                    <div className="flex justify-between items-center border-b border-[var(--border)] pb-2">
                      <span className="font-bold text-sm text-[var(--foreground)]">{ders.ad} ({ders.soruSayisi} Soru)</span>
                      <span className="font-extrabold text-sm text-[var(--primary)] bg-[var(--primary)]/10 px-2.5 py-1 rounded-lg">
                        {net} Net
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <label className="block text-[11px] text-emerald-600 font-bold mb-1">Doğru</label>
                        <input
                          type="number"
                          value={dn.dogru}
                          onChange={(e) => notGuncelle(ders.id, "dogru", e.target.value)}
                          placeholder=""
                          className="w-full text-center py-1.5 rounded-lg border border-[var(--border)] font-bold text-sm bg-transparent focus:ring-2 focus:ring-[var(--ring)]"
                          min="0"
                          max={ders.soruSayisi}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-red-500 font-bold mb-1">Yanlış</label>
                        <input
                          type="number"
                          value={dn.yanlis}
                          onChange={(e) => notGuncelle(ders.id, "yanlis", e.target.value)}
                          placeholder=""
                          className="w-full text-center py-1.5 rounded-lg border border-[var(--border)] font-bold text-sm bg-transparent focus:ring-2 focus:ring-[var(--ring)]"
                          min="0"
                          max={ders.soruSayisi}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-[var(--muted-foreground)] font-bold mb-1">Boş</label>
                        <div className="py-1.5 rounded-lg bg-[var(--secondary)] font-bold text-sm text-[var(--muted-foreground)]">
                          {dn.bos}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Anlık Hesaplanan Özet Barı */}
            <div className="p-4 rounded-xl gradient-bg text-white flex justify-between items-center shadow-lg">
              <div>
                <span className="text-xs opacity-80 block">Hesaplanan Toplam Net</span>
                <span className="text-2xl font-extrabold">
                  {toplamNetBul(geciciNotlar)} Net
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs opacity-80 block">
                  {secilenSinif === "8" ? "Hesaplanan LGS Puanı" : "Hesaplanan Puan"}
                </span>
                <span className="text-2xl font-extrabold">
                  {lgsPuanHesapla(geciciNotlar)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setAktifOgrenci(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--secondary)] text-[var(--foreground)]"
              >
                Vazgeç
              </button>
              <button
                onClick={ogrenciNotuKaydet}
                className="px-6 py-2 rounded-xl text-sm font-bold bg-[var(--primary)] text-white shadow-md hover:opacity-90"
              >
                💾 Notları Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
