ALTER TABLE students
  ADD COLUMN course_start_month text,
  ADD COLUMN course_end_month text;

UPDATE students SET course_start_month = billing_start_month WHERE course_start_month IS NULL;