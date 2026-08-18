"use client";

import React, { useState, useEffect } from "react";
import { useAuth, type AppUser } from "@/lib/auth-context";
import Link from "next/link";

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading, getAllUsers, setUserProDuration, cancelUserPro } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [arama, setArama] = useState("");
  const [filtre, setFiltre] = useState<"hepsi" | "pro" | "standart" | "kritik">("hepsi");

  // Özel Gün Tanımlama Modalı State'i
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [customDays, setCustomDays] = useState<number>(30);
  const [customModalOpen, setCustomModalOpen] = useState(false);

  // E-posta Gönderim Modalı State'i
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTargetUser, setEmailTargetUser] = useState<AppUser | null>(null);
  const [emailTemplateType, setEmailTemplateType] = useState<"active" | "warning" | "expired">("active");

  const [isUpdating, setIsUpdating] = useState(false);
  const [bildirim, setBildirim] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const list = await getAllUsers();
    setUsers(list);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setBildirim({ text, type });
    setTimeout(() => setBildirim(null), 4000);
  };

  // Pro Süresi Güncelle
  const handleSetDuration = async (uid: string, days: number, userEmail: string) => {
    setIsUpdating(true);
    const res = await setUserProDuration(uid, days);
    setIsUpdating(false);

    if (res.success) {
      showNotification(`✓ ${userEmail} kullanıcısına ${days} gün PRO üyelik tanımlandı.`);
      await fetchUsers();
    } else {
      showNotification(`⚠️ Hata: ${res.error}`, "error");
    }
  };

  // Pro İptal Et
  const handleCancelPro = async (uid: string, userEmail: string) => {
    if (!confirm(`${userEmail} kullanıcısının PRO üyeliğini iptal etmek istediğinize emin misiniz?`)) {
      return;
    }
    setIsUpdating(true);
    const res = await cancelUserPro(uid);
    setIsUpdating(false);

    if (res.success) {
      showNotification(`✓ ${userEmail} kullanıcısının PRO üyeliği iptal edildi.`);
      await fetchUsers();
    } else {
      showNotification(`⚠️ Hata: ${res.error}`, "error");
    }
  };

  // E-posta Şablonları Oluşturucu
  const getEmailContent = (u: AppUser, type: "active" | "warning" | "expired") => {
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://egitim-araclari.web.app";
    const userName = u.displayName || u.email.split("@")[0];

    if (type === "active") {
      const days = u.proDaysLeft || 30;
      const bitisTarihi = u.proExpiresAt ? new Date(u.proExpiresAt).toLocaleDateString("tr-TR") : `${days} gün sonra`;
      return {
        subject: "🎉 Eğitim Araçları - PRO Üyeliğiniz Aktif Edildi!",
        body: `Merhaba ${userName},\n\nEğitim Araçları platformunda PRO üyeliğiniz ${days} gün süreyle başarıyla aktif edilmiştir!\n\n📅 Bitiş Tarihi: ${bitisTarihi}\n⭐ Ayrıcalıklarınız:\n- Sınırsız Öğrenci Ekleme\n- PDF Karne ve Sınav Analizi\n- Ortalama Hesaplama ve Net Analizleri\n- Aidat, Nöbet ve Ders Programı Yönetimi\n- Veli Bilgilendirme ve Başarı Grafikleri\n\nPlatforma hemen giriş yapmak için:\n${siteUrl}\n\nİyi çalışmalar ve başarılar dileriz!\nEğitim Araçları Yönetimi (Mustafa Demirbaş)`,
      };
    }

    if (type === "warning") {
      const bitisTarihi = u.proExpiresAt ? new Date(u.proExpiresAt).toLocaleDateString("tr-TR") : "3 gün sonra";
      return {
        subject: "⏳ Eğitim Araçları - PRO Üyeliğinizin Bitmesine 3 Gün Kaldı!",
        body: `Merhaba ${userName},\n\nEğitim Araçları platformundaki PRO üyeliğinizin süresi 3 gün sonra (${bitisTarihi}) sona erecektir.\n\nSınırsız öğrenci ekleme ve karne/analiz modüllerinizi kesintisiz kullanmaya devam etmek için üyeliğinizi yenileyebilirsiniz.\n\n💳 Üyelik Seçenekleri:\n• Aylık PRO: 150 ₺\n• Yıllık PRO: 1.600 ₺ (200 ₺ İndirimli)\n\nYenileme ve bilgi için yönetici ile iletişime geçebilirsiniz.\nPlatforma giriş:\n${siteUrl}\n\nSaygılarımızla,\nEğitim Araçları Yönetimi (Mustafa Demirbaş)`,
      };
    }

    // Expired
    return {
      subject: "⚠️ Eğitim Araçları - PRO Üyelik Süreniz Sona Erdi",
      body: `Merhaba ${userName},\n\nEğitim Araçları platformundaki PRO üyelik süreniz sona ermiştir ve hesabınız Standart Üye moduna geçirilmiştir.\n\nPRO üyeliğinizi yeniden uzatmak ve tüm gelişmiş araçlara (PDF Karne, Sınav Analizi, Sınırsız Öğrenci) kesintisiz erişmek için:\n\n💳 Paket Seçenekleri:\n• Aylık PRO: 150 ₺\n• Yıllık PRO: 1.600 ₺\n\nYönetici ile iletişime geçerek anında aktif ettirebilirsiniz.\n\nPlatform:\n${siteUrl}\n\nSaygılarımızla,\nEğitim Araçları Yönetimi (Mustafa Demirbaş)`,
    };
  };

  // E-posta Uygulamasını Başlat (Mailto)
  const openMailClient = () => {
    if (!emailTargetUser) return;
    const { subject, body } = getEmailContent(emailTargetUser, emailTemplateType);
    const mailtoUrl = `mailto:${emailTargetUser.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, "_blank");
    setEmailModalOpen(false);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Yetkisiz Erişim Ekranı
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 glass-card rounded-3xl text-center space-y-5 border border-red-500/30">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 text-red-500 flex items-center justify-center text-3xl mx-auto">
          ⛔
        </div>
        <h3 className="text-xl font-black text-[var(--foreground)]">Yetkisiz Erişim</h3>
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          Bu yönetim paneline yalnızca sistem yöneticisi (<strong>Mustafa Demirbaş</strong>) erişebilir.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 rounded-xl font-bold text-xs bg-[var(--primary)] text-white hover:opacity-90 transition-all shadow-md"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    );
  }

  // İstatistik Hesaplamaları
  const totalUsers = users.length;
  const proUsers = users.filter((u) => u.isPro).length;
  const standardUsers = users.filter((u) => !u.isPro).length;
  const expiringSoonUsers = users.filter((u) => u.isPro && u.role !== "admin" && (u.proDaysLeft ?? 0) <= 3 && (u.proDaysLeft ?? 0) > 0).length;

  // Filtreleme
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.email.toLowerCase().includes(arama.toLowerCase()) ||
      u.displayName.toLowerCase().includes(arama.toLowerCase());

    if (!matchSearch) return false;
    if (filtre === "pro") return u.isPro;
    if (filtre === "standart") return !u.isPro;
    if (filtre === "kritik") return u.isPro && u.role !== "admin" && (u.proDaysLeft ?? 0) <= 3;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Üst Bildirim Toast */}
      {bildirim && (
        <div
          className={`fixed top-20 right-6 z-50 p-4 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2 animate-slide-up ${
            bildirim.type === "success"
              ? "bg-emerald-500 text-white border-emerald-400"
              : "bg-red-500 text-white border-red-400"
          }`}
        >
          <span>{bildirim.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-amber-500/30">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white text-xl shadow-lg">
              👑
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">
                Yönetici & Pro Üyelik Kontrol Paneli
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                Kayıtlı kullanıcıları yönetin, Pro üyelik sürelerini belirleyin ve bildirim gönderin
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading || isUpdating}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
        >
          <span>🔄</span>
          <span>Listeyi Yenile</span>
        </button>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 space-y-2 border border-[var(--border)]">
          <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase">Toplam Kullanıcı</p>
          <p className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">{totalUsers}</p>
          <p className="text-[11px] text-indigo-500 font-semibold">Tüm kayıtlı hesaplar</p>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-2 border border-amber-500/30 bg-amber-500/5">
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">⭐ Aktif PRO Üyeler</p>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">{proUsers}</p>
          <p className="text-[11px] text-amber-600/80 font-semibold">Sınırsız erişimli kullanıcılar</p>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-2 border border-[var(--border)]">
          <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase">🆓 Standart Üyeler</p>
          <p className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">{standardUsers}</p>
          <p className="text-[11px] text-slate-500 font-semibold">10 öğrenci limitli</p>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-2 border border-orange-500/30 bg-orange-500/5">
          <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase">⏳ Son 3 Gün Kalanlar</p>
          <p className="text-2xl sm:text-3xl font-black text-orange-600 dark:text-orange-400">{expiringSoonUsers}</p>
          <p className="text-[11px] text-orange-600/80 font-semibold">Yakında süresi bitecekler</p>
        </div>
      </div>

      {/* Filtre ve Arama Çubuğu */}
      <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <input
            type="text"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="E-posta veya isim ara..."
            className="w-full px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFiltre("hepsi")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filtre === "hepsi"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            Tümü ({totalUsers})
          </button>
          <button
            onClick={() => setFiltre("pro")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filtre === "pro"
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-amber-500"
            }`}
          >
            PRO ({proUsers})
          </button>
          <button
            onClick={() => setFiltre("standart")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filtre === "standart"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            Standart ({standardUsers})
          </button>
          <button
            onClick={() => setFiltre("kritik")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filtre === "kritik"
                ? "bg-orange-600 text-white shadow-sm"
                : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-orange-500"
            }`}
          >
            Kritik (≤3 Gün) ({expiringSoonUsers})
          </button>
        </div>
      </div>

      {/* Kullanıcılar Tablosu */}
      <div className="glass-card rounded-3xl p-6 overflow-x-auto shadow-xl border border-[var(--border)]">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-[var(--muted-foreground)] flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span>Kullanıcılar yükleniyor...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-xs font-bold text-[var(--muted-foreground)]">
            Arama kriterlerine uygun kullanıcı bulunamadı.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)] font-extrabold uppercase tracking-wider text-[11px]">
                <th className="p-3">Kullanıcı / E-posta</th>
                <th className="p-3">Üyelik Durumu</th>
                <th className="p-3">Kalan Süre</th>
                <th className="p-3">Bitiş Tarihi</th>
                <th className="p-3">Hızlı PRO Süresi Tanımla</th>
                <th className="p-3 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredUsers.map((u) => {
                const isUserAdmin = u.role === "admin" || u.email.toLowerCase() === user?.email.toLowerCase();
                const daysLeft = u.proDaysLeft ?? 0;

                return (
                  <tr key={u.uid} className="hover:bg-[var(--secondary)]/40 transition-colors">
                    {/* E-posta & İsim */}
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-sm ${
                            isUserAdmin
                              ? "bg-gradient-to-br from-amber-500 to-orange-600"
                              : u.isPro
                              ? "bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600"
                              : "bg-slate-500"
                          }`}
                        >
                          {isUserAdmin ? "👑" : u.isPro ? "⭐" : "👤"}
                        </div>
                        <div>
                          <p className="font-extrabold text-[var(--foreground)] text-xs">
                            {u.displayName} {isUserAdmin && <span className="text-amber-500">(Admin)</span>}
                          </p>
                          <p className="text-[11px] text-[var(--muted-foreground)] font-mono">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Üyelik Durumu */}
                    <td className="p-3">
                      {isUserAdmin ? (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          👑 Süresiz Admin
                        </span>
                      ) : u.isPro ? (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                          <span>⭐</span>
                          <span>PRO Üye</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                          🆓 Standart
                        </span>
                      )}
                    </td>

                    {/* Kalan Süre */}
                    <td className="p-3">
                      {isUserAdmin ? (
                        <span className="text-emerald-500 font-bold">Sınırsız</span>
                      ) : u.isPro ? (
                        <span
                          className={`font-black px-2 py-0.5 rounded-md text-[11px] ${
                            daysLeft <= 3
                              ? "bg-red-500/15 text-red-600 dark:text-red-400 animate-pulse border border-red-500/30"
                              : daysLeft <= 7
                              ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30"
                              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          ⏳ {daysLeft} Gün Kaldı
                        </span>
                      ) : (
                        <span className="text-[var(--muted-foreground)] font-semibold">0 Gün</span>
                      )}
                    </td>

                    {/* Bitiş Tarihi */}
                    <td className="p-3 font-mono text-[11px] text-[var(--muted-foreground)]">
                      {isUserAdmin
                        ? "—"
                        : u.proExpiresAt
                        ? new Date(u.proExpiresAt).toLocaleDateString("tr-TR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                        : "Yok"}
                    </td>

                    {/* Hızlı Pro Süre Butonları */}
                    <td className="p-3">
                      {isUserAdmin ? (
                        <span className="text-[11px] text-[var(--muted-foreground)]">Yönetici hesabı</span>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleSetDuration(u.uid, 7, u.email)}
                            disabled={isUpdating}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white transition-all cursor-pointer"
                            title="7 Günlük Pro Tanımla"
                          >
                            +7 Gün
                          </button>
                          <button
                            onClick={() => handleSetDuration(u.uid, 30, u.email)}
                            disabled={isUpdating}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white transition-all cursor-pointer"
                            title="30 Günlük Pro Tanımla"
                          >
                            +30 Gün
                          </button>
                          <button
                            onClick={() => handleSetDuration(u.uid, 90, u.email)}
                            disabled={isUpdating}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white transition-all cursor-pointer"
                            title="90 Günlük (3 Ay) Pro Tanımla"
                          >
                            +90 Gün
                          </button>
                          <button
                            onClick={() => handleSetDuration(u.uid, 365, u.email)}
                            disabled={isUpdating}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500 hover:text-white transition-all cursor-pointer"
                            title="365 Günlük (1 Yıl) Pro Tanımla"
                          >
                            +1 Yıl
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setCustomModalOpen(true);
                            }}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-white transition-all cursor-pointer"
                            title="Özel gün sayısı belirle"
                          >
                            ⚙️ Özel
                          </button>
                        </div>
                      )}
                    </td>

                    {/* İşlemler & E-posta */}
                    <td className="p-3 text-center">
                      {!isUserAdmin && (
                        <div className="flex items-center justify-center gap-1.5">
                          {/* E-posta Gönder Butonu */}
                          <button
                            onClick={() => {
                              setEmailTargetUser(u);
                              setEmailTemplateType(u.isPro ? (daysLeft <= 3 ? "warning" : "active") : "expired");
                              setEmailModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all cursor-pointer"
                            title="Bilgilendirme E-postası Gönder"
                          >
                            ✉️ Mail
                          </button>

                          {/* Pro İptal */}
                          {u.isPro && (
                            <button
                              onClick={() => handleCancelPro(u.uid, u.email)}
                              disabled={isUpdating}
                              className="p-1.5 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                              title="PRO Üyeliği Sonlandır"
                            >
                              ⛔ İptal
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ÖZEL GÜN TANIMLAMA MODALI */}
      {customModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card rounded-3xl w-full max-w-sm p-6 space-y-4 border border-amber-500/30 bg-[var(--background)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h4 className="font-extrabold text-sm text-[var(--foreground)] flex items-center gap-1.5">
                <span>⭐</span>
                <span>Özel PRO Süresi Belirle</span>
              </h4>
              <button
                onClick={() => setCustomModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-red-500 font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-[var(--muted-foreground)]">
                Kullanıcı: <strong>{selectedUser.email}</strong>
              </p>
              <label className="block font-bold text-[var(--foreground)] uppercase text-[11px]">
                Kaç gün PRO üyelik tanımlansın?
              </label>
              <input
                type="number"
                min={1}
                max={3650}
                value={customDays}
                onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => setCustomModalOpen(false)}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-[var(--secondary)] text-[var(--foreground)]"
              >
                Vazgeç
              </button>
              <button
                onClick={async () => {
                  setCustomModalOpen(false);
                  await handleSetDuration(selectedUser.uid, customDays, selectedUser.email);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:opacity-90"
              >
                Onayla & Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E-POSTA ŞABLONU GÖNDERME MODALI */}
      {emailModalOpen && emailTargetUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card rounded-3xl w-full max-w-lg p-6 sm:p-7 space-y-4 border border-indigo-500/30 bg-[var(--background)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h4 className="font-extrabold text-base text-[var(--foreground)] flex items-center gap-2">
                  <span>✉️</span>
                  <span>E-posta Bildirimi Gönder</span>
                </h4>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  Alıcı: <strong>{emailTargetUser.email}</strong>
                </p>
              </div>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-red-500 font-bold"
              >
                ×
              </button>
            </div>

            {/* Şablon Seçici */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[var(--secondary)] border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setEmailTemplateType("active")}
                className={`py-2 rounded-lg text-[11px] font-bold transition-all ${
                  emailTemplateType === "active"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                🎉 Aktif Edildi
              </button>
              <button
                type="button"
                onClick={() => setEmailTemplateType("warning")}
                className={`py-2 rounded-lg text-[11px] font-bold transition-all ${
                  emailTemplateType === "warning"
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                ⏳ Son 3 Gün
              </button>
              <button
                type="button"
                onClick={() => setEmailTemplateType("expired")}
                className={`py-2 rounded-lg text-[11px] font-bold transition-all ${
                  emailTemplateType === "expired"
                    ? "bg-red-500 text-white shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                ⚠️ Sona Erdi
              </button>
            </div>

            {/* Önizleme Alanı */}
            <div className="p-3.5 rounded-2xl bg-[var(--secondary)]/60 border border-[var(--border)] text-xs space-y-2">
              <p className="font-bold text-[var(--foreground)]">
                <strong>Konu:</strong> {getEmailContent(emailTargetUser, emailTemplateType).subject}
              </p>
              <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] font-mono text-[11px] text-[var(--foreground)] whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                {getEmailContent(emailTargetUser, emailTemplateType).body}
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => setEmailModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[var(--secondary)] text-[var(--foreground)]"
              >
                Kapat
              </button>
              <button
                onClick={openMailClient}
                className="flex-1 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>🚀</span>
                <span>Mail İstemcisinde Aç & Gönder</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
