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

create temporary table country_name_map (
  english_name text primary key,
  russian_name text not null
) on commit drop;

insert into country_name_map (english_name, russian_name) values
  ('France', 'Франция'),
  ('Spain', 'Испания'),
  ('Argentina', 'Аргентина'),
  ('England', 'Англия'),
  ('Portugal', 'Португалия'),
  ('Netherlands', 'Нидерланды'),
  ('Brazil', 'Бразилия'),
  ('Belgium', 'Бельгия'),
  ('Germany', 'Германия'),
  ('Croatia', 'Хорватия'),
  ('Morocco', 'Марокко'),
  ('Colombia', 'Колумбия'),
  ('Uruguay', 'Уругвай'),
  ('Switzerland', 'Швейцария'),
  ('USA', 'США'),
  ('Mexico', 'Мексика');

alter table public.matches drop constraint if exists winner_is_match_team;
alter table public.matches drop constraint if exists teams_are_different;

with duplicates as (
  select english_team.id as english_id, russian_team.id as russian_id
  from country_name_map map
  join public.teams english_team on english_team.name = map.english_name
  join public.teams russian_team on russian_team.name = map.russian_name
)
update public.matches m
set team_a_id = d.russian_id
from duplicates d
where m.team_a_id = d.english_id;

with duplicates as (
  select english_team.id as english_id, russian_team.id as russian_id
  from country_name_map map
  join public.teams english_team on english_team.name = map.english_name
  join public.teams russian_team on russian_team.name = map.russian_name
)
update public.matches m
set team_b_id = d.russian_id
from duplicates d
where m.team_b_id = d.english_id;

with duplicates as (
  select english_team.id as english_id, russian_team.id as russian_id
  from country_name_map map
  join public.teams english_team on english_team.name = map.english_name
  join public.teams russian_team on russian_team.name = map.russian_name
)
update public.matches m
set winner_team_id = d.russian_id
from duplicates d
where m.winner_team_id = d.english_id;

with duplicates as (
  select english_team.id as english_id, russian_team.id as russian_id
  from country_name_map map
  join public.teams english_team on english_team.name = map.english_name
  join public.teams russian_team on russian_team.name = map.russian_name
)
update public.bets b
set selected_team_id = d.russian_id
from duplicates d
where b.selected_team_id = d.english_id;

delete from public.teams t
using country_name_map map
where t.name = map.english_name
  and exists (
    select 1 from public.teams russian_team where russian_team.name = map.russian_name
  );

update public.teams t
set name = map.russian_name,
    player_1 = coalesce(nullif(t.player_1, ''), 'TBD'),
    player_2 = coalesce(nullif(t.player_2, ''), 'TBD')
from country_name_map map
where t.name = map.english_name;

delete from public.matches
where team_a_id = team_b_id;

alter table public.matches
  add constraint teams_are_different check (team_a_id <> team_b_id);

alter table public.matches
  add constraint winner_is_match_team check (
    winner_team_id is null or winner_team_id in (team_a_id, team_b_id)
  );

select public.recalculate_scores();
