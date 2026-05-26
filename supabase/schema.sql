create extension if not exists pgcrypto;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  player_1 text not null,
  player_2 text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  round text not null,
  team_a_id uuid not null references public.teams(id) on delete restrict,
  team_b_id uuid not null references public.teams(id) on delete restrict,
  deadline timestamptz not null,
  status text not null default 'open' check (status in ('open', 'closed', 'finished')),
  winner_team_id uuid references public.teams(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint teams_are_different check (team_a_id <> team_b_id),
  constraint winner_is_match_team check (
    winner_team_id is null or winner_team_id in (team_a_id, team_b_id)
  )
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  constraint participant_name_not_blank check (length(trim(name)) > 0)
);

create unique index if not exists participants_name_unique_lower
  on public.participants (lower(trim(name)));

create table if not exists public.bets (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  selected_team_id uuid not null references public.teams(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint one_bet_per_match unique (participant_id, match_id)
);

create table if not exists public.scores (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  points integer not null default 0,
  correct_predictions integer not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.validate_bet()
returns trigger
language plpgsql
as $$
declare
  target_match public.matches;
begin
  select * into target_match from public.matches where id = new.match_id;

  if target_match.id is null then
    raise exception 'Match does not exist';
  end if;

  if new.selected_team_id not in (target_match.team_a_id, target_match.team_b_id) then
    raise exception 'Selected team is not part of this match';
  end if;

  if target_match.status <> 'open' or now() >= target_match.deadline then
    raise exception 'Betting is closed for this match';
  end if;

  return new;
end;
$$;

drop trigger if exists bets_validate_before_insert on public.bets;
create trigger bets_validate_before_insert
before insert on public.bets
for each row execute function public.validate_bet();

create or replace function public.recalculate_scores()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with totals as (
    select
      p.id as participant_id,
      coalesce(count(b.id) filter (where m.winner_team_id = b.selected_team_id), 0)::integer as correct_predictions,
      coalesce(sum(
        case
          when m.winner_team_id = b.selected_team_id and m.round = '1/8 финала' then 1
          when m.winner_team_id = b.selected_team_id and m.round = '1/4 финала' then 2
          when m.winner_team_id = b.selected_team_id and m.round = '1/2 финала' then 3
          when m.winner_team_id = b.selected_team_id and m.round = 'финал' then 5
          else 0
        end
      ), 0)::integer as points
    from public.participants p
    left join public.bets b on b.participant_id = p.id
    left join public.matches m on m.id = b.match_id and m.winner_team_id is not null
    group by p.id
  )
  insert into public.scores (participant_id, points, correct_predictions, updated_at)
  select participant_id, points, correct_predictions, now()
  from totals
  on conflict (participant_id) do update
  set points = excluded.points,
      correct_predictions = excluded.correct_predictions,
      updated_at = now();
end;
$$;

create or replace function public.recalculate_scores_trigger()
returns trigger
language plpgsql
as $$
begin
  perform public.recalculate_scores();
  return coalesce(new, old);
end;
$$;

drop trigger if exists matches_recalculate_scores on public.matches;
create trigger matches_recalculate_scores
after insert or update of winner_team_id, status or delete on public.matches
for each row execute function public.recalculate_scores_trigger();

drop trigger if exists bets_recalculate_scores on public.bets;
create trigger bets_recalculate_scores
after insert or update or delete on public.bets
for each row execute function public.recalculate_scores_trigger();

alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.participants enable row level security;
alter table public.bets enable row level security;
alter table public.scores enable row level security;

drop policy if exists "public read teams" on public.teams;
create policy "public read teams" on public.teams for select using (true);

drop policy if exists "public read matches" on public.matches;
create policy "public read matches" on public.matches for select using (true);

drop policy if exists "public read scores" on public.scores;
create policy "public read scores" on public.scores for select using (true);

drop policy if exists "public create participants" on public.participants;
create policy "public create participants" on public.participants
for insert with check (true);

drop policy if exists "public read participants" on public.participants;
create policy "public read participants" on public.participants
for select using (true);

drop policy if exists "public create bets" on public.bets;
create policy "public create bets" on public.bets
for insert with check (true);

drop policy if exists "public read own-safe bets" on public.bets;
create policy "public read own-safe bets" on public.bets
for select using (true);

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
