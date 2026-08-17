"use client";

import { useState, useEffect } from "react";
import { demoOgrenciler, sinifNumaralari, subeler, type Ogrenci } from "@/lib/data";
import { usePersistentState } from "@/lib/use-persistent-state";
import { subscribeOgrenciler, fetchYoklamalar, saveYoklamaGunu } from "@/lib/firestore-service";

type YoklamaDurum = "var" | "yok" | "izinli";

export default function YoklamaPage() {
  const [secilenSinif, setSecilenSinif] = usePersistentState("egitim_yoklama_sinif", "5");
  const [secilenSube, setSecilenSube] = usePersistentState("egitim_yoklama_sube", "A");
  const [tarih, setTarih] = useState(new Date().toISOString().split("T")[0]);
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>(demoOgrenciler);
  const [yoklamalar, setYoklamalar] = useState<Record<number, YoklamaDurum>>({});
  const [kayitliGunler, setKayitliGunler] = useState<Record<string, Record<number, YoklamaDurum>>>({});

  // Firestore'dan öğrencileri ve kayıtlı yoklamaları al
  useEffect(() => {
    const unsub = subscribeOgrenciler((data) => setOgrenciler(data));
    fetchYoklamalar().then((data) => {
      setKayitliGunler(data as Record<string, Record<number, YoklamaDurum>>);
    });
    return () => unsub();
  }, []);

  // Tarih veya sınıf değiştiğinde var olan yoklamayı getir
  useEffect(() => {
    const key = `${secilenSinif}${secilenSube}-${tarih}`;
    if (kayitliGunler[key]) {
      setYoklamalar(kayitliGunler[key]);
    } else {
      setYoklamalar({});
    }
  }, [secilenSinif, secilenSube, tarih, kayitliGunler]);

  const filtrelenmisOgrenciler = ogrenciler.filter(
    (o) => o.sinif === secilenSinif && o.sube === secilenSube
  );

  const durumDegistir = (ogrenciId: number, durum: YoklamaDurum) => {
    setYoklamalar({ ...yoklamalar, [ogrenciId]: durum });
  };

  const tumunuIsaretle = (durum: YoklamaDurum) => {
    const yeni: Record<number, YoklamaDurum> = {};
    filtrelenmisOgrenciler.forEach((o) => {
      yeni[o.id] = durum;
    });
    setYoklamalar(yeni);
  };

  const kaydet = async () => {
    const key = `${secilenSinif}${secilenSube}-${tarih}`;
    await saveYoklamaGunu(key, yoklamalar);
    setKayitliGunler({ ...kayitliGunler, [key]: { ...yoklamalar } });
    alert("Yoklama Firebase'e kaydedildi! ✅");
  };

  const durumRenk = (durum?: YoklamaDurum) => {
    switch (durum) {
      case "var": return "bg-emerald-500 text-white";
      case "yok": return "bg-red-500 text-white";
      case "izinli": return "bg-amber-500 text-white";
      default: return "bg-[var(--secondary)] text-[var(--muted-foreground)]";
    }
  };

  const varSayisi = Object.values(yoklamalar).filter((d) => d === "var").length;
  const yokSayisi = Object.values(yoklamalar).filter((d) => d === "yok").length;
  const izinliSayisi = Object.values(yoklamalar).filter((d) => d === "izinli").length;
  const belirsiz = filtrelenmisOgrenciler.length - varSayisi - yokSayisi - izinliSayisi;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Filtreler */}
      <div className="glass-card rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Sınıf</label>
            <select
              value={secilenSinif}
              onChange={(e) => { setSecilenSinif(e.target.value); setYoklamalar({}); }}
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
              value={secilenSube}
              onChange={(e) => { setSecilenSube(e.target.value); setYoklamalar({}); }}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              {subeler.map((s) => (
                <option key={s} value={s}>{s} Şubesi</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Tarih</label>
            <input
              type="date"
              value={tarih}
              onChange={(e) => setTarih(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={() => tumunuIsaretle("var")} className="flex-1 px-3 py-2.5 rounded-xl text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
              Tümü Var
            </button>
            <button onClick={kaydet} className="flex-1 px-3 py-2.5 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-all shadow-md">
              💾 Kaydet
            </button>
          </div>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Var", sayi: varSayisi, ikon: "✅", renk: "text-emerald-500" },
          { label: "Yok", sayi: yokSayisi, ikon: "❌", renk: "text-red-500" },
          { label: "İzinli", sayi: izinliSayisi, ikon: "📝", renk: "text-amber-500" },
          { label: "Belirsiz", sayi: belirsiz, ikon: "❓", renk: "text-gray-400" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card rounded-2xl p-4 text-center">
            <span className="text-2xl">{stat.ikon}</span>
            <p className={`text-3xl font-extrabold mt-1 ${stat.renk}`}>{stat.sayi}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Yoklama Listesi */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-base font-bold text-[var(--foreground)] mb-4">
          📋 {secilenSinif}-{secilenSube} Sınıfı - {new Date(tarih).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
        </h3>

        {filtrelenmisOgrenciler.length === 0 ? (
          <p className="text-center text-[var(--muted-foreground)] py-8">Bu sınıfta öğrenci bulunmamaktadır.</p>
        ) : (
          <div className="space-y-2">
            {filtrelenmisOgrenciler.map((ogrenci, i) => (
              <div
                key={ogrenci.id}
                className={`flex items-center justify-between p-4 rounded-xl border border-[var(--border)] hover:bg-[var(--secondary)]/50 transition-all animate-slide-up stagger-${Math.min(i + 1, 10)}`}
                style={{ opacity: 0 }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold">
                    {ogrenci.numara}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{ogrenci.ad} {ogrenci.soyad}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{ogrenci.numara} • {ogrenci.sinif}-{ogrenci.sube}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {(["var", "yok", "izinli"] as YoklamaDurum[]).map((durum) => (
                    <button
                      key={durum}
                      onClick={() => durumDegistir(ogrenci.id, durum)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        yoklamalar[ogrenci.id] === durum
                          ? durumRenk(durum)
                          : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:opacity-80"
                      }`}
                    >
                      {durum === "var" ? "VAR" : durum === "yok" ? "YOK" : "İZİNLİ"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
