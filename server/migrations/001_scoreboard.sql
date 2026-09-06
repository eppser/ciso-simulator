begin;
create schema if not exists ciso_game_private;
revoke all on schema ciso_game_private from public, anon, authenticated;
create table if not exists public.ciso_game_scores (
 id uuid primary key default gen_random_uuid(), run_id uuid not null unique,
 name text not null check (char_length(name) between 2 and 28),
 superskill text not null check (char_length(superskill) between 2 and 40),
 score integer not null check (score between 0 and 10000),
 categories integer[] not null check (array_length(categories,1)=3 and categories[1] between 0 and 4000 and categories[2] between 0 and 3000 and categories[3] between 0 and 3000 and categories[1]+categories[2]+categories[3]=score),
 org text not null check (org in ('startup','midcap','enterprise')),
 scenario date not null, ruleset text not null,
 outcome text not null check (outcome in ('won','lost')),
 seconds integer not null check (seconds between 0 and 4000),
 created_at timestamptz not null default now()
);
alter table public.ciso_game_scores enable row level security;
revoke all on public.ciso_game_scores from public,anon,authenticated;
grant select(id,name,superskill,score,categories,org,scenario,ruleset,outcome,seconds,created_at) on public.ciso_game_scores to anon,authenticated;
create policy ciso_scores_public_read on public.ciso_game_scores for select to anon,authenticated using (true);
grant all on public.ciso_game_scores to service_role;
create index ciso_scores_rank on public.ciso_game_scores (ruleset,scenario,org,score desc,created_at);
create index ciso_scores_history on public.ciso_game_scores (created_at desc,id);
create table ciso_game_private.runs (
 id uuid primary key default gen_random_uuid(),token_hash text not null unique,
 ip_hash text not null,org text not null check(org in ('startup','midcap','enterprise')),
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '24 hours',
 used boolean not null default false,attempts integer not null default 0
);
alter table ciso_game_private.runs enable row level security;
revoke all on ciso_game_private.runs from public,anon,authenticated;
create policy ciso_runs_server_only on ciso_game_private.runs to service_role using(true) with check(true);
create index ciso_run_rate on ciso_game_private.runs(ip_hash,created_at);
create function public.ciso_begin_run(p_token text,p_ip text,p_org text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if p_token !~ '^[a-f0-9]{64}$' or p_ip !~ '^[a-f0-9]{64}$' or p_org not in ('startup','midcap','enterprise') then raise exception 'Invalid run'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_ip,0));
 if (select count(*) from ciso_game_private.runs where ip_hash=p_ip and created_at>now()-interval '1 hour')>=20 then raise exception 'Run limit reached'; end if;
 delete from ciso_game_private.runs where expires_at<now()-interval '24 hours';
 insert into ciso_game_private.runs(token_hash,ip_hash,org) values(p_token,p_ip,p_org) returning id into v_id;
 return v_id;
end $$;
create function public.ciso_claim_run(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r ciso_game_private.runs;
begin
 select * into r from ciso_game_private.runs where token_hash=p_token for update;
 if not found or r.used or r.expires_at<now() or r.attempts>=4 then return null; end if;
 update ciso_game_private.runs set attempts=attempts+1 where id=r.id;
 return jsonb_build_object('id',r.id,'org',r.org,'created_at',r.created_at);
end $$;
create function public.ciso_finish_run(p_run uuid,p_name text,p_skill text,p_score integer,p_categories integer[],p_org text,p_scenario date,p_ruleset text,p_outcome text,p_seconds integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare r ciso_game_private.runs;v_id uuid;
begin
 select * into r from ciso_game_private.runs where id=p_run for update;
 if not found or r.used or r.expires_at<now() or r.org<>p_org then raise exception 'Run already used or expired'; end if;
 insert into public.ciso_game_scores(run_id,name,superskill,score,categories,org,scenario,ruleset,outcome,seconds)
 values(p_run,p_name,p_skill,p_score,p_categories,p_org,p_scenario,p_ruleset,p_outcome,p_seconds) returning id into v_id;
 update ciso_game_private.runs set used=true where id=p_run;
 return v_id;
end $$;
revoke all on function public.ciso_begin_run(text,text,text),public.ciso_claim_run(text),public.ciso_finish_run(uuid,text,text,integer,integer[],text,date,text,text,integer) from public,anon,authenticated;
grant execute on function public.ciso_begin_run(text,text,text),public.ciso_claim_run(text),public.ciso_finish_run(uuid,text,text,integer,integer[],text,date,text,text,integer) to service_role;
comment on table public.ciso_game_scores is 'CISO Simulator: opt-in public pseudonyms and server-replayed scores. No IP addresses or source imports.';
notify pgrst,'reload schema';
commit;
