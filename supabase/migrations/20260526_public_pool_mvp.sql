drop view if exists public.leaderboard;
create view public.leaderboard as
select
  p.id as participant_id,
  p.name,
  coalesce(s.correct_predictions, 0) as correct_predictions,
  coalesce(count(b.id), 0)::integer as total_predictions,
  coalesce(s.points, 0) as points,
  dense_rank() over (
    order by coalesce(s.points, 0) desc, coalesce(s.correct_predictions, 0) desc, p.created_at asc
  ) as place
from public.participants p
left join public.scores s on s.participant_id = p.id
left join public.bets b on b.participant_id = p.id
group by p.id, p.name, p.created_at, s.correct_predictions, s.points;

grant select on public.leaderboard to anon, authenticated;

drop view if exists public.bets_with_details;
create view public.bets_with_details as
select
  b.id,
  b.created_at,
  p.name as participant_name,
  b.participant_id,
  b.match_id,
  b.selected_team_id,
  m.round,
  m.deadline,
  m.status,
  ta.name as team_a_name,
  tb.name as team_b_name,
  selected.name as selected_team_name,
  winner.name as winner_team_name
from public.bets b
join public.participants p on p.id = b.participant_id
join public.matches m on m.id = b.match_id
join public.teams ta on ta.id = m.team_a_id
join public.teams tb on tb.id = m.team_b_id
join public.teams selected on selected.id = b.selected_team_id
left join public.teams winner on winner.id = m.winner_team_id;

grant select on public.bets_with_details to anon, authenticated;

select public.recalculate_scores();
