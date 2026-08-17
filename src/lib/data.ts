// Demo veriler - Eğitim Araçları uygulaması için örnek veriler

export interface Ogrenci {
  id: number;
  ad: string;
  soyad: string;
  numara: string;
  sinif: string; // örn: "5"
  sube: string;  // örn: "A"
  cinsiyet: "E" | "K";
  veliTelefon: string;
  veliAd: string;
}

export interface DersNotu {
  ders: string;
  sinav1: number;
  sinav2: number;
  sinav3?: number;
  odev: number;
  performans: number;
}

export interface Ogretmen {
  id: number;
  ad: string;
  soyad: string;
  brans: string;
}

export const sinifNumaralari = Array.from({ length: 12 }, (_, i) => (i + 1).toString()); // ["1", "2", ..., "12"]
export const subeler = ["A", "B", "C", "Ç", "D", "E", "F", "G", "Ğ", "H", "I", "İ", "J", "K", "L", "M", "N", "O", "Ö", "P", "R", "S"];

export const dersler = [
  { ad: "Türkçe", renk: "#3B82F6" },
  { ad: "Matematik", renk: "#8B5CF6" },
  { ad: "Fen Bilimleri", renk: "#06B6D4" },
  { ad: "Sosyal Bilgiler", renk: "#F59E0B" },
  { ad: "İngilizce", renk: "#10B981" },
  { ad: "Din Kültürü", renk: "#EF4444" },
  { ad: "Müzik", renk: "#EC4899" },
  { ad: "Görsel Sanatlar", renk: "#F97316" },
  { ad: "Beden Eğitimi", renk: "#14B8A6" },
  { ad: "Teknoloji ve Tasarım", renk: "#6366F1" },
  { ad: "Bilişim Teknolojileri", renk: "#8B5CF6" },
];

export const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

export const dersSaatleri = [
  "08:30 - 09:10",
  "09:20 - 10:00",
  "10:10 - 10:50",
  "11:00 - 11:40",
  "12:30 - 13:10",
  "13:20 - 14:00",
  "14:10 - 14:50",
  "15:00 - 15:40",
];

export const demoOgrenciler: Ogrenci[] = [
  { id: 1, ad: "Ahmet", soyad: "Yılmaz", numara: "101", sinif: "5", sube: "A", cinsiyet: "E", veliTelefon: "0532 111 2233", veliAd: "Mehmet Yılmaz" },
  { id: 2, ad: "Ayşe", soyad: "Kaya", numara: "102", sinif: "5", sube: "A", cinsiyet: "K", veliTelefon: "0533 222 3344", veliAd: "Fatma Kaya" },
  { id: 3, ad: "Mehmet", soyad: "Demir", numara: "103", sinif: "5", sube: "B", cinsiyet: "E", veliTelefon: "0534 333 4455", veliAd: "Ali Demir" },
  { id: 4, ad: "Fatma", soyad: "Çelik", numara: "104", sinif: "6", sube: "A", cinsiyet: "K", veliTelefon: "0535 444 5566", veliAd: "Hasan Çelik" },
  { id: 5, ad: "Ali", soyad: "Şahin", numara: "105", sinif: "7", sube: "C", cinsiyet: "E", veliTelefon: "0536 555 6677", veliAd: "Hüseyin Şahin" },
  { id: 6, ad: "Zeynep", soyad: "Yıldız", numara: "106", sinif: "8", sube: "A", cinsiyet: "K", veliTelefon: "0537 666 7788", veliAd: "Mustafa Yıldız" },
  { id: 7, ad: "Emre", soyad: "Özdemir", numara: "107", sinif: "9", sube: "B", cinsiyet: "E", veliTelefon: "0538 777 8899", veliAd: "İbrahim Özdemir" },
  { id: 8, ad: "Elif", soyad: "Arslan", numara: "108", sinif: "12", sube: "S", cinsiyet: "K", veliTelefon: "0539 888 9900", veliAd: "Osman Arslan" },
];

