import { BettingApp } from "@/components/BettingApp";
import { LeaderboardPanel } from "@/components/LeaderboardPanel";
import { TournamentBracket } from "@/components/TournamentBracket";
import { getPublicSupabase } from "@/lib/supabase";
import type { LeaderboardRow, Match } from "@/lib/types";

export const dynamic = "force-dynamic";

function HeroMemeArena() {
  return (
    <div className="relative min-h-[320px] overflow-hidden rounded-md border border-black bg-[#101820] text-white shadow-[8px_8px_0_#141414] sm:min-h-[280px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,204,0,0.35),transparent_24%),radial-gradient(circle_at_78%_18%,rgba(0,163,108,0.32),transparent_22%),linear-gradient(180deg,#152034_0%,#0d151f_60%,#17351f_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_34px),linear-gradient(180deg,transparent,#2f7f67)]" />
      <div className="absolute left-1/2 top-6 h-28 w-72 -translate-x-1/2 rounded-full border border-white/20" />
      <div className="animate-stadium-sweep absolute left-0 top-7 h-16 w-2/3 -skew-x-12 bg-white/10 blur-sm" />

      <svg className="absolute bottom-16 left-4 h-32 w-24 text-white/92 sm:bottom-8 sm:left-9 sm:h-44 sm:w-32" viewBox="0 0 120 170" aria-hidden="true">
        <path d="M58 18c10 0 17 8 17 18s-7 18-17 18-17-8-17-18 7-18 17-18Z" fill="currentColor" />
        <path d="M44 59h28l7 39H37l7-39Z" fill="currentColor" />
        <path d="M44 63 14 33l-9 10 34 45 10-10-5-15ZM72 63l32-28 8 11-35 43-10-10 5-16ZM42 97l-14 58h16l18-58H42ZM74 97l22 58h16L88 97H74Z" fill="currentColor" />
        <path d="M37 82h42" stroke="#ffcc00" strokeWidth="8" strokeLinecap="round" />
      </svg>

      <svg className="absolute bottom-16 right-4 h-32 w-28 text-white/88 sm:bottom-8 sm:right-10 sm:h-44 sm:w-36" viewBox="0 0 130 170" aria-hidden="true">
        <path d="M64 20c10 0 18 8 18 18s-8 18-18 18-18-8-18-18 8-18 18-18Z" fill="currentColor" />
        <path d="M47 61h34l-5 45H52l-5-45Z" fill="currentColor" />
        <path d="M48 66 21 83l7 13 25-12-5-18ZM80 66l28 18-7 13-25-13 4-18ZM54 105l-18 48h16l22-48H54ZM76 105l15 48h16l-13-48H76Z" fill="currentColor" />
        <path d="M34 17c8 11 18 17 30 17s22-6 30-17" fill="none" stroke="#ffcc00" strokeWidth="7" strokeLinecap="round" />
        <text x="65" y="13" textAnchor="middle" className="fill-accent text-[13px] font-black">GOAT</text>
      </svg>

      <svg className="animate-whale-cheer absolute bottom-3 left-1/2 h-28 w-36 -translate-x-1/2 sm:bottom-6 sm:h-36 sm:w-44" viewBox="0 0 190 130" aria-hidden="true">
        <path d="M31 77c10-33 43-51 82-43 31 6 47 25 52 39l16-10c1 18-7 31-21 37-14 17-45 25-79 17-34-7-54-22-50-40Z" fill="#66d9e8" stroke="#101820" strokeWidth="5" />
        <path d="M48 70c-19-6-31 2-38 17 20 2 34-2 43-12" fill="#66d9e8" stroke="#101820" strokeWidth="5" strokeLinejoin="round" />
        <path d="M83 92c22 9 43 8 62-4" fill="none" stroke="#101820" strokeWidth="5" strokeLinecap="round" />
        <circle cx="122" cy="65" r="5" fill="#101820" />
        <path d="M135 76c6 3 12 3 18 0" fill="none" stroke="#101820" strokeWidth="4" strokeLinecap="round" />
      </svg>

      <div className="absolute left-7 top-7 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide">SUI silhouette</div>
      <div className="absolute right-7 top-7 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide">GOAT mode</div>
      <div className="animate-football-bounce absolute bottom-36 left-[44%] h-10 w-10 rounded-full border-4 border-white bg-black shadow-[0_10px_0_rgba(0,0,0,0.25)] sm:bottom-28 sm:left-[46%] sm:h-11 sm:w-11">
        <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white" />
      </div>
    </div>
  );
}

