import { cookies } from "next/headers";
import { Lock, RefreshCw, Trophy } from "lucide-react";
import {
  adminLogin,
  adminLogout,
  createTournamentMatch,
  createWorldCupTeams,
  deleteTournamentBracket,
  recalculateScores,
  resetMatchResult,
  resetTournamentResults,
  setWinner,
  updateTournamentMatch
} from "@/app/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { getAdminSupabase } from "@/lib/supabase";
import { previousRoundByRound, ROUND_MATCH_COUNTS, TOURNAMENT_ROUNDS, type TournamentRound } from "@/lib/tournament";
import type { BetDetails, LeaderboardRow, Match, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

function isAdmin() {
  const password = cookies().get("kicker_admin")?.value;
  return Boolean(process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function statusLabel(status: Match["status"]) {
  if (status === "open") return "прогнозы открыты";
  if (status === "closed") return "прогнозы закрыты";
  return "матч завершен";
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function getAvailableTeams(round: TournamentRound, teams: Team[], matches: Match[], currentMatchId?: string) {
  const usedInRound = new Set(
    matches
      .filter((match) => match.round === round)
      .filter((match) => match.id !== currentMatchId)
      .flatMap((match) => [match.team_a_id, match.team_b_id])
  );
  const previousRound = previousRoundByRound[round];

  if (!previousRound) {
    return teams.filter((team) => !usedInRound.has(team.id));
  }

  const winnerIds = new Set(
    matches
      .filter((match) => match.round === previousRound && match.winner_team_id)
      .map((match) => match.winner_team_id as string)
  );

  return teams.filter((team) => winnerIds.has(team.id) && !usedInRound.has(team.id));
}

export default async function AdminPage({
  searchParams
}: {
  searchParams?: { message?: string; createRound?: string };
}) {
  if (!isAdmin()) {
    return (
      <div className="mx-auto max-w-md rounded-md border border-black/10 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-black text-white">
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-accentText">админка турнира</p>
            <h1 className="text-2xl font-bold">Вход</h1>
          </div>
        </div>
        {searchParams?.message ? <p className="mb-4 text-sm font-semibold text-accentText">{searchParams.message}</p> : null}
        <form action={adminLogin} className="space-y-3">
          <input
            type="password"
            name="password"
            required
            placeholder="Пароль"
            className="h-11 w-full rounded-md border border-line bg-field px-3 outline-none focus:border-black"
          />
          <button className="h-11 w-full rounded-md bg-black px-4 font-semibold text-white">Войти</button>
        </form>
      </div>
    );
  }

  const supabase = getAdminSupabase();
  const [{ data: teamsData }, { data: matchesData }, { data: betsData }, { data: leaderboardData }] = await Promise.all([
    supabase.from("teams").select("*").order("created_at", { ascending: true }),
    supabase
      .from("matches")
      .select("*, team_a:teams!matches_team_a_id_fkey(*), team_b:teams!matches_team_b_id_fkey(*), winner:teams!matches_winner_team_id_fkey(*)")
      .order("created_at", { ascending: true }),
    supabase.from("bets_with_details").select("*").order("created_at", { ascending: false }),
    supabase.from("leaderboard").select("*").order("points", { ascending: false }).order("correct_predictions", { ascending: false }).limit(10)
  ]);

  const teams = (teamsData ?? []) as Team[];
  const matches = (matchesData ?? []) as Match[];
  const bets = (betsData ?? []) as BetDetails[];
  const leaderboard = (leaderboardData ?? []) as LeaderboardRow[];
  const selectedRound = TOURNAMENT_ROUNDS.includes(searchParams?.createRound as TournamentRound)
    ? searchParams?.createRound as TournamentRound
    : "1/8 финала";
  const availableTeams = getAvailableTeams(selectedRound, teams, matches);
  const finalWinner = matches.find((match) => match.round === "финал" && match.winner)?.winner;
  const betsByMatch = new Map<string, number>();
  bets.forEach((bet) => {
    betsByMatch.set(bet.match_id, (betsByMatch.get(bet.match_id) ?? 0) + 1);
  });

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-accentText">кит следит за сеткой</p>
            <h1 className="mt-1 text-3xl font-black">Пульт ведущей</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink/65">
              Не туда нажала? Спокойно, кит умеет откатывать реальность.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={resetTournamentResults}>
              <ConfirmSubmitButton
                message="Сбросить результаты всех матчей? Баллы станут 0, result-states исчезнут."
                className="h-10 rounded-md bg-accent px-4 text-sm font-bold text-black"
              >
                Сбросить результаты турнира
              </ConfirmSubmitButton>
            </form>
            <form action={adminLogout}>
              <button className="h-10 rounded-md bg-black px-4 text-sm font-bold text-white">Выйти</button>
            </form>
          </div>
        </div>
      </section>

      {searchParams?.message ? (
        <div className="rounded-md border border-black/10 bg-white px-4 py-3 text-sm font-semibold shadow-sm">
          {searchParams.message}
        </div>
      ) : null}

      {finalWinner ? (
        <section className="rounded-md border border-accent bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-accentText">чемпион</p>
          <h2 className="mt-1 flex items-center gap-2 text-3xl font-black">
            <Trophy className="h-7 w-7 text-accentText" />
            {finalWinner.name}
          </h2>
        </section>
      ) : null}

      <section className="rounded-md border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-accentText">блок 1</p>
            <h2 className="text-2xl font-black">Страны турнира</h2>
          </div>
          <form action={createWorldCupTeams}>
            <button className="h-11 rounded-md bg-black px-4 text-sm font-bold text-white">Создать 16 стран</button>
          </form>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {teams.map((team) => (
            <div key={team.id} className="rounded-md border border-line bg-field px-3 py-2 text-sm font-bold">
              {team.name}
            </div>
          ))}
          {teams.length === 0 ? <p className="text-sm text-ink/60">Страны еще не созданы.</p> : null}
        </div>
      </section>

      <section className="rounded-md border border-black/10 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-accentText">блок 2</p>
        <h2 className="text-2xl font-black">Создать матч</h2>

        <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="block text-sm font-bold">
            Раунд
            <select name="createRound" defaultValue={selectedRound} className="mt-1 h-11 w-full rounded-md border border-line bg-field px-3 outline-none focus:border-black">
              {TOURNAMENT_ROUNDS.map((round) => <option key={round} value={round}>{round}</option>)}
            </select>
          </label>
          <button className="h-11 rounded-md border border-black/10 px-4 text-sm font-bold sm:self-end">Показать страны</button>
        </form>

        <form action={createTournamentMatch} className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <input type="hidden" name="round" value={selectedRound} />
          <select name="teamAId" required className="h-12 rounded-md border border-line bg-field px-3 outline-none focus:border-black">
            <option value="">Страна A</option>
            {availableTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
          <select name="teamBId" required className="h-12 rounded-md border border-line bg-field px-3 outline-none focus:border-black">
            <option value="">Страна B</option>
            {availableTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
          <input name="deadline" required type="datetime-local" className="h-12 rounded-md border border-line bg-field px-3 outline-none focus:border-black" />
          <button className="h-12 rounded-md bg-accent px-5 text-sm font-bold text-black">Создать матч</button>
        </form>

        <p className="mt-3 text-sm text-ink/60">
          Доступно для {selectedRound}: {availableTeams.length} из {selectedRound === "1/8 финала" ? 16 : ROUND_MATCH_COUNTS[previousRoundByRound[selectedRound] ?? "1/8 финала"]} стран. Финал близко. Excel уже вспотел.
        </p>
      </section>

      <section className="rounded-md border border-black/10 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-accentText">блок 3</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">Матчи</h2>
            <p className="mt-1 text-sm text-ink/60">Удалить всю сетку можно без потери стран и ников.</p>
          </div>
          <form action={deleteTournamentBracket}>
            <ConfirmSubmitButton
              message="Удалить всю сетку, прогнозы и результаты? Страны останутся. Это действие нельзя отменить."
              className="rounded-md border border-black bg-white px-4 py-3 text-sm font-black text-black shadow-[4px_4px_0_#ffcc00] hover:bg-field"
            >
              Удалить всю сетку и начать заново
            </ConfirmSubmitButton>
          </form>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          {TOURNAMENT_ROUNDS.map((round) => {
            const roundMatches = matches.filter((match) => match.round === round);
            return (
              <div key={round} className="rounded-md border border-line bg-field p-3">
                <h3 className="mb-3 text-lg font-black">{round}</h3>
                <div className="space-y-3">
                  {roundMatches.map((match) => (
                    <article key={match.id} className="rounded-md bg-white p-3">
                      <p className="text-base font-black">{match.team_a.name} vs {match.team_b.name}</p>
                      <p className="mt-1 text-xs text-ink/60">Дедлайн: {formatDate(match.deadline)}</p>
                      <p className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                        match.status === "finished" ? "bg-[#00a36c] text-white" : "bg-accent/10 text-accentText"
                      }`}>
                        {statusLabel(match.status)}
                      </p>
                      {match.winner ? (
                        <>
                          <p className="mt-3 rounded-md bg-[#00a36c] px-3 py-2 text-sm font-bold text-white">
                            Победитель: {match.winner.name}
                          </p>
                          <details className="mt-3 rounded-md border border-line bg-field p-2">
                            <summary className="cursor-pointer text-sm font-bold">Изменить результат</summary>
                            <div className="mt-3 grid gap-2">
                              {[match.team_a, match.team_b].map((team) => (
                                <form key={team.id} action={setWinner}>
                                  <input type="hidden" name="id" value={match.id} />
                                  <input type="hidden" name="winnerTeamId" value={team.id} />
                                  <ConfirmSubmitButton
                                    message="Ты точно хочешь изменить результат? Баллы и сетка пересчитаются. Если следующий раунд уже создан, кит удалит зависимые матчи."
                                    className="h-10 w-full rounded-md bg-black px-3 text-sm font-bold text-white"
                                  >
                                    Победила {team.name}
                                  </ConfirmSubmitButton>
                                </form>
                              ))}
                              <form action={resetMatchResult}>
                                <input type="hidden" name="id" value={match.id} />
                                <ConfirmSubmitButton
                                  message="Сбросить результат матча? Баллы пересчитаются, зависимые матчи следующих раундов будут удалены."
                                  className="h-10 w-full rounded-md border border-accent bg-white px-3 text-sm font-bold text-accentText"
                                >
                                  Сбросить результат матча
                                </ConfirmSubmitButton>
                              </form>
                            </div>
                          </details>
                          <details className="mt-3 rounded-md border border-line bg-field p-2">
                            <summary className="cursor-pointer text-sm font-bold">Редактировать матч</summary>
                            <form action={updateTournamentMatch} className="mt-3 grid gap-2">
                              <input type="hidden" name="id" value={match.id} />
                              <input type="hidden" name="confirmFinished" value="yes" />
                              <select name="teamAId" defaultValue={match.team_a_id} required className="h-10 rounded-md border border-line bg-white px-3 text-sm">
                                {getAvailableTeams(match.round as TournamentRound, teams, matches, match.id).map((team) => (
                                  <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                              </select>
                              <select name="teamBId" defaultValue={match.team_b_id} required className="h-10 rounded-md border border-line bg-white px-3 text-sm">
                                {getAvailableTeams(match.round as TournamentRound, teams, matches, match.id).map((team) => (
                                  <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                              </select>
                              <input name="deadline" type="datetime-local" defaultValue={toDatetimeLocal(match.deadline)} required className="h-10 rounded-md border border-line bg-white px-3 text-sm" />
                              <ConfirmSubmitButton
                                message={(betsByMatch.get(match.id) ?? 0) > 0
                                  ? "На этот матч уже есть прогнозы. После изменения команд старые прогнозы могут стать некорректными и будут очищены, если страны изменились. Продолжить?"
                                  : "Ты точно хочешь изменить завершенный матч? Баллы и сетка пересчитаются."}
                                className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm font-bold"
                              >
                                Сохранить матч
                              </ConfirmSubmitButton>
                            </form>
                          </details>
                        </>
                      ) : (
                        <>
                          <details className="mt-3 rounded-md border border-line bg-field p-2">
                            <summary className="cursor-pointer text-sm font-bold">Редактировать матч</summary>
                            <form action={updateTournamentMatch} className="mt-3 grid gap-2">
                              <input type="hidden" name="id" value={match.id} />
                              <select name="teamAId" defaultValue={match.team_a_id} required className="h-10 rounded-md border border-line bg-white px-3 text-sm">
                                {getAvailableTeams(match.round as TournamentRound, teams, matches, match.id).map((team) => (
                                  <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                              </select>
                              <select name="teamBId" defaultValue={match.team_b_id} required className="h-10 rounded-md border border-line bg-white px-3 text-sm">
                                {getAvailableTeams(match.round as TournamentRound, teams, matches, match.id).map((team) => (
                                  <option key={team.id} value={team.id}>{team.name}</option>
                                ))}
                              </select>
                              <input name="deadline" type="datetime-local" defaultValue={toDatetimeLocal(match.deadline)} required className="h-10 rounded-md border border-line bg-white px-3 text-sm" />
                              <ConfirmSubmitButton
                                message={(betsByMatch.get(match.id) ?? 0) > 0
                                  ? "На этот матч уже есть прогнозы. После изменения команд старые прогнозы могут стать некорректными и будут очищены, если страны изменились. Продолжить?"
                                  : "Сохранить изменения матча?"}
                                className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm font-bold"
                              >
                                Сохранить матч
                              </ConfirmSubmitButton>
                            </form>
                          </details>
                          <form action={resetMatchResult} className="mt-3">
                            <input type="hidden" name="id" value={match.id} />
                            <ConfirmSubmitButton
                              message="Сбросить результат матча? Если зависимые матчи следующих раундов уже есть, кит их удалит."
                              className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-bold"
                            >
                              Сбросить результат матча
                            </ConfirmSubmitButton>
                          </form>
                          <div className="mt-3 grid gap-2">
                            <form action={setWinner}>
                              <input type="hidden" name="id" value={match.id} />
                              <input type="hidden" name="winnerTeamId" value={match.team_a_id} />
                              <button className="h-10 w-full rounded-md bg-black px-3 text-sm font-bold text-white">
                                Победила {match.team_a.name}
                              </button>
                            </form>
                            <form action={setWinner}>
                              <input type="hidden" name="id" value={match.id} />
                              <input type="hidden" name="winnerTeamId" value={match.team_b_id} />
                              <button className="h-10 w-full rounded-md bg-black px-3 text-sm font-bold text-white">
                                Победила {match.team_b.name}
                              </button>
                            </form>
                          </div>
                        </>
                      )}
                    </article>
                  ))}
                  {roundMatches.length === 0 ? (
                    <p className="rounded-md border border-dashed border-line bg-white/70 p-3 text-sm text-ink/50">Матчей пока нет.</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-md border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-accentText">блок 4</p>
            <h2 className="text-2xl font-black">Лидерборд / прогнозы</h2>
          </div>
          <form action={recalculateScores}>
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-black/10 px-4 text-sm font-semibold hover:bg-felt">
              <RefreshCw className="h-4 w-4" />
              Пересчитать баллы, пока Excel не заплакал
            </button>
          </form>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-line bg-field p-3">
            <h3 className="mb-2 font-black">Топ участников</h3>
            <div className="space-y-2">
              {leaderboard.map((row) => (
                <div key={row.participant_id} className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm">
                  <span className="font-bold">#{row.place} {row.name}</span>
                  <span>{row.points} б. · {row.correct_predictions}/{row.total_predictions}</span>
                </div>
              ))}
              {leaderboard.length === 0 ? <p className="text-sm text-ink/60">Пока нет участников.</p> : null}
            </div>
          </div>

          <div className="rounded-md border border-line bg-field p-3">
            <h3 className="mb-2 font-black">Последние прогнозы</h3>
            <div className="space-y-2">
              {bets.map((bet) => (
                <div key={bet.id} className="rounded-md bg-white px-3 py-2 text-sm">
                  <p className="font-bold">{bet.participant_name}: {bet.selected_team_name}</p>
                  <p className="text-xs text-ink/60">{bet.round} · {bet.team_a_name} vs {bet.team_b_name}</p>
                </div>
              ))}
              {bets.length === 0 ? <p className="text-sm text-ink/60">Прогнозов пока нет.</p> : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
