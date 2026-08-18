"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";

export interface AppUser {
  uid: string;
  email: string;
  password?: string;
  displayName: string;
  role: "admin" | "user" | "teacher";
  unvan?: string;
  isPro: boolean;
  proExpiresAt?: string | null;
  proStartedAt?: string | null;
  createdAt?: string;
  proDaysLeft?: number;
}

export const ADMIN_EMAIL = "mustafademirbas0053@gmail.com";
export const ADMIN_PASS = "uslanmaz5353";

export function calculateDaysLeft(expiresAt?: string | null): number {
  if (!expiresAt) return 0;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function makeUid(email: string): string {
  let h = 5381;
  for (let i = 0; i < email.length; i++) {
    h = ((h << 5) + h) ^ email.charCodeAt(i);
    h >>>= 0;
  }
  return "u_" + h.toString(36) + "_" + email.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();
}

// Güvenli Timeout Sarmalayıcı (Asla askıda kalmaz)
function withTimeout<T>(promise: Promise<T>, ms = 1500, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  isPro: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, pass: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  quickAdminLogin: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  getAllUsers: () => Promise<AppUser[]>;
  setUserProDuration: (uid: string, days: number) => Promise<{ success: boolean; error?: string }>;
  cancelUserPro: (uid: string) => Promise<{ success: boolean; error?: string }>;
  proModalOpen: boolean;
  openProModal: (featureName?: string) => void;
  closeProModal: () => void;
  proModalFeature: string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isPro: false,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  quickAdminLogin: async () => ({ success: false }),
  logout: async () => {},
  getAllUsers: async () => [],
  setUserProDuration: async () => ({ success: false }),
  cancelUserPro: async () => ({ success: false }),
  proModalOpen: false,
  openProModal: () => {},
  closeProModal: () => {},
  proModalFeature: "",
});

const SESSION_KEY = "egitim_araclari_user_session";
const USERS_DB_KEY = "egitim_araclari_local_users_db";

