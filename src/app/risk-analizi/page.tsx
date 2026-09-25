"use client";

import { useState, useEffect, useMemo } from "react";
import { sinifNumaralari, subeler, type Ogrenci } from "@/lib/data";
import { usePersistentState } from "@/lib/use-persistent-state";
import {
  subscribeOgrenciler,
  subscribeYoklamalar,
  subscribeTumOgrenciNotlari,
  subscribeSinavlar,
  getInitialOgrenciler,
  type SinavData,
  type KayitliDersNotu,
} from "@/lib/firestore-service";

type RiskLevel = "kritik" | "yuksek" | "orta" | "dusuk";

interface StudentRiskProfile {
  student: Ogrenci;
  // Devamsızlık verileri
  toplamYoklama: number;
  devamsizlikSayisi: number;
  izinliSayisi: number;
  devamsizlikOrani: number; // yüzde
  // Not ortalaması verileri
  notOrtalamasi: number | null;
  basarisizDersSayisi: number; // < 50
  // Sınav / Deneme verileri
  sinavSayisi: number;
  ortalamaNet: number | null;
  netTrendi: "yukselis" | "dusus" | "sabit" | "yok";
  // Risk Skoru (0 - 100)
  riskPuan: number;
  riskSeviye: RiskLevel;
  // Risk Nedenleri ve Yapay Zeka Tavsiyeleri
  riskFaktorleri: string[];
  eylemTavsiyesi: string;
}

