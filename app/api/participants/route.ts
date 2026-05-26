import { NextResponse } from "next/server";
import { getPublicSupabase, normalizeName } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = normalizeName(String(body?.name ?? ""));

  if (!name || name.length > 60) {
    return NextResponse.json({ error: "Введите ник до 60 символов" }, { status: 400 });
  }

  const { data, error } = await getPublicSupabase()
    .from("participants")
    .insert({ name })
    .select("id,name")
    .single();

  if (error) {
    return NextResponse.json({ error: "Этот ник уже занят" }, { status: 409 });
  }

  return NextResponse.json({ participant: data });
}
