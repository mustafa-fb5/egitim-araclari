"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { demoOgrenciler, demoPersoneller, type Ogrenci, type Personel } from "@/lib/data";
import {
  subscribeOgrenciler,
  subscribePersoneller,
  subscribeSinavlar,
  getInitialOgrenciler,
  getInitialPersoneller,
  type SinavData,
} from "@/lib/firestore-service";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { freeRoutes } from "@/components/layout/sidebar";

const tools = [
  {
    href: "/sinif-listesi",
    icon: "📋",
    title: "Sınıf Listesi",
    description: "Öğrenci bilgilerini ekleyin, düzenleyin ve yönetin (Sınıf 1-12, Şube A-S).",
    color: "from-sky-500 to-cyan-600",
    span: "md:col-span-2",
  },
  {
    href: "/yoklama",
    icon: "✅",
    title: "Yoklama",
    description: "Sınıf bazlı yoklama alın, tek tıkla durum değiştirin ve devamsızlıkları takip edin.",
    color: "from-emerald-500 to-teal-600",
    span: "",
  },
  {
    href: "/ortalama-hesaplama",
    icon: "📊",
    title: "Ortalama Hesaplama",
    description: "Ders notları girişi yaparak ağırlıklı ortalama ve başarı durumu hesaplayın.",
    color: "from-blue-500 to-indigo-600",
    span: "",
  },
  {
    href: "/testler",
    icon: "📝",
    title: "Testler & Net Takibi",
    description: "5 ana branşta konu bazlı testler oluşturun, 3Y 1D net hesaplayın ve isim analizi yapın.",
    color: "from-indigo-600 to-violet-600",
    span: "md:col-span-2",
  },
  {
    href: "/sinav-analiz",
    icon: "📈",
    title: "Sınav Analiz",
    description: "Soru bazlı net ve LGS puan analizi hesaplayın, PDF raporlar üretin.",
    color: "from-cyan-500 to-blue-600",
    span: "",
  },
  {
    href: "/pdf-karne",
    icon: "📄",
    title: "PDF Karne",
    description: "Toplu veya bireysel öğrenci karneleri oluşturun ve PDF olarak indirin.",
    color: "from-rose-500 to-pink-600",
    span: "",
  },
  {
    href: "/veli-bilgilendirme",
    icon: "💬",
    title: "Veli Bilgilendirme",
    description: "SMS ve WhatsApp formatında veli bilgilendirme mesajları oluşturun ve gönderin.",
    color: "from-amber-500 to-orange-600",
    span: "",
  },
  {
    href: "/ders-programi",
    icon: "📅",
    title: "Ders Programı",
    description: "Ders saatlerini ve branşları özelleştirin, haftalık ders programını oluşturup yazdırın.",
    color: "from-indigo-500 to-violet-600",
    span: "",
  },
  {
    href: "/nobet-cizelgesi",
    icon: "🔄",
    title: "Nöbet Çizelgesi",
    description: "Öğretmen listesini düzenleyin ve otomatik nöbet dağıtımı planlayın.",
    color: "from-fuchsia-500 to-purple-600",
    span: "",
  },
  {
    href: "/ogrenci-basari-grafikleri",
    icon: "📉",
    title: "Başarı Grafikleri",
    description: "Öğrenci başarı trendlerini ve puan dağılımlarını interaktif grafiklerle takip edin.",
    color: "from-purple-500 to-indigo-600",
    span: "",
  },
  {
    href: "/aidat-takip",
    icon: "💰",
    title: "Aidat Takip",
    description: "Öğrenci bazlı aylık aidat ödemelerini, kalan borçları ve gecikmeleri yönetin.",
    color: "from-emerald-600 to-green-600",
    span: "",
  },
  {
    href: "/personel-listesi",
    icon: "👥",
    title: "Personel Listesi",
    description: "Okul personellerinin ve öğretmenlerin telefon, branş ve görev bilgilerini yönetin.",
    color: "from-violet-500 to-fuchsia-600",
    span: "",
  },
];