export default async function Home({
  searchParams
}: {
  searchParams?: { message?: string };
}) {
  const supabase = getPublicSupabase();
  const [{ data: matchesData }, { data: leaderboardData }] = await Promise.all([
    supabase
      .from("matches")
      .select("*, team_a:teams!matches_team_a_id_fkey(*), team_b:teams!matches_team_b_id_fkey(*), winner:teams!matches_winner_team_id_fkey(*)")
      .order("deadline", { ascending: true }),
    supabase
      .from("leaderboard")
      .select("*")
      .order("points", { ascending: false })
      .order("correct_predictions", { ascending: false })
  ]);

  const matches = (matchesData ?? []) as Match[];
  const leaderboard = (leaderboardData ?? []) as LeaderboardRow[];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-md border border-line bg-white shadow-sm">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-accentText">Яндекс Кит · офисный ЧМ по кикеру</p>
            <h1 className="mt-2 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
              Кикер, киты и лишь одна команда-чемпион
            </h1>
            <p className="mt-4 max-w-2xl text-base text-ink/70">
              Без денег. Только баллы и шанс сделать правильный выбор на каждом этапе этого ЧМ.
            </p>
          </div>
          <div className="rounded-md border border-black bg-accent p-5 shadow-[6px_6px_0_#141414]">
            <p className="text-sm font-black uppercase">ПРОГНОЗЫ ПРИНЯТЫ, СЛАВА НА КОНУ</p>
            <p className="mt-3 text-3xl font-black leading-tight">Макс свистит в свисток. Аня держит сетку в порядке.</p>
            <p className="mt-3 text-sm">Выберите победителя. Лучший кит заберет приз, а остальные — опыт, драму и много веселья.</p>
          </div>
          <div className="lg:col-span-2">
            <HeroMemeArena />
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-3 lg:col-span-2">
            {["Войти под офисным ником", "Предсказать победителя", "Принять славу или драму"].map((step, index) => (
              <div key={step} className="rounded-md border border-line bg-field p-4">
                <span className="text-xs font-black text-accentText">0{index + 1}</span>
                <p className="mt-1 font-bold">{step}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="h-2 bg-[linear-gradient(90deg,#ffcc00_0%,#ffcc00_34%,#00a36c_34%,#00a36c_67%,#246bfe_67%,#246bfe_100%)]" />
      </section>

      {searchParams?.message ? (
        <div className="rounded-md border border-black/10 bg-white px-4 py-3 text-sm font-medium">
          {searchParams.message}
        </div>
      ) : null}

      <BettingApp matches={matches} leaderboard={leaderboard} />
      <section className="rounded-md border border-black/10 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-xs font-black uppercase tracking-wide text-accentText">как начисляются баллы</p>
        <h2 className="mt-1 text-2xl font-black">Чем ближе к финалу — тем дороже прогноз.</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {[
            ["1/8 финала", "1 балл"],
            ["1/4 финала", "2 балла"],
            ["1/2 финала", "3 балла"],
            ["Финал", "5 баллов"]
          ].map(([round, points]) => (
            <div key={round} className="rounded-md border border-line bg-field p-3">
              <p className="text-sm font-black">{round}</p>
              <p className="mt-1 text-2xl font-black text-accentText">{points}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 text-sm text-ink/70 sm:grid-cols-2">
          <p>Выбираешь победителя конкретного матча.</p>
          <p>После игры админ отмечает результат.</p>
          <p>Если угадал — получаешь баллы по раунду.</p>
          <p>Лидерборд обновляется после пересчета. Excel уже вспотел.</p>
        </div>
      </section>
      <TournamentBracket matches={matches} />
      <LeaderboardPanel rows={leaderboard} title="Лидерборд" limit={10} />
    </div>
  );
}
