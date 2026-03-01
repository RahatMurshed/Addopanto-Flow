/**
 * Centralized status constants and union types.
 * Use these instead of raw strings throughout the codebase.
 */

export const STUDENT_STATUSES = ["active", "inactive", "graduated", "dropout", "inquiry"] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const PAYMENT_STATUSES = ["paid", "pending", "partial", "overdue", "cancelled"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_TYPES = ["admission", "monthly", "product", "custom"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const BATCH_STATUSES = ["active", "completed", "cancelled"] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export const PAYMENT_METHODS = ["cash", "bank_transfer", "online", "cheque", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const ENROLLMENT_STATUSES = ["active", "completed", "cancelled", "dropped"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const EMPLOYEE_STATUSES = ["active", "inactive", "terminated", "on_leave"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const PAYMENT_MODES = ["monthly", "one_time", "custom"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];
