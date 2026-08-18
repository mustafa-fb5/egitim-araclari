import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from "firebase/firestore";
import { db } from "./firebase";
import { 
  demoOgrenciler, 
  type Ogrenci 
} from "./data";

// ==========================================
// KULLANICIYA ÖZEL BULUT VE ÖNBELLEK YARDIMCILARI
// ==========================================
export function getActiveUserUid(): string {
  if (typeof window === "undefined") return "guest";
  try {
    const raw = localStorage.getItem("egitim_araclari_user_session");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.uid) return String(parsed.uid);
      if (parsed?.email) return String(parsed.email).replace(/[^a-zA-Z0-9]/g, "_");
    }
  } catch {
    // ignore
  }
  return "guest";
}

// Kullanıcıya özel koleksiyon yolu: users/{uid}/{collectionName}
function userCol(colName: string) {
  const uid = getActiveUserUid();
  return collection(db, "users", uid, colName);
}

// Kullanıcıya özel doküman yolu: users/{uid}/{collectionName}/{docId}
function userDoc(colName: string, docId: string) {
  const uid = getActiveUserUid();
  return doc(db, "users", uid, colName, docId);
}

// Kullanıcıya özel yerel önbellek anahtarı
function userCacheKey(key: string) {
  return `${getActiveUserUid()}__${key}`;
}

// ==============================
// 1. ÖĞRENCİ YÖNETİMİ (Kullanıcıya Özel)
// ==============================

const OGRENCILER_COL = "ogrenciler";

export function getInitialOgrenciler(): Ogrenci[] {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(userCacheKey("egitim_ogrenciler_cache"));
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
  }
  return [];
}

export function getInitialPersoneller(): PersonelData[] {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(userCacheKey("egitim_personeller_cache"));
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
  }
  return [];
}

export async function fetchOgrenciler(): Promise<Ogrenci[]> {
  try {
    const snap = await getDocs(userCol(OGRENCILER_COL));
    if (snap.empty) {
      return [];
    }
    const list: Ogrenci[] = [];
    snap.forEach((d) => {
      list.push(d.data() as Ogrenci);
    });
    return list.sort((a, b) => Number(a.numara) - Number(b.numara));
  } catch (error) {
    console.error("Firestore fetchOgrenciler error:", error);
    return getInitialOgrenciler();
  }
}

export function subscribeOgrenciler(callback: (ogrenciler: Ogrenci[]) => void) {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(userCacheKey("egitim_ogrenciler_cache"));
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          callback(parsed);
        }
      }
    } catch {
      // ignore
    }
  }

  return onSnapshot(userCol(OGRENCILER_COL), (snap) => {
    const list: Ogrenci[] = [];
    snap.forEach((d) => list.push(d.data() as Ogrenci));
    list.sort((a, b) => Number(a.numara) - Number(b.numara));
    
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(userCacheKey("egitim_ogrenciler_cache"), JSON.stringify(list));
      } catch {
        // ignore
      }
    }
    
    callback(list);
  }, (err) => {
    console.warn("Firestore subscription error:", err);
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(userCacheKey("egitim_ogrenciler_cache"));
        if (cached) {
          callback(JSON.parse(cached));
          return;
        }
      } catch {
        // ignore
      }
    }
  });
}

export async function saveOgrenci(ogrenci: Ogrenci): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const cacheKey = userCacheKey("egitim_ogrenciler_cache");
      const cached = localStorage.getItem(cacheKey);
      let list: Ogrenci[] = cached ? JSON.parse(cached) : [];
      const idx = list.findIndex((o) => o.id === ogrenci.id);
      if (idx >= 0) {
        list[idx] = ogrenci;
      } else {
        list.push(ogrenci);
      }
      localStorage.setItem(cacheKey, JSON.stringify(list));
    } catch {
      // ignore
    }
  }
  await setDoc(userDoc(OGRENCILER_COL, String(ogrenci.id)), ogrenci);
}

export async function deleteOgrenci(ogrenciId: number): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const cacheKey = userCacheKey("egitim_ogrenciler_cache");
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        let list: Ogrenci[] = JSON.parse(cached);
        list = list.filter((o) => o.id !== ogrenciId);
        localStorage.setItem(cacheKey, JSON.stringify(list));
      }
    } catch {
      // ignore
    }
  }
  await deleteDoc(userDoc(OGRENCILER_COL, String(ogrenciId)));
}

