begin;
create table private.admin_ayudas (
 id uuid primary key, jugador_id uuid not null references public.jugadores(id) on delete cascade,
 clase text not null check(clase in ('credito','pieza')), cantidad integer not null default 0 check(cantidad between 0 and 100000),
 tipo text, bloque_id uuid, created_at timestamptz not null default now()
);
alter table private.admin_ayudas enable row level security;
revoke all on private.admin_ayudas from public,anon,authenticated;
create index admin_ayudas_jugador_fecha on private.admin_ayudas(jugador_id,created_at);
create function private.extra(p_jugador uuid) returns integer language sql stable security definer set search_path='' as $$
 select coalesce(sum(cantidad),0)::integer from private.admin_ayudas where jugador_id=p_jugador and clase='credito' and created_at>=date_trunc('day',now());
$$;
create function private.saldo(p_jugador uuid) returns integer language sql stable security definer set search_path='' as $$
 select public._presupuesto(bando)+private.extra(id)-public._gastado(id) from public.jugadores where id=p_jugador;
$$;
create or replace function public.mi_presupuesto(p_token uuid) returns json language plpgsql security definer set search_path='' as $$
declare j public.jugadores; total integer; gastado integer;
begin
 j:=public._jugador(p_token); if j.id is null then raise exception 'Token no válido'; end if;
 total:=public._presupuesto(j.bando)+private.extra(j.id); gastado:=public._gastado(j.id);
 return json_build_object('presupuesto',total,'gastado',gastado,'restante',total-gastado);
end $$;
-- Conservar las funciones del catálogo, integrando el saldo ampliado y el bloqueo de gasto concurrente.
do $$
declare f record; def text;
begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('poner_pieza','disparar') loop
  def:=pg_get_functiondef(f.oid);
  if position('_presupuesto(j.bando) - _gastado(j.id)' in def)=0 then raise exception 'El cálculo de saldo ha cambiado: revisar integración'; end if;
  def:=replace(def,'v_rest := _presupuesto(j.bando) - _gastado(j.id);','perform 1 from public.jugadores where id=j.id for update; v_rest := private.saldo(j.id);');
  execute def;
 end loop;
end $$;
create function public.admin_jugadores(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform private.admin_check(p_token);
 return coalesce((select jsonb_agg(jsonb_build_object('id',j.id,'nombre',j.nombre,'bando',j.bando,'puntos',j.puntos,'presupuesto',public._presupuesto(j.bando)+private.extra(j.id),'restante',private.saldo(j.id)) order by j.nombre,j.id)
 from public.jugadores j join public.partidas p on p.id=j.partida_id where p.codigo='general'),'[]'::jsonb);
end $$;
create function public.admin_presupuesto(p_token text,p_jugador uuid,p_cantidad integer,p_operacion uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.jugadores; previa private.admin_ayudas;
begin
 perform private.admin_check(p_token);
 if p_operacion is null or p_cantidad is null or p_cantidad<1 or p_cantidad>100000 then raise exception 'Indica entre 1 y 100000 créditos.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_operacion::text,0));
 select jg.* into j from public.jugadores jg join public.partidas p on p.id=jg.partida_id where jg.id=p_jugador and p.codigo='general' for update of jg;
 if j.id is null then raise exception 'Jugador no encontrado en esta partida.'; end if;
 select * into previa from private.admin_ayudas where id=p_operacion;
 if found then
  if previa.jugador_id<>p_jugador or previa.clase<>'credito' or previa.cantidad<>p_cantidad then raise exception 'La operación no coincide.'; end if;
 else
  if private.extra(j.id)+p_cantidad>1000000 then raise exception 'Límite de un millón de créditos extra por día.'; end if;
  insert into private.admin_ayudas(id,jugador_id,clase,cantidad) values(p_operacion,j.id,'credito',p_cantidad);
 end if;
 return jsonb_build_object('restante',private.saldo(j.id),'presupuesto',public._presupuesto(j.bando)+private.extra(j.id));
end $$;
create function public.admin_construir(p_token text,p_jugador uuid,p_tipo text,p_texto text,p_x real,p_y real,p_operacion uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.jugadores; c public.catalogo; tema uuid; bloque uuid; previa private.admin_ayudas;
begin
 perform private.admin_check(p_token);
 if p_operacion is null then raise exception 'Falta identificar la operación.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_operacion::text,0));
 select jg.* into j from public.jugadores jg join public.partidas p on p.id=jg.partida_id where jg.id=p_jugador and p.codigo='general';
 if j.id is null then raise exception 'Jugador no encontrado en esta partida.'; end if;
 select * into c from public.catalogo where id=p_tipo and clase='pieza' and bando=j.bando;
 if c.id is null then raise exception 'Elige una pieza del bando del jugador.'; end if;
 select * into previa from private.admin_ayudas where id=p_operacion;
 if found then
  if previa.jugador_id<>p_jugador or previa.clase<>'pieza' or previa.tipo<>p_tipo then raise exception 'La operación no coincide.'; end if;
  return jsonb_build_object('id',previa.bloque_id);
 end if;
 if p_x is null or p_y is null or not(p_x between 0 and 1680) or not(p_y between -2000 and 1000) then raise exception 'Posición no válida.'; end if;
 select id into tema from public.temas where partida_id=j.partida_id order by inicio desc limit 1;
 insert into public.bloques(partida_id,tema_id,jugador_id,bando,tipo,texto,x,y,ancho,alto,coste)
 values(j.partida_id,tema,j.id,j.bando,c.id,nullif(left(trim(coalesce(p_texto,'')),60),''),p_x,p_y,c.ancho,c.alto,0) returning id into bloque;
 insert into private.admin_ayudas(id,jugador_id,clase,tipo,bloque_id) values(p_operacion,j.id,'pieza',p_tipo,bloque);
 return jsonb_build_object('id',bloque);
end $$;
revoke execute on function private.extra(uuid),private.saldo(uuid) from public,anon,authenticated;
revoke execute on function public.admin_jugadores(text),public.admin_presupuesto(text,uuid,integer,uuid),public.admin_construir(text,uuid,text,text,real,real,uuid) from public;
grant execute on function public.admin_jugadores(text),public.admin_presupuesto(text,uuid,integer,uuid),public.admin_construir(text,uuid,text,text,real,real,uuid) to anon,authenticated;
notify pgrst,'reload schema';
commit;
