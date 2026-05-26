import { Medal, Trophy } from "lucide-react";
import type { LeaderboardRow } from "@/lib/types";

export function LeaderboardPanel({
  rows,
  title = "Лидерборд",
  limit
}: {
  rows: LeaderboardRow[];
  title?: string;
  limit?: number;
}) {
  const visibleRows = typeof limit === "number" ? rows.slice(0, limit) : rows;

  return (
    <section className="rounded-md border border-black/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-accentText">очки и места</p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-black">
            <Trophy className="h-5 w-5 text-accentText" />
            {title}
          </h2>
        </div>
      </div>

      <div className="grid gap-2 sm:hidden">
        {visibleRows.map((row) => (
          <article key={row.participant_id} className="rounded-md border border-line bg-field p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-accentText">#{row.place}</p>
                <h3 className="text-lg font-black">{row.name}</h3>
                <p className="mt-1 text-xs font-semibold text-ink/60">
                  {row.place === 1 ? "Главный кит турнира" : row.place <= 3 ? "Киты на волне" : "Еще можно всплыть"}
                </p>
              </div>
              {row.place <= 3 ? <Medal className="h-5 w-5 text-accentText" /> : null}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md bg-white p-2">
                <p className="text-xl font-black">{row.points}</p>
                <p className="text-xs text-ink/60">баллы</p>
              </div>
              <div className="rounded-md bg-white p-2">
                <p className="text-xl font-black">{row.correct_predictions}/{row.total_predictions}</p>
                <p className="text-xs text-ink/60">угадано</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-md border border-line sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-black text-xs uppercase tracking-wide text-white">
            <tr>
              <th className="px-3 py-3">Место</th>
              <th className="px-3 py-3">Ник</th>
              <th className="px-3 py-3">Баллы</th>
              <th className="px-3 py-3">Угадано / всего</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.participant_id} className="border-t border-line">
                <td className="px-3 py-3 font-black">
                  <span className="inline-flex items-center gap-2">
                    {row.place <= 3 ? <Medal className="h-4 w-4 text-accentText" /> : null}
                    #{row.place}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <p className="font-semibold">{row.name}</p>
                  <p className="text-xs text-ink/55">
                    {row.place === 1 ? "Главный кит турнира" : row.place <= 3 ? "Киты на волне" : "Еще можно всплыть"}
                  </p>
                </td>
                <td className="px-3 py-3 font-black">{row.points}</td>
                <td className="px-3 py-3">{row.correct_predictions}/{row.total_predictions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visibleRows.length === 0 ? (
        <div className="rounded-md bg-field p-4 text-sm text-ink/65">Пока нет участников.</div>
      ) : null}
    </section>
  );
}
