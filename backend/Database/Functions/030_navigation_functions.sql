create or replace function cosmos.fn_pages_get_all(p_search_term text, p_sort_by text, p_sort_direction text, p_page_number int, p_page_size int, p_is_active boolean)
returns table (total_count bigint, id uuid, page_name varchar, route_path varchar, icon varchar, menu_group varchar, display_order integer, show_in_menu boolean, is_active boolean, is_deleted boolean, created_at timestamp, created_by uuid, updated_at timestamp, updated_by uuid)
language sql
as $$
    with filtered as (
        select * from cosmos.pages p
        where p.is_deleted = false
          and (p_is_active is null or p.is_active = p_is_active)
          and (coalesce(p_search_term, '') = '' or p.page_name ilike '%' || p_search_term || '%' or p.route_path ilike '%' || p_search_term || '%')
    )
    select count(*) over(), id, page_name, route_path, icon, menu_group, display_order, show_in_menu, is_active, is_deleted, created_at, created_by, updated_at, updated_by
    from filtered
    order by display_order asc, created_at desc
    offset greatest((p_page_number - 1), 0) * p_page_size
    limit p_page_size;
$$;

create or replace function cosmos.fn_pages_get_by_id(p_id uuid)
returns setof cosmos.pages
language sql
as $$ select * from cosmos.pages where id = p_id and is_deleted = false; $$;

create or replace function cosmos.fn_pages_create(p_page_name varchar, p_route_path varchar, p_icon varchar, p_menu_group varchar, p_display_order integer, p_show_in_menu boolean, p_is_active boolean, p_created_by uuid)
returns uuid
language plpgsql
as $$
declare v_id uuid;
begin
    insert into cosmos.pages (page_name, route_path, icon, menu_group, display_order, show_in_menu, is_active, created_by)
    values (p_page_name, p_route_path, p_icon, p_menu_group, p_display_order, p_show_in_menu, p_is_active, p_created_by)
    returning id into v_id;
    return v_id;
end;
$$;

create or replace function cosmos.fn_pages_update(p_id uuid, p_page_name varchar, p_route_path varchar, p_icon varchar, p_menu_group varchar, p_display_order integer, p_show_in_menu boolean, p_is_active boolean, p_updated_by uuid)
returns void
language plpgsql
as $$
begin
    update cosmos.pages
    set page_name = p_page_name, route_path = p_route_path, icon = p_icon, menu_group = p_menu_group,
        display_order = p_display_order, show_in_menu = p_show_in_menu, is_active = p_is_active,
        updated_at = timezone('utc', now()), updated_by = p_updated_by
    where id = p_id and is_deleted = false;
end;
$$;

create or replace function cosmos.fn_pages_delete(p_id uuid, p_deleted_by uuid)
returns void
language plpgsql
as $$
begin
    update cosmos.pages set is_deleted = true, is_active = false, updated_at = timezone('utc', now()), updated_by = p_deleted_by
    where id = p_id and is_deleted = false;
end;
$$;

create or replace function cosmos.fn_sections_get_all(p_search_term text, p_sort_by text, p_sort_direction text, p_page_number int, p_page_size int, p_is_active boolean, p_page_id uuid)
returns table (total_count bigint, id uuid, page_id uuid, page_name varchar, section_name varchar, section_key varchar, is_active boolean, is_deleted boolean, created_at timestamp, created_by uuid, updated_at timestamp, updated_by uuid)
language sql
as $$
    with filtered as (
        select s.*, p.page_name
        from cosmos.sections s
        join cosmos.pages p on p.id = s.page_id and p.is_deleted = false
        where s.is_deleted = false
          and (p_page_id is null or s.page_id = p_page_id)
          and (p_is_active is null or s.is_active = p_is_active)
          and (coalesce(p_search_term, '') = '' or s.section_name ilike '%' || p_search_term || '%' or s.section_key ilike '%' || p_search_term || '%')
    )
    select count(*) over(), id, page_id, page_name, section_name, section_key, is_active, is_deleted, created_at, created_by, updated_at, updated_by
    from filtered
    order by created_at desc
    offset greatest((p_page_number - 1), 0) * p_page_size
    limit p_page_size;
$$;

create or replace function cosmos.fn_sections_get_by_id(p_id uuid)
returns table (id uuid, page_id uuid, page_name varchar, section_name varchar, section_key varchar, is_active boolean, is_deleted boolean, created_at timestamp, created_by uuid, updated_at timestamp, updated_by uuid)
language sql
as $$
    select s.id, s.page_id, p.page_name, s.section_name, s.section_key, s.is_active, s.is_deleted, s.created_at, s.created_by, s.updated_at, s.updated_by
    from cosmos.sections s
    join cosmos.pages p on p.id = s.page_id and p.is_deleted = false
    where s.id = p_id and s.is_deleted = false;
