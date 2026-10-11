begin;
do $$
declare t text:=gen_random_uuid()::text; j uuid; player_token uuid; result json; p uuid; n integer;
begin
 insert into private.admin_sessions values(encode(extensions.digest(t,'sha256'),'hex'),now()+interval '5 minutes');
 update public.partidas set activa=true where codigo='general';
 select id into p from public.partidas where codigo='general';
 insert into public.jugadores(partida_id,nombre,bando,ip) values(p,'Prueba cambio admin','izquierda','test-team-admin') returning id into j;
 insert into public.jugador_tokens(jugador_id) values(j) returning token into player_token;
 perform public.poner_pieza(player_token,'tienda','Prueba conserva',300,714);
 select count(*) into n from public.bloques where jugador_id=j;
 result:=public.admin_bando(t,player_token,'derecha');
 if result->>'bando'<>'derecha' then raise exception 'No cambia a Torres'; end if;
 if (public.mi_presupuesto(player_token)->>'presupuesto')::int<>200 then raise exception 'No actualiza presupuesto de Torres'; end if;
 result:=public.admin_bando(t,player_token,'izquierda');
 if result->>'bando'<>'izquierda' then raise exception 'No vuelve a Acampada'; end if;
 if public._gastado(j)<>10 or (select count(*) from public.bloques where jugador_id=j)<>n then raise exception 'No conserva tablero y gasto'; end if;
 if (select transfuga_usado from public.jugadores where id=j) then raise exception 'Consume el cambio normal de bando'; end if;
 begin perform public.admin_bando('invalid',player_token,'derecha'); raise exception 'Admite sesión inválida'; exception when invalid_authorization_specification then null; end;
 begin perform public.admin_bando(t,player_token,'otro'); raise exception 'Admite bando inválido'; exception when others then if position('Elige Acampada' in sqlerrm)=0 then raise; end if; end;
end $$;
rollback;
select 'Cambio repetido, presupuesto, conservación y permisos: correctos. Prueba revertida.' as resultado;