// ==============================
// 2. SINAV ANALİZİ (Kullanıcıya Özel)
// ==============================

const SINAVLAR_COL = "sinavlar";

export interface SoruSonuc {
  dogru: number | "";
  yanlis: number | "";
  bos: number;
}

export interface SinavData {
  id: number;
  ad: string;
  sinif: string;
  sube: string;
  tarih: string;
  ogrenciNotlari: Record<number, Record<string, SoruSonuc>>;
}

export async function fetchSinavlar(): Promise<SinavData[]> {
  try {
    const snap = await getDocs(userCol(SINAVLAR_COL));
    const list: SinavData[] = [];
    snap.forEach((d) => list.push(d.data() as SinavData));
    return list;
  } catch (error) {
    console.error("Firestore fetchSinavlar error:", error);
    return [];
  }
}

export function subscribeSinavlar(callback: (sinavlar: SinavData[]) => void) {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(userCacheKey("egitim_sinavlar_cache"));
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          callback(parsed);
        }
      }
    } catch {
      // ignore
    }
  }

  return onSnapshot(userCol(SINAVLAR_COL), (snap) => {
    const list: SinavData[] = [];
    snap.forEach((d) => list.push(d.data() as SinavData));
    
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(userCacheKey("egitim_sinavlar_cache"), JSON.stringify(list));
      } catch {
        // ignore
      }
    }
    
    callback(list);
  }, (err) => {
    console.warn("Firestore sinavlar subscription error:", err);
  });
}

export async function saveSinav(sinav: SinavData): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const cacheKey = userCacheKey("egitim_sinavlar_cache");
      const cached = localStorage.getItem(cacheKey);
      let list: SinavData[] = cached ? JSON.parse(cached) : [];
      const idx = list.findIndex((s) => s.id === sinav.id);
      if (idx >= 0) {
        list[idx] = sinav;
      } else {
        list.push(sinav);
      }
      localStorage.setItem(cacheKey, JSON.stringify(list));
    } catch {
      // ignore
    }
  }
  await setDoc(userDoc(SINAVLAR_COL, String(sinav.id)), sinav);
}

export async function deleteSinav(sinavId: number): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const cacheKey = userCacheKey("egitim_sinavlar_cache");
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        let list: SinavData[] = JSON.parse(cached);
        list = list.filter((s) => s.id !== sinavId);
        localStorage.setItem(cacheKey, JSON.stringify(list));
      }
    } catch {
      // ignore
    }
  }
  await deleteDoc(userDoc(SINAVLAR_COL, String(sinavId)));
}

// ==============================
// 3. YOKLAMA (Kullanıcıya Özel)
// ==============================

const YOKLAMA_COL = "yoklamalar";

export function subscribeYoklamalar(callback: (data: Record<string, Record<number, string>>) => void) {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(userCacheKey("egitim_yoklama_cache"));
      if (cached) {
        callback(JSON.parse(cached));
      }
    } catch {
      // ignore
    }
  }

  return onSnapshot(userCol(YOKLAMA_COL), (snap) => {
    const data: Record<string, Record<number, string>> = {};
    snap.forEach((d) => {
      const raw = d.data().kayitlar || {};
      const converted: Record<number, string> = {};
      Object.entries(raw).forEach(([idStr, val]) => {
        converted[Number(idStr)] = val as string;
      });
      data[d.id] = converted;
    });
    
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(userCacheKey("egitim_yoklama_cache"), JSON.stringify(data));
      } catch {
        // ignore
      }
    }
    
    callback(data);
  }, (err) => {
    console.warn("Firestore yoklama realtime subscription error:", err);
  });
}

export async function fetchYoklamalar(): Promise<Record<string, Record<number, string>>> {
  try {
    const snap = await getDocs(userCol(YOKLAMA_COL));
    const data: Record<string, Record<number, string>> = {};
    snap.forEach((d) => {
      const raw = d.data().kayitlar || {};
      const converted: Record<number, string> = {};
      Object.entries(raw).forEach(([idStr, val]) => {
        converted[Number(idStr)] = val as string;
      });
      data[d.id] = converted;
    });
    return data;
  } catch (error) {
    console.error("Firestore fetchYoklamalar error:", error);
    return {};
  }
}

