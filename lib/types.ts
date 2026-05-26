export type Team = {
  id: string;
  name: string;
  player_1: string;
  player_2: string;
};

export type MatchStatus = "open" | "closed" | "finished";

export type Match = {
  id: string;
  round: string;
  team_a_id: string;
  team_b_id: string;
  deadline: string;
  status: MatchStatus;
  winner_team_id: string | null;
  team_a: Team;
  team_b: Team;
  winner?: Team | null;
};

export type LeaderboardRow = {
  participant_id: string;
  name: string;
  correct_predictions: number;
  total_predictions: number;
  points: number;
  place: number;
};

export type BetDetails = {
  id: string;
  created_at: string;
  participant_name: string;
  participant_id: string;
  match_id: string;
  selected_team_id: string;
  round: string;
  deadline: string;
  status: MatchStatus;
  team_a_name: string;
  team_b_name: string;
  selected_team_name: string;
  winner_team_name: string | null;
};
