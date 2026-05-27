import { NextResponse } from "next/server";
import { getPublicSupabase, normalizeName } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = normalizeName(String(body?.name ?? ""));

  if (!name || name.length > 60) {
    return NextResponse.json({ error: "Введите ник до 60 символов" }, { status: 400 });
  }

  const supabase = getPublicSupabase();
  const { data: existingParticipant, error: readError } = await supabase
    .from("participants")
    .select("id,name")
    .ilike("name", name)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: "Не удалось проверить ник" }, { status: 500 });
  }

  if (existingParticipant) {
    return NextResponse.json({ participant: existingParticipant });
  }

  const { data, error } = await supabase
    .from("participants")
    .insert({ name })
    .select("id,name")
    .single();

  if (error) {
    const { data: participant } = await supabase
      .from("participants")
      .select("id,name")
      .ilike("name", name)
      .maybeSingle();

    if (participant) {
      return NextResponse.json({ participant });
    }

    return NextResponse.json({ error: "Не удалось сохранить ник" }, { status: 409 });
  }

  return NextResponse.json({ participant: data });
}
