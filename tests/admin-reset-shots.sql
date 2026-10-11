begin;
do $$
declare adm text:=gen_random_uuid()::text; p uuid; a uuid; b uuid; atok uuid; btok uuid; r json; op uuid:=gen_random_uuid(); before_count integer; result jsonb;
begin
 insert into private.admin_sessions values(encode(extensions.digest(adm,'sha256'),'hex'),now()+interval '5 minutes');
 update public.partidas set activa=true where codigo='general'; select id into p from public.partidas where codigo='general';
 insert into public.jugadores(partida_id,nombre,bando,ip) values(p,'Prueba reset A','izquierda','test-reset-a') returning id into a;
 insert into public.jugadores(partida_id,nombre,bando,ip) values(p,'Prueba reset B','derecha','test-reset-b') returning id into b;
 insert into public.jugador_tokens(jugador_id) values(a) returning token into atok;
 insert into public.jugador_tokens(jugador_id) values(b) returning token into btok;
 perform public.poner_pieza(atok,'tienda',null,300,714);
 r:=public.iniciar_ataque(atok,'piedra','Uno',gen_random_uuid()); perform public.terminar_ataque(atok,(r->>'id')::uuid,'[]');
 r:=public.iniciar_ataque(atok,'piedra','Dos',gen_random_uuid()); perform public.terminar_ataque(atok,(r->>'id')::uuid,'[]');
 r:=public.iniciar_ataque(btok,'pelota','Uno',gen_random_uuid()); perform public.terminar_ataque(btok,(r->>'id')::uuid,'[]');
 select count(*) into before_count from public.disparos where partida_id=p;
 result:=public.admin_restablecer_disparos(adm,op);
 if (public.mis_disparos(atok)->>'restantes')::int<>2 or (public.mis_disparos(btok)->>'restantes')::int<>2 then raise exception 'No devuelve 2 a ambos bandos'; end if;
 if (select count(*) from public.disparos where partida_id=p)<>before_count then raise exception 'Borra historial'; end if;
 if private.saldo(a)<>90 then raise exception 'Modifica presupuesto'; end if;
 r:=public.iniciar_ataque(atok,'piedra','Nuevo',gen_random_uuid()); perform public.terminar_ataque(atok,(r->>'id')::uuid,'[]');
 perform public.admin_restablecer_disparos(adm,op);
 if (public.mis_disparos(atok)->>'restantes')::int<>1 then raise exception 'Reintento vuelve a resetear'; end if;
 begin perform public.admin_restablecer_disparos('invalid',gen_random_uuid()); raise exception 'Admite sesión inválida'; exception when invalid_authorization_specification then null; end;
end $$;
rollback;
select 'Reinicio para ambos bandos, historial y presupuesto conservados, reintentos y permisos: correctos. Prueba revertida.' as resultado;
