"use client";

import React, { useState, useEffect } from "react";
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
  return <>{children}</>;
}
