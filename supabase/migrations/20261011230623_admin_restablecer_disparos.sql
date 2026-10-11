begin;
alter table public.disparos add column cuenta_cupo boolean not null default true;
create table private.admin_reinicios_disparos(id uuid primary key, created_at timestamptz not null default now(), jugadores integer not null, disparos integer not null);
alter table private.admin_reinicios_disparos enable row level security;
revoke all on private.admin_reinicios_disparos from public,anon,authenticated;
do $$
declare f record; def text;
begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname in ('mis_disparos','iniciar_ataque') loop
  def:=pg_get_functiondef(f.oid);
  if position('where jugador_id=j.id and created_at>=' in def)=0 then raise exception 'Revisar integración del cupo'; end if;
  execute replace(def,'where jugador_id=j.id and created_at>=','where jugador_id=j.id and cuenta_cupo and created_at>=');
 end loop;
end $$;
create function public.admin_restablecer_disparos(p_token text,p_operacion uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare p uuid; n integer; d integer; previa private.admin_reinicios_disparos;
begin
 perform private.admin_check(p_token);
 if p_operacion is null then raise exception 'Falta identificar el reinicio.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_operacion::text,0));
 select * into previa from private.admin_reinicios_disparos where id=p_operacion;
 if found then return jsonb_build_object('jugadores',previa.jugadores,'disparos',previa.disparos,'restantes',2); end if;
 select id into p from public.partidas where codigo='general';
 if p is null then raise exception 'No se ha encontrado la partida general.'; end if;
 perform 1 from public.jugadores where partida_id=p order by id for update;
 select count(*) into n from public.jugadores where partida_id=p;
 update public.disparos set cuenta_cupo=false where partida_id=p and cuenta_cupo and created_at>=(date_trunc('day',now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid');
 get diagnostics d=row_count;
 insert into private.admin_reinicios_disparos(id,jugadores,disparos) values(p_operacion,n,d);
 return jsonb_build_object('jugadores',n,'disparos',d,'restantes',2);
end $$;
revoke execute on function public.admin_restablecer_disparos(text,uuid) from public;
grant execute on function public.admin_restablecer_disparos(text,uuid) to anon,authenticated;
notify pgrst,'reload schema';
commit;
