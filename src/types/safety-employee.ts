export type EmployeeTrainingType =
  | 'annual_safety'
  | 'work_at_height'
  | 'new_employee';

export interface SafetyClientEmployee {
  id: string;
  clientId: string;
  fullName: string;
  idNumber?: string;
  jobTitle?: string;
  phone?: string;
  email?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SafetyEmployeeTrainingRecord {
  id: string;
  employeeId: string;
  trainingType: EmployeeTrainingType;
  completedAt: string;
  expiresAt?: string;
  certificateNumber?: string;
  notes?: string;
  createdAt: string;
}

export const EMPLOYEE_TRAINING_DETAILS: Record<
  EmployeeTrainingType,
  { label: string; validityMonths?: number }
> = {
  annual_safety: { label: 'הדרכת בטיחות שנתית', validityMonths: 12 },
  work_at_height: { label: 'אישור הדרכה לעבודה בגובה', validityMonths: 24 },
  new_employee: { label: 'הדרכת עובד חדש / לפני תחילת עבודה' },
};

export function employeeTrainingLabel(type: EmployeeTrainingType): string {
  return EMPLOYEE_TRAINING_DETAILS[type].label;
}

export function defaultTrainingExpiry(
  type: EmployeeTrainingType,
  completedAt: string,
): string | undefined {
  const months = EMPLOYEE_TRAINING_DETAILS[type].validityMonths;
  if (!months || !completedAt) return undefined;
  const date = new Date(`${completedAt}T12:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}
