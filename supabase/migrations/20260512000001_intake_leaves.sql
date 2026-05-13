CREATE TABLE IF NOT EXISTS intake_leaves (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id   uuid NOT NULL REFERENCES intakes(id) ON DELETE CASCADE,
  date        date NOT NULL,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intake_id, date)
);

CREATE INDEX IF NOT EXISTS intake_leaves_intake_date_idx
  ON intake_leaves (intake_id, date);

ALTER TABLE intake_leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read intake_leaves"
  ON intake_leaves FOR SELECT TO authenticated USING (true);

CREATE POLICY "Instructors can manage intake_leaves"
  ON intake_leaves FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'instructor')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'instructor')
  );