export const demoOgretmenler: Ogretmen[] = [
  { id: 1, ad: "Ahmet", soyad: "Öztürk", brans: "Türkçe" },
  { id: 2, ad: "Fatma", soyad: "Kılıç", brans: "Matematik" },
  { id: 3, ad: "Mehmet", soyad: "Yılmaz", brans: "Fen Bilimleri" },
  { id: 4, ad: "Ayşe", soyad: "Demir", brans: "Sosyal Bilgiler" },
  { id: 5, ad: "Ali", soyad: "Çelik", brans: "İngilizce" },
  { id: 6, ad: "Zeynep", soyad: "Şahin", brans: "Din Kültürü" },
  { id: 7, ad: "Hasan", soyad: "Arslan", brans: "Müzik" },
  { id: 8, ad: "Emine", soyad: "Kurt", brans: "Görsel Sanatlar" },
  { id: 9, ad: "Murat", soyad: "Aydın", brans: "Beden Eğitimi" },
  { id: 10, ad: "Seda", soyad: "Koç", brans: "Teknoloji ve Tasarım" },
];

export const nobetYerleri = ["Ana Koridor", "1. Kat Koridor", "2. Kat Koridor", "Bahçe", "Kantin", "Giriş Kapısı"];

// Sınav sonuçları demo verisi
export const demoSinavSonuclari = [
  { ogrenci: "Ahmet Yılmaz", puan: 85 },
  { ogrenci: "Ayşe Kaya", puan: 92 },
  { ogrenci: "Mehmet Demir", puan: 78 },
  { ogrenci: "Fatma Çelik", puan: 65 },
  { ogrenci: "Ali Şahin", puan: 88 },
  { ogrenci: "Zeynep Yıldız", puan: 95 },
  { ogrenci: "Emre Özdemir", puan: 72 },
  { ogrenci: "Elif Arslan", puan: 58 },
];

// Aylık başarı trend verisi
export const basariTrendi = [
  { ay: "Eylül", turkce: 72, matematik: 68, fen: 70, sosyal: 75, ingilizce: 65 },
  { ay: "Ekim", turkce: 75, matematik: 70, fen: 73, sosyal: 78, ingilizce: 68 },
  { ay: "Kasım", turkce: 78, matematik: 74, fen: 76, sosyal: 80, ingilizce: 72 },
  { ay: "Aralık", turkce: 80, matematik: 76, fen: 78, sosyal: 82, ingilizce: 75 },
  { ay: "Ocak", turkce: 82, matematik: 78, fen: 80, sosyal: 85, ingilizce: 78 },
  { ay: "Şubat", turkce: 85, matematik: 82, fen: 83, sosyal: 87, ingilizce: 80 },
  { ay: "Mart", turkce: 83, matematik: 80, fen: 81, sosyal: 84, ingilizce: 78 },
  { ay: "Nisan", turkce: 87, matematik: 85, fen: 86, sosyal: 88, ingilizce: 82 },
  { ay: "Mayıs", turkce: 90, matematik: 88, fen: 89, sosyal: 91, ingilizce: 85 },
  { ay: "Haziran", turkce: 92, matematik: 90, fen: 91, sosyal: 93, ingilizce: 88 },
];

// Mesaj şablonları
export const mesajSablonlari = {
  devamsizlik: "Sayın {veliAd}, {ogrenciAd} isimli öğrencinizin {tarih} tarihinde devamsızlık yaptığını bildirmek isteriz. Toplam devamsızlık: {toplam} gün. Bilginize sunarız.",
  basariDurumu: "Sayın {veliAd}, {ogrenciAd} isimli öğrencinizin {donem} dönemi genel not ortalaması {ortalama} olarak belirlenmiştir. {durum}. Bilginize sunarız.",
  toplanti: "Sayın {veliAd}, {tarih} tarihinde saat {saat}'de okulumuzda veli toplantısı düzenlenecektir. Katılımınızı rica ederiz.",
  genel: "Sayın {veliAd}, {mesaj}. Bilginize sunarız.",
};