export default function RiskAnaliziPage() {
  const [secilenSinif, setSecilenSinif] = usePersistentState("egitim_risk_sinif", "Tümü");
  const [secilenSube, setSecilenSube] = usePersistentState("egitim_risk_sube", "Tümü");
  const [riskFiltresi, setRiskFiltresi] = useState<string>("Tümü");
  const [aramaKelimesi, setAramaKelimesi] = useState("");
  const [seciliOgrenciDetay, setSeciliOgrenciDetay] = useState<StudentRiskProfile | null>(null);

  // Firestore Verileri
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>(getInitialOgrenciler);
  const [yoklamalar, setYoklamalar] = useState<Record<string, Record<number, string>>>({});
  const [ogrenciNotlari, setOgrenciNotlari] = useState<Record<string, KayitliDersNotu[]>>({});
  const [sinavlar, setSinavlar] = useState<SinavData[]>([]);

  useEffect(() => {
    const unsubOgrenciler = subscribeOgrenciler((data) => setOgrenciler(data));
    const unsubYoklamalar = subscribeYoklamalar((data) => setYoklamalar(data));
    const unsubNotlar = subscribeTumOgrenciNotlari((data) => setOgrenciNotlari(data));
    const unsubSinavlar = subscribeSinavlar((data) => setSinavlar(data));

    return () => {
      unsubOgrenciler();
      unsubYoklamalar();
      unsubNotlar();
      unsubSinavlar();
    };
  }, []);

  // Risk Hesaplama Algoritması
  const riskProfilleri = useMemo<StudentRiskProfile[]>(() => {
    return ogrenciler.map((ogr) => {
      // 1. Devamsızlık Hesaplama
      let toplamGun = 0;
      let devamsizGun = 0;
      let izinliGun = 0;

      Object.entries(yoklamalar).forEach(([key, gunKayitlari]) => {
        const ogrKey = `${ogr.sinif}${ogr.sube}`;
        if (key.startsWith(ogrKey) && gunKayitlari[ogr.id]) {
          toplamGun++;
          if (gunKayitlari[ogr.id] === "yok") devamsizGun++;
          else if (gunKayitlari[ogr.id] === "izinli") izinliGun++;
        }
      });

      const devamsizlikOrani = toplamGun > 0 ? (devamsizGun / toplamGun) * 100 : 0;

      // 2. Not Ortalaması ve Başarısız Ders Sayısı
      const dersler = ogrenciNotlari[String(ogr.id)] || [];
      let toplamNot = 0;
      let notluDersSayisi = 0;
      let basarisizSayisi = 0;

      dersler.forEach((d) => {
        const notlar = [
          parseFloat(d.sinav1),
          parseFloat(d.sinav2),
          parseFloat(d.sinav3),
          parseFloat(d.odev),
          parseFloat(d.performans),
        ].filter((val) => !isNaN(val));

        if (notlar.length > 0) {
          const dersOrt = notlar.reduce((a, b) => a + b, 0) / notlar.length;
          toplamNot += dersOrt;
          notluDersSayisi++;
          if (dersOrt < 50) basarisizSayisi++;
        }
      });

      const notOrtalamasi = notluDersSayisi > 0 ? toplamNot / notluDersSayisi : null;

      // 3. Sınav / Deneme Analizi
      const katildigiSinavlar = sinavlar
        .filter((s) => s.sinif === ogr.sinif && (s.sube === ogr.sube || s.sube === "Tümü"))
        .sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime());

      const ogrenciNetleri: number[] = [];
      katildigiSinavlar.forEach((s) => {
        const ogrSonuc = s.ogrenciNotlari?.[ogr.id];
        if (ogrSonuc) {
          let toplamNet = 0;
          Object.values(ogrSonuc).forEach((soru) => {
            const d = typeof soru.dogru === "number" ? soru.dogru : 0;
            const y = typeof soru.yanlis === "number" ? soru.yanlis : 0;
            const net = Math.max(0, d - y / 3);
            toplamNet += net;
          });
          ogrenciNetleri.push(toplamNet);
        }
      });

      const sinavSayisi = ogrenciNetleri.length;
      const ortalamaNet =
        sinavSayisi > 0
          ? ogrenciNetleri.reduce((a, b) => a + b, 0) / sinavSayisi
          : null;

      let netTrendi: "yukselis" | "dusus" | "sabit" | "yok" = "yok";
      if (sinavSayisi >= 2) {
        const sonNet = ogrenciNetleri[sinavSayisi - 1];
        const oncekiNet = ogrenciNetleri[sinavSayisi - 2];
        const fark = sonNet - oncekiNet;
        if (fark > 1.5) netTrendi = "yukselis";
        else if (fark < -1.5) netTrendi = "dusus";
        else netTrendi = "sabit";
      }

      // 4. BİRLEŞİK RİSK PUANI HESAPLAMA (0 - 100 Arası)
      let riskPuan = 0;
      const riskFaktorleri: string[] = [];

      // A) Devamsızlık Ağırlığı (%35)
      if (devamsizGun >= 10 || devamsizlikOrani > 25) {
        riskPuan += 35;
        riskFaktorleri.push(`Kritik Devamsızlık: ${devamsizGun} gün devamsız`);
      } else if (devamsizGun >= 5 || devamsizlikOrani > 15) {
        riskPuan += 22;
        riskFaktorleri.push(`Yüksek Devamsızlık: ${devamsizGun} gün devamsız`);
      } else if (devamsizGun >= 3 || devamsizlikOrani > 8) {
        riskPuan += 10;
        riskFaktorleri.push(`Düzenli devamsızlık başlangıcı: ${devamsizGun} gün`);
      }

      // B) Akademik Başarı / Not Ortalaması Ağırlığı (%40)
      if (notOrtalamasi !== null) {
        if (notOrtalamasi < 50) {
          riskPuan += 40;
          riskFaktorleri.push(`Sınıf Geçme Riski: Not Ortalaması ${notOrtalamasi.toFixed(1)}`);
        } else if (notOrtalamasi < 65) {
          riskPuan += 25;
          riskFaktorleri.push(`Düşük Not Ortalaması: ${notOrtalamasi.toFixed(1)}`);
        } else if (notOrtalamasi < 75) {
          riskPuan += 10;
        }

        if (basarisizSayisi >= 3) {
          riskPuan = Math.min(100, riskPuan + 15);
          riskFaktorleri.push(`${basarisizSayisi} dersten 50'nin altında kaldı`);
        }
      }

      // C) Deneme / Sınav Trendi Ağırlığı (%25)
      if (netTrendi === "dusus") {
        riskPuan += 20;
        riskFaktorleri.push("Son sınavlarda belirgin net kaybı / motivasyon düşüşü");
      } else if (ortalamaNet !== null && ortalamaNet < 15) {
        riskPuan += 15;
        riskFaktorleri.push(`Düşük Deneme Ortalaması: ${ortalamaNet.toFixed(1)} net`);
      }

      // Puan aralıklarına göre seviye
      let riskSeviye: RiskLevel = "dusuk";
      let eylemTavsiyesi = "Öğrencinin durumu dengeli. Rutin takip yeterli.";

      if (riskPuan >= 65) {
        riskSeviye = "kritik";
        eylemTavsiyesi = "⚠️ Acil Veli Görüşmesi & Rehberlik Yönlendirmesi önerilir. Hem devamsızlık hem ders kaybı kritik seviyede!";
      } else if (riskPuan >= 45) {
        riskSeviye = "yuksek";
        eylemTavsiyesi = "Öğrenciyle birebir koçluk görüşmesi yapılmalı ve zayıf dersler için destek etüdü planlanmalı.";
      } else if (riskPuan >= 25) {
        riskSeviye = "orta";
        eylemTavsiyesi = "Haftalık yoklama ve ders ödevleri kontrol edilerek gidişat izlenmeli.";
      }

      if (riskFaktorleri.length === 0) {
        riskFaktorleri.push("Gözlemlenen belirgin bir akademik veya devamsızlık riski bulunmuyor.");
      }

      return {
        student: ogr,
        toplamYoklama: toplamGun,
        devamsizlikSayisi: devamsizGun,
        izinliSayisi: izinliGun,
        devamsizlikOrani,
        notOrtalamasi,
        basarisizDersSayisi: basarisizSayisi,
        sinavSayisi,
        ortalamaNet,
        netTrendi,
        riskPuan: Math.min(100, riskPuan),
        riskSeviye,
        riskFaktorleri,
        eylemTavsiyesi,
      };
    });
  }, [ogrenciler, yoklamalar, ogrenciNotlari, sinavlar]);

  // Filtreleme
  const filtrelenmisProfiller = useMemo(() => {
    return riskProfilleri.filter((p) => {
      const sinifUygun = secilenSinif === "Tümü" || p.student.sinif === secilenSinif;
      const subeUygun = secilenSube === "Tümü" || p.student.sube === secilenSube;
      const riskUygun =
        riskFiltresi === "Tümü" ||
        (riskFiltresi === "kritik" && p.riskSeviye === "kritik") ||
        (riskFiltresi === "yuksek" && p.riskSeviye === "yuksek") ||
        (riskFiltresi === "orta" && p.riskSeviye === "orta") ||
        (riskFiltresi === "dusuk" && p.riskSeviye === "dusuk");

      const arama = aramaKelimesi.toLowerCase().trim();
      const isimUygun =
        !arama ||
        `${p.student.ad} ${p.student.soyad}`.toLowerCase().includes(arama) ||
        p.student.numara.includes(arama);

      return sinifUygun && subeUygun && riskUygun && isimUygun;
    });
  }, [riskProfilleri, secilenSinif, secilenSube, riskFiltresi, aramaKelimesi]);

  // İstatistik Sayaçları Verileri
  const stats = useMemo(() => {
    const total = riskProfilleri.length;
    const kritik = riskProfilleri.filter((p) => p.riskSeviye === "kritik").length;
    const yuksek = riskProfilleri.filter((p) => p.riskSeviye === "yuksek").length;
    const orta = riskProfilleri.filter((p) => p.riskSeviye === "orta").length;
    const dusuk = riskProfilleri.filter((p) => p.riskSeviye === "dusuk").length;

    return { total, kritik, yuksek, orta, dusuk };
  }, [riskProfilleri]);

  // WhatsApp Bilgilendirme Mesajı
  const generateWhatsAppUrl = (p: StudentRiskProfile) => {
    const tel = p.student.veliTelefon ? p.student.veliTelefon.replace(/\D/g, "") : "";
    const mesaj = encodeURIComponent(
      `Sayın Velimiz, ${p.student.ad} ${p.student.soyad} isimli öğrencimizin okuldaki devamsızlık ve ders gelişim durumu hakkında görüşmek üzere en kısa sürede okulumuza veya telefonla sınıf rehber öğretmenimize ulaşmanızı rica ederiz.\n\nEğitim Yönetim Sistemi`
    );
    return `https://wa.me/90${tel}?text=${mesaj}`;
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Erken Uyarı Özeti */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-600 via-amber-600 to-indigo-700 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
              Yapay Zeka Destekli Erken Uyarı Sistemi
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Öğrenci Risk & Başarı Analizi
            </h1>
            <p className="text-white/80 text-sm md:text-base mt-1 max-w-2xl">
              Devamsızlık, ders notları ve sınav netlerini çapraz analiz ederek sınıf tekrarı veya ders kaybı riski taşıyan öğrencileri önceden tespit edin.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-sm font-medium transition-all flex items-center gap-2"
            >
              <span>🖨️</span> Rapor Yazdır
            </button>
          </div>
        </div>

        {/* Arka plan dekoratif daireler */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* İstatistik Sayaçları (Kritik / Yüksek / Orta / Düşük) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setRiskFiltresi("kritik")}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            riskFiltresi === "kritik"
              ? "bg-rose-500/15 border-rose-500 shadow-md ring-2 ring-rose-400"
              : "bg-[var(--card-bg)] border-[var(--border-color)] hover:border-rose-400/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              🚨 Kritik Risk
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
          </div>
          <div className="text-2xl md:text-3xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {stats.kritik}
          </div>
          <p className="text-xs text-[var(--muted-text)] mt-1">Acil müdahale gereken</p>
        </div>

        <div
          onClick={() => setRiskFiltresi("yuksek")}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            riskFiltresi === "yuksek"
              ? "bg-amber-500/15 border-amber-500 shadow-md ring-2 ring-amber-400"
              : "bg-[var(--card-bg)] border-[var(--border-color)] hover:border-amber-400/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              ⚠️ Yüksek Risk
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          </div>
          <div className="text-2xl md:text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {stats.yuksek}
          </div>
          <p className="text-xs text-[var(--muted-text)] mt-1">Takip & etüt gerekli</p>
        </div>

        <div
          onClick={() => setRiskFiltresi("orta")}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            riskFiltresi === "orta"
              ? "bg-yellow-500/15 border-yellow-500 shadow-md ring-2 ring-yellow-400"
              : "bg-[var(--card-bg)] border-[var(--border-color)] hover:border-yellow-400/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
              ⚡ Orta Düzey
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
          </div>
          <div className="text-2xl md:text-3xl font-black text-yellow-600 dark:text-yellow-400 mt-2">
            {stats.orta}
          </div>
          <p className="text-xs text-[var(--muted-text)] mt-1">Düşüş eğilimi olan</p>
        </div>

        <div
          onClick={() => setRiskFiltresi("dusuk")}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            riskFiltresi === "dusuk"
              ? "bg-emerald-500/15 border-emerald-500 shadow-md ring-2 ring-emerald-400"
              : "bg-[var(--card-bg)] border-[var(--border-color)] hover:border-emerald-400/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              ✅ Güvenli Bölge
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {stats.dusuk}
          </div>
          <p className="text-xs text-[var(--muted-text)] mt-1">Dengeli ve başarılı</p>
        </div>
      </div>

      {/* Filtre ve Arama Çubuğu */}
      <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] shadow-sm flex flex-wrap items-center gap-3">
        {/* Sınıf Filtresi */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[var(--muted-text)]">Sınıf:</label>
          <select
            value={secilenSinif}
            onChange={(e) => setSecilenSinif(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="Tümü">Tümü</option>
            {sinifNumaralari.map((s) => (
              <option key={s} value={s}>
                {s}. Sınıf
              </option>
            ))}
          </select>
        </div>

        {/* Şube Filtresi */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[var(--muted-text)]">Şube:</label>
          <select
            value={secilenSube}
            onChange={(e) => setSecilenSube(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="Tümü">Tümü</option>
            {subeler.map((sb) => (
              <option key={sb} value={sb}>
                {sb} Şubesi
              </option>
            ))}
          </select>
        </div>

        {/* Risk Seviyesi Filtresi */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-[var(--muted-text)]">Risk:</label>
          <select
            value={riskFiltresi}
            onChange={(e) => setRiskFiltresi(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="Tümü">Tüm Seviyeler</option>
            <option value="kritik">🚨 Sadece Kritik</option>
            <option value="yuksek">⚠️ Yüksek Risk</option>
            <option value="orta">⚡ Orta Düzey</option>
            <option value="dusuk">✅ Güvenli Bölge</option>
          </select>
        </div>

        {/* Arama */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Öğrenci adı, soyadı veya no ile ara..."
            value={aramaKelimesi}
            onChange={(e) => setAramaKelimesi(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        {(riskFiltresi !== "Tümü" || secilenSinif !== "Tümü" || secilenSube !== "Tümü" || aramaKelimesi) && (
          <button
            onClick={() => {
              setRiskFiltresi("Tümü");
              setSecilenSinif("Tümü");
              setSecilenSube("Tümü");
              setAramaKelimesi("");
            }}
            className="text-xs text-[var(--primary)] hover:underline font-medium"
          >
            Filtreleri Temizle
          </button>
        )}
      </div>

      {/* Öğrenci Risk Kartları Izgarası */}
      {filtrelenmisProfiller.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--muted-text)]">
          <p className="text-3xl mb-2">🔍</p>
          <p className="font-semibold">Seçilen kriterlere uygun öğrenci bulunamadı.</p>
          <p className="text-xs mt-1">Filtreleri değiştirmeyi deneyebilirsiniz.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtrelenmisProfiller.map((profil) => {
            const isKritik = profil.riskSeviye === "kritik";
            const isYuksek = profil.riskSeviye === "yuksek";
            const isOrta = profil.riskSeviye === "orta";

            const badgeBg = isKritik
              ? "bg-rose-500 text-white"
              : isYuksek
              ? "bg-amber-500 text-white"
              : isOrta
              ? "bg-yellow-500 text-slate-900"
              : "bg-emerald-500 text-white";

            const borderGlow = isKritik
              ? "border-rose-400/80 hover:shadow-rose-500/20"
              : isYuksek
              ? "border-amber-400/80 hover:shadow-amber-500/20"
              : "border-[var(--border-color)]";

            return (
              <div
                key={profil.student.id}
                className={`relative rounded-3xl bg-[var(--card-bg)] border ${borderGlow} p-5 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between`}
              >
                {/* Üst Bilgi Satırı */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-lg">
                        {profil.student.ad.charAt(0)}
                        {profil.student.soyad.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-[var(--foreground)] leading-snug">
                          {profil.student.ad} {profil.student.soyad}
                        </h3>
                        <p className="text-xs text-[var(--muted-text)]">
                          {profil.student.sinif}/{profil.student.sube} • No: #{profil.student.numara}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${badgeBg}`}
                    >
                      {profil.riskSeviye === "kritik"
                        ? "KRİTİK"
                        : profil.riskSeviye === "yuksek"
                        ? "YÜKSEK"
                        : profil.riskSeviye === "orta"
                        ? "ORTA"
                        : "GÜVENLİ"}
                    </span>
                  </div>

                  {/* Risk Skor Göstergesi */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-[var(--muted-text)]">Bileşik Risk Puanı</span>
                      <span
                        className={`font-black ${
                          isKritik
                            ? "text-rose-600"
                            : isYuksek
                            ? "text-amber-600"
                            : isOrta
                            ? "text-yellow-600"
                            : "text-emerald-600"
                        }`}
                      >
                        %{profil.riskPuan}
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isKritik
                            ? "bg-rose-500"
                            : isYuksek
                            ? "bg-amber-500"
                            : isOrta
                            ? "bg-yellow-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.max(5, profil.riskPuan)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* 3 Temel Metrik (Devamsızlık, Not Ort, Sınav Neti) */}
                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[var(--border-color)]">
                      <div className="text-[10px] uppercase font-bold text-[var(--muted-text)]">
                        Devamsızlık
                      </div>
                      <div
                        className={`text-sm font-extrabold mt-0.5 ${
                          profil.devamsizlikSayisi >= 5 ? "text-rose-500" : "text-[var(--foreground)]"
                        }`}
                      >
                        {profil.devamsizlikSayisi} Gün
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[var(--border-color)]">
                      <div className="text-[10px] uppercase font-bold text-[var(--muted-text)]">
                        Not Ort.
                      </div>
                      <div
                        className={`text-sm font-extrabold mt-0.5 ${
                          profil.notOrtalamasi !== null && profil.notOrtalamasi < 50
                            ? "text-rose-500"
                            : "text-[var(--foreground)]"
                        }`}
                      >
                        {profil.notOrtalamasi !== null ? profil.notOrtalamasi.toFixed(1) : "—"}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[var(--border-color)]">
                      <div className="text-[10px] uppercase font-bold text-[var(--muted-text)]">
                        Deneme Net
                      </div>
                      <div className="text-sm font-extrabold mt-0.5 text-[var(--foreground)] flex items-center justify-center gap-1">
                        <span>{profil.ortalamaNet !== null ? profil.ortalamaNet.toFixed(1) : "—"}</span>
                        {profil.netTrendi === "yukselis" && <span className="text-emerald-500 text-xs">▲</span>}
                        {profil.netTrendi === "dusus" && <span className="text-rose-500 text-xs">▼</span>}
                      </div>
                    </div>
                  </div>

                  {/* Tespit Edilen Risk Faktörleri */}
                  <div className="mt-4 space-y-1.5">
                    <div className="text-[11px] font-bold text-[var(--muted-text)] uppercase tracking-wider">
                      Tespit Edilen Faktörler:
                    </div>
                    {profil.riskFaktorleri.slice(0, 2).map((fakt, idx) => (
                      <div
                        key={idx}
                        className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 font-medium flex items-start gap-1.5"
                      >
                        <span className="text-rose-500 mt-0.5">•</span>
                        <span>{fakt}</span>
                      </div>
                    ))}
                    {profil.riskFaktorleri.length > 2 && (
                      <div className="text-[11px] text-[var(--muted-text)] italic">
                        +{profil.riskFaktorleri.length - 2} ek risk faktörü daha...
                      </div>
                    )}
                  </div>
                </div>

                {/* Alt Aksiyon Butonları (Veli Ara, WhatsApp, Detay) */}
                <div className="mt-5 pt-4 border-t border-[var(--border-color)] flex items-center gap-2">
                  <button
                    onClick={() => setSeciliOgrenciDetay(profil)}
                    className="flex-1 py-2 px-3 rounded-xl bg-[var(--input-bg)] hover:bg-[var(--primary)] hover:text-white border border-[var(--border-color)] text-xs font-semibold transition-all text-center"
                  >
                    Detaylı Rapor
                  </button>

                  {profil.student.veliTelefon && (
                    <>
                      <a
                        href={`tel:${profil.student.veliTelefon}`}
                        title={`Veli Ara: ${profil.student.veliTelefon}`}
                        className="p-2 rounded-xl bg-sky-500/10 hover:bg-sky-500 text-sky-600 hover:text-white transition-all text-sm"
                      >
                        📞
                      </a>
                      <a
                        href={generateWhatsAppUrl(profil)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Veliye WhatsApp Mesajı Gönder"
                        className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white transition-all text-sm"
                      >
                        💬
                      </a>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detaylı İnceleme Modalı */}
      {seciliOgrenciDetay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
            <button
              onClick={() => setSeciliOgrenciDetay(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-[var(--muted-text)] hover:text-[var(--foreground)] flex items-center justify-center font-bold text-sm"
            >
              ✕
            </button>

            {/* Modal Başlık */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-xl">
                {seciliOgrenciDetay.student.ad.charAt(0)}
                {seciliOgrenciDetay.student.soyad.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[var(--foreground)]">
                  {seciliOgrenciDetay.student.ad} {seciliOgrenciDetay.student.soyad}
                </h2>
                <p className="text-xs text-[var(--muted-text)]">
                  {seciliOgrenciDetay.student.sinif}/{seciliOgrenciDetay.student.sube} Şubesi • Okul No: {seciliOgrenciDetay.student.numara}
                </p>
              </div>
            </div>

            {/* Risk Analiz Kutusu */}
            <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-rose-500/10 via-amber-500/10 to-indigo-500/10 border border-rose-500/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Risk Derecesi & Durum
                </span>
                <span className="text-sm font-black px-3 py-1 rounded-full bg-rose-500 text-white">
                  %{seciliOgrenciDetay.riskPuan} Risk
                </span>
              </div>
              <p className="text-sm font-semibold text-[var(--foreground)] mt-2">
                {seciliOgrenciDetay.eylemTavsiyesi}
              </p>
            </div>

            {/* Detaylı Faktörler Listesi */}
            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)] mb-2">
                Tüm Risk Parametreleri & İpuçları
              </h4>
              <div className="space-y-2">
                {seciliOgrenciDetay.riskFaktorleri.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[var(--border-color)] text-xs text-[var(--foreground)] flex items-start gap-2"
                  >
                    <span className="text-amber-500 font-bold">▶</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Veli İletişim Bilgileri */}
            <div className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-[var(--border-color)]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)] mb-2">
                Veli İletişim Bilgisi
              </h4>
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[var(--muted-text)]">Veli Adı: </span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {seciliOgrenciDetay.student.veliAd || "Belirtilmemiş"}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--muted-text)]">Telefon: </span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {seciliOgrenciDetay.student.veliTelefon || "Kayıtlı telefon yok"}
                  </span>
                </div>
                {seciliOgrenciDetay.student.veliTelefon && (
                  <div className="flex gap-2">
                    <a
                      href={`tel:${seciliOgrenciDetay.student.veliTelefon}`}
                      className="px-3 py-1.5 rounded-xl bg-sky-500 text-white font-medium hover:bg-sky-600 transition-all flex items-center gap-1"
                    >
                      <span>📞</span> Ara
                    </a>
                    <a
                      href={generateWhatsAppUrl(seciliOgrenciDetay)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-all flex items-center gap-1"
                    >
                      <span>💬</span> WhatsApp
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Kapat Butonu */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSeciliOgrenciDetay(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-[var(--foreground)] font-semibold text-xs hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
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
