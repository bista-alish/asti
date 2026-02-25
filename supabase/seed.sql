-- modules
insert into modules (name, order_index, is_current) values
  ('Excel', 1, false),
  ('SQL', 2, true),
  ('Power BI', 3, false),
  ('Python', 4, false);

-- intake
insert into intakes (name, start_date, is_active) values
  ('Jan 2025', '2025-01-01', true);

-- students (linked to Jan 2025 intake)
-- use a subquery to get the intake id cleanly
insert into students (name, intake_id) 
select name, id from (values
  ('Lena Hoffmann'),
  ('Maximilian Bauer'),
  ('Amara Diallo'),
  ('Jonas Weber'),
  ('Sofia Rossi'),
  ('Tobias Schneider'),
  ('Yara Al-Hassan'),
  ('Finn Müller'),
  ('Chioma Okafor'),
  ('Elena Kovač')
) as s(name)
cross join (select id from intakes where name = 'Jan 2025') as i;

-- enrollments (enroll all students in all modules)
insert into enrollments (student_id, module_id)
select s.id, m.id
from students s
cross join modules m;
