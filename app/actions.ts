"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminSupabase, getPublicSupabase, normalizeName } from "@/lib/supabase";
import { NEXT_ROUND, ROUND_MATCH_COUNTS, TOURNAMENT_ROUNDS, previousRoundByRound, shuffle, type TournamentRound } from "@/lib/tournament";

const worldCupFavoriteTeams = [
  "Франция",
  "Испания",
  "Аргентина",
  "Англия",
  "Португалия",
  "Нидерланды",
  "Бразилия",
  "Бельгия",
  "Германия",
  "Хорватия",
  "Марокко",
  "Колумбия",
  "Уругвай",
  "Швейцария",
  "США",
  "Мексика"
];

function formText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function revalidateTournamentPages() {
  revalidatePath("/");
  revalidatePath("/leaderboard");
  revalidatePath("/admin");
}

function laterRounds(round: string) {
  const index = TOURNAMENT_ROUNDS.findIndex((item) => item === round);
  return index >= 0 ? TOURNAMENT_ROUNDS.slice(index + 1) : [];
}

async function deleteLaterRoundMatches(round: string) {
  const roundsToDelete = laterRounds(round);
  if (roundsToDelete.length === 0) return;

  const { error } = await getAdminSupabase()
    .from("matches")
    .delete()
    .in("round", roundsToDelete);

  if (error) {
    redirect(`/admin?message=${encodeURIComponent("Не удалось очистить зависимые матчи следующих раундов")}`);
  }
}

async function getEligibleTeamIds(round: TournamentRound, currentMatchId?: string) {
  const supabase = getAdminSupabase();
  const { data: roundMatches, error: roundError } = await supabase
    .from("matches")
    .select("id,team_a_id,team_b_id")
    .eq("round", round);

  if (roundError) {
    redirect(`/admin?message=${encodeURIComponent("Не удалось проверить матчи раунда")}`);
  }

  const alreadyUsed = new Set(
    (roundMatches ?? [])
      .filter((match) => match.id !== currentMatchId)
      .flatMap((match) => [match.team_a_id, match.team_b_id])
  );

  let eligibleTeamIds: Set<string>;
  const previousRound = previousRoundByRound[round];

  if (!previousRound) {
    const { data: teams, error } = await supabase.from("teams").select("id");
    if (error || !teams) {
      redirect(`/admin?message=${encodeURIComponent("Не удалось загрузить страны")}`);
    }
    eligibleTeamIds = new Set(teams.map((team) => team.id as string));
  } else {
    const { data: previousMatches, error } = await supabase
      .from("matches")
      .select("winner_team_id")
      .eq("round", previousRound);

    if (error || !previousMatches) {
      redirect(`/admin?message=${encodeURIComponent("Не удалось загрузить победителей предыдущего раунда")}`);
    }

    if (previousMatches.some((match) => !match.winner_team_id)) {
      redirect(`/admin?message=${encodeURIComponent(`Сначала укажите всех победителей раунда ${previousRound}`)}`);
    }

    eligibleTeamIds = new Set(previousMatches.map((match) => match.winner_team_id as string));
  }

  return { alreadyUsed, eligibleTeamIds };
}

export async function placeBet(formData: FormData) {
  const name = normalizeName(formText(formData, "name"));
  const matchId = formText(formData, "matchId");
  const selectedTeamId = formText(formData, "selectedTeamId");

  if (!name || !matchId || !selectedTeamId) {
    redirect("/?message=Заполните имя и выберите команду");
  }

  const supabase = getPublicSupabase();
  const { data: existingParticipant } = await supabase
    .from("participants")
    .select("id")
    .ilike("name", name)
    .maybeSingle();

  let participantId = existingParticipant?.id;

  if (!participantId) {
    const { data, error } = await supabase
      .from("participants")
      .insert({ name })
      .select("id")
      .single();

    if (error) {
      redirect(`/?message=${encodeURIComponent("Не удалось зарегистрировать имя. Возможно, оно уже занято.")}`);
    }

    participantId = data.id;
  }

  const { error } = await supabase.from("bets").insert({
    participant_id: participantId,
    match_id: matchId,
    selected_team_id: selectedTeamId
  });

  if (error) {
    const text = error.code === "23505"
      ? "Этот участник уже сделал прогноз на матч"
      : "Прогноз не принят: матч закрыт, дедлайн прошел или команда не из этого матча";
    redirect(`/?message=${encodeURIComponent(text)}`);
  }

  revalidatePath("/");
  revalidatePath("/leaderboard");
  redirect("/?message=Прогноз принят");
}

export async function adminLogin(formData: FormData) {
  const password = formText(formData, "password");

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    redirect("/admin?message=Неверный пароль");
  }

  cookies().set("kicker_admin", password, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });

  redirect("/admin");
}

export async function adminLogout() {
  cookies().delete("kicker_admin");
  redirect("/admin");
}

export async function requireAdmin() {
  const password = cookies().get("kicker_admin")?.value;

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    redirect("/admin?message=Нужен пароль администратора");
  }
}

export async function createTeam(formData: FormData) {
  await requireAdmin();
  const name = formText(formData, "name");
  const player1 = formText(formData, "player1");
  const player2 = formText(formData, "player2");

  if (!name || !player1 || !player2) {
    redirect("/admin?message=Заполните все поля команды");
  }

  const { error } = await getAdminSupabase()
    .from("teams")
    .insert({ name, player_1: player1, player_2: player2 });

  if (error) redirect(`/admin?message=${encodeURIComponent("Команду не удалось создать")}`);
  revalidateTournamentPages();
}

export async function bulkCreateTeams(formData: FormData) {
  await requireAdmin();
  const rawTeams = formText(formData, "teams");

  const teams = rawTeams
    .split("\n")
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts) => parts.some(Boolean));

  if (teams.length === 0) {
    redirect("/admin?message=Добавьте хотя бы одну строку с командой");
  }

  const invalidLine = teams.findIndex((parts) => parts.length !== 3 || parts.some((part) => !part));
  if (invalidLine >= 0) {
    redirect(`/admin?message=${encodeURIComponent(`Ошибка в строке ${invalidLine + 1}: нужен формат Страна | Игрок 1 | Игрок 2`)}`);
  }

  const seenNames = new Set<string>();
  const rows = teams.map(([name, player1, player2]) => {
    const key = name.toLowerCase();
    if (seenNames.has(key)) {
      redirect(`/admin?message=${encodeURIComponent(`Дубликат команды в списке: ${name}`)}`);
    }
    seenNames.add(key);

    return {
      name,
      player_1: player1,
      player_2: player2
    };
  });

  const { error } = await getAdminSupabase().from("teams").insert(rows);

  if (error) redirect(`/admin?message=${encodeURIComponent("Команды не удалось загрузить")}`);
  revalidateTournamentPages();
  redirect(`/admin?message=${encodeURIComponent(`Загружено команд: ${rows.length}`)}`);
}

export async function createWorldCupTeams() {
  await requireAdmin();
  const supabase = getAdminSupabase();
  const { data: existingTeams, error: readError } = await supabase
    .from("teams")
    .select("name");

  if (readError) {
    redirect(`/admin?message=${encodeURIComponent("Не удалось проверить команды")}`);
  }

  const existingNames = new Set((existingTeams ?? []).map((team) => String(team.name).toLowerCase()));
  const rows = worldCupFavoriteTeams
    .filter((name) => !existingNames.has(name.toLowerCase()))
    .map((name) => ({
      name,
      player_1: "TBD",
      player_2: "TBD"
    }));

  if (rows.length === 0) {
    redirect(`/admin?message=${encodeURIComponent("Все 16 команд ЧМ-2026 уже созданы")}`);
  }

  const { error } = await supabase.from("teams").insert(rows);

  if (error) {
    redirect(`/admin?message=${encodeURIComponent("Не удалось создать команды ЧМ-2026")}`);
  }

  revalidateTournamentPages();
  redirect(`/admin?message=${encodeURIComponent(`Создано команд ЧМ-2026: ${rows.length}`)}`);
}

export async function updateTeam(formData: FormData) {
  await requireAdmin();
  const id = formText(formData, "id");
  const name = formText(formData, "name");
  const player1 = formText(formData, "player1");
  const player2 = formText(formData, "player2");

  const { error } = await getAdminSupabase()
    .from("teams")
    .update({ name, player_1: player1, player_2: player2 })
    .eq("id", id);

  if (error) redirect(`/admin?message=${encodeURIComponent("Команду не удалось обновить")}`);
  revalidateTournamentPages();
}

export async function deleteTeam(formData: FormData) {
  await requireAdmin();
  const id = formText(formData, "id");

  const { error } = await getAdminSupabase()
    .from("teams")
    .delete()
    .eq("id", id);

  if (error) {
    redirect(`/admin?message=${encodeURIComponent("Команду нельзя удалить: она уже используется в матчах или прогнозах")}`);
  }

  revalidateTournamentPages();
  redirect("/admin?message=Команда удалена");
}

export async function createMatch(formData: FormData) {
  await requireAdmin();
  const round = formText(formData, "round");
  const teamAId = formText(formData, "teamAId");
  const teamBId = formText(formData, "teamBId");
  const deadline = formText(formData, "deadline");

  if (!round || !teamAId || !teamBId || !deadline || teamAId === teamBId) {
    redirect("/admin?message=Проверьте данные матча");
  }

  const { error } = await getAdminSupabase().from("matches").insert({
    round,
    team_a_id: teamAId,
    team_b_id: teamBId,
    deadline: new Date(deadline).toISOString(),
    status: "open"
  });

  if (error) redirect(`/admin?message=${encodeURIComponent("Матч не удалось создать")}`);
  revalidateTournamentPages();
}

export async function createTournamentMatch(formData: FormData) {
  await requireAdmin();
  const round = formText(formData, "round") as TournamentRound;
  const teamAId = formText(formData, "teamAId");
  const teamBId = formText(formData, "teamBId");
  const deadline = formText(formData, "deadline");

  if (!TOURNAMENT_ROUNDS.includes(round) || !teamAId || !teamBId || !deadline || teamAId === teamBId) {
    redirect("/admin?message=Проверьте раунд, страны и дедлайн");
  }

  const supabase = getAdminSupabase();
  const { alreadyUsed, eligibleTeamIds } = await getEligibleTeamIds(round);
  if (alreadyUsed.has(teamAId) || alreadyUsed.has(teamBId)) {
    redirect(`/admin?message=${encodeURIComponent("Эта страна уже участвует в матче выбранного раунда")}`);
  }

  if (!eligibleTeamIds.has(teamAId) || !eligibleTeamIds.has(teamBId)) {
    redirect(`/admin?message=${encodeURIComponent("Для этого раунда можно выбрать только страны, которые прошли дальше")}`);
  }

  const { error } = await supabase.from("matches").insert({
    round,
    team_a_id: teamAId,
    team_b_id: teamBId,
    deadline: new Date(deadline).toISOString(),
    status: "open"
  });

  if (error) redirect(`/admin?message=${encodeURIComponent("Матч не удалось создать")}`);
  revalidateTournamentPages();
  redirect(`/admin?message=${encodeURIComponent("Матч создан и появился на главной")}`);
}

export async function updateTournamentMatch(formData: FormData) {
  await requireAdmin();
  const id = formText(formData, "id");
  const teamAId = formText(formData, "teamAId");
  const teamBId = formText(formData, "teamBId");
  const deadline = formText(formData, "deadline");
  const confirmFinished = formText(formData, "confirmFinished") === "yes";

  if (!id || !teamAId || !teamBId || !deadline || teamAId === teamBId) {
    redirect("/admin?message=Проверьте страны и дедлайн");
  }

  const supabase = getAdminSupabase();
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id,round,team_a_id,team_b_id,status,winner_team_id")
    .eq("id", id)
    .single();

  if (matchError || !match) {
    redirect(`/admin?message=${encodeURIComponent("Матч не найден")}`);
  }

  if (match.status === "finished" && !confirmFinished) {
    redirect(`/admin?message=${encodeURIComponent("Завершенный матч можно редактировать только после отдельного подтверждения")}`);
  }

  const round = match.round as TournamentRound;
  if (!TOURNAMENT_ROUNDS.includes(round)) {
    redirect(`/admin?message=${encodeURIComponent("Неизвестный раунд")}`);
  }

  const { alreadyUsed, eligibleTeamIds } = await getEligibleTeamIds(round, id);
  if (alreadyUsed.has(teamAId) || alreadyUsed.has(teamBId)) {
    redirect(`/admin?message=${encodeURIComponent("Эта страна уже участвует в другом матче этого раунда")}`);
  }

  if (!eligibleTeamIds.has(teamAId) || !eligibleTeamIds.has(teamBId)) {
    redirect(`/admin?message=${encodeURIComponent("Для этого раунда можно выбрать только страны, которые прошли дальше")}`);
  }

  const teamsChanged = match.team_a_id !== teamAId || match.team_b_id !== teamBId;
  const updatePayload = teamsChanged
    ? {
        team_a_id: teamAId,
        team_b_id: teamBId,
        deadline: new Date(deadline).toISOString(),
        winner_team_id: null,
        status: "open"
      }
    : {
        team_a_id: teamAId,
        team_b_id: teamBId,
        deadline: new Date(deadline).toISOString()
      };

  const { error } = await supabase
    .from("matches")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    redirect(`/admin?message=${encodeURIComponent("Матч не удалось обновить")}`);
  }

  if (teamsChanged) {
    await deleteLaterRoundMatches(match.round);
    const { error: deleteError } = await supabase.from("bets").delete().eq("match_id", id);
    if (deleteError) {
      redirect(`/admin?message=${encodeURIComponent("Матч обновлен, но прогнозы не удалось очистить")}`);
    }
  }

  await supabase.rpc("recalculate_scores");
  revalidateTournamentPages();
  redirect(`/admin?message=${encodeURIComponent(teamsChanged ? "Матч обновлен, старые прогнозы очищены" : "Дедлайн матча обновлен")}`);
}

export async function updateMatchDeadline(formData: FormData) {
  await requireAdmin();
  const id = formText(formData, "id");
  const deadline = formText(formData, "deadline");

  if (!id || !deadline) {
    redirect("/admin?message=Укажите новый дедлайн");
  }

  const { error } = await getAdminSupabase()
    .from("matches")
    .update({ deadline: new Date(deadline).toISOString() })
    .eq("id", id);

  if (error) redirect(`/admin?message=${encodeURIComponent("Дедлайн не удалось изменить")}`);
  revalidateTournamentPages();
}

export async function generateRoundOf16(formData: FormData) {
  await requireAdmin();
  const deadline = formText(formData, "deadline");

  if (!deadline) {
    redirect("/admin?message=Укажите дедлайн для 1/8 финала");
  }

  const supabase = getAdminSupabase();
  const [{ data: existingMatches }, { data: teams, error: teamsError }] = await Promise.all([
    supabase.from("matches").select("id").eq("round", "1/8 финала"),
    supabase.from("teams").select("id").order("created_at", { ascending: true })
  ]);

  if ((existingMatches ?? []).length > 0) {
    redirect(`/admin?message=${encodeURIComponent("1/8 финала уже создана")}`);
  }

  if (teamsError || !teams || teams.length !== 16) {
    redirect(`/admin?message=${encodeURIComponent("Для генерации 1/8 нужно ровно 16 команд")}`);
  }

  const shuffledTeams = shuffle(teams);
  const rows = Array.from({ length: 8 }, (_, index) => ({
    round: "1/8 финала",
    team_a_id: shuffledTeams[index * 2].id,
    team_b_id: shuffledTeams[index * 2 + 1].id,
    deadline: new Date(deadline).toISOString(),
    status: "open"
  }));

  const { error } = await supabase.from("matches").insert(rows);

  if (error) redirect(`/admin?message=${encodeURIComponent("Не удалось создать 1/8 финала")}`);
  revalidateTournamentPages();
  redirect(`/admin?message=${encodeURIComponent("1/8 финала создана: 8 матчей, жеребьевка случайная")}`);
}

export async function generateNextRound(formData: FormData) {
  await requireAdmin();
  const sourceRound = formText(formData, "sourceRound") as TournamentRound;
  const deadline = formText(formData, "deadline");
  const targetRound = NEXT_ROUND[sourceRound];

  if (!targetRound || !TOURNAMENT_ROUNDS.includes(sourceRound) || !deadline) {
    redirect("/admin?message=Проверьте раунд и дедлайн");
  }

  const supabase = getAdminSupabase();
  const [{ data: sourceMatches, error: sourceError }, { data: targetMatches }] = await Promise.all([
    supabase
      .from("matches")
      .select("id,winner_team_id,created_at")
      .eq("round", sourceRound)
      .order("created_at", { ascending: true }),
    supabase.from("matches").select("id").eq("round", targetRound)
  ]);

  if ((targetMatches ?? []).length > 0) {
    redirect(`/admin?message=${encodeURIComponent(`${targetRound} уже создан`)}`);
  }

  if (sourceError || !sourceMatches || sourceMatches.length !== ROUND_MATCH_COUNTS[sourceRound]) {
    redirect(`/admin?message=${encodeURIComponent(`Сначала создайте полный раунд: ${sourceRound}`)}`);
  }

  if (sourceMatches.some((match) => !match.winner_team_id)) {
    redirect(`/admin?message=${encodeURIComponent(`Нельзя создать ${targetRound}: не все победители выбраны в ${sourceRound}`)}`);
  }

  const winners = sourceMatches.map((match) => match.winner_team_id as string);
  const rows = Array.from({ length: winners.length / 2 }, (_, index) => ({
    round: targetRound,
    team_a_id: winners[index * 2],
    team_b_id: winners[index * 2 + 1],
    deadline: new Date(deadline).toISOString(),
    status: "open"
  }));

  const { error } = await supabase.from("matches").insert(rows);

  if (error) redirect(`/admin?message=${encodeURIComponent(`${targetRound} не удалось создать`)}`);
  revalidateTournamentPages();
  redirect(`/admin?message=${encodeURIComponent(`${targetRound} создан`)}`);
}

export async function updateMatchStatus(formData: FormData) {
  await requireAdmin();
  const id = formText(formData, "id");
  const status = formText(formData, "status");

  const { error } = await getAdminSupabase()
    .from("matches")
    .update({ status })
    .eq("id", id);

  if (error) redirect(`/admin?message=${encodeURIComponent("Статус не удалось изменить")}`);
  revalidateTournamentPages();
}

export async function setWinner(formData: FormData) {
  await requireAdmin();
  const id = formText(formData, "id");
  const winnerTeamId = formText(formData, "winnerTeamId");
  const supabase = getAdminSupabase();

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("round,winner_team_id")
    .eq("id", id)
    .single();

  if (matchError || !match) {
    redirect(`/admin?message=${encodeURIComponent("Матч не найден")}`);
  }

  if (match.winner_team_id && match.winner_team_id !== winnerTeamId) {
    await deleteLaterRoundMatches(match.round);
  }

  const { error } = await supabase
    .from("matches")
    .update({ winner_team_id: winnerTeamId, status: "finished" })
    .eq("id", id);

  if (error) redirect(`/admin?message=${encodeURIComponent("Победителя не удалось сохранить")}`);
  await supabase.rpc("recalculate_scores");
  revalidateTournamentPages();
}

export async function recalculateScores() {
  await requireAdmin();
  const { error } = await getAdminSupabase().rpc("recalculate_scores");

  if (error) redirect(`/admin?message=${encodeURIComponent("Баллы не удалось пересчитать")}`);
  revalidateTournamentPages();
}

export async function resetMatchResult(formData: FormData) {
  await requireAdmin();
  const id = formText(formData, "id");
  const supabase = getAdminSupabase();

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("round,winner_team_id")
    .eq("id", id)
    .single();

  if (matchError || !match) {
    redirect(`/admin?message=${encodeURIComponent("Матч не найден")}`);
  }

  if (match.winner_team_id) {
    await deleteLaterRoundMatches(match.round);
  }

  const { error } = await supabase
    .from("matches")
    .update({ winner_team_id: null, status: "open" })
    .eq("id", id);

  if (error) {
    redirect(`/admin?message=${encodeURIComponent("Не удалось сбросить результат матча")}`);
  }

  await supabase.rpc("recalculate_scores");
  revalidateTournamentPages();
  redirect(`/admin?message=${encodeURIComponent("Результат матча сброшен. Кит откатил реальность.")}`);
}

export async function resetTournamentResults() {
  await requireAdmin();
  const supabase = getAdminSupabase();
  const { error } = await supabase
    .from("matches")
    .update({ winner_team_id: null, status: "open" })
    .not("id", "is", null);

  if (error) {
    redirect(`/admin?message=${encodeURIComponent("Не удалось сбросить результаты турнира")}`);
  }

  await supabase.rpc("recalculate_scores");
  revalidateTournamentPages();
  redirect(`/admin?message=${encodeURIComponent("Все результаты сброшены. Баллы пересчитаны, Excel выдохнул.")}`);
}

export async function deleteTournamentBracket() {
  await requireAdmin();
  const supabase = getAdminSupabase();

  const { error } = await supabase
    .from("matches")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    redirect(`/admin?message=${encodeURIComponent("Не удалось удалить сетку турнира")}`);
  }

  await supabase.rpc("recalculate_scores");
  revalidateTournamentPages();
  redirect(`/admin?message=${encodeURIComponent("Сетка удалена. Страны и ники на месте, кит готов к новому жеребьевочному кругу.")}`);
}

export async function clearTestData() {
  await requireAdmin();
  const supabase = getAdminSupabase();

  const operations = [
    supabase.from("bets").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
    supabase.from("scores").delete().neq("participant_id", "00000000-0000-0000-0000-000000000000"),
    supabase.from("participants").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
    supabase.from("matches").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
    supabase.from("teams").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  ];

  for (const operation of operations) {
    const { error } = await operation;
    if (error) {
      redirect(`/admin?message=${encodeURIComponent("Не удалось очистить тестовые данные")}`);
    }
  }

  revalidateTournamentPages();
  redirect("/admin?message=Тестовые данные очищены");
}
