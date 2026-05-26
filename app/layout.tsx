import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Кикер-прогнозы",
  description: "Фановая игра прогнозов для турнира по кикеру"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-field text-ink">
        <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-black">
                <Trophy className="h-4 w-4" />
              </span>
              Кикер-прогнозы
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium">
              <Link href="/" className="hover:text-accentText">Прогнозы</Link>
              <Link href="/leaderboard" className="hover:text-accentText">Лидерборд</Link>
              <Link href="/admin" className="hover:text-accentText">Админка</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