$$;

create or replace function cosmos.fn_sections_create(p_page_id uuid, p_section_name varchar, p_section_key varchar, p_is_active boolean, p_created_by uuid)
returns uuid
language plpgsql
as $$
declare v_id uuid;
begin
    insert into cosmos.sections (page_id, section_name, section_key, is_active, created_by)
    values (p_page_id, p_section_name, upper(p_section_key), p_is_active, p_created_by)
    returning id into v_id;
    return v_id;
end;
$$;

create or replace function cosmos.fn_sections_update(p_id uuid, p_page_id uuid, p_section_name varchar, p_section_key varchar, p_is_active boolean, p_updated_by uuid)
returns void
language plpgsql
as $$
begin
    update cosmos.sections
    set page_id = p_page_id, section_name = p_section_name, section_key = upper(p_section_key),
        is_active = p_is_active, updated_at = timezone('utc', now()), updated_by = p_updated_by
    where id = p_id and is_deleted = false;
end;
$$;

create or replace function cosmos.fn_sections_delete(p_id uuid, p_deleted_by uuid)
returns void
language plpgsql
as $$
begin
    update cosmos.sections set is_deleted = true, is_active = false, updated_at = timezone('utc', now()), updated_by = p_deleted_by
    where id = p_id and is_deleted = false;
end;
$$;

create or replace function cosmos.fn_fields_get_all(p_search_term text, p_sort_by text, p_sort_direction text, p_page_number int, p_page_size int, p_is_active boolean, p_section_id uuid)
returns table (total_count bigint, id uuid, section_id uuid, section_name varchar, field_name varchar, field_key varchar, field_type varchar, is_active boolean, is_deleted boolean, created_at timestamp, created_by uuid, updated_at timestamp, updated_by uuid)
language sql
as $$
    with filtered as (
        select f.*, s.section_name
        from cosmos.fields f
        join cosmos.sections s on s.id = f.section_id and s.is_deleted = false
        where f.is_deleted = false
          and (p_section_id is null or f.section_id = p_section_id)
          and (p_is_active is null or f.is_active = p_is_active)
          and (coalesce(p_search_term, '') = '' or f.field_name ilike '%' || p_search_term || '%' or f.field_key ilike '%' || p_search_term || '%')
    )
    select count(*) over(), id, section_id, section_name, field_name, field_key, field_type, is_active, is_deleted, created_at, created_by, updated_at, updated_by
    from filtered
    order by created_at desc
    offset greatest((p_page_number - 1), 0) * p_page_size
    limit p_page_size;
$$;

create or replace function cosmos.fn_fields_get_by_id(p_id uuid)
returns table (id uuid, section_id uuid, section_name varchar, field_name varchar, field_key varchar, field_type varchar, is_active boolean, is_deleted boolean, created_at timestamp, created_by uuid, updated_at timestamp, updated_by uuid)
language sql
as $$
    select f.id, f.section_id, s.section_name, f.field_name, f.field_key, f.field_type, f.is_active, f.is_deleted, f.created_at, f.created_by, f.updated_at, f.updated_by
    from cosmos.fields f
    join cosmos.sections s on s.id = f.section_id and s.is_deleted = false
    where f.id = p_id and f.is_deleted = false;
$$;

create or replace function cosmos.fn_fields_create(p_section_id uuid, p_field_name varchar, p_field_key varchar, p_field_type varchar, p_is_active boolean, p_created_by uuid)
returns uuid
language plpgsql
as $$
declare v_id uuid;
begin
    insert into cosmos.fields (section_id, field_name, field_key, field_type, is_active, created_by)
    values (p_section_id, p_field_name, upper(p_field_key), p_field_type, p_is_active, p_created_by)
    returning id into v_id;
    return v_id;
end;
$$;

create or replace function cosmos.fn_fields_update(p_id uuid, p_section_id uuid, p_field_name varchar, p_field_key varchar, p_field_type varchar, p_is_active boolean, p_updated_by uuid)
returns void
language plpgsql
as $$
begin
    update cosmos.fields
    set section_id = p_section_id, field_name = p_field_name, field_key = upper(p_field_key), field_type = p_field_type,
        is_active = p_is_active, updated_at = timezone('utc', now()), updated_by = p_updated_by
    where id = p_id and is_deleted = false;
end;
$$;

create or replace function cosmos.fn_fields_delete(p_id uuid, p_deleted_by uuid)
returns void
language plpgsql
as $$
begin
    update cosmos.fields set is_deleted = true, is_active = false, updated_at = timezone('utc', now()), updated_by = p_deleted_by
    where id = p_id and is_deleted = false;
end;
$$;
