"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import ProGuard from "@/components/auth/pro-guard";

const freeRoutes = ["/", "/sinif-listesi", "/yoklama", "/personel-listesi", "/admin"];

const pageNameMap: Record<string, string> = {
  "/ortalama-hesaplama": "Ortalama Hesaplama",
  "/testler": "Testler & Net Takibi",
  "/sinav-analiz": "Sınav Analiz",
  "/pdf-karne": "PDF Karne",
  "/veli-bilgilendirme": "Veli Bilgilendirme",
  "/ders-programi": "Ders Programı",
  "/nobet-cizelgesi": "Nöbet Çizelgesi",
  "/ogrenci-basari-grafikleri": "Başarı Grafikleri",
  "/aidat-takip": "Aidat Takip",
};

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isPro, loading } = useAuth();

  const isFree = freeRoutes.includes(pathname);

  // Eğer ücretsiz bir sayfadaysa veya kullanıcı Pro ise direkt içeriği göster
  if (isFree || isPro || loading) {
    return <>{children}</>;
  }

  // Aksi halde Pro kilidini göster
  const featureName = pageNameMap[pathname] || "Bu Özellik";
  return <ProGuard featureName={featureName}>{children}</ProGuard>;
}
