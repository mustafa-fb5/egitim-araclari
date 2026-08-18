"use client";

import { useState, useEffect } from "react";
import { mesajSablonlari, type Ogrenci } from "@/lib/data";
import { subscribeOgrenciler, getInitialOgrenciler } from "@/lib/firestore-service";

type SablonTuru = "devamsizlik" | "basariDurumu" | "toplanti" | "genel";

export default function VeliBilgilendirmePage() {
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>(getInitialOgrenciler);
  const [secilenOgrenci, setSecilenOgrenci] = useState<Ogrenci | null>(() => {
    const init = getInitialOgrenciler();
    return init.length > 0 ? init[0] : null;
  });
  const [sablonTuru, setSablonTuru] = useState<SablonTuru>("devamsizlik");

  useEffect(() => {
    const unsub = subscribeOgrenciler((data) => {
      setOgrenciler(data);
      if (data.length > 0) {
        setSecilenOgrenci((prev) => (prev ? data.find((o) => o.id === prev.id) || data[0] : data[0]));
      } else {
        setSecilenOgrenci(null);
      }
    });
    return () => unsub();
  }, []);
  const [ekBilgiler, setEkBilgiler] = useState({
    tarih: new Date().toLocaleDateString("tr-TR"),
    toplam: "3",
    donem: "2. Dönem",
    ortalama: "78.5",
    durum: "Öğrenciniz başarılı bir dönem geçirmiştir",
    saat: "14:00",
    mesaj: "",
  });
  const [olusturulanMesaj, setOlusturulanMesaj] = useState("");
  const [kopyalandi, setKopyalandi] = useState(false);

  const mesajOlustur = () => {
    let sablon = mesajSablonlari[sablonTuru];
    sablon = sablon.replace("{veliAd}", secilenOgrenci.veliAd);
    sablon = sablon.replace("{ogrenciAd}", `${secilenOgrenci.ad} ${secilenOgrenci.soyad}`);
    sablon = sablon.replace("{tarih}", ekBilgiler.tarih);
    sablon = sablon.replace("{toplam}", ekBilgiler.toplam);
    sablon = sablon.replace("{donem}", ekBilgiler.donem);
    sablon = sablon.replace("{ortalama}", ekBilgiler.ortalama);
    sablon = sablon.replace("{durum}", ekBilgiler.durum);
    sablon = sablon.replace("{saat}", ekBilgiler.saat);
    sablon = sablon.replace("{mesaj}", ekBilgiler.mesaj);
    setOlusturulanMesaj(sablon);
  };

  const kopyala = async () => {
    await navigator.clipboard.writeText(olusturulanMesaj);
    setKopyalandi(true);
    setTimeout(() => setKopyalandi(false), 2000);
  };

  const whatsappGonder = () => {
    const tel = secilenOgrenci.veliTelefon.replace(/\s/g, "");
    const url = `https://wa.me/90${tel.slice(1)}?text=${encodeURIComponent(olusturulanMesaj)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Öğrenci Seçimi */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-base font-bold text-[var(--foreground)] mb-4">👨‍🎓 Öğrenci Seçimi</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Öğrenci</label>
            <select
              value={secilenOgrenci?.id || ""}
              onChange={(e) => {
                const ogr = ogrenciler.find((o) => o.id === Number(e.target.value));
                if (ogr) setSecilenOgrenci(ogr);
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              {ogrenciler.map((o) => (
                <option key={o.id} value={o.id}>{o.ad} {o.soyad} - {o.sinif}/{o.sube}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Mesaj Türü</label>
            <select
              value={sablonTuru}
              onChange={(e) => setSablonTuru(e.target.value as SablonTuru)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="devamsizlik">📝 Devamsızlık Bildirimi</option>
              <option value="basariDurumu">📊 Başarı Durumu</option>
              <option value="toplanti">📅 Veli Toplantısı</option>
              <option value="genel">💬 Genel Mesaj</option>
            </select>
          </div>
        </div>
      </div>

      {/* Veli & Öğrenci Bilgileri */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <h4 className="text-sm font-bold text-[var(--muted-foreground)] mb-3">📱 Veli Bilgileri</h4>
          <p className="font-medium text-[var(--foreground)]">{secilenOgrenci.veliAd}</p>
          <p className="text-sm text-[var(--muted-foreground)]">{secilenOgrenci.veliTelefon}</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <h4 className="text-sm font-bold text-[var(--muted-foreground)] mb-3">🎓 Öğrenci Bilgileri</h4>
          <p className="font-medium text-[var(--foreground)]">{secilenOgrenci.ad} {secilenOgrenci.soyad}</p>
          <p className="text-sm text-[var(--muted-foreground)]">{secilenOgrenci.sinif} • No: {secilenOgrenci.numara}</p>
        </div>
      </div>

      {/* Ek Bilgiler */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-base font-bold text-[var(--foreground)] mb-4">⚙️ Mesaj Detayları</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sablonTuru === "devamsizlik" && (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Tarih</label>
                <input type="text" value={ekBilgiler.tarih} onChange={(e) => setEkBilgiler({ ...ekBilgiler, tarih: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Toplam Devamsızlık (Gün)</label>
                <input type="text" value={ekBilgiler.toplam} onChange={(e) => setEkBilgiler({ ...ekBilgiler, toplam: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]" />
              </div>
            </>
          )}
          {sablonTuru === "basariDurumu" && (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Dönem</label>
                <input type="text" value={ekBilgiler.donem} onChange={(e) => setEkBilgiler({ ...ekBilgiler, donem: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Not Ortalaması</label>
                <input type="text" value={ekBilgiler.ortalama} onChange={(e) => setEkBilgiler({ ...ekBilgiler, ortalama: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]" />
              </div>
            </>
          )}
          {sablonTuru === "toplanti" && (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Toplantı Tarihi</label>
                <input type="text" value={ekBilgiler.tarih} onChange={(e) => setEkBilgiler({ ...ekBilgiler, tarih: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Toplantı Saati</label>
                <input type="text" value={ekBilgiler.saat} onChange={(e) => setEkBilgiler({ ...ekBilgiler, saat: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]" />
              </div>
            </>
          )}
          {sablonTuru === "genel" && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-2">Mesaj İçeriği</label>
              <textarea value={ekBilgiler.mesaj} onChange={(e) => setEkBilgiler({ ...ekBilgiler, mesaj: e.target.value })}
                rows={3}
                placeholder="Mesajınızı yazın..."
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] resize-none" />
            </div>
          )}
        </div>
        <button
          onClick={mesajOlustur}
          className="mt-4 px-6 py-2.5 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-all shadow-md"
        >
          ✨ Mesaj Oluştur
        </button>
      </div>

      {/* Oluşturulan Mesaj */}
      {olusturulanMesaj && (
        <div className="glass-card rounded-2xl p-6 animate-slide-up" style={{ opacity: 0 }}>
          <h3 className="text-base font-bold text-[var(--foreground)] mb-4">📨 Oluşturulan Mesaj</h3>
          <div className="p-4 rounded-xl bg-[var(--secondary)] text-[var(--foreground)] text-sm leading-relaxed mb-4">
            {olusturulanMesaj}
          </div>
          <div className="flex gap-3">
            <button
              onClick={kopyala}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md ${
                kopyalandi
                  ? "bg-emerald-500 text-white"
                  : "bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-white"
              }`}
            >
              {kopyalandi ? "✅ Kopyalandı!" : "📋 Kopyala"}
            </button>
            <button
              onClick={whatsappGonder}
              className="px-6 py-2.5 rounded-xl text-sm font-medium bg-[#25D366] text-white hover:opacity-90 transition-all shadow-md"
            >
              💬 WhatsApp ile Gönder
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
