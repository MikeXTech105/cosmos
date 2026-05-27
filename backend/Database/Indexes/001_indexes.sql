create unique index if not exists ux_roles_role_name_active
    on cosmos.roles (lower(role_name))
    where is_deleted = false;

create unique index if not exists ux_users_email_active
    on cosmos.users (lower(email))
    where is_deleted = false;

create unique index if not exists ux_pages_route_path_active
    on cosmos.pages (lower(route_path))
    where is_deleted = false;

create unique index if not exists ux_sections_page_key_active
    on cosmos.sections (page_id, lower(section_key))
    where is_deleted = false;

create unique index if not exists ux_fields_section_key_active
    on cosmos.fields (section_id, lower(field_key))
    where is_deleted = false;

create unique index if not exists ux_refresh_tokens_token_hash
    on cosmos.refresh_tokens (token_hash)
    where is_deleted = false;

create unique index if not exists ux_role_permissions_scope_active
    on cosmos.role_permissions (
        role_id,
        coalesce(page_id, '00000000-0000-0000-0000-000000000000'::uuid),
        coalesce(section_id, '00000000-0000-0000-0000-000000000000'::uuid),
        coalesce(field_id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
    where is_deleted = false;
