begin;
create function public.admin_bando(p_token text,p_jugador_token uuid,p_bando text) returns json
language plpgsql security definer set search_path='' as $$
declare j public.jugadores;
begin
 perform private.admin_check(p_token);
 if p_bando is null or p_bando not in ('izquierda','derecha') then raise exception 'Elige Acampada o Torres.'; end if;
 j:=public._jugador(p_jugador_token);
 if j.id is null or not exists(select 1 from public.partidas where id=j.partida_id and codigo='general') then raise exception 'Entra primero en la partida para probar un bando.'; end if;
 update public.jugadores set bando=p_bando where id=j.id returning * into j;
 return public._sesion(j);
end $$;
revoke execute on function public.admin_bando(text,uuid,text) from public;
grant execute on function public.admin_bando(text,uuid,text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