export async function saveYoklamaGunu(key: string, kayitlar: Record<number, string>): Promise<void> {
  const safeKayitlar: Record<string, string> = {};
  Object.entries(kayitlar).forEach(([id, val]) => {
    safeKayitlar[String(id)] = val;
  });
  await setDoc(userDoc(YOKLAMA_COL, key), { kayitlar: safeKayitlar, updatedAt: new Date().toISOString() });
}

// ==============================
// 4. DERS PROGRAMI (Kullanıcıya Özel)
// ==============================

const PROGRAM_COL = "ders_programlari";
const AYARLAR_COL = "ayarlar";

export async function fetchDersProgrami(sinif: string, sube: string): Promise<Record<string, Record<string, string>> | null> {
  try {
    const d = await getDoc(userDoc(PROGRAM_COL, `${sinif}-${sube}`));
    if (d.exists()) {
      return d.data().program;
    }
    return null;
  } catch (error) {
    console.error("Firestore fetchDersProgrami error:", error);
    return null;
  }
}

export async function saveDersProgrami(sinif: string, sube: string, program: Record<string, Record<string, string>>): Promise<void> {
  await setDoc(userDoc(PROGRAM_COL, `${sinif}-${sube}`), { program });
}

export function subscribeDersProgrami(sinif: string, sube: string, callback: (program: Record<string, Record<string, string>> | null) => void) {
  return onSnapshot(userDoc(PROGRAM_COL, `${sinif}-${sube}`), (snap) => {
    if (snap.exists() && snap.data()?.program) {
      callback(snap.data().program);
    } else {
      callback(null);
    }
  }, (err) => {
    console.warn("Firestore ders programi subscription error:", err);
  });
}

export function subscribeDersSaatleri(callback: (saatler: string[]) => void) {
  const cacheKey = userCacheKey("egitim_ders_saatleri_cache");
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        callback(JSON.parse(cached));
      }
    } catch {
      // ignore
    }
  }

  return onSnapshot(userDoc(AYARLAR_COL, "ders_saatleri"), (snap) => {
    if (snap.exists() && snap.data()?.saatler && Array.isArray(snap.data()?.saatler)) {
      const list = snap.data()?.saatler;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(list));
        } catch {
          // ignore
        }
      }
      callback(list);
    }
  }, (err) => {
    console.warn("Firestore ders saatleri subscription error:", err);
  });
}

export async function saveDersSaatleri(saatler: string[]): Promise<void> {
  const cacheKey = userCacheKey("egitim_ders_saatleri_cache");
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(saatler));
    } catch {
      // ignore
    }
  }
  await setDoc(userDoc(AYARLAR_COL, "ders_saatleri"), {
    saatler,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export interface DersBilgisi {
  ad: string;
  renk: string;
}

export function subscribeDersler(callback: (dersler: DersBilgisi[]) => void) {
  const cacheKey = userCacheKey("egitim_dersler_listesi_cache");
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        callback(JSON.parse(cached));
      }
    } catch {
      // ignore
    }
  }

  return onSnapshot(userDoc(AYARLAR_COL, "dersler_listesi"), (snap) => {
    if (snap.exists() && snap.data()?.dersler && Array.isArray(snap.data()?.dersler)) {
      const list = snap.data()?.dersler;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(list));
        } catch {
          // ignore
        }
      }
      callback(list);
    }
  }, (err) => {
    console.warn("Firestore dersler subscription error:", err);
  });
}

export async function saveDersler(dersler: DersBilgisi[]): Promise<void> {
  const cacheKey = userCacheKey("egitim_dersler_listesi_cache");
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(dersler));
    } catch {
      // ignore
    }
  }
  await setDoc(userDoc(AYARLAR_COL, "dersler_listesi"), {
    dersler,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export interface OgretmenBilgisi {
  id: number;
  ad: string;
  soyad: string;
  brans: string;
  telefon?: string;
  eposta?: string;
}

export function subscribeOgretmenlerListesi(callback: (ogretmenler: OgretmenBilgisi[]) => void) {
  const cacheKey = userCacheKey("egitim_ogretmenler_cache");
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        callback(JSON.parse(cached));
      }
    } catch {
      // ignore
    }
  }

  return onSnapshot(userDoc(AYARLAR_COL, "ogretmenler_listesi"), (snap) => {
    if (snap.exists() && snap.data()?.ogretmenler && Array.isArray(snap.data()?.ogretmenler)) {
      const list = snap.data()?.ogretmenler;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(list));
        } catch {
          // ignore
        }
      }
      callback(list);
    }
  }, (err) => {
    console.warn("Firestore ogretmenler subscription error:", err);
  });
}

