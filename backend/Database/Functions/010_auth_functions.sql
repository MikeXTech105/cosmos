create or replace function cosmos.fn_auth_get_user_by_email(p_email varchar)
returns table (
    id uuid,
    first_name varchar,
    last_name varchar,
    email varchar,
    password_hash text,
    role_id uuid,
    role_name varchar,
    is_active boolean,
    is_deleted boolean,
    created_at timestamp,
    created_by uuid,
    updated_at timestamp,
    updated_by uuid
)
language sql
as $$
    select u.id, u.first_name, u.last_name, u.email, u.password_hash, u.role_id, r.role_name,
           u.is_active, u.is_deleted, u.created_at, u.created_by, u.updated_at, u.updated_by
    from cosmos.users u
    join cosmos.roles r on r.id = u.role_id and r.is_deleted = false
    where lower(u.email) = lower(p_email)
      and u.is_deleted = false;
$$;

create or replace function cosmos.fn_refresh_tokens_create(p_user_id uuid, p_token_hash varchar, p_expires_at timestamp, p_created_by uuid)
returns uuid
language plpgsql
as $$
declare
    v_id uuid;
begin
    insert into cosmos.refresh_tokens (user_id, token_hash, expires_at, created_by)
    values (p_user_id, p_token_hash, p_expires_at, p_created_by)
    returning id into v_id;
    return v_id;
end;
$$;

create or replace function cosmos.fn_refresh_tokens_get(p_token_hash varchar)
returns table (
    id uuid,
    user_id uuid,
    token_hash varchar,
    expires_at timestamp,
    revoked_at timestamp,
    is_active boolean,
    is_deleted boolean,
    created_at timestamp,
    created_by uuid,
    updated_at timestamp,
    updated_by uuid
)
language sql
as $$
    select id, user_id, token_hash, expires_at, revoked_at, is_active, is_deleted, created_at, created_by, updated_at, updated_by
    from cosmos.refresh_tokens
    where token_hash = p_token_hash and is_deleted = false;
$$;

create or replace function cosmos.fn_refresh_tokens_revoke(p_token_hash varchar, p_updated_by uuid)
returns void
language plpgsql
as $$
begin
    update cosmos.refresh_tokens
    set revoked_at = timezone('utc', now()),
        updated_at = timezone('utc', now()),
        updated_by = p_updated_by,
        is_active = false
    where token_hash = p_token_hash
      and is_deleted = false
      and revoked_at is null;
end;
$$;
