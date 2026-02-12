import { z } from 'zod';

export const applicationStatuses = [
  'saved',
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];

export const ApplicationStatusSchema = z.enum(applicationStatuses);
