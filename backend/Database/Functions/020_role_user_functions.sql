create or replace function cosmos.fn_roles_get_all(p_search_term text, p_sort_by text, p_sort_direction text, p_page_number int, p_page_size int, p_is_active boolean)
returns table (
    total_count bigint,
    id uuid,
    role_name varchar,
    description varchar,
    is_active boolean,
    is_deleted boolean,
    created_at timestamp,
    created_by uuid,
    updated_at timestamp,
    updated_by uuid
)
language sql
as $$
    with filtered as (
        select *
        from cosmos.roles r
        where r.is_deleted = false
          and (p_is_active is null or r.is_active = p_is_active)
          and (coalesce(p_search_term, '') = '' or r.role_name ilike '%' || p_search_term || '%' or r.description ilike '%' || p_search_term || '%')
    )
    select count(*) over(), id, role_name, description, is_active, is_deleted, created_at, created_by, updated_at, updated_by
    from filtered
    order by
        case when lower(coalesce(p_sort_by, 'created_at')) = 'role_name' and lower(p_sort_direction) = 'asc' then role_name end asc,
        case when lower(coalesce(p_sort_by, 'created_at')) = 'role_name' and lower(p_sort_direction) = 'desc' then role_name end desc,
        created_at desc
    offset greatest((p_page_number - 1), 0) * p_page_size
    limit p_page_size;
$$;

create or replace function cosmos.fn_roles_get_by_id(p_id uuid)
returns setof cosmos.roles
language sql
as $$
    select * from cosmos.roles where id = p_id and is_deleted = false;
$$;

create or replace function cosmos.fn_roles_create(p_role_name varchar, p_description varchar, p_is_active boolean, p_created_by uuid)
returns uuid
language plpgsql
as $$
declare v_id uuid;
begin
    insert into cosmos.roles (role_name, description, is_active, created_by)
    values (upper(p_role_name), p_description, p_is_active, p_created_by)
    returning id into v_id;
    return v_id;
end;
$$;

create or replace function cosmos.fn_roles_update(p_id uuid, p_role_name varchar, p_description varchar, p_is_active boolean, p_updated_by uuid)
returns void
language plpgsql
as $$
begin
    update cosmos.roles
    set role_name = upper(p_role_name), description = p_description, is_active = p_is_active,
        updated_at = timezone('utc', now()), updated_by = p_updated_by
    where id = p_id and is_deleted = false;
end;
$$;

create or replace function cosmos.fn_roles_delete(p_id uuid, p_deleted_by uuid)
returns void
language plpgsql
as $$
begin
    update cosmos.roles
    set is_deleted = true, is_active = false, updated_at = timezone('utc', now()), updated_by = p_deleted_by
    where id = p_id and is_deleted = false;
end;
$$;

create or replace function cosmos.fn_users_get_all(p_search_term text, p_sort_by text, p_sort_direction text, p_page_number int, p_page_size int, p_is_active boolean, p_role_id uuid)
returns table (
    total_count bigint,
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
    with filtered as (
        select u.*, r.role_name
        from cosmos.users u
        join cosmos.roles r on r.id = u.role_id and r.is_deleted = false
        where u.is_deleted = false
          and (p_is_active is null or u.is_active = p_is_active)
          and (p_role_id is null or u.role_id = p_role_id)
          and (coalesce(p_search_term, '') = '' or u.first_name ilike '%' || p_search_term || '%' or u.last_name ilike '%' || p_search_term || '%' or u.email ilike '%' || p_search_term || '%')
    )
    select count(*) over(), id, first_name, last_name, email, password_hash, role_id, role_name, is_active, is_deleted, created_at, created_by, updated_at, updated_by
    from filtered
    order by
        case when lower(coalesce(p_sort_by, 'created_at')) = 'email' and lower(p_sort_direction) = 'asc' then email end asc,
        case when lower(coalesce(p_sort_by, 'created_at')) = 'email' and lower(p_sort_direction) = 'desc' then email end desc,
        created_at desc
    offset greatest((p_page_number - 1), 0) * p_page_size
    limit p_page_size;
$$;

create or replace function cosmos.fn_users_get_by_id(p_id uuid)
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
    where u.id = p_id and u.is_deleted = false;
$$;

create or replace function cosmos.fn_users_create(p_first_name varchar, p_last_name varchar, p_email varchar, p_password_hash text, p_role_id uuid, p_is_active boolean, p_created_by uuid)
returns uuid
language plpgsql
as $$
declare v_id uuid;
begin
    insert into cosmos.users (first_name, last_name, email, password_hash, role_id, is_active, created_by)
    values (p_first_name, p_last_name, lower(p_email), p_password_hash, p_role_id, p_is_active, p_created_by)
    returning id into v_id;
    return v_id;
end;
$$;

create or replace function cosmos.fn_users_update(p_id uuid, p_first_name varchar, p_last_name varchar, p_email varchar, p_role_id uuid, p_is_active boolean, p_updated_by uuid)
returns void
language plpgsql
as $$
begin
    update cosmos.users
    set first_name = p_first_name, last_name = p_last_name, email = lower(p_email), role_id = p_role_id,
        is_active = p_is_active, updated_at = timezone('utc', now()), updated_by = p_updated_by
    where id = p_id and is_deleted = false;
end;
$$;

create or replace function cosmos.fn_users_set_active(p_id uuid, p_is_active boolean, p_updated_by uuid)
returns void
language plpgsql
as $$
begin
    update cosmos.users
    set is_active = p_is_active, updated_at = timezone('utc', now()), updated_by = p_updated_by
    where id = p_id and is_deleted = false;
end;
$$;

create or replace function cosmos.fn_users_delete(p_id uuid, p_deleted_by uuid)
returns void
language plpgsql
as $$
begin
    update cosmos.users
    set is_deleted = true, is_active = false, updated_at = timezone('utc', now()), updated_by = p_deleted_by
    where id = p_id and is_deleted = false;
end;
$$;
