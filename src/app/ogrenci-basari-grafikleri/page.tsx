"use client";

import { useState } from "react";
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { basariTrendi, demoSinavSonuclari, dersler } from "@/lib/data";

const dersRenkleri: Record<string, string> = {
  turkce: "#3B82F6",
  matematik: "#8B5CF6",
  fen: "#06B6D4",
  sosyal: "#F59E0B",
  ingilizce: "#10B981",
};

const radarVerisi = [
  { ders: "Türkçe", puan: 85, sinifOrt: 72 },
  { ders: "Matematik", puan: 78, sinifOrt: 68 },
  { ders: "Fen", puan: 82, sinifOrt: 70 },
  { ders: "Sosyal", puan: 90, sinifOrt: 75 },
  { ders: "İngilizce", puan: 75, sinifOrt: 65 },
  { ders: "Din K.", puan: 88, sinifOrt: 78 },
  { ders: "Müzik", puan: 95, sinifOrt: 82 },
  { ders: "Sanat", puan: 92, sinifOrt: 80 },
];

type GrafikTipi = "trend" | "karsilastirma" | "radar" | "dagilim";

export default function OgrenciBasariGrafikleriPage() {
  const [aktifGrafik, setAktifGrafik] = useState<GrafikTipi>("trend");

  const grafikler: { tip: GrafikTipi; baslik: string; ikon: string }[] = [
    { tip: "trend", baslik: "Başarı Trendi", ikon: "📈" },
    { tip: "karsilastirma", baslik: "Ders Karşılaştırma", ikon: "📊" },
    { tip: "radar", baslik: "Yetenek Haritası", ikon: "🎯" },
    { tip: "dagilim", baslik: "Puan Dağılımı", ikon: "📉" },
  ];

  // Sınav sonuçlarını puan aralığına göre grupla
  const dagilimVerisi = [
    { aralik: "0-24", sayi: demoSinavSonuclari.filter((s) => s.puan < 25).length },
    { aralik: "25-44", sayi: demoSinavSonuclari.filter((s) => s.puan >= 25 && s.puan < 45).length },
    { aralik: "45-54", sayi: demoSinavSonuclari.filter((s) => s.puan >= 45 && s.puan < 55).length },
    { aralik: "55-69", sayi: demoSinavSonuclari.filter((s) => s.puan >= 55 && s.puan < 70).length },
    { aralik: "70-84", sayi: demoSinavSonuclari.filter((s) => s.puan >= 70 && s.puan < 85).length },
    { aralik: "85-100", sayi: demoSinavSonuclari.filter((s) => s.puan >= 85).length },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Grafik Seçici */}
      <div className="flex flex-wrap gap-3">
        {grafikler.map((g) => (
          <button
            key={g.tip}
            onClick={() => setAktifGrafik(g.tip)}
            className={`px-5 py-3 rounded-xl text-sm font-medium transition-all ${
              aktifGrafik === g.tip
                ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/25"
                : "glass-card text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {g.ikon} {g.baslik}
          </button>
        ))}
      </div>

      {/* Başarı Trendi */}
      {aktifGrafik === "trend" && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-base font-bold text-[var(--foreground)] mb-6">📈 Aylık Başarı Trendi (Sınıf Ortalaması)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={basariTrendi}>
              <defs>
                <linearGradient id="colorTurkce" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorMatematik" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorFen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="ay" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} domain={[50, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  color: "var(--foreground)",
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="turkce" name="Türkçe" stroke="#3B82F6" fill="url(#colorTurkce)" strokeWidth={2} />
              <Area type="monotone" dataKey="matematik" name="Matematik" stroke="#8B5CF6" fill="url(#colorMatematik)" strokeWidth={2} />
              <Area type="monotone" dataKey="fen" name="Fen Bilimleri" stroke="#06B6D4" fill="url(#colorFen)" strokeWidth={2} />
              <Line type="monotone" dataKey="sosyal" name="Sosyal Bilgiler" stroke="#F59E0B" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ingilizce" name="İngilizce" stroke="#10B981" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Ders Karşılaştırma */}
      {aktifGrafik === "karsilastirma" && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-base font-bold text-[var(--foreground)] mb-6">📊 Ders Bazlı Karşılaştırma</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={[
              { ders: "Türkçe", birinci: 85, ikinci: 92 },
              { ders: "Matematik", birinci: 72, ikinci: 88 },
              { ders: "Fen", birinci: 78, ikinci: 85 },
              { ders: "Sosyal", birinci: 82, ikinci: 90 },
              { ders: "İngilizce", birinci: 68, ikinci: 80 },
              { ders: "Din K.", birinci: 88, ikinci: 92 },
              { ders: "Müzik", birinci: 90, ikinci: 95 },
              { ders: "Sanat", birinci: 85, ikinci: 92 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="ders" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  color: "var(--foreground)",
                }}
              />
              <Legend />
              <Bar dataKey="birinci" name="1. Dönem" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ikinci" name="2. Dönem" fill="#a78bfa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Yetenek Haritası */}
      {aktifGrafik === "radar" && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-base font-bold text-[var(--foreground)] mb-6">🎯 Öğrenci Yetenek Haritası</h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarVerisi}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="ders" stroke="var(--muted-foreground)" fontSize={12} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={10} />
              <Radar name="Öğrenci" dataKey="puan" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} strokeWidth={2} />
              <Radar name="Sınıf Ortalaması" dataKey="sinifOrt" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={2} />
              <Legend />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  color: "var(--foreground)",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Puan Dağılımı */}
      {aktifGrafik === "dagilim" && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-base font-bold text-[var(--foreground)] mb-6">📉 Puan Dağılımı</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={dagilimVerisi}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="aralik" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  color: "var(--foreground)",
                }}
              />
              <Bar dataKey="sayi" name="Öğrenci Sayısı" radius={[8, 8, 0, 0]}>
                {dagilimVerisi.map((entry, index) => {
                  const renkler = ["#ef4444", "#f97316", "#f59e0b", "#3b82f6", "#6366f1", "#10b981"];
                  return <rect key={`cell-${index}`} fill={renkler[index]} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Hızlı İstatistikler */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "En Yüksek", deger: "95", ikon: "🏆", renk: "text-emerald-500" },
          { label: "En Düşük", deger: "45", ikon: "📉", renk: "text-red-500" },
          { label: "Sınıf Ortalaması", deger: "76.8", ikon: "📊", renk: "text-blue-500" },
          { label: "Başarı Oranı", deger: "%81", ikon: "🎯", renk: "text-violet-500" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card rounded-2xl p-5 text-center card-hover">
            <span className="text-2xl">{stat.ikon}</span>
            <p className={`text-3xl font-extrabold mt-2 ${stat.renk}`}>{stat.deger}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
