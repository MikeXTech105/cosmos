do $$
declare
    v_role_id uuid;
    v_admin_id uuid;
    v_page_id uuid;
begin
    insert into cosmos.roles (role_name, description, is_active)
    values ('MASTER_ADMIN', 'Built-in master administrator role with full system access.', true)
    on conflict ((lower(role_name))) where is_deleted = false do update
        set description = excluded.description,
            is_active = true,
            updated_at = timezone('utc', now())
    returning id into v_role_id;

    select id into v_role_id from cosmos.roles where role_name = 'MASTER_ADMIN' and is_deleted = false;

    insert into cosmos.users (first_name, last_name, email, password_hash, role_id, is_active)
    values ('Master', 'Admin', 'admin@cosmos.com', crypt('Admin@123', gen_salt('bf', 12)), v_role_id, true)
    on conflict ((lower(email))) where is_deleted = false do update
        set role_id = excluded.role_id,
            is_active = true,
            updated_at = timezone('utc', now())
    returning id into v_admin_id;

    for v_page_id in
        insert into cosmos.pages (page_name, route_path, icon, menu_group, display_order, show_in_menu)
        values
            ('Users', '/users', 'users', 'Administration', 10, true),
            ('Roles', '/roles', 'shield', 'Administration', 20, true),
            ('Pages', '/pages', 'panel-top', 'Authorization', 30, true),
            ('Sections', '/sections', 'layout-list', 'Authorization', 40, true),
            ('Fields', '/fields', 'list-checks', 'Authorization', 50, true),
            ('Permissions', '/permissions', 'lock-keyhole', 'Authorization', 60, true)
        on conflict ((lower(route_path))) where is_deleted = false do update
            set page_name = excluded.page_name,
                icon = excluded.icon,
                menu_group = excluded.menu_group,
                display_order = excluded.display_order,
                show_in_menu = excluded.show_in_menu,
                is_active = true,
                updated_at = timezone('utc', now())
        returning id
    loop
        perform cosmos.fn_permissions_upsert(v_role_id, v_page_id, null, null, true, true, true, true, true, v_admin_id);
    end loop;
end $$;
