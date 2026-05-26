import { LeaderboardPanel } from "@/components/LeaderboardPanel";
import { getPublicSupabase } from "@/lib/supabase";
import type { LeaderboardRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const { data } = await getPublicSupabase()
    .from("leaderboard")
    .select("*")
    .order("points", { ascending: false })
    .order("correct_predictions", { ascending: false });

  const rows = (data ?? []) as LeaderboardRow[];

  return (
    <div className="space-y-6">
      <LeaderboardPanel rows={rows} title="Полный лидерборд" />
    </div>
  );
}
