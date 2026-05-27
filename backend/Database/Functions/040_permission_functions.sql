create or replace function cosmos.fn_permissions_upsert(
    p_role_id uuid,
    p_page_id uuid,
    p_section_id uuid,
    p_field_id uuid,
    p_can_view boolean,
    p_can_create boolean,
    p_can_edit boolean,
    p_can_delete boolean,
    p_can_full_access boolean,
    p_updated_by uuid)
returns void
language plpgsql
as $$
declare
    v_permission_key text;
begin
    v_permission_key := cosmos.fn_permission_base_key(p_page_id, p_section_id, p_field_id);

    insert into cosmos.role_permissions (
        role_id, page_id, section_id, field_id, permission_key,
        can_view, can_create, can_edit, can_delete, can_full_access,
        created_by, updated_by, updated_at)
    values (
        p_role_id, p_page_id, p_section_id, p_field_id, v_permission_key,
        p_can_view, p_can_create, p_can_edit, p_can_delete, p_can_full_access,
        p_updated_by, p_updated_by, timezone('utc', now()))
    on conflict (
        role_id,
        (coalesce(page_id, '00000000-0000-0000-0000-000000000000'::uuid)),
        (coalesce(section_id, '00000000-0000-0000-0000-000000000000'::uuid)),
        (coalesce(field_id, '00000000-0000-0000-0000-000000000000'::uuid))
    )
    where is_deleted = false
    do update set
        permission_key = excluded.permission_key,
        can_view = excluded.can_view,
        can_create = excluded.can_create,
        can_edit = excluded.can_edit,
        can_delete = excluded.can_delete,
        can_full_access = excluded.can_full_access,
        is_active = true,
        updated_at = timezone('utc', now()),
        updated_by = p_updated_by;
end;
$$;

create or replace function cosmos.fn_permissions_get_by_role(p_role_id uuid)
returns setof cosmos.role_permissions
language sql
as $$
    select *
    from cosmos.role_permissions
    where role_id = p_role_id
      and is_deleted = false
    order by permission_key;
$$;

create or replace function cosmos.fn_permissions_get_keys_by_user(p_user_id uuid)
returns table (permission_key text)
language sql
as $$
    select distinct key
    from cosmos.users u
    join cosmos.roles r on r.id = u.role_id and r.is_deleted = false and r.is_active = true
    join cosmos.role_permissions rp on rp.role_id = r.id and rp.is_deleted = false and rp.is_active = true
    cross join lateral (
        values
            (case when rp.can_view or rp.can_full_access then rp.permission_key || '_VIEW' end),
            (case when rp.can_create or rp.can_full_access then rp.permission_key || '_CREATE' end),
            (case when rp.can_edit or rp.can_full_access then rp.permission_key || '_EDIT' end),
            (case when rp.can_delete or rp.can_full_access then rp.permission_key || '_DELETE' end),
            (case when rp.can_full_access then rp.permission_key || '_FULL_ACCESS' end)
    ) as expanded(key)
    where u.id = p_user_id
      and u.is_deleted = false
      and u.is_active = true
      and expanded.key is not null;
$$;

create or replace function cosmos.fn_user_has_permission(p_user_id uuid, p_permission_key text)
returns boolean
language sql
as $$
    select exists (
        select 1
        from cosmos.fn_permissions_get_keys_by_user(p_user_id) k
        where k.permission_key = upper(p_permission_key)
    );
$$;
