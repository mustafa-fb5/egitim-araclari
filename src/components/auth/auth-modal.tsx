"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "login" | "register";
}

export default function AuthModal({ isOpen, onClose, initialTab = "login" }: AuthModalProps) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<"login" | "register">(initialTab);

  // Form State'leri - Kutular tamamen boş
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      setSuccessMessage("Başarıyla giriş yapıldı!");
      setTimeout(() => {
        setEmail("");
        setPassword("");
        onClose();
      }, 600);
    } else {
      setErrorMessage(res.error || "Giriş başarısız oldu.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    const res = await register(email, password);
    setLoading(false);

    if (res.success) {
      setSuccessMessage("Hesabınız oluşturuldu ve giriş yapıldı!");
      setTimeout(() => {
        setEmail("");
        setPassword("");
        onClose();
      }, 700);
    } else {
      setErrorMessage(res.error || "Kayıt oluşturulamadı.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in no-print">
      <div className="glass-card rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl border border-[var(--border)] bg-[var(--background)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div>
            <h3 className="text-xl font-black text-[var(--foreground)] flex items-center gap-2">
              <span>{tab === "register" ? "📝" : "🔑"}</span>
              <span>{tab === "register" ? "Yeni Hesap Oluştur" : "Kullanıcı Girişi"}</span>
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Eğitim araçları platformuna erişim
            </p>
          </div>
          <button
            onClick={() => {
              setErrorMessage("");
              setSuccessMessage("");
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-[var(--secondary)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-500 transition-colors font-bold text-lg cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Tab Switcher - Sadece Giriş Yap ve Kayıt Ol */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[var(--secondary)] border border-[var(--border)]">
          <button
            type="button"
            onClick={() => { setTab("login"); setErrorMessage(""); setSuccessMessage(""); }}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === "login"
                ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => { setTab("register"); setErrorMessage(""); setSuccessMessage(""); }}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === "register"
                ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            Kayıt Ol
          </button>
        </div>

        {/* Alert Messages */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-semibold flex items-center gap-2 animate-slide-up">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-semibold flex items-center gap-2 animate-slide-up">
            <span>✓</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* TAB 1: GİRİŞ YAP */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">
                E-posta Adresi
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=""
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">
                Şifre
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.99] transition-all shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-[var(--muted-foreground)]">Hesabınız yok mu? </span>
              <button
                type="button"
                onClick={() => setTab("register")}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Kayıt Olun
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: KAYIT OL */}
        {tab === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">
                E-posta Adresi
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=""
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">
                Şifre (En az 6 karakter)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-90 active:scale-[0.99] transition-all shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Hesap oluşturuluyor..." : "Kayıt Ol"}
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-[var(--muted-foreground)]">Zaten hesabınız var mı? </span>
              <button
                type="button"
                onClick={() => setTab("login")}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Giriş Yapın
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
