import Link from "next/link";

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
    description: "Sınıf bazlı yoklama alın, devamsızlık takibi yapın.",
    color: "from-emerald-500 to-teal-600",
    span: "",
  },
  {
    href: "/ortalama-hesaplama",
    icon: "📊",
    title: "Ortalama Hesaplama",
    description: "Ders notları girişi yaparak ağırlıklı ortalama ve harf notu hesaplayın.",
    color: "from-blue-500 to-indigo-600",
    span: "",
  },
  {
    href: "/sinav-analiz",
    icon: "📈",
    title: "Sınav Analiz",
    description: "Soru bazlı net ve LGS puan analizi hesaplayın.",
    color: "from-cyan-500 to-blue-600",
    span: "md:col-span-2",
  },
  {
    href: "/pdf-karne",
    icon: "📄",
    title: "PDF Karne",
    description: "Öğrenci karnesi oluşturun ve PDF olarak indirin.",
    color: "from-rose-500 to-pink-600",
    span: "",
  },
  {
    href: "/veli-bilgilendirme",
    icon: "💬",
    title: "Veli Bilgilendirme",
    description: "SMS ve WhatsApp formatında veli mesajları oluşturun.",
    color: "from-amber-500 to-orange-600",
    span: "",
  },
  {
    href: "/ders-programi",
    icon: "📅",
    title: "Ders Programı",
    description: "Haftalık ders programını oluşturun ve düzenleyin.",
    color: "from-indigo-500 to-violet-600",
    span: "",
  },
  {
    href: "/nobet-cizelgesi",
    icon: "🔄",
    title: "Nöbet Çizelgesi",
    description: "Öğretmen nöbet programını planlayın.",
    color: "from-fuchsia-500 to-purple-600",
    span: "",
  },
  {
    href: "/ogrenci-basari-grafikleri",
    icon: "📉",
    title: "Başarı Grafikleri",
    description: "Öğrenci başarı trendlerini interaktif grafiklerle takip edin.",
    color: "from-purple-500 to-indigo-600",
    span: "md:col-span-2",
  },
];

const quickStats = [
  { label: "Toplam Öğrenci", value: "324", icon: "👨‍🎓", trend: "+12" },
  { label: "Sınıf Sayısı", value: "12", icon: "🏫", trend: "" },
  { label: "Öğretmen", value: "28", icon: "👩‍🏫", trend: "+2" },
  { label: "Ortalama Başarı", value: "%78", icon: "⭐", trend: "+5%" },
];

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl gradient-bg p-8 md:p-10 text-white shadow-xl shadow-indigo-500/20 border border-white/20">
        <div className="absolute -top-12 -right-12 w-72 h-72 bg-white/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-60 h-60 bg-purple-400/25 rounded-full blur-2xl" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold text-white/95 border border-white/30">
            <span>✨ 2026-2027 Öğretim Dönemi</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight drop-shadow-sm">
            Hoş Geldiniz! 👋
          </h1>
          <p className="text-white/90 text-base md:text-lg max-w-2xl font-normal leading-relaxed">
            Eğitim araçları platformuna hoş geldiniz. Öğrenci takibi, sınav ve LGS analizleri, 
            karne oluşturma ve haftalık planlamalarınızı tek bir yerden kolayca yönetin.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((stat, i) => (
          <div
            key={stat.label}
            className={`glass-card rounded-2xl p-5 card-hover animate-slide-up stagger-${i + 1}`}
            style={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{stat.icon}</span>
              {stat.trend && (
                <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                  {stat.trend}
                </span>
              )}
            </div>
            <p className="text-2xl font-extrabold text-[var(--foreground)]">{stat.value}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Bento Grid - Tools */}
      <div>
        <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">📚 Eğitim Araçları</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tools.map((tool, i) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={`group glass-card rounded-2xl p-6 card-hover animate-slide-up stagger-${i + 1} ${tool.span}`}
              style={{ opacity: 0 }}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  {tool.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1 leading-relaxed">
                    {tool.description}
                  </p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--primary)]">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
