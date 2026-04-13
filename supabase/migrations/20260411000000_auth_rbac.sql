-- ─────────────────────────────────────────────────────────────────
-- Auth + RBAC migration
-- Adds: profiles table, auto-create trigger, RLS on all tables,
--       helper function, and missing unique constraints.
-- ─────────────────────────────────────────────────────────────────

-- ── 1. profiles table ────────────────────────────────────────────
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'viewer'
                check (role in ('admin', 'instructor', 'viewer')),
  created_at  timestamptz default now()
);

-- ── 2. Auto-create profile on signup ─────────────────────────────
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  first_admin boolean;
begin
  -- Grant admin to the very first user if no admin exists yet
  select not exists (
    select 1 from profiles where role = 'admin'
  ) into first_admin;

  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when first_admin then 'admin' else 'viewer' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── 3. Helper: get current user's role ───────────────────────────
create or replace function get_user_role()
returns text
language sql
security definer stable
as $$
  select role from profiles where id = auth.uid();
$$;

-- ── 4. Missing unique constraints on existing tables ─────────────
alter table enrollments
  add constraint enrollments_student_module_key
  unique (student_id, module_id);

alter table sessions
  add constraint sessions_module_intake_date_key
  unique (module_id, intake_id, date);

-- ── 5. Enable RLS on all tables ──────────────────────────────────
alter table profiles    enable row level security;
alter table intakes     enable row level security;
alter table modules     enable row level security;
alter table students    enable row level security;
alter table enrollments enable row level security;
alter table sessions    enable row level security;
alter table attendance  enable row level security;

-- ── 6. RLS policies ──────────────────────────────────────────────

-- profiles: all authenticated users can read, only admins can write
create policy "profiles_select"
  on profiles for select
  to authenticated
  using (true);

create policy "profiles_update"
  on profiles for update
  to authenticated
  using (get_user_role() = 'admin')
  with check (get_user_role() = 'admin');

-- intakes
create policy "intakes_select"
  on intakes for select
  to authenticated
  using (true);

create policy "intakes_insert"
  on intakes for insert
  to authenticated
  with check (get_user_role() in ('admin', 'instructor'));

create policy "intakes_update"
  on intakes for update
  to authenticated
  using (get_user_role() in ('admin', 'instructor'))
  with check (get_user_role() in ('admin', 'instructor'));

create policy "intakes_delete"
  on intakes for delete
  to authenticated
  using (get_user_role() = 'admin');

-- modules
create policy "modules_select"
  on modules for select
  to authenticated
  using (true);

create policy "modules_insert"
  on modules for insert
  to authenticated
  with check (get_user_role() in ('admin', 'instructor'));

create policy "modules_update"
  on modules for update
  to authenticated
  using (get_user_role() in ('admin', 'instructor'))
  with check (get_user_role() in ('admin', 'instructor'));

create policy "modules_delete"
  on modules for delete
  to authenticated
  using (get_user_role() = 'admin');

-- students
create policy "students_select"
  on students for select
  to authenticated
  using (true);

create policy "students_insert"
  on students for insert
  to authenticated
  with check (get_user_role() in ('admin', 'instructor'));

create policy "students_update"
  on students for update
  to authenticated
  using (get_user_role() in ('admin', 'instructor'))
  with check (get_user_role() in ('admin', 'instructor'));

create policy "students_delete"
  on students for delete
  to authenticated
  using (get_user_role() = 'admin');

-- enrollments
create policy "enrollments_select"
  on enrollments for select
  to authenticated
  using (true);

create policy "enrollments_insert"
  on enrollments for insert
  to authenticated
  with check (get_user_role() in ('admin', 'instructor'));

create policy "enrollments_delete"
  on enrollments for delete
  to authenticated
  using (get_user_role() in ('admin', 'instructor'));

-- sessions
create policy "sessions_select"
  on sessions for select
  to authenticated
  using (true);

create policy "sessions_insert"
  on sessions for insert
  to authenticated
  with check (get_user_role() in ('admin', 'instructor'));

create policy "sessions_update"
  on sessions for update
  to authenticated
  using (get_user_role() in ('admin', 'instructor'))
  with check (get_user_role() in ('admin', 'instructor'));

create policy "sessions_delete"
  on sessions for delete
  to authenticated
  using (get_user_role() = 'admin');

-- attendance
create policy "attendance_select"
  on attendance for select
  to authenticated
  using (true);

create policy "attendance_insert"
  on attendance for insert
  to authenticated
  with check (get_user_role() in ('admin', 'instructor'));

create policy "attendance_update"
  on attendance for update
  to authenticated
  using (get_user_role() in ('admin', 'instructor'))
  with check (get_user_role() in ('admin', 'instructor'));

create policy "attendance_delete"
  on attendance for delete
  to authenticated
  using (get_user_role() = 'admin');
