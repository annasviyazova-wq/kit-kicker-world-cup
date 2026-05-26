import { CheckCircle2, Clock, Trophy } from "lucide-react";
import { ROUND_MATCH_COUNTS, TOURNAMENT_ROUNDS } from "@/lib/tournament";
import type { Match } from "@/lib/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function matchStatus(match: Match) {
  if (match.status === "finished") return "матч завершен";
  if (match.status === "open" && new Date(match.deadline).getTime() > Date.now()) return "прогнозы открыты";
  return "прогнозы закрыты";
}

export function TournamentBracket({ matches }: { matches: Match[] }) {
  return (
    <section className="rounded-md border border-black/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-wide text-accentText">публичная сетка</p>
        <h2 className="mt-1 text-2xl font-black">Текущая сетка турнира</h2>
        <p className="mt-1 text-sm text-ink/60">Киты следят за сеткой. Победитель поплыл дальше.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {TOURNAMENT_ROUNDS.map((round) => {
          const roundMatches = matches.filter((match) => match.round === round);
          const slots = Array.from({ length: ROUND_MATCH_COUNTS[round] }, (_, index) => roundMatches[index]);

          return (
            <div key={round} className="rounded-md border border-line bg-field p-3">
              <h3 className="mb-3 text-lg font-black">{round}</h3>
              <div className="space-y-3">
                {slots.map((match, index) => (
                  match ? (
                    <article key={match.id} className="rounded-md border border-black/10 bg-white p-3">
                      <div className="space-y-2">
                        {[match.team_a, match.team_b].map((team) => {
                          const isWinner = match.winner_team_id === team.id;
                          return (
                            <div
                              key={team.id}
                              className={`rounded-md px-3 py-2 text-sm font-bold ${
                                isWinner ? "bg-[#00a36c] text-white" : "bg-field text-ink"
                              }`}
                            >
                              {team.name}
                              {isWinner ? <CheckCircle2 className="ml-2 inline h-4 w-4" /> : null}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-ink/60">
                        <p className="font-bold text-ink">{matchStatus(match)}</p>
                        <p className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(match.deadline)}
                        </p>
                        {match.winner ? (
                          <p className="flex items-center gap-1 font-bold text-accentText">
                            <Trophy className="h-3 w-3" />
                            Победитель: {match.winner.name}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  ) : (
                    <article key={`${round}-${index}`} className="rounded-md border border-dashed border-line bg-white/60 p-3 text-sm font-semibold text-ink/50">
                      Матч еще не сформирован — шарики ждут мешок
                    </article>
                  )
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
