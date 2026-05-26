export const TOURNAMENT_ROUNDS = ["1/8 финала", "1/4 финала", "1/2 финала", "финал"] as const;

export type TournamentRound = (typeof TOURNAMENT_ROUNDS)[number];

export const NEXT_ROUND: Partial<Record<TournamentRound, TournamentRound>> = {
  "1/8 финала": "1/4 финала",
  "1/4 финала": "1/2 финала",
  "1/2 финала": "финал"
};

export const previousRoundByRound: Partial<Record<TournamentRound, TournamentRound>> = {
  "1/4 финала": "1/8 финала",
  "1/2 финала": "1/4 финала",
  "финал": "1/2 финала"
};

export const ROUND_MATCH_COUNTS: Record<TournamentRound, number> = {
  "1/8 финала": 8,
  "1/4 финала": 4,
  "1/2 финала": 2,
  "финал": 1
};

export const ROUND_POINTS: Record<TournamentRound, number> = {
  "1/8 финала": 1,
  "1/4 финала": 2,
  "1/2 финала": 3,
  "финал": 5
};

export function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}