// Yerel Kullanıcı Veritabanı Yardımcıları
function getLocalUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalUser(newUser: AppUser) {
  try {
    const list = getLocalUsers();
    const idx = list.findIndex((u) => u.email.toLowerCase() === newUser.email.toLowerCase());
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...newUser };
    } else {
      list.push(newUser);
    }
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [proModalOpen, setProModalOpen] = useState(false);
  const [proModalFeature, setProModalFeature] = useState("");

  const openProModal = (featureName = "Bu Özellik") => {
    setProModalFeature(featureName);
    setProModalOpen(true);
  };

  const closeProModal = () => {
    setProModalOpen(false);
    setProModalFeature("");
  };

  // Oturumu anında localStorage'dan yükle (0ms)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed: AppUser = JSON.parse(saved);
        const daysLeft = calculateDaysLeft(parsed.proExpiresAt);
        const isProValid = parsed.role === "admin" || (parsed.isPro && daysLeft > 0);
        setUser({ ...parsed, isPro: isProValid, proDaysLeft: daysLeft });
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const isAdmin = Boolean(
    user && (user.role === "admin" || user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase())
  );
  const isPro = Boolean(
    user && (isAdmin || (user.isPro && calculateDaysLeft(user.proExpiresAt) > 0))
  );

  const saveSession = (u: AppUser) => {
    const daysLeft = calculateDaysLeft(u.proExpiresAt);
    const fullUser: AppUser = {
      ...u,
      isPro: u.role === "admin" || (Boolean(u.isPro) && daysLeft > 0),
      proDaysLeft: daysLeft,
    };
    setUser(fullUser);
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(fullUser));
      saveLocalUser(fullUser);
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  // =================== KAYIT OL (ANINDA YANIT) ===================
  const register = async (
    email: string,
    pass: string,
    name?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || "").trim() || cleanEmail.split("@")[0];

    if (!cleanEmail || !pass) {
      return { success: false, error: "Lütfen e-posta ve şifrenizi giriniz." };
    }
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      return { success: false, error: "Geçerli bir e-posta adresi giriniz." };
    }
    if (pass.length < 6) {
      return { success: false, error: "Şifreniz en az 6 karakter olmalıdır." };
    }

    const isAdminUser = cleanEmail === ADMIN_EMAIL.toLowerCase();
    const uid = isAdminUser ? "admin_mustafa" : makeUid(cleanEmail);

    // 1. Yerel veritabanında var mı kontrol et
    const localUsers = getLocalUsers();
    const alreadyExists = localUsers.some((u) => u.email.toLowerCase() === cleanEmail);
    if (alreadyExists) {
      return { success: false, error: "Bu e-posta adresi zaten kayıtlı! Giriş Yapınız." };
    }

    const createdAt = new Date().toISOString();
    const newUser: AppUser = {
      uid,
      email: cleanEmail,
      password: pass,
      displayName: cleanName,
      role: isAdminUser ? "admin" : "teacher",
      unvan: isAdminUser ? "Sistem Yöneticisi" : "Öğretmen",
      isPro: isAdminUser,
      proExpiresAt: null,
      proStartedAt: null,
      createdAt,
      proDaysLeft: 0,
    };

    // 2. Anında yerel oturum aç ve kaydet
    saveSession(newUser);

    // 3. Arka planda Firestore'a yaz (Kullanıcıyı asla bekletmez)
    withTimeout(
      setDoc(doc(db, "kullanicilar", uid), {
        uid,
        email: cleanEmail,
        password: pass,
        displayName: cleanName,
        role: newUser.role,
        unvan: newUser.unvan,
        isPro: newUser.isPro,
        proExpiresAt: null,
        proStartedAt: null,
        createdAt,
      }),
      2000,
      null
    ).catch(() => {});

    return { success: true };
  };

  // =================== GİRİŞ YAP (ANINDA YANIT) ===================
  const login = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !pass) {
      return { success: false, error: "Lütfen e-posta ve şifrenizi giriniz." };
    }

    const isAdminUser = cleanEmail === ADMIN_EMAIL.toLowerCase();

    // 1. Yönetici Girişi
    if (isAdminUser) {
      if (pass !== ADMIN_PASS) {
        return { success: false, error: "Yönetici parolası hatalı!" };
      }
      const adminUser: AppUser = {
        uid: "admin_mustafa",
        email: ADMIN_EMAIL,
        password: ADMIN_PASS,
        displayName: "Mustafa Demirbaş",
        role: "admin",
        unvan: "Sistem Yöneticisi",
        isPro: true,
        proExpiresAt: null,
        proStartedAt: null,
        createdAt: new Date().toISOString(),
        proDaysLeft: 9999,
      };
      saveSession(adminUser);

      // Arka planda Firestore senkronu
      withTimeout(
        setDoc(doc(db, "kullanicilar", "admin_mustafa"), adminUser, { merge: true }),
        2000,
        null
      ).catch(() => {});

      return { success: true };
    }

    // 2. Önce yerel veritabanında ara (Anında 0ms kontrol)
    const localUsers = getLocalUsers();
    const localFound = localUsers.find((u) => u.email.toLowerCase() === cleanEmail);

    if (localFound) {
      if (localFound.password && localFound.password !== pass) {
        return { success: false, error: "Girdiğiniz şifre hatalı!" };
      }
      saveSession(localFound);
      return { success: true };
    }

    // 3. Yerelde yoksa Firestore'dan kontrol et (Maksimum 1.5 saniye bekleme süresi)
    const uid = makeUid(cleanEmail);
    try {
      const snap = await withTimeout(getDoc(doc(db, "kullanicilar", uid)), 1500, null);

      if (snap && snap.exists()) {
        const d = snap.data();
        if (d.password && d.password !== pass) {
          return { success: false, error: "Girdiğiniz şifre hatalı!" };
        }
        const daysLeft = calculateDaysLeft(d.proExpiresAt);
        const loggedUser: AppUser = {
          uid: snap.id,
          email: cleanEmail,
          password: d.password || pass,
          displayName: d.displayName || cleanEmail.split("@")[0],
          role: d.role || "teacher",
          unvan: d.unvan || "Öğretmen",
          isPro: Boolean(d.isPro) && daysLeft > 0,
          proExpiresAt: d.proExpiresAt || null,
          proStartedAt: d.proStartedAt || null,
          createdAt: d.createdAt || new Date().toISOString(),
          proDaysLeft: daysLeft,
        };
        saveSession(loggedUser);
        return { success: true };
      }
    } catch {
      // ignore
    }

    // Kullanıcı bulunamadıysa yeni hesap olarak otomatik oluşturup giriş yapsın mı?
    // Kullanıcı dostu akış: Eğer şifre >= 6 karakterse kullanıcıyı bekletmeden otomatik kaydet
    if (pass.length >= 6) {
      const autoUser: AppUser = {
        uid,
        email: cleanEmail,
        password: pass,
        displayName: cleanEmail.split("@")[0],
        role: "teacher",
        unvan: "Öğretmen",
        isPro: false,
        proExpiresAt: null,
        proStartedAt: null,
        createdAt: new Date().toISOString(),
        proDaysLeft: 0,
      };
      saveSession(autoUser);
      withTimeout(
        setDoc(doc(db, "kullanicilar", uid), autoUser, { merge: true }),
        2000,
        null
      ).catch(() => {});
      return { success: true };
    }

    return { success: false, error: "E-posta veya şifre hatalı!" };
  };

  const quickAdminLogin = async () => login(ADMIN_EMAIL, ADMIN_PASS);

  const logout = async () => {
    setUser(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  // ================= ADMIN METODLARI =================
  const getAllUsers = async (): Promise<AppUser[]> => {
    const localList = getLocalUsers();
    try {
      const snap = await withTimeout(getDocs(collection(db, "kullanicilar")), 2000, null);
      if (snap) {
        const remoteUsers: AppUser[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          const daysLeft = calculateDaysLeft(d.proExpiresAt);
          const isAdminU = d.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
          remoteUsers.push({
            uid: docSnap.id,
            email: d.email || "",
            password: d.password,
            displayName: d.displayName || d.email?.split("@")[0] || "Kullanıcı",
            role: isAdminU ? "admin" : (d.role || "teacher"),
            unvan: d.unvan || "Öğretmen",
            isPro: isAdminU || (Boolean(d.isPro) && daysLeft > 0),
            proExpiresAt: d.proExpiresAt || null,
            proStartedAt: d.proStartedAt || null,
            createdAt: d.createdAt || "",
            proDaysLeft: daysLeft,
          });
        });

        // Birleştir
        const mergedMap = new Map<string, AppUser>();
        localList.forEach((u) => mergedMap.set(u.email.toLowerCase(), u));
        remoteUsers.forEach((u) => mergedMap.set(u.email.toLowerCase(), u));

        const result = Array.from(mergedMap.values()).sort((a, b) => {
          if (a.role === "admin") return -1;
          if (b.role === "admin") return 1;
          return (b.createdAt || "").localeCompare(a.createdAt || "");
        });

        localStorage.setItem(USERS_DB_KEY, JSON.stringify(result));
        return result;
      }
    } catch {
      // ignore
    }
    return localList;
  };

  const setUserProDuration = async (uid: string, days: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const now = new Date();
      const proExpiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
      const proStartedAt = now.toISOString();

      // Yerelde güncelle
      const localUsers = getLocalUsers();
      const target = localUsers.find((u) => u.uid === uid);
      if (target) {
        target.isPro = true;
        target.proExpiresAt = proExpiresAt;
        target.proStartedAt = proStartedAt;
        target.proDaysLeft = days;
        saveLocalUser(target);
      }

      if (user && user.uid === uid) {
        saveSession({ ...user, isPro: true, proExpiresAt, proStartedAt, proDaysLeft: days });
      }

      // Firestore'da arka planda güncelle
      withTimeout(
        updateDoc(doc(db, "kullanicilar", uid), { isPro: true, proExpiresAt, proStartedAt }),
        2000,
        null
      ).catch(() => {});

      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: "Pro süre kaydedilemedi." };
    }
  };

  const cancelUserPro = async (uid: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const localUsers = getLocalUsers();
      const target = localUsers.find((u) => u.uid === uid);
      if (target) {
        target.isPro = false;
        target.proExpiresAt = null;
        target.proDaysLeft = 0;
        saveLocalUser(target);
      }

      if (user && user.uid === uid && user.role !== "admin") {
        saveSession({ ...user, isPro: false, proExpiresAt: null, proDaysLeft: 0 });
      }

      withTimeout(
        updateDoc(doc(db, "kullanicilar", uid), { isPro: false, proExpiresAt: null }),
        2000,
        null
      ).catch(() => {});

      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: "İptal işlemi başarısız." };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isPro,
        login,
        register,
        quickAdminLogin,
        logout,
        getAllUsers,
        setUserProDuration,
        cancelUserPro,
        proModalOpen,
        openProModal,
        closeProModal,
        proModalFeature,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
