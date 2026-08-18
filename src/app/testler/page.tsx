"use client";

import { useState, useEffect, useMemo } from "react";
import { demoOgrenciler, sinifNumaralari, subeler, type Ogrenci } from "@/lib/data";
import { usePersistentState } from "@/lib/use-persistent-state";
import {
  subscribeOgrenciler,
  subscribeTestler,
  saveTest,
  deleteTest,
  type TestDocData as TestDoc,
  type OgrenciTestKayit as OgrenciKayit,
} from "@/lib/firestore-service";

// ============================================================
// TYPES
// ============================================================
type DersId = "turkce" | "matematik" | "fen" | "sosyal" | "ingilizce";

const DERSLER: { id: DersId; label: string; emoji: string; renk: string }[] = [
  { id: "turkce",    label: "Türkçe",         emoji: "📖", renk: "indigo"  },
  { id: "matematik", label: "Matematik",       emoji: "🔢", renk: "violet"  },
  { id: "fen",       label: "Fen Bilgisi",     emoji: "🔬", renk: "sky"     },
  { id: "sosyal",    label: "Sosyal Bilgiler", emoji: "🌍", renk: "amber"   },
  { id: "ingilizce", label: "İngilizce",       emoji: "🇬🇧", renk: "emerald" },
];

const DERS_PLACEHOLDERS: Record<DersId, string> = {
  turkce:    "örn: Fiilimsiler, Sözcükte Anlam, Cümlede Anlam, Paragrafta Anlam...",
  matematik: "örn: Çarpanlar ve Katlar, Üslü İfadeler, Kareköklü İfadeler, Denklemler...",
  fen:       "örn: Mevsimler ve İklim, DNA ve Genetik Kod, Basınç, Basit Makineler...",
  sosyal:    "örn: Bir Kahraman Doğuyor, Milli Uyanış, Atatürkçülük...",
  ingilizce: "örn: Friendship, Teen Life, In The Kitchen, On The Phone, The Internet...",
};

type TestKayitlari = Record<number, OgrenciKayit>;

// ============================================================
// NET HESAPLAMA  (3 yanlış = 1 doğru götürür)
// ============================================================
function netHesapla(d: number | "", y: number | ""): number {
  const dogru  = Number(d) || 0;
  const yanlis = Number(y) || 0;
  return Math.max(0, dogru - yanlis / 3);
}