export async function saveOgretmenlerListesi(ogretmenler: OgretmenBilgisi[]): Promise<void> {
  const cacheKey = userCacheKey("egitim_ogretmenler_cache");
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(ogretmenler));
    } catch {
      // ignore
    }
  }
  await setDoc(userDoc(AYARLAR_COL, "ogretmenler_listesi"), {
    ogretmenler,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

// ==============================
// 5. ÖĞRENCİ NOTLARI & ORTALAMA (Kullanıcıya Özel)
// ==============================

const NOTLAR_COL = "ogrenci_notlari";

export interface KayitliDersNotu {
  id: number;
  ders: string;
  sinav1: string;
  sinav2: string;
  sinav3: string;
  odev: string;
  performans: string;
}

export interface OgrenciNotKaydi {
  ogrenciId: string;
  dersler: KayitliDersNotu[];
  guncellenmeTarihi: string;
}

export async function fetchTumOgrenciNotlari(): Promise<Record<string, KayitliDersNotu[]>> {
  try {
    const snap = await getDocs(userCol(NOTLAR_COL));
    const result: Record<string, KayitliDersNotu[]> = {};
    snap.forEach((d) => {
      const data = d.data() as OgrenciNotKaydi;
      result[d.id] = data.dersler || [];
    });
    return result;
  } catch (error) {
    console.error("Firestore fetchTumOgrenciNotlari error:", error);
    return {};
  }
}

export function subscribeTumOgrenciNotlari(callback: (notlar: Record<string, KayitliDersNotu[]>) => void) {
  return onSnapshot(userCol(NOTLAR_COL), (snap) => {
    const result: Record<string, KayitliDersNotu[]> = {};
    snap.forEach((d) => {
      const data = d.data() as OgrenciNotKaydi;
      result[d.id] = data.dersler || [];
    });
    callback(result);
  }, (err) => {
    console.warn("Firestore notlar subscription error:", err);
  });
}

export async function saveOgrenciNotlari(ogrenciId: string, dersler: KayitliDersNotu[]): Promise<void> {
  await setDoc(userDoc(NOTLAR_COL, ogrenciId), {
    ogrenciId,
    dersler,
    guncellenmeTarihi: new Date().toISOString(),
  });
}

// ==============================
// 6. AİDAT TAKİP (Kullanıcıya Özel)
// ==============================

const AIDAT_COL = "aidat_kayitlari";

export interface AyOdemeData {
  tutar: number;
  durum: "odendi" | "bekliyor" | "gecikti";
  odenmeTarihi?: string;
}

export interface OgrenciAidatData {
  ogrenciId: number;
  aylikAidat: number;
  aylar: Record<string, AyOdemeData>;
}

export function subscribeAidatKayitlari(callback: (data: Record<string, OgrenciAidatData>) => void) {
  return onSnapshot(userCol(AIDAT_COL), (snap) => {
    const result: Record<string, OgrenciAidatData> = {};
    snap.forEach((d) => {
      result[d.id] = d.data() as OgrenciAidatData;
    });
    callback(result);
  }, (err) => {
    console.warn("Firestore aidat subscription error:", err);
  });
}

export async function saveAidatKaydi(ogrenciId: string | number, aidat: OgrenciAidatData): Promise<void> {
  await setDoc(userDoc(AIDAT_COL, String(ogrenciId)), aidat);
}

export function subscribeGlobalAidat(callback: (tutar: number) => void) {
  return onSnapshot(userDoc(AYARLAR_COL, "aidat"), (snap) => {
    if (snap.exists() && snap.data()?.globalAylikAidat) {
      callback(snap.data().globalAylikAidat);
    }
  }, (err) => {
    console.warn("Firestore global aidat subscription error:", err);
  });
}

export async function saveGlobalAidat(globalAylikAidat: number): Promise<void> {
  await setDoc(userDoc(AYARLAR_COL, "aidat"), { globalAylikAidat }, { merge: true });
}

// ==============================
// 7. NÖBET ÇİZELGESİ (Kullanıcıya Özel)
// ==============================

const NOBET_COL = "nobet_cizelgeleri";

export interface NobetAtamasiData {
  ogretmenId: number;
  gun: string;
  yer?: string;
}

export function subscribeNobetAtamalari(callback: (atamalar: NobetAtamasiData[]) => void) {
  return onSnapshot(userDoc(NOBET_COL, "aktif_cizelge"), (snap) => {
    if (snap.exists() && snap.data()?.atamalar) {
      callback(snap.data().atamalar);
    }
  }, (err) => {
    console.warn("Firestore nobet subscription error:", err);
  });
}

export async function saveNobetAtamalari(atamalar: NobetAtamasiData[]): Promise<void> {
  await setDoc(userDoc(NOBET_COL, "aktif_cizelge"), {
    atamalar,
    updatedAt: new Date().toISOString(),
  });
}

// ==============================
// 8. TESTLER & NET ANALİZİ (Kullanıcıya Özel)
// ==============================

const TESTLER_COL = "testler";

export interface OgrenciTestKayit {
  dogru: number | "";
  yanlis: number | "";
  bos: number | "";
}

export interface TestDocData {
  id: string;
  sinif: string;
  sube: string;
  ders: "turkce" | "matematik" | "fen" | "sosyal" | "ingilizce";
  konuBasligi: string;
  tarih: string;
  kayitlar: Record<string | number, OgrenciTestKayit>;
  updatedAt: string;
}

export function subscribeTestler(sinif: string, sube: string, callback: (testler: TestDocData[]) => void) {
  const cacheKey = userCacheKey(`egitim_testler_cache_${sinif}_${sube}`);
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        callback(JSON.parse(cached));
      }
    } catch {
      // ignore
    }
  }

  return onSnapshot(userCol(TESTLER_COL), (snap) => {
    const list: TestDocData[] = [];
    snap.forEach((d) => {
      const data = d.data() as TestDocData;
      if (data.sinif === sinif && data.sube === sube) {
        list.push({ ...data, id: d.id });
      }
    });
    list.sort((a, b) => b.tarih.localeCompare(a.tarih));

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(list));
      } catch {
        // ignore
      }
    }

    callback(list);
  }, (err) => {
    console.warn("Firestore testler subscription error:", err);
  });
}

