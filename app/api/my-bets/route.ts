import { NextResponse } from "next/server";
import { getPublicSupabase, normalizeName } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = normalizeName(searchParams.get("name") ?? "");

  if (!name) {
    return NextResponse.json({ bets: [] });
  }

  const supabase = getPublicSupabase();
  const { data: participant } = await supabase
    .from("participants")
    .select("id")
    .ilike("name", name)
    .maybeSingle();

  if (!participant) {
    return NextResponse.json({ bets: [] });
  }

  const { data, error } = await supabase
    .from("bets")
    .select("id, match_id, selected_team_id, created_at")
    .eq("participant_id", participant.id);

  if (error) {
    return NextResponse.json({ error: "Не удалось загрузить прогнозы" }, { status: 500 });
  }

  return NextResponse.json({ bets: data ?? [] });
}
