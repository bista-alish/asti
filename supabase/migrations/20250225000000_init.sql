-- intakes
create table intakes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- modules
create table modules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  order_index integer,
  is_current boolean default false,
  created_at timestamptz default now()
);

-- students
create table students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  intake_id uuid references intakes(id),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- enrollments
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  module_id uuid references modules(id),
  enrolled_at timestamptz default now()
);

-- sessions
create table sessions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id),
  intake_id uuid references intakes(id),
  date date not null,
  created_at timestamptz default now()
);

-- attendance
create table attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id),
  student_id uuid references students(id),
  status text check (status in ('present', 'absent')) default 'absent',
  created_at timestamptz default now(),
  unique(session_id, student_id)
);
