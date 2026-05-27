create extension if not exists pgcrypto;

create schema if not exists cosmos;

create table if not exists cosmos.roles (
    id uuid primary key default gen_random_uuid(),
    role_name varchar(100) not null,
    description varchar(500) null,
    is_active boolean not null default true,
    is_deleted boolean not null default false,
    created_at timestamp not null default timezone('utc', now()),
    created_by uuid null,
    updated_at timestamp null,
    updated_by uuid null
);

create table if not exists cosmos.users (
    id uuid primary key default gen_random_uuid(),
    first_name varchar(100) not null,
    last_name varchar(100) not null,
    email varchar(256) not null,
    password_hash text not null,
    role_id uuid not null references cosmos.roles(id),
    is_active boolean not null default true,
    is_deleted boolean not null default false,
    created_at timestamp not null default timezone('utc', now()),
    created_by uuid null,
    updated_at timestamp null,
    updated_by uuid null
);

create table if not exists cosmos.pages (
    id uuid primary key default gen_random_uuid(),
    page_name varchar(150) not null,
    route_path varchar(300) not null,
    icon varchar(100) null,
    menu_group varchar(100) null,
    display_order integer not null default 0,
    show_in_menu boolean not null default true,
    is_active boolean not null default true,
    is_deleted boolean not null default false,
    created_at timestamp not null default timezone('utc', now()),
    created_by uuid null,
    updated_at timestamp null,
    updated_by uuid null
);

create table if not exists cosmos.sections (
    id uuid primary key default gen_random_uuid(),
    page_id uuid not null references cosmos.pages(id),
    section_name varchar(150) not null,
    section_key varchar(150) not null,
    is_active boolean not null default true,
    is_deleted boolean not null default false,
    created_at timestamp not null default timezone('utc', now()),
    created_by uuid null,
    updated_at timestamp null,
    updated_by uuid null
);

create table if not exists cosmos.fields (
    id uuid primary key default gen_random_uuid(),
    section_id uuid not null references cosmos.sections(id),
    field_name varchar(150) not null,
    field_key varchar(150) not null,
    field_type varchar(50) not null,
    is_active boolean not null default true,
    is_deleted boolean not null default false,
    created_at timestamp not null default timezone('utc', now()),
    created_by uuid null,
    updated_at timestamp null,
    updated_by uuid null
);

create table if not exists cosmos.role_permissions (
    id uuid primary key default gen_random_uuid(),
    role_id uuid not null references cosmos.roles(id),
    page_id uuid null references cosmos.pages(id),
    section_id uuid null references cosmos.sections(id),
    field_id uuid null references cosmos.fields(id),
    permission_key varchar(250) not null,
    can_view boolean not null default false,
    can_create boolean not null default false,
    can_edit boolean not null default false,
    can_delete boolean not null default false,
    can_full_access boolean not null default false,
    is_active boolean not null default true,
    is_deleted boolean not null default false,
    created_at timestamp not null default timezone('utc', now()),
    created_by uuid null,
    updated_at timestamp null,
    updated_by uuid null,
    constraint chk_role_permissions_target check (page_id is not null or section_id is not null or field_id is not null)
);

create table if not exists cosmos.refresh_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references cosmos.users(id),
    token_hash varchar(128) not null,
    expires_at timestamp not null,
    revoked_at timestamp null,
    is_active boolean not null default true,
    is_deleted boolean not null default false,
    created_at timestamp not null default timezone('utc', now()),
    created_by uuid null,
    updated_at timestamp null,
    updated_by uuid null
);
