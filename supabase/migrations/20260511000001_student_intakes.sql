-- Junction table: one student can belong to multiple intakes
CREATE TABLE IF NOT EXISTS student_intakes (
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  intake_id  uuid NOT NULL REFERENCES intakes(id)  ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, intake_id)
);

ALTER TABLE student_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read student_intakes"
  ON student_intakes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Instructors can manage student_intakes"
  ON student_intakes FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'instructor')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Migrate existing single-intake assignments into the junction table
INSERT INTO student_intakes (student_id, intake_id)
SELECT id, intake_id FROM students WHERE intake_id IS NOT NULL
ON CONFLICT DO NOTHING;
