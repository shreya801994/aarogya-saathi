export enum VisitStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

export interface Visit {
  id: string;
  patientName: string;
  symptoms: string;
  imageData?: string; // Base64 string
  aiAdvice: string;
  doctorRecommendation?: string;
  status: VisitStatus;
  timestamp: number;
}

export enum UserRole {
  NONE = 'NONE',
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
}

export type Language = 'en' | 'hi';

export enum ReminderType {
  MEDICATION = 'MEDICATION',
  VACCINE = 'VACCINE',
  APPOINTMENT = 'APPOINTMENT',
}

export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  time: string; // ISO date string or simple time string
}

export interface Alert {
  id: string;
  disease: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  date: string;
}