"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clock, LogOut, Trophy, UserRound } from "lucide-react";
import { ROUND_POINTS, type TournamentRound } from "@/lib/tournament";
import type { LeaderboardRow, Match } from "@/lib/types";

type MyBet = {
  id: string;
  match_id: string;
  selected_team_id: string;
  created_at: string;
};

type ApiResult<T> = T & { error?: string };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function isBettingOpen(match: Match) {
  return match.status === "open" && new Date(match.deadline).getTime() > Date.now();
}

function normalizeForCompare(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function pointsText(points: number) {
  if (points === 1) return "+1 балл";
  if (points > 1 && points < 5) return `+${points} балла`;
  return `+${points} баллов`;
}

async function postJson<T>(url: string, payload: unknown): Promise<ApiResult<T>> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();

  if (!response.ok) {
    return { ...data, error: data.error ?? "Что-то пошло не так" };
  }

  return data;
}

function CelebrationResult({ points, selectedTeam }: { points: number; selectedTeam: string }) {
  return (
    <div className="relative overflow-hidden rounded-md border-2 border-[#08875d] bg-[#eafff4] p-4 shadow-[5px_5px_0_#08875d]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_16%,rgba(255,204,0,0.55),transparent_20%),radial-gradient(circle_at_86%_26%,rgba(0,163,108,0.22),transparent_24%)]" />
      <div className="animate-stadium-sweep absolute left-0 top-4 h-12 w-3/4 -skew-x-12 bg-white/60" />

      <div className="relative grid gap-4 sm:grid-cols-[1fr_150px] sm:items-center">
        <div>
          <p className="inline-flex rounded-full bg-black px-3 py-1 text-xs font-black uppercase tracking-wide text-accent">
            RONALDO APPROVES
          </p>
          <h3 className="mt-3 text-3xl font-black leading-none text-[#064f38]">SUIIIII! Прогноз в девятку.</h3>
          <p className="mt-2 text-sm font-bold text-ink/75">Ваш выбор: {selectedTeam}</p>
          <p className="mt-3 text-2xl font-black">{pointsText(points)}. Киты орут в корпоративный чат.</p>
          <p className="mt-1 text-xs font-semibold text-ink/65">Трофей подпрыгнул, мяч одобрил, Excel сделал вид, что он тоже из Яндекс Кит.</p>
        </div>

        <div className="relative mx-auto h-36 w-36">
          <svg className="animate-trophy-pop absolute left-8 top-0 h-20 w-20" viewBox="0 0 90 90" aria-hidden="true">
            <path d="M25 14h40v13c0 19-8 31-20 31S25 46 25 27V14Z" fill="#ffcc00" stroke="#141414" strokeWidth="4" />
            <path d="M25 23H12c1 17 8 25 22 27M65 23h13c-1 17-8 25-22 27" fill="none" stroke="#141414" strokeWidth="4" strokeLinecap="round" />
            <path d="M39 58h12v14h17v8H22v-8h17V58Z" fill="#ffcc00" stroke="#141414" strokeWidth="4" />
          </svg>
          <svg className="animate-whale-cheer absolute bottom-0 left-0 h-24 w-36" viewBox="0 0 170 105" aria-hidden="true">
            <path d="M25 63c8-27 38-42 73-36 27 5 41 20 46 31l15-9c1 16-7 27-20 32-13 15-40 21-70 15-30-7-48-20-44-33Z" fill="#66d9e8" stroke="#141414" strokeWidth="4" />
            <path d="M41 58c-17-6-28 2-34 15 17 2 30-2 38-10" fill="#66d9e8" stroke="#141414" strokeWidth="4" strokeLinejoin="round" />
            <circle cx="106" cy="52" r="4" fill="#141414" />
            <path d="M117 62c7 5 15 5 22 0" fill="none" stroke="#141414" strokeWidth="4" strokeLinecap="round" />
            <path d="M61 73c18 8 39 7 57-3" fill="none" stroke="#141414" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <div className="animate-football-bounce absolute right-1 top-20 h-10 w-10 rounded-full border-[5px] border-black bg-white">
            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-black" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DisappointmentResult({ selectedTeam }: { selectedTeam: string }) {
  return (
    <div className="relative overflow-hidden rounded-md border-2 border-[#29415c] bg-[#eef3f8] p-4 shadow-[5px_5px_0_#29415c]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(36,107,254,0.16),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.75),transparent_55%)]" />
      <div className="animate-sad-rain absolute left-8 top-0 h-10 w-1 rounded-full bg-[#246bfe]/30" />
      <div className="animate-sad-rain absolute right-14 top-2 h-12 w-1 rounded-full bg-[#246bfe]/25 [animation-delay:0.55s]" />

      <div className="relative grid gap-4 sm:grid-cols-[1fr_150px] sm:items-center">
        <div>
          <p className="inline-flex rounded-full bg-[#29415c] px-3 py-1 text-xs font-black uppercase tracking-wide text-white">
            MESSI DISAPPOINTMENT ENERGY
          </p>
          <h3 className="mt-3 text-3xl font-black leading-none text-[#1f3146]">0 баллов. GOAT молчит в сторону газона.</h3>
          <p className="mt-2 text-sm font-bold text-ink/75">Ваш выбор: {selectedTeam}</p>
          <p className="mt-3 text-lg font-black">Внутренний кит разочарован, но держится product-y.</p>
          <p className="mt-1 text-xs font-semibold text-ink/65">Прогноз не зашел. Зато драматургия уровня финального слайда в квартальном отчете.</p>
        </div>

        <div className="relative mx-auto h-36 w-36">
          <svg className="absolute left-7 top-0 h-24 w-24 text-[#1f3146]" viewBox="0 0 100 110" aria-hidden="true">
            <path d="M50 13c9 0 16 7 16 16s-7 16-16 16-16-7-16-16 7-16 16-16Z" fill="currentColor" />
            <path d="M34 50h32l-4 31H38l-4-31Z" fill="currentColor" />
            <path d="M35 53 16 72l8 9 19-15-8-13ZM65 53l20 20-9 8-18-15 7-13ZM39 80l-9 25h13l11-25H39ZM61 80l9 25h13l-8-25H61Z" fill="currentColor" />
            <path d="M28 17c6 7 13 10 22 10s16-3 22-10" fill="none" stroke="#ffcc00" strokeWidth="5" strokeLinecap="round" />
          </svg>
          <svg className="animate-whale-sad absolute bottom-0 left-0 h-24 w-36" viewBox="0 0 170 105" aria-hidden="true">
            <path d="M25 63c8-27 38-42 73-36 27 5 41 20 46 31l15-9c1 16-7 27-20 32-13 15-40 21-70 15-30-7-48-20-44-33Z" fill="#8ed8e5" stroke="#141414" strokeWidth="4" />
            <path d="M41 58c-17-6-28 2-34 15 17 2 30-2 38-10" fill="#8ed8e5" stroke="#141414" strokeWidth="4" strokeLinejoin="round" />
            <circle cx="106" cy="52" r="4" fill="#141414" />
            <path d="M116 67c8-5 15-5 22 0" fill="none" stroke="#141414" strokeWidth="4" strokeLinecap="round" />
            <path d="M58 75c19 5 39 4 57-3" fill="none" stroke="#141414" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <div className="absolute right-4 top-20 h-10 w-10 rotate-12 rounded-full border-[5px] border-[#29415c] bg-white opacity-60">
            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#29415c]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function BettingApp({ matches, leaderboard }: { matches: Match[]; leaderboard: LeaderboardRow[] }) {
  const [nickname, setNickname] = useState("");
  const [draftName, setDraftName] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [isChangingName, setIsChangingName] = useState(false);
  const [message, setMessage] = useState("");
  const [bets, setBets] = useState<MyBet[]>([]);
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);

  useEffect(() => {
    const storedName = window.localStorage.getItem("kickerNickname") ?? "";
    setNickname(storedName);
    setDraftName(storedName);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!nickname) return;

    fetch(`/api/my-bets?name=${encodeURIComponent(nickname)}`)
      .then((response) => response.json())
      .then((data) => setBets(data.bets ?? []))
      .catch(() => setMessage("Не удалось загрузить ваши прогнозы"));
  }, [nickname]);

  const betsByMatch = useMemo(() => {
    return new Map(bets.map((bet) => [bet.match_id, bet]));
  }, [bets]);

  const currentUserScore = useMemo(() => {
    const normalizedNickname = normalizeForCompare(nickname);
    return leaderboard.find((row) => normalizeForCompare(row.name) === normalizedNickname);
  }, [leaderboard, nickname]);

  const visibleMatches = matches.filter((match) => isBettingOpen(match) || betsByMatch.has(match.id));
  const matchHistory = useMemo(() => {
    const matchesById = new Map(matches.map((match) => [match.id, match]));

    return bets
      .map((bet) => {
        const match = matchesById.get(bet.match_id);
        if (!match) return null;

        const selectedTeam = bet.selected_team_id === match.team_a_id ? match.team_a : match.team_b;
        const result = match.winner_team_id
          ? match.winner_team_id === bet.selected_team_id
            ? "угадал"
            : "не угадал"
          : "ожидаем результат";

        return { bet, match, selectedTeam, result };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((left, right) => new Date(right.bet.created_at).getTime() - new Date(left.bet.created_at).getTime());
  }, [bets, matches]);

  async function registerName() {
    const cleanName = draftName.trim().replace(/\s+/g, " ");
    setMessage("");

    if (!cleanName) {
      setMessage("Введите ник");
      return;
    }

    setIsEntering(true);
    const result = await postJson<{ participant: { name: string } }>("/api/participants", { name: cleanName });
    setIsEntering(false);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    window.localStorage.setItem("kickerNickname", result.participant.name);
    setNickname(result.participant.name);
    setDraftName(result.participant.name);
    setIsChangingName(false);
  }

  function changeName() {
    window.localStorage.removeItem("kickerNickname");
    setNickname("");
    setDraftName("");
    setBets([]);
    setIsChangingName(true);
  }

  async function placeBet(match: Match, selectedTeamId: string) {
    if (!nickname || pendingMatchId) return;

    setPendingMatchId(match.id);
    setMessage("");
    const result = await postJson<{ bet: MyBet }>("/api/bets", {
      name: nickname,
      matchId: match.id,
      selectedTeamId
    });
    setPendingMatchId(null);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    setBets((current) => [...current, result.bet]);
    const selectedTeam = match.team_a_id === selectedTeamId ? match.team_a.name : match.team_b.name;
    setMessage(`Прогноз принят. Киты занесли в таблицу, Excel напрягся. Ты выбрал ${selectedTeam}. Теперь болей красиво.`);
  }

  if (!isReady) {
    return <div className="rounded-md border border-black/10 bg-white p-5 text-sm">Загружаем матч-день...</div>;
  }

  if (!nickname || isChangingName) {
    return (
      <section className="mx-auto max-w-md rounded-md border border-black/10 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-black text-white">
            <UserRound className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-accentText">первый вход</p>
            <h2 className="text-2xl font-black">Выберите ник</h2>
            <p className="mt-1 text-sm text-ink/65">Он будет сохранен на этом телефоне.</p>
          </div>
        </div>

        {message ? <p className="mb-3 rounded-md bg-field px-3 py-2 text-sm font-semibold text-accentText">{message}</p> : null}

        <div className="space-y-3">
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            maxLength={60}
            className="h-12 w-full rounded-md border border-line bg-field px-3 text-base outline-none focus:border-black"
            placeholder="Например: table-boss"
          />
          <button
            type="button"
            onClick={registerName}
            disabled={isEntering}
            className="h-12 w-full rounded-md bg-black px-4 font-bold text-white disabled:opacity-60"
          >
            {isEntering ? "Проверяем..." : "Войти в игру"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-accentText">вы вошли</p>
            <p className="text-2xl font-black">Ваш ник: {nickname}</p>
          </div>
          <div>
            <button onClick={changeName} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-black/10 px-4 text-sm font-bold">
              <LogOut className="h-4 w-4" />
              Сменить ник
            </button>
          </div>
        </div>
      </section>

      {message ? <p className="rounded-md border border-black/10 bg-white px-4 py-3 text-sm font-semibold">{message}</p> : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <p className="text-xs font-black uppercase tracking-wide text-accentText">прогнозы</p>
          <h2 className="mt-1 text-2xl font-black">Открытые матчи</h2>
          <p className="mt-1 text-sm text-ink/60">До дедлайна лучше не тупить. Киты смотрят на часы.</p>
        </div>
        {visibleMatches.length === 0 ? (
          <div className="rounded-md border border-black/10 bg-white p-6">
            <h2 className="text-xl font-black">Открытых матчей пока нет</h2>
            <p className="mt-2 text-sm text-ink/65">Загляните позже, когда админ откроет следующий раунд.</p>
          </div>
        ) : null}

        {visibleMatches.map((match) => {
          const open = isBettingOpen(match);
          const existingBet = betsByMatch.get(match.id);
          const selectedTeam = existingBet?.selected_team_id === match.team_a_id ? match.team_a : match.team_b;
          const roundPoints = ROUND_POINTS[match.round as TournamentRound] ?? 1;
          const isResolved = Boolean(existingBet && match.winner_team_id);
          const isCorrect = Boolean(existingBet && match.winner_team_id === existingBet.selected_team_id);

          return (
            <article key={match.id} className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-accentText">{match.round}</p>
                  <h2 className="mt-1 text-xl font-black">{match.team_a.name} vs {match.team_b.name}</h2>
                </div>
                <span className="rounded-full bg-field px-3 py-1 text-xs font-black uppercase">
                  {match.status === "finished" ? "готово" : open ? "открыт" : "закрыт"}
                </span>
              </div>

              <div className="mb-4 flex items-center gap-2 text-sm text-ink/65">
                <Clock className="h-4 w-4" />
                Дедлайн: {formatDate(match.deadline)}
              </div>

              {existingBet ? (
                isResolved ? (
                  isCorrect ? (
                    <CelebrationResult points={roundPoints} selectedTeam={selectedTeam.name} />
                  ) : (
                    <DisappointmentResult selectedTeam={selectedTeam.name} />
                  )
                ) : (
                  <div className="rounded-md border border-[#00a36c]/25 bg-[#00a36c]/10 p-4">
                    <p className="flex items-center gap-2 text-sm font-black text-[#08734f]">
                      <Check className="h-4 w-4" />
                      Ваш выбор: {selectedTeam.name}
                    </p>
                    <p className="mt-1 text-xs text-ink/60">Прогноз сохранен и не меняется. Киты следят за сеткой.</p>
                  </div>
                )
              ) : open ? (
                <div className="grid gap-3">
                  {[match.team_a, match.team_b].map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => placeBet(match, team.id)}
                      disabled={pendingMatchId === match.id}
                      className="min-h-20 rounded-md border-2 border-black bg-white p-4 text-left shadow-[4px_4px_0_#111] transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
                    >
                      <span className="block text-lg font-black">{team.name}</span>
                      <span className="mt-1 block text-sm text-ink/65">{team.player_1} + {team.player_2}</span>
                      <span className="mt-3 inline-flex rounded-full bg-black px-3 py-1 text-xs font-bold text-white">Выбрать победителя</span>
                    </button>
                  ))}
                  <p className="text-xs font-semibold text-ink/60">Киты, фиксируем прогноз.</p>
                </div>
              ) : (
                <div className="rounded-md bg-field p-4 text-sm font-semibold text-ink/65">Прогнозы закрыты</div>
              )}

              {match.winner ? (
                <p className="mt-3 flex items-center gap-2 text-sm font-bold">
                  <Trophy className="h-4 w-4 text-accentText" />
                  Победитель: {match.winner.name}
                </p>
              ) : null}
            </article>
          );
        })}
      </section>

      <section className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-accentText">мои прогнозы</p>
        <h2 className="mt-1 text-2xl font-black">Мои прогнозы</h2>
        <div className="mt-4 grid gap-2">
          {matchHistory.map(({ bet, match, selectedTeam, result }) => (
            <article key={bet.id} className="rounded-md border border-line bg-field p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black">{match.team_a.name} vs {match.team_b.name}</p>
                  <p className="mt-1 text-xs text-ink/60">{match.round} · выбор: {selectedTeam.name}</p>
                  <p className="mt-1 text-xs text-ink/60">Победитель: {match.winner?.name ?? "пока не выбран"}</p>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${
                  result === "угадал"
                    ? "bg-[#00a36c] text-white"
                    : result === "не угадал"
                      ? "bg-[#29415c] text-white"
                      : "bg-white text-accentText"
                }`}>
                  {result}
                </span>
              </div>
            </article>
          ))}
          {matchHistory.length === 0 ? (
            <p className="rounded-md border border-dashed border-line bg-field p-4 text-sm text-ink/60">
              Здесь появятся ваши прошлые выборы после первого прогноза.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-accentText">персональный статус</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-md bg-field p-3 text-center">
            <p className="text-lg font-black">#{currentUserScore?.place ?? "-"}</p>
            <p className="text-xs text-ink/60">Ваше место</p>
          </div>
          <div className="rounded-md bg-field p-3 text-center">
            <p className="text-lg font-black">{currentUserScore?.points ?? 0}</p>
            <p className="text-xs text-ink/60">Ваши баллы</p>
          </div>
          <div className="rounded-md bg-field p-3 text-center">
            <p className="text-lg font-black">
              {currentUserScore?.correct_predictions ?? 0}/{currentUserScore?.total_predictions ?? bets.length}
            </p>
            <p className="text-xs text-ink/60">Угадано</p>
          </div>
        </div>
      </section>
    </div>
  );
}
