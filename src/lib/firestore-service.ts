import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from "firebase/firestore";
import { db } from "./firebase";
import { 
  demoOgrenciler, 
  type Ogrenci 
} from "./data";

// ==============================
// 1. ÖĞRENCİ YÖNETİMİ (Firestore)
// ==============================

const OGRENCILER_COL = "ogrenciler";

export async function fetchOgrenciler(): Promise<Ogrenci[]> {
  try {
    const snap = await getDocs(collection(db, OGRENCILER_COL));
    if (snap.empty) {
      // İlk defa açılıyorsa varsayılan demo verilerini Firestore'a yükle
      for (const ogr of demoOgrenciler) {
        await setDoc(doc(db, OGRENCILER_COL, String(ogr.id)), ogr);
      }
      return demoOgrenciler;
    }
    const list: Ogrenci[] = [];
    snap.forEach((d) => {
      list.push(d.data() as Ogrenci);
    });
    return list.sort((a, b) => Number(a.numara) - Number(b.numara));
  } catch (error) {
    console.error("Firestore fetchOgrenciler error:", error);
    return demoOgrenciler;
  }
}

export function subscribeOgrenciler(callback: (ogrenciler: Ogrenci[]) => void) {
  return onSnapshot(collection(db, OGRENCILER_COL), (snap) => {
    if (snap.empty) {
      callback(demoOgrenciler);
      return;
    }
    const list: Ogrenci[] = [];
    snap.forEach((d) => list.push(d.data() as Ogrenci));
    list.sort((a, b) => Number(a.numara) - Number(b.numara));
    callback(list);
  }, (err) => {
    console.warn("Firestore subscription error:", err);
    callback(demoOgrenciler);
  });
}

export async function saveOgrenci(ogrenci: Ogrenci): Promise<void> {
  await setDoc(doc(db, OGRENCILER_COL, String(ogrenci.id)), ogrenci);
}

export async function deleteOgrenci(ogrenciId: number): Promise<void> {
  await deleteDoc(doc(db, OGRENCILER_COL, String(ogrenciId)));
}

// ==============================
// 2. SINAV ANALİZİ (Firestore)
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
    const snap = await getDocs(collection(db, SINAVLAR_COL));
    const list: SinavData[] = [];
    snap.forEach((d) => list.push(d.data() as SinavData));
    return list;
  } catch (error) {
    console.error("Firestore fetchSinavlar error:", error);
    return [];
  }
}

export function subscribeSinavlar(callback: (sinavlar: SinavData[]) => void) {
  return onSnapshot(collection(db, SINAVLAR_COL), (snap) => {
    const list: SinavData[] = [];
    snap.forEach((d) => list.push(d.data() as SinavData));
    callback(list);
  }, (err) => {
    console.warn("Firestore sinavlar subscription error:", err);
  });
}

export async function saveSinav(sinav: SinavData): Promise<void> {
  await setDoc(doc(db, SINAVLAR_COL, String(sinav.id)), sinav);
}

export async function deleteSinav(sinavId: number): Promise<void> {
  await deleteDoc(doc(db, SINAVLAR_COL, String(sinavId)));
}

// ==============================
// 3. YOKLAMA (Firestore)
// ==============================

const YOKLAMA_COL = "yoklamalar";

export async function fetchYoklamalar(): Promise<Record<string, Record<number, string>>> {
  try {
    const snap = await getDocs(collection(db, YOKLAMA_COL));
    const data: Record<string, Record<number, string>> = {};
    snap.forEach((d) => {
      data[d.id] = d.data().kayitlar || {};
    });
    return data;
  } catch (error) {
    console.error("Firestore fetchYoklamalar error:", error);
    return {};
  }
}

export async function saveYoklamaGunu(key: string, kayitlar: Record<number, string>): Promise<void> {
  await setDoc(doc(db, YOKLAMA_COL, key), { kayitlar });
}

// ==============================
// 4. DERS PROGRAMI (Firestore)
// ==============================

const PROGRAM_COL = "ders_programlari";

export async function fetchDersProgrami(sinif: string, sube: string): Promise<Record<string, Record<string, string>> | null> {
  try {
    const d = await getDoc(doc(db, PROGRAM_COL, `${sinif}-${sube}`));
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
  await setDoc(doc(db, PROGRAM_COL, `${sinif}-${sube}`), { program });
}

// ==============================
// 5. ÖĞRENCİ NOTLARI & ORTALAMA (Firestore)
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
    const snap = await getDocs(collection(db, NOTLAR_COL));
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
  return onSnapshot(collection(db, NOTLAR_COL), (snap) => {
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
  await setDoc(doc(db, NOTLAR_COL, ogrenciId), {
    ogrenciId,
    dersler,
    guncellenmeTarihi: new Date().toISOString(),
  });
}
