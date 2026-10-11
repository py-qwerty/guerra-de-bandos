begin;
alter table public.disparos add column operacion uuid;
alter table public.disparos add column finalizado boolean not null default true;
alter table public.disparos add column bando text;
create unique index disparos_operacion on public.disparos(operacion) where operacion is not null;
create index if not exists disparos_jugador_fecha on public.disparos(jugador_id,created_at);
update public.catalogo set coste=0 where clase='municion';
create or replace function public._gastado(p_jugador uuid) returns integer language sql stable security definer set search_path='' as $$
 select coalesce(sum(coste),0)::integer from public.bloques where jugador_id=p_jugador and created_at>=date_trunc('day',now());
$$;
create function public.mis_disparos(p_token uuid) returns json language plpgsql security definer set search_path='' as $$
declare j public.jugadores; usados integer;
begin
 j:=public._jugador(p_token); if j.id is null then raise exception 'Token no válido'; end if;
 select count(*) into usados from public.disparos where jugador_id=j.id and created_at>=(date_trunc('day',now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid');
 return json_build_object('usados',usados,'restantes',greatest(0,2-usados),'total',2);
end $$;
create function public.iniciar_ataque(p_token uuid,p_municion text,p_replica text,p_operacion uuid) returns json language plpgsql security definer set search_path='' as $$
declare j public.jugadores; a public.disparos; usados integer; activa boolean;
begin
 j:=public._jugador(p_token); if j.id is null then raise exception 'Token no válido'; end if;
 perform 1 from public.jugadores where id=j.id for update;
 select * into j from public.jugadores where id=j.id;
 select p.activa into activa from public.partidas p where id=j.partida_id for share;
 if activa is distinct from true then raise exception 'Partida terminada.'; end if;
 if p_operacion is null then raise exception 'Falta identificar el disparo.'; end if;
 select * into a from public.disparos where operacion=p_operacion;
 if found then
  if a.jugador_id<>j.id or a.municion<>p_municion or coalesce(a.replica,'')<>left(coalesce(p_replica,''),140) then raise exception 'El disparo no coincide.'; end if;
  return json_build_object('id',a.id,'finalizado',a.finalizado,'restantes',(public.mis_disparos(p_token)->>'restantes')::int);
 end if;
 if not exists(select 1 from public.catalogo where id=p_municion and clase='municion' and bando=j.bando) then raise exception 'Esa munición no es de tu bando.'; end if;
 select count(*) into usados from public.disparos where jugador_id=j.id and created_at>=(date_trunc('day',now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid');
 if usados>=2 then raise exception 'Ya has usado tus 2 disparos gratuitos de hoy. Mañana tendrás otros 2.'; end if;
 if exists(select 1 from public.disparos where jugador_id=j.id and not finalizado and created_at>now()-interval '45 seconds') then raise exception 'Espera a que termine tu ataque anterior.'; end if;
 insert into public.disparos(partida_id,jugador_id,municion,replica,coste,operacion,finalizado,bando)
 values(j.partida_id,j.id,p_municion,left(coalesce(p_replica,''),140),0,p_operacion,false,j.bando) returning * into a;
 return json_build_object('id',a.id,'finalizado',false,'restantes',1-usados);
end $$;
create function public.terminar_ataque(p_token uuid,p_ataque uuid,p_estado jsonb) returns json language plpgsql security definer set search_path='' as $$
declare j public.jugadores; a public.disparos; e jsonb; n integer:=0; activa boolean;
begin
 j:=public._jugador(p_token); if j.id is null then raise exception 'Token no válido'; end if;
 select * into a from public.disparos where id=p_ataque and jugador_id=j.id for update;
 if a.id is null then raise exception 'Disparo no autorizado.'; end if;
 if a.finalizado then return json_build_object('derribados',a.derribados,'restantes',(public.mis_disparos(p_token)->>'restantes')::int); end if;
 select p.activa into activa from public.partidas p where id=j.partida_id for share;
 if activa is distinct from true then raise exception 'Partida terminada.'; end if;
 if jsonb_typeof(p_estado) is distinct from 'array' or jsonb_array_length(p_estado)>500 then raise exception 'Estado del ataque no válido.'; end if;
 for e in select * from jsonb_array_elements(p_estado) loop
  if coalesce((e->>'en_pie')::boolean,true)=false then
   update public.bloques set en_pie=false,derribado_por=j.id,replica=a.replica,derribado_at=now()
   where id=(e->>'id')::uuid and partida_id=a.partida_id and bando<>a.bando and derribado_por is null;
   if found then n:=n+1; end if;
  end if;
 end loop;
 update public.disparos set finalizado=true,derribados=n where id=a.id;
 update public.jugadores set puntos=puntos+n*10 where id=j.id;
 return json_build_object('derribados',n,'restantes',(public.mis_disparos(p_token)->>'restantes')::int);
end $$;
-- Los daños solo se aceptan mientras hay un disparo autorizado en curso.
do $$
declare def text;
begin
 select pg_get_functiondef('public.registrar_danos(uuid,jsonb)'::regprocedure) into def;
 def:=replace(def,'j := _jugador(p_token);','j := _jugador(p_token); if not exists(select 1 from public.disparos where jugador_id=j.id and not finalizado and created_at>now()-interval ''45 seconds'') then raise exception ''No hay un ataque autorizado en curso.''; end if;');
 if position('No hay un ataque autorizado' in def)=0 then raise exception 'Revisar integración de daños'; end if;
 execute def;
end $$;
revoke execute on function public.disparar(uuid,text,text,jsonb) from public,anon,authenticated;
revoke execute on function public.mis_disparos(uuid),public.iniciar_ataque(uuid,text,text,uuid),public.terminar_ataque(uuid,uuid,jsonb) from public;
grant execute on function public.mis_disparos(uuid),public.iniciar_ataque(uuid,text,text,uuid),public.terminar_ataque(uuid,uuid,jsonb) to anon,authenticated;
notify pgrst,'reload schema';
commit;
