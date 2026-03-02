-- 1. Make audit logs immutable - remove DELETE policy
DROP POLICY IF EXISTS "Only cipher users can delete audit logs" ON audit_logs;