import { NextResponse } from "next/server";
import { getPublicSupabase, normalizeName } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = normalizeName(String(body?.name ?? ""));
  const matchId = String(body?.matchId ?? "");
  const selectedTeamId = String(body?.selectedTeamId ?? "");

  if (!name || !matchId || !selectedTeamId) {
    return NextResponse.json({ error: "Не хватает данных для прогноза" }, { status: 400 });
  }

  const supabase = getPublicSupabase();
  const { data: participant } = await supabase
    .from("participants")
    .select("id")
    .ilike("name", name)
    .maybeSingle();

  let participantId = participant?.id;

  if (!participantId) {
    const { data: createdParticipant, error: participantError } = await supabase
      .from("participants")
      .insert({ name })
      .select("id")
      .single();

    if (participantError) {
      return NextResponse.json({ error: "Не удалось найти или создать ник" }, { status: 409 });
    }

    participantId = createdParticipant.id;
  }

  const { data, error } = await supabase
    .from("bets")
    .insert({
      participant_id: participantId,
      match_id: matchId,
      selected_team_id: selectedTeamId
    })
    .select("id, match_id, selected_team_id, created_at")
    .single();

  if (error) {
    const message = error.code === "23505"
      ? "Вы уже сделали прогноз на этот матч"
      : "Прогноз не принят: матч закрыт или дедлайн прошел";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  return NextResponse.json({ bet: data });
}