export default function HomePage() {
  const { user, isPro, openProModal } = useAuth();
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>(getInitialOgrenciler);
  const [personeller, setPersoneller] = useState<Personel[]>(getInitialPersoneller);
  const [sinavSayisi, setSinavSayisi] = useState(0);
  const [testSayisi, setTestSayisi] = useState(0);

  // Firestore Canlı Abonelikler
  useEffect(() => {
    // 1. Öğrenciler
    const unsubOgr = subscribeOgrenciler((list) => {
      setOgrenciler(list);
    });

    // 2. Personeller
    const unsubPer = subscribePersoneller((list) => {
      setPersoneller(list);
    });

    // 3. Sınavlar
    const unsubSinav = subscribeSinavlar((list) => {
      setSinavSayisi(list.length);
    });

    // 4. Testler
    const unsubTestler = onSnapshot(collection(db, "testler"), (snap) => {
      setTestSayisi(snap.size);
    }, () => {});

    return () => {
      unsubOgr();
      unsubPer();
      unsubSinav();
      unsubTestler();
    };
  }, []);

  // Giriş yapmamış kullanıcılar için sabit 4 demo öğrenci, giriş yapmışlar için kendi öğrencileri
  const gorunenOgrenciler = useMemo(() => {
    if (!user) {
      return demoOgrenciler.slice(0, 4);
    }
    return ogrenciler;
  }, [user, ogrenciler]);

  // Aktif Sınıf/Şube Sayısı
  const aktifSinifSayisi = useMemo(() => {
    const set = new Set<string>();
    gorunenOgrenciler.forEach((o) => {
      if (o.sinif && o.sube) {
        set.add(`${o.sinif}-${o.sube}`);
      }
    });
    return set.size;
  }, [gorunenOgrenciler]);

  // Canlı İstatistikler
  const quickStats = [
    {
      label: "Toplam Öğrenci",
      value: `${gorunenOgrenciler.length}`,
      icon: "👨‍🎓",
      detail: !user ? "Örnek Veri (4 Öğrenci)" : `${aktifSinifSayisi} Aktif Şube`,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-500/15",
    },
    {
      label: "Kayıtlı Personel",
      value: `${personeller.length}`,
      icon: "👥",
      detail: `${new Set(personeller.map((p) => p.brans)).size} Farklı Branş`,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-500/15",
    },
    {
      label: "Toplam Sınav & Test",
      value: `${sinavSayisi + testSayisi}`,
      icon: "📝",
      detail: `${testSayisi} Test / ${sinavSayisi} Sınav`,
      color: "text-emerald-500",
      bg: "bg-emerald-500/15",
    },
    {
      label: "Aktif Modül",
      value: "12",
      icon: "⚡",
      detail: "Bulut Senkronize",
      color: "text-amber-500",
      bg: "bg-amber-500/15",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5 sm:space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl gradient-bg p-5 sm:p-8 md:p-10 text-white shadow-xl shadow-indigo-500/20 border border-white/20">
        <div className="absolute -top-12 -right-12 w-72 h-72 bg-white/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-60 h-60 bg-purple-400/25 rounded-full blur-2xl" />
        <div className="relative z-10 space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] sm:text-xs font-bold text-white border border-white/30">
            <span>✨ 2026-2027 Eğitim Öğretim Dönemi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight drop-shadow-sm leading-tight">
            Öğretmen ve Yönetici Paneli 👋
          </h1>
          <p className="text-white/90 text-xs sm:text-base md:text-lg max-w-3xl font-medium leading-relaxed">
            Sınıf listeleri, yoklamalar, testler, LGS analizleri, karne oluşturma,
            ders programı ve aidat takibini tek bir bulut platformundan yönetin.
          </p>
        </div>
      </div>

      {/* Quick Stats (Canlı Gerçek Adetler) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {quickStats.map((stat, i) => (
          <div
            key={stat.label}
            className="glass-card rounded-2xl p-3 sm:p-5 card-hover flex flex-col justify-between min-w-0"
          >
            <div className="flex items-center justify-between mb-2 gap-1">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${stat.bg} flex items-center justify-center text-base sm:text-xl shrink-0`}>
                {stat.icon}
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-[var(--muted-foreground)] bg-[var(--secondary)] px-1.5 py-0.5 rounded-md truncate min-w-0 text-right">
                {stat.detail}
              </span>
            </div>
            <div>
              <p className={`text-xl sm:text-3xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] sm:text-xs font-semibold text-[var(--muted-foreground)] mt-0.5 leading-tight">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bento Grid - Tools */}
      <div>
        <h2 className="text-base sm:text-xl font-black text-[var(--foreground)] mb-3 sm:mb-4 flex items-center gap-2">
          <span>📚</span>
          <span>Tüm Eğitim Araçları ({tools.length})</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {tools.map((tool) => {
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className={`group glass-card rounded-2xl p-4 sm:p-5 card-hover ${tool.span}`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-xl sm:text-2xl shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shrink-0`}>
                    {tool.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors truncate">
                      {tool.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-2 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                  <div className="shrink-0 self-center opacity-50 group-hover:opacity-100 transition-all duration-300">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--primary)]">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
