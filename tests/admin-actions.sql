begin;
do $$
declare t text:=gen_random_uuid()::text; l uuid; r uuid; player_token uuid; operation uuid:=gen_random_uuid(); build_op uuid:=gen_random_uuid(); result jsonb; block_id uuid;
begin
 insert into private.admin_sessions values(encode(extensions.digest(t,'sha256'),'hex'),now()+interval '5 minutes');
 update public.partidas set activa=true where codigo='general';
 insert into public.jugadores(partida_id,nombre,bando,ip) select id,'Prueba admin izquierda','izquierda','test-admin-left' from public.partidas where codigo='general' returning id into l;
 insert into public.jugadores(partida_id,nombre,bando,ip) select id,'Prueba admin derecha','derecha','test-admin-right' from public.partidas where codigo='general' returning id into r;
 insert into public.jugador_tokens(jugador_id) values(l) returning token into player_token;
 result:=public.admin_presupuesto(t,l,200,operation);
 if (result->>'restante')::int<>300 then raise exception 'No suma los créditos'; end if;
 result:=public.admin_presupuesto(t,l,200,operation);
 if (result->>'restante')::int<>300 then raise exception 'Reintento duplica el presupuesto'; end if;
 perform public.poner_pieza(player_token,'tienda','Prueba gasto',300,714);
 if private.saldo(l)<>290 then raise exception 'El juego no gasta el saldo ampliado'; end if;
 result:=public.admin_construir(t,l,'tienda','Prueba regalo',330,714,build_op); block_id:=(result->>'id')::uuid;
 if private.saldo(l)<>290 then raise exception 'La construcción del admin descuenta saldo'; end if;
 result:=public.admin_construir(t,l,'tienda','Prueba regalo',330,714,build_op);
 if (result->>'id')::uuid<>block_id then raise exception 'Reintento duplica la pieza'; end if;
 perform public.admin_construir(t,r,'planta','Prueba derecha',1050,714,gen_random_uuid());
 if not exists(select 1 from public.bloques where jugador_id=r and tipo='planta' and coste=0) then raise exception 'No construye para el otro bando'; end if;
 begin perform public.admin_presupuesto('invalid',l,100,gen_random_uuid()); raise exception 'Admite sesión inválida'; exception when invalid_authorization_specification then null; end;
 begin perform public.admin_construir(t,l,'planta',null,1050,714,gen_random_uuid()); raise exception 'Admite pieza del bando incorrecto'; exception when others then if position('Elige una pieza' in sqlerrm)=0 then raise; end if; end;
 perform public.admin_partida(t,false);
 begin perform public.admin_construir(t,l,'tienda',null,330,714,gen_random_uuid()); raise exception 'Construye en partida terminada'; exception when others then if position('Partida terminada' in sqlerrm)=0 then raise; end if; end;
end $$;
rollback;
select 'Pruebas correctas: presupuesto, gasto real, construcción para ambos bandos, reintentos y permisos. Datos revertidos.' as resultado;
