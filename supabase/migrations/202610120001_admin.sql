begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create extension if not exists pgcrypto with schema extensions;
alter table public.partidas add column if not exists activa boolean not null default true;
alter table public.partidas add column if not exists iniciada_at timestamptz not null default now();
alter table public.partidas add column if not exists terminada_at timestamptz;
create table if not exists private.admin_config (id boolean primary key default true check(id), password_hash text not null);
create table if not exists private.admin_sessions (token_hash text primary key, expires_at timestamptz not null);
create table if not exists private.admin_attempts (ip text primary key, attempts int not null, since timestamptz not null);
revoke all on all tables in schema private from public, anon, authenticated;
alter table private.admin_config enable row level security;
alter table private.admin_sessions enable row level security;
alter table private.admin_attempts enable row level security;

create or replace function private.admin_check(p_token text) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if not exists(select 1 from private.admin_sessions where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and expires_at>now()) then
  raise exception 'Sesión de administrador caducada. Vuelve a entrar.' using errcode='28000';
 end if;
end $$;

create or replace function public.admin_entrar(p_password text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_hash text; v_token text; v_ip text:=coalesce(public._ip(),'unknown'); v_n int;
begin
 select password_hash into v_hash from private.admin_config where id=true;
 if v_hash is null then return jsonb_build_object('error','El acceso de administrador todavía no está configurado.'); end if;
 insert into private.admin_attempts values(v_ip,1,now()) on conflict(ip) do update
 set attempts=case when admin_attempts.since<now()-interval '15 minutes' then 1 else admin_attempts.attempts+1 end,
 since=case when admin_attempts.since<now()-interval '15 minutes' then now() else admin_attempts.since end
 returning attempts into v_n;
 if v_n>5 then return jsonb_build_object('error','Demasiados intentos. Espera 15 minutos.'); end if;
 if p_password is null or length(p_password)>256 or extensions.crypt(p_password,v_hash)<>v_hash then
  return jsonb_build_object('error','Contraseña incorrecta. Inténtalo de nuevo.');
 end if;
 delete from private.admin_attempts where ip=v_ip;
 delete from private.admin_sessions where expires_at<=now();
 v_token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into private.admin_sessions values(encode(extensions.digest(v_token,'sha256'),'hex'),now()+interval '1 hour');
 return jsonb_build_object('token',v_token);
end $$;

create or replace function public.admin_estado(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_partida jsonb;
begin
 perform private.admin_check(p_token);
 select to_jsonb(p) into v_partida from public.partidas p where codigo='general';
 return v_partida;
end $$;

create or replace function public.admin_partida(p_token text,p_activa boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_partida public.partidas;
begin
 perform private.admin_check(p_token);
 if p_activa is null then raise exception 'Indica iniciar o terminar la partida.'; end if;
 select * into v_partida from public.partidas where codigo='general' for update;
 if not found then raise exception 'No se ha encontrado la partida general.'; end if;
 if v_partida.activa is distinct from p_activa then
  update public.partidas set activa=p_activa,
  iniciada_at=case when p_activa then now() else iniciada_at end,
  terminada_at=case when p_activa then null else now() end
  where id=v_partida.id returning * into v_partida;
 end if;
 return to_jsonb(v_partida);
end $$;

create or replace function public.admin_salir(p_token text) returns void
language sql security definer set search_path = '' as $$
 delete from private.admin_sessions where token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
$$;

-- Los controles se aplican también al servidor, incluso si se evita la interfaz.
create or replace function private.partida_abierta() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_activa boolean;
begin
 if tg_table_name='likes' then
  select partida_id into v_id from public.bloques where id=new.bloque_id;
 else v_id:=new.partida_id;
 end if;
 select activa into v_activa from public.partidas where id=v_id for share;
 if v_activa is distinct from true then raise exception 'Partida terminada. Espera a que el administrador la inicie.'; end if;
 return new;
end $$;
create trigger admin_gate_bloques before insert or update on public.bloques for each row execute function private.partida_abierta();
create trigger admin_gate_disparos before insert on public.disparos for each row execute function private.partida_abierta();
create trigger admin_gate_likes before insert on public.likes for each row execute function private.partida_abierta();
create trigger admin_gate_jugadores before insert on public.jugadores for each row execute function private.partida_abierta();
revoke execute on all functions in schema private from public,anon,authenticated;
revoke all on function public.admin_entrar(text),public.admin_estado(text),public.admin_partida(text,boolean),public.admin_salir(text) from public;
grant execute on function public.admin_entrar(text),public.admin_estado(text),public.admin_partida(text,boolean),public.admin_salir(text) to anon,authenticated;
revoke execute on function public.crear_partida(text,text) from public,anon,authenticated;
-- La administración debe ser la única vía de cambiar el estado.
revoke insert,update,delete on public.partidas from anon,authenticated;
notify pgrst,'reload schema';
commit;