// ============================================================
// PAGE COMPONENT
// ============================================================
export default function TestlerPage() {
  // Sınıf, Şube ve Ders Tercihleri (Kalıcı)
  const [secilenSinif, setSecilenSinif] = usePersistentState("egitim_testler_sinif", "8");
  const [secilenSube, setSecilenSube]   = usePersistentState("egitim_testler_sube",  "A");
  const [secilenDers, setSecilenDers]   = usePersistentState<DersId>("egitim_testler_secilen_ders", "turkce");

  // Öğrenciler
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>(demoOgrenciler);

  useEffect(() => {
    const unsub = subscribeOgrenciler((list) => setOgrenciler(list));
    return unsub;
  }, []);

  const filtrelenmisOgrenciler = useMemo(
    () => ogrenciler.filter((o) => o.sinif === secilenSinif && o.sube === secilenSube),
    [ogrenciler, secilenSinif, secilenSube]
  );

  // Sınıf & Şubeye Ait Tüm Testler
  const [tumTestler, setTumTestler] = useState<TestDoc[]>([]);

  useEffect(() => {
    const unsub = subscribeTestler(secilenSinif, secilenSube, setTumTestler);
    return unsub;
  }, [secilenSinif, secilenSube]);

  // Seçili derse göre filtrelenmiş testler
  const derseGoreTestler = useMemo(
    () => tumTestler.filter((t) => t.ders === secilenDers),
    [tumTestler, secilenDers]
  );

  // Aktif test seçimi
  const [aktifTestId, setAktifTestId] = useState<string | null>(null);

  // Ders veya testler değiştiğinde aktif testi otomatik senkronize et
  useEffect(() => {
    if (derseGoreTestler.length > 0) {
      const exists = derseGoreTestler.some((t) => t.id === aktifTestId);
      if (!exists) {
        setAktifTestId(derseGoreTestler[0].id);
      }
    } else {
      setAktifTestId(null);
    }
  }, [secilenDers, derseGoreTestler, aktifTestId]);

  const aktifTest = derseGoreTestler.find((t) => t.id === aktifTestId) ?? null;

  // Modal State'leri
  const [modalAcik,    setModalAcik]    = useState(false);
  const [yeniDers,     setYeniDers]     = useState<DersId>(secilenDers);
  const [yeniKonu,     setYeniKonu]     = useState("");
  const [yeniTarih,    setYeniTarih]    = useState(() => new Date().toISOString().split("T")[0]);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  // Modal açıldığında yeniDers'i seçili ders ile eşitle
  const modalAc = () => {
    setYeniDers(secilenDers);
    setYeniKonu("");
    setModalAcik(true);
  };

  // Öğrenci kayıtları (local state – Firestore'a anlık yazar)
  const [kayitlar, setKayitlar] = useState<TestKayitlari>({});

  useEffect(() => {
    setKayitlar(aktifTest?.kayitlar ?? {});
  }, [aktifTestId, aktifTest]);

  // Sıralama: net büyükten küçüğe (veri girilmemişler sona)
  const siraliOgrenciler = useMemo(() => {
    return [...filtrelenmisOgrenciler].sort((a, b) => {
      const ka = kayitlar[a.id];
      const kb = kayitlar[b.id];
      const hasA = ka && (ka.dogru !== "" || ka.yanlis !== "");
      const hasB = kb && (kb.dogru !== "" || kb.yanlis !== "");
      if (!hasA && !hasB) return 0;
      if (!hasA) return 1;
      if (!hasB) return -1;
      return netHesapla(kb.dogru, kb.yanlis) - netHesapla(ka.dogru, ka.yanlis);
    });
  }, [filtrelenmisOgrenciler, kayitlar]);

  // Kayıt güncelle
  const updateKayit = async (ogrenciId: number, alan: keyof OgrenciKayit, deger: string) => {
    if (!aktifTest) return;
    const parsed: number | "" = deger === "" ? "" : Math.max(0, parseInt(deger, 10) || 0);
    const guncel: TestKayitlari = {
      ...kayitlar,
      [ogrenciId]: {
        dogru:  kayitlar[ogrenciId]?.dogru  ?? "",
        yanlis: kayitlar[ogrenciId]?.yanlis ?? "",
        bos:    kayitlar[ogrenciId]?.bos    ?? "",
        [alan]: parsed,
      },
    };
    setKayitlar(guncel);
    await saveTest({ ...aktifTest, kayitlar: guncel, updatedAt: new Date().toISOString() });
  };

  // Yeni test oluştur
  const yeniTestOlustur = () => {
    const konu = yeniKonu.trim();
    if (!konu) return;

    const id = `${secilenSinif}${secilenSube}-${yeniDers}-${Date.now()}`;
    const test: TestDoc = {
      id,
      sinif: secilenSinif,
      sube: secilenSube,
      ders: yeniDers,
      konuBasligi: konu,
      tarih: yeniTarih,
      kayitlar: {},
      updatedAt: new Date().toISOString(),
    };

    // Modalı hemen anında kapat ve formu sıfırla
    setModalAcik(false);
    setYeniKonu("");

    // Aktif ders ve aktif testi anında güncelle
    if (yeniDers !== secilenDers) {
      setSecilenDers(yeniDers);
    }
    setAktifTestId(id);

    // Arka planda Firestore'a kaydet
    saveTest(test).catch((err) => {
      console.error("Test kaydetme hatası:", err);
    });
  };

  // Testi sil
  const testSil = async (id: string) => {
    if (!confirm("Bu testi silmek istediğinize emin misiniz?")) return;
    await deleteTest(id);
    if (aktifTestId === id) setAktifTestId(null);
  };

  // İsim Analizi Modalı State'leri
  const [isimAnaliziAcik, setIsimAnaliziAcik] = useState(false);
  const [analizOgrenciId, setAnalizOgrenciId] = useState<number | null>(null);
  const [analizDersFiltre, setAnalizDersFiltre] = useState<"tum" | DersId>("tum");

  // İsim analizi açma fonksiyonu
  const isimAnaliziAc = (ogrId?: number) => {
    if (ogrId) {
      setAnalizOgrenciId(ogrId);
    } else if (!analizOgrenciId && filtrelenmisOgrenciler.length > 0) {
      setAnalizOgrenciId(filtrelenmisOgrenciler[0].id);
    }
    setIsimAnaliziAcik(true);
  };

  // Seçili analiz öğrencisi
  const seciliAnalizOgrenci = useMemo(() => {
    return ogrenciler.find((o) => o.id === analizOgrenciId) || filtrelenmisOgrenciler[0] || null;
  }, [ogrenciler, analizOgrenciId, filtrelenmisOgrenciler]);

  // Seçili öğrencinin çözmüş olduğu tüm testler ve sonuçları
  const ogrenciAnalizTestleri = useMemo(() => {
    if (!seciliAnalizOgrenci) return [];
    const ogrId = seciliAnalizOgrenci.id;

    return tumTestler
      .filter((t) => {
        if (analizDersFiltre !== "tum" && t.ders !== analizDersFiltre) return false;
        const k = t.kayitlar?.[ogrId];
        return k && (k.dogru !== "" || k.yanlis !== "" || k.bos !== "");
      })
      .map((t) => {
        const k = t.kayitlar[ogrId];
        const dogru = Number(k.dogru) || 0;
        const yanlis = Number(k.yanlis) || 0;
        const bos = Number(k.bos) || 0;
        const net = netHesapla(k.dogru, k.yanlis);

        // Bu testteki sınıf içi sıralamasını hesapla
        const testKatilimcilar = Object.entries(t.kayitlar || {})
          .filter(([_, val]) => val.dogru !== "" || val.yanlis !== "")
          .map(([idStr, val]) => ({
            id: Number(idStr),
            net: netHesapla(val.dogru, val.yanlis),
          }))
          .sort((a, b) => b.net - a.net);

        const sira = testKatilimcilar.findIndex((x) => x.id === ogrId) + 1;

        return {
          id: t.id,
          tarih: t.tarih,
          ders: t.ders,
          konuBasligi: t.konuBasligi,
          dogru,
          yanlis,
          bos,
          net,
          sira: sira > 0 ? sira : "-",
          toplamKatilim: testKatilimcilar.length,
        };
      })
      .sort((a, b) => b.tarih.localeCompare(a.tarih));
  }, [tumTestler, seciliAnalizOgrenci, analizDersFiltre]);

  // Öğrencinin genel test istatistikleri
  const ogrenciIstatistikleri = useMemo(() => {
    if (ogrenciAnalizTestleri.length === 0) {
      return { toplamTest: 0, ortalamaNet: 0, enYuksekNet: 0, toplamDogru: 0, toplamYanlis: 0, toplamBos: 0 };
    }
    const toplamTest = ogrenciAnalizTestleri.length;
    const toplamNet = ogrenciAnalizTestleri.reduce((acc, t) => acc + t.net, 0);
    const enYuksekNet = Math.max(...ogrenciAnalizTestleri.map((t) => t.net));
    const toplamDogru = ogrenciAnalizTestleri.reduce((acc, t) => acc + t.dogru, 0);
    const toplamYanlis = ogrenciAnalizTestleri.reduce((acc, t) => acc + t.yanlis, 0);
    const toplamBos = ogrenciAnalizTestleri.reduce((acc, t) => acc + t.bos, 0);

    return {
      toplamTest,
      ortalamaNet: toplamNet / toplamTest,
      enYuksekNet,
      toplamDogru,
      toplamYanlis,
      toplamBos,
    };
  }, [ogrenciAnalizTestleri]);

  // Renk yardımcıları
  const dersInfo = (dersId: DersId) => DERSLER.find((d) => d.id === dersId)!;
  const netRenk = (net: number) => {
    if (net >= 16) return "text-emerald-500";
    if (net >= 10) return "text-sky-500";
    if (net >= 5)  return "text-amber-500";
    return "text-red-500";
  };

  const renkMap: Record<string, string> = {
    indigo:  "border-l-indigo-500 bg-indigo-500/5",
    violet:  "border-l-violet-500 bg-violet-500/5",
    sky:     "border-l-sky-500    bg-sky-500/5",
    amber:   "border-l-amber-500  bg-amber-500/5",
    emerald: "border-l-emerald-500 bg-emerald-500/5",
  };

  const btnRenk: Record<string, string> = {
    indigo:  "bg-indigo-600  shadow-indigo-500/30",
    violet:  "bg-violet-600  shadow-violet-500/30",
    sky:     "bg-sky-600     shadow-sky-500/30",
    amber:   "bg-amber-500   shadow-amber-500/30",
    emerald: "bg-emerald-600 shadow-emerald-500/30",
  };

  const seciliDersDetay = dersInfo(secilenDers);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* BAŞLIK & SAĞ ÜST BUTONLAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold gradient-text">📝 Testler & Net Analizleri</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Ders bazlı konu testlerini seçin, netleri girin ve başarı sıralamasını anında görün.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => isimAnaliziAc()}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-violet-600/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 hover:bg-violet-600 hover:text-white transition-all hover:scale-105 shadow-sm flex items-center gap-2"
          >
            <span>👤</span>
            <span>İsim Analizi</span>
          </button>
          <button
            onClick={modalAc}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all hover:scale-105 shadow-lg flex items-center gap-2"
          >
            <span>➕</span>
            <span>Yeni {seciliDersDetay.label} Testi Ekle</span>
          </button>
        </div>
      </div>

      {/* DERS SEÇİM TABS (ÜSTTE ÖNCELİKLİ) */}
      <div className="glass-card rounded-2xl p-3">
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <span className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
            📚 Branş / Ders Seçimi (Her dersin neticelerini ayrı inceleyin)
          </span>
          <span className="text-xs font-medium text-indigo-500">
            Aktif Ders: <strong>{seciliDersDetay.label}</strong>
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {DERSLER.map((d) => {
            const isActive = secilenDers === d.id;
            const dersTestSayisi = tumTestler.filter((t) => t.ders === d.id).length;

            const activeStyles: Record<DersId, string> = {
              turkce:    "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border-indigo-500 scale-[1.02]",
              matematik: "bg-violet-600 text-white shadow-lg shadow-violet-500/25 border-violet-500 scale-[1.02]",
              fen:       "bg-sky-600 text-white shadow-lg shadow-sky-500/25 border-sky-500 scale-[1.02]",
              sosyal:    "bg-amber-500 text-white shadow-lg shadow-amber-500/25 border-amber-500 scale-[1.02]",
              ingilizce: "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 border-emerald-500 scale-[1.02]",
            };

            return (
              <button
                key={d.id}
                onClick={() => setSecilenDers(d.id)}
                className={`flex items-center justify-between p-3 rounded-xl font-bold transition-all border ${
                  isActive
                    ? activeStyles[d.id]
                    : "border-[var(--border)] bg-[var(--background)]/60 text-[var(--foreground)] hover:bg-[var(--background)] hover:border-indigo-500/40"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-xl">{d.emoji}</span>
                  <span className="text-sm font-extrabold truncate">{d.label}</span>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-black ml-1 shrink-0 ${
                  isActive ? "bg-white/25 text-white" : "bg-indigo-500/10 text-indigo-500"
                }`}>
                  {dersTestSayisi}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SINIF VE ŞUBE FİLTRESİ */}
      <div className="glass-card rounded-2xl p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">Sınıf</label>
            <select
              value={secilenSinif}
              onChange={(e) => setSecilenSinif(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              {sinifNumaralari.map((s) => <option key={s} value={s}>{s}. Sınıf</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">Şube</label>
            <select
              value={secilenSube}
              onChange={(e) => setSecilenSube(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              {subeler.map((s) => <option key={s} value={s}>{s} Şubesi</option>)}
            </select>
          </div>
          <div className="col-span-2 flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
            <span className="text-xl">👥</span>
            <span>
              <strong className="text-[var(--foreground)]">{filtrelenmisOgrenciler.length}</strong> öğrenci &nbsp;•&nbsp;
              <strong className="text-[var(--foreground)]">{seciliDersDetay.label}</strong> için{" "}
              <strong className="text-indigo-500">{derseGoreTestler.length}</strong> test kayıtlı
            </span>
          </div>
        </div>
      </div>

      {/* ANA İÇERİK: SOLDA TEST LİSTESİ, SAĞDA NET TABLOSU */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* Sol: Seçili Derse Ait Test Listesi */}
        <div className="lg:col-span-1 space-y-2">
          <div className="flex items-center justify-between px-1 mb-2">
            <h3 className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wide">
              {seciliDersDetay.emoji} {seciliDersDetay.label} Testleri
            </h3>
            <span className="text-xs font-bold text-indigo-500">
              ({derseGoreTestler.length})
            </span>
          </div>

          {derseGoreTestler.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center text-sm text-[var(--muted-foreground)] space-y-3">
              <p className="text-3xl">📭</p>
              <p className="font-semibold text-xs leading-relaxed">
                Bu sınıfta henüz <strong>{seciliDersDetay.label}</strong> testi eklenmemiş.
              </p>
              <button
                onClick={modalAc}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-indigo-600/10 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"
              >
                + Test Ekle
              </button>
            </div>
          ) : (
            derseGoreTestler.map((t) => {
              const info = dersInfo(t.ders);
              const isActive = aktifTestId === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setAktifTestId(t.id)}
                  className={`glass-card rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.01] border-2 ${
                    isActive ? "border-indigo-500 shadow-lg shadow-indigo-500/20" : "border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{info.emoji}</span>
                        <p className="text-xs font-bold text-[var(--muted-foreground)]">{info.label}</p>
                      </div>
                      <p className="text-sm font-bold text-[var(--foreground)] truncate mt-1">{t.konuBasligi}</p>
                      <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                        📅 {new Date(t.tarih).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); testSil(t.id); }}
                      className="shrink-0 w-6 h-6 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center font-bold text-xs"
                      title="Testi Sil"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sağ: Aktif test net tablosu */}
        <div className="lg:col-span-3">
          {!aktifTest ? (
            <div className="glass-card rounded-2xl p-12 text-center space-y-4">
              <p className="text-5xl">{seciliDersDetay.emoji}</p>
              <div>
                <p className="text-lg font-bold text-[var(--foreground)]">
                  {seciliDersDetay.label} Dersi İçin Test Seçin veya Ekleyin
                </p>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  Soldaki listeden bir test seçebilir veya yeni bir konu testi oluşturabilirsiniz.
                </p>
              </div>
              <button
                onClick={modalAc}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all hover:scale-105 shadow-md inline-flex items-center gap-2"
              >
                <span>➕</span>
                <span>Yeni {seciliDersDetay.label} Testi Ekle</span>
              </button>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden">
              {/* Test başlık */}
              <div className={`border-l-4 p-5 ${renkMap[dersInfo(aktifTest.ders).renk]}`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{dersInfo(aktifTest.ders).emoji}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600">
                          {dersInfo(aktifTest.ders).label}
                        </span>
                        <span className="text-xs text-[var(--muted-foreground)]">
                          📅 {new Date(aktifTest.tarih).toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                      <h3 className="text-xl font-extrabold text-[var(--foreground)] mt-0.5">{aktifTest.konuBasligi}</h3>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        {secilenSinif}-{secilenSube} Sınıfı • {filtrelenmisOgrenciler.length} Öğrenci • 3 Yanlış 1 Doğruyu Götürür
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => testSil(aktifTest.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5"
                  >
                    <span>🗑️</span>
                    <span>Testi Sil</span>
                  </button>
                </div>
              </div>

              {/* Tablo */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--background)]/50">
                      <th className="text-left p-3 text-xs font-bold text-[var(--muted-foreground)] uppercase w-12">Sıra</th>
                      <th className="text-left p-3 text-xs font-bold text-[var(--muted-foreground)] uppercase">Öğrenci Adı Soyadı</th>
                      <th className="text-center p-3 text-xs font-bold text-emerald-600 uppercase w-24">✅ Doğru</th>
                      <th className="text-center p-3 text-xs font-bold text-red-500 uppercase w-24">❌ Yanlış</th>
                      <th className="text-center p-3 text-xs font-bold text-[var(--muted-foreground)] uppercase w-24">⬜ Boş</th>
                      <th className="text-center p-3 text-xs font-bold text-sky-600 uppercase w-28">⭐ Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siraliOgrenciler.map((ogr, idx) => {
                      const k = kayitlar[ogr.id];
                      const hasData = k && (k.dogru !== "" || k.yanlis !== "");
                      const net = hasData ? netHesapla(k.dogru, k.yanlis) : 0;
                      const madalya =
                        idx === 0 && hasData ? "bg-amber-400 text-white" :
                        idx === 1 && hasData ? "bg-slate-400 text-white" :
                        idx === 2 && hasData ? "bg-orange-700 text-white" :
                        "bg-[var(--background)] text-[var(--muted-foreground)] border border-[var(--border)]";
                      return (
                        <tr
                          key={ogr.id}
                          className={`border-b border-[var(--border)] transition-colors hover:bg-[var(--background)]/60 ${
                            idx === 0 && hasData ? "bg-emerald-500/5" : ""
                          }`}
                        >
                          <td className="p-3">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${madalya}`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => isimAnaliziAc(ogr.id)}
                              className="flex items-center gap-2.5 text-left group transition-all"
                              title="Tüm çözülen testlerin neticelerini görüntüle"
                            >
                              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center justify-center text-xs font-black text-indigo-600">
                                {ogr.ad[0]}{ogr.soyad[0]}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-[var(--foreground)] group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                                  <span>{ogr.ad} {ogr.soyad}</span>
                                  <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">🔍</span>
                                </p>
                                <p className="text-xs text-[var(--muted-foreground)]">No: {ogr.numara}</p>
                              </div>
                            </button>
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number" min="0"
                              value={k?.dogru ?? ""}
                              onChange={(e) => updateKayit(ogr.id, "dogru", e.target.value)}
                              placeholder="–"
                              className="w-16 px-2 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-center text-sm font-bold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number" min="0"
                              value={k?.yanlis ?? ""}
                              onChange={(e) => updateKayit(ogr.id, "yanlis", e.target.value)}
                              placeholder="–"
                              className="w-16 px-2 py-1.5 rounded-lg border border-red-500/30 bg-red-500/5 text-center text-sm font-bold text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number" min="0"
                              value={k?.bos ?? ""}
                              onChange={(e) => updateKayit(ogr.id, "bos", e.target.value)}
                              placeholder="–"
                              className="w-16 px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-center text-sm font-semibold text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <span className={`text-xl font-black ${hasData ? netRenk(net) : "text-[var(--muted-foreground)]"}`}>
                              {hasData ? net.toFixed(2) : "–"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {filtrelenmisOgrenciler.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-[var(--muted-foreground)]">
                          Bu sınıf ve şubede kayıtlı öğrenci bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Özet bar */}
              {filtrelenmisOgrenciler.length > 0 && (() => {
                const netler = filtrelenmisOgrenciler
                  .filter((o) => { const k = kayitlar[o.id]; return k && (k.dogru !== "" || k.yanlis !== ""); })
                  .map((o) => netHesapla(kayitlar[o.id].dogru, kayitlar[o.id].yanlis));
                if (netler.length === 0) {
                  return (
                    <p className="p-4 text-xs text-[var(--muted-foreground)] text-center border-t border-[var(--border)]">
                      Doğru/yanlış sayıları girildikçe {seciliDersDetay.label} sınıf ortalaması ve sıralama anında hesaplanır.
                    </p>
                  );
                }
                const ort = netler.reduce((a, b) => a + b, 0) / netler.length;
                return (
                  <div className="p-4 border-t border-[var(--border)] bg-[var(--background)]/50 flex flex-wrap gap-6 justify-center text-center">
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">Sınıf Ortalaması</p>
                      <p className="text-xl font-black gradient-text">{ort.toFixed(2)} Net</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">En Yüksek Net</p>
                      <p className="text-xl font-black text-emerald-500">{Math.max(...netler).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">En Düşük Net</p>
                      <p className="text-xl font-black text-amber-500">{Math.min(...netler).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">Veri Girilen Öğrenci</p>
                      <p className="text-xl font-black text-indigo-500">{netler.length} / {filtrelenmisOgrenciler.length}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* YENİ TEST EKLE MODAL */}
      {modalAcik && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-[var(--foreground)]">📝 Yeni Test Ekle</h3>
              <button
                onClick={() => setModalAcik(false)}
                className="w-8 h-8 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-500 transition-colors font-bold"
              >
                ×
              </button>
            </div>

            {/* Ders seçimi */}
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">Ders</label>
              <div className="grid grid-cols-5 gap-2">
                {DERSLER.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setYeniDers(d.id)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs font-bold transition-all hover:scale-105 border-2 ${
                      yeniDers === d.id
                        ? `${btnRenk[d.renk]} text-white shadow-md border-transparent`
                        : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                    }`}
                  >
                    <span className="text-xl">{d.emoji}</span>
                    <span style={{ fontSize: "10px" }}>{d.label.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Konu başlığı */}
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">Konu Başlığı</label>
              <input
                type="text"
                value={yeniKonu}
                onChange={(e) => setYeniKonu(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && yeniTestOlustur()}
                placeholder={DERS_PLACEHOLDERS[yeniDers] || "örn: Konu başlığı girin..."}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                autoFocus
              />
            </div>

            {/* Tarih */}
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">Tarih</label>
              <input
                type="date"
                value={yeniTarih}
                onChange={(e) => setYeniTarih(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setModalAcik(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
              >
                İptal
              </button>
              <button
                onClick={yeniTestOlustur}
                disabled={!yeniKonu.trim() || kaydediliyor}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {kaydediliyor ? "Kaydediliyor..." : "✅ Test Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* İSİM ANALİZİ MODAL (KİŞİ BAZLI TÜM TESTLERİN NETİCELERİ) */}
      {isimAnaliziAcik && seciliAnalizOgrenci && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 animate-fade-in">
          <div className="glass-card rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-[var(--border)] overflow-hidden">
            
            {/* Modal Üst Başlık & Öğrenci Seçici */}
            <div className="p-5 sm:p-6 border-b border-[var(--border)] bg-[var(--background)]/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center text-white text-lg font-black shadow-md shrink-0">
                  {seciliAnalizOgrenci.ad[0]}{seciliAnalizOgrenci.soyad[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-600 dark:text-violet-400">
                      👤 İsim Analizi
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {seciliAnalizOgrenci.sinif}-{seciliAnalizOgrenci.sube} Sınıfı • No: {seciliAnalizOgrenci.numara}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-[var(--foreground)] mt-0.5">
                    {seciliAnalizOgrenci.ad} {seciliAnalizOgrenci.soyad} — Test Sonuç Geçmişi
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                {/* Öğrenci Değiştirme Dropdown */}
                <select
                  value={seciliAnalizOgrenci.id}
                  onChange={(e) => setAnalizOgrenciId(Number(e.target.value))}
                  className="px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {filtrelenmisOgrenciler.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.ad} {o.soyad} (No: {o.numara})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setIsimAnaliziAcik(false)}
                  className="w-9 h-9 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-500 transition-colors font-bold text-lg shrink-0"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal İçerik (Kaydırılabilir) */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* İstatistik Kartları */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass-card rounded-2xl p-4 text-center border-l-4 border-l-violet-500">
                  <p className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase">Çözülen Test</p>
                  <p className="text-2xl font-black text-violet-600 dark:text-violet-400 mt-1">
                    {ogrenciIstatistikleri.toplamTest}
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Toplam Kayıt</p>
                </div>

                <div className="glass-card rounded-2xl p-4 text-center border-l-4 border-l-indigo-500">
                  <p className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase">Ortalama Net</p>
                  <p className="text-2xl font-black gradient-text mt-1">
                    {ogrenciIstatistikleri.ortalamaNet.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Tüm Testler</p>
                </div>

                <div className="glass-card rounded-2xl p-4 text-center border-l-4 border-l-emerald-500">
                  <p className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase">En Yüksek Net</p>
                  <p className="text-2xl font-black text-emerald-500 mt-1">
                    {ogrenciIstatistikleri.enYuksekNet.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Zirve Skor</p>
                </div>

                <div className="glass-card rounded-2xl p-4 text-center border-l-4 border-l-sky-500">
                  <p className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase">Toplam Doğru / Yanlış</p>
                  <p className="text-xl font-black text-[var(--foreground)] mt-1.5">
                    <span className="text-emerald-500">{ogrenciIstatistikleri.toplamDogru} D</span>
                    <span className="text-[var(--muted-foreground)] mx-1">/</span>
                    <span className="text-red-500">{ogrenciIstatistikleri.toplamYanlis} Y</span>
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                    {ogrenciIstatistikleri.toplamBos} Boş
                  </p>
                </div>
              </div>

              {/* Ders Filtre Butonları */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[var(--background)]/60 p-1.5 rounded-2xl border border-[var(--border)]">
                <button
                  onClick={() => setAnalizDersFiltre("tum")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    analizDersFiltre === "tum"
                      ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
                      : "text-[var(--foreground)] hover:text-violet-600"
                  }`}
                >
                  🌐 Tüm Dersler ({tumTestler.filter((t) => t.kayitlar?.[seciliAnalizOgrenci.id]).length})
                </button>
                {DERSLER.map((d) => {
                  const dersKayitSayisi = tumTestler.filter(
                    (t) => t.ders === d.id && t.kayitlar?.[seciliAnalizOgrenci.id]
                  ).length;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setAnalizDersFiltre(d.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        analizDersFiltre === d.id
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                          : "text-[var(--foreground)] hover:text-indigo-600"
                      }`}
                    >
                      <span>{d.emoji}</span>
                      <span>{d.label}</span>
                      <span className="text-[10px] opacity-70">({dersKayitSayisi})</span>
                    </button>
                  );
                })}
              </div>

              {/* Test Sonuçları Tablosu */}
              <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)]">
                <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--background)]/40">
                  <h4 className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                    📋 Çözülen Testler ve Sıralama Detayı ({ogrenciAnalizTestleri.length} Test)
                  </h4>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--background)]/70 text-xs font-bold text-[var(--muted-foreground)] uppercase">
                        <th className="text-left p-3 w-10">#</th>
                        <th className="text-left p-3">Tarih</th>
                        <th className="text-left p-3">Ders</th>
                        <th className="text-left p-3">Konu Başlığı</th>
                        <th className="text-center p-3 text-emerald-600">Doğru</th>
                        <th className="text-center p-3 text-red-500">Yanlış</th>
                        <th className="text-center p-3">Boş</th>
                        <th className="text-center p-3 text-sky-600">Net</th>
                        <th className="text-center p-3">Sınıf Sırası</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ogrenciAnalizTestleri.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-10 text-center text-[var(--muted-foreground)]">
                            <p className="text-3xl mb-2">📭</p>
                            <p className="font-semibold text-sm">
                              {seciliAnalizOgrenci.ad} için bu kriterde çözülmüş test kaydı bulunamadı.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        ogrenciAnalizTestleri.map((t, idx) => {
                          const info = dersInfo(t.ders);
                          return (
                            <tr
                              key={t.id}
                              className="border-b border-[var(--border)] hover:bg-[var(--background)]/60 transition-colors text-sm"
                            >
                              <td className="p-3 font-bold text-xs text-[var(--muted-foreground)]">
                                {idx + 1}
                              </td>
                              <td className="p-3 text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                                📅 {new Date(t.tarih).toLocaleDateString("tr-TR")}
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                  <span>{info.emoji}</span>
                                  <span>{info.label}</span>
                                </span>
                              </td>
                              <td className="p-3 font-bold text-[var(--foreground)]">
                                {t.konuBasligi}
                              </td>
                              <td className="p-3 text-center font-bold text-emerald-600">
                                {t.dogru}
                              </td>
                              <td className="p-3 text-center font-bold text-red-500">
                                {t.yanlis}
                              </td>
                              <td className="p-3 text-center font-semibold text-[var(--muted-foreground)]">
                                {t.bos}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`text-base font-black ${netRenk(t.net)}`}>
                                  {t.net.toFixed(2)}
                                </span>
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                {t.sira === 1 ? (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-600 dark:text-amber-400 font-extrabold text-xs">
                                    🥇 1. / {t.toplamKatilim}
                                  </span>
                                ) : t.sira === 2 ? (
                                  <span className="px-2 py-0.5 rounded-md bg-slate-400/20 text-slate-600 dark:text-slate-300 font-extrabold text-xs">
                                    🥈 2. / {t.toplamKatilim}
                                  </span>
                                ) : t.sira === 3 ? (
                                  <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-600 font-extrabold text-xs">
                                    🥉 3. / {t.toplamKatilim}
                                  </span>
                                ) : (
                                  <span className="text-xs font-bold text-[var(--muted-foreground)]">
                                    {t.sira}. / {t.toplamKatilim}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Alt Kapat Butonu */}
            <div className="p-4 border-t border-[var(--border)] bg-[var(--background)]/80 flex justify-end">
              <button
                onClick={() => setIsimAnaliziAcik(false)}
                className="px-6 py-2 rounded-xl text-sm font-bold bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] hover:bg-violet-600 hover:text-white transition-all"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

