ALTER TABLE intakes
  ADD COLUMN IF NOT EXISTS time_slot text NOT NULL DEFAULT 'morning'
    CHECK (time_slot IN ('morning', 'night'));

CREATE INDEX IF NOT EXISTS intakes_time_slot_idx ON intakes (time_slot);