export async function saveTest(test: TestDocData): Promise<void> {
  const cleanKayitlar: Record<string, Record<string, number | string>> = {};
  Object.entries(test.kayitlar || {}).forEach(([id, k]) => {
    cleanKayitlar[String(id)] = {
      dogru: k.dogru === "" ? "" : Number(k.dogru),
      yanlis: k.yanlis === "" ? "" : Number(k.yanlis),
      bos: k.bos === "" ? "" : Number(k.bos),
    };
  });
  await setDoc(userDoc(TESTLER_COL, test.id), {
    ...test,
    kayitlar: cleanKayitlar,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTest(testId: string): Promise<void> {
  await deleteDoc(userDoc(TESTLER_COL, testId));
}

// ==============================
// 9. PERSONEL LİSTESİ (Kullanıcıya Özel)
// ==============================

const PERSONEL_COL = "personeller";

export interface PersonelData {
  id: number;
  adSoyad: string;
  telefon: string;
  brans: string;
}

export function subscribePersoneller(callback: (list: PersonelData[]) => void) {
  const cacheKey = userCacheKey("egitim_personeller_cache");
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        callback(JSON.parse(cached));
      }
    } catch {
      // ignore
    }
  }

  return onSnapshot(userCol(PERSONEL_COL), (snap) => {
    const list: PersonelData[] = [];
    snap.forEach((d) => {
      list.push(d.data() as PersonelData);
    });
    list.sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, "tr"));

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(list));
      } catch {
        // ignore
      }
    }
    callback(list);
  }, (err) => {
    console.warn("Firestore personeller subscription error:", err);
  });
}

export async function savePersonel(personel: PersonelData): Promise<void> {
  await setDoc(userDoc(PERSONEL_COL, String(personel.id)), {
    ...personel,
    updatedAt: new Date().toISOString(),
  });
}

export async function deletePersonel(id: number | string): Promise<void> {
  await deleteDoc(userDoc(PERSONEL_COL, String(id)));
}
