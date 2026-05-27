create or replace function cosmos.fn_normalize_key(p_value text)
returns text
language sql
immutable
as $$
    select regexp_replace(upper(trim(coalesce(p_value, ''))), '[^A-Z0-9]+', '_', 'g');
$$;

create or replace function cosmos.fn_permission_base_key(p_page_id uuid, p_section_id uuid, p_field_id uuid)
returns text
language plpgsql
as $$
declare
    v_key text;
begin
    if p_field_id is not null then
        select cosmos.fn_normalize_key(field_key) || '_FIELD' into v_key
        from cosmos.fields
        where id = p_field_id and is_deleted = false;
    elsif p_section_id is not null then
        select cosmos.fn_normalize_key(section_key) into v_key
        from cosmos.sections
        where id = p_section_id and is_deleted = false;
    elsif p_page_id is not null then
        select cosmos.fn_normalize_key(page_name) || '_PAGE' into v_key
        from cosmos.pages
        where id = p_page_id and is_deleted = false;
    end if;

    if v_key is null then
        raise exception 'Permission target was not found.';
    end if;

    return v_key;
end;
$$;
