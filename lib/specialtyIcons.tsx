import {
  Activity,
  Baby,
  Bone,
  Brain,
  Droplets,
  Heart,
  Stethoscope,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { MedicalSpecialty } from '@/lib/types';

const specialtyIconMap: Record<MedicalSpecialty, LucideIcon> = {
  cardiology: Heart,
  pulmonology: Wind,
  gastroenterology: Activity,
  neurology: Brain,
  orthopedics: Bone,
  dermatology: Droplets,
  emergency_medicine: Zap,
  family_medicine: Stethoscope,
  internal_medicine: Stethoscope,
  pediatrics: Baby,
  other: Activity,
};

export function getSpecialtyIcon(specialty: MedicalSpecialty | string): LucideIcon {
  return specialtyIconMap[specialty as MedicalSpecialty] ?? Activity;
}

interface SpecialtyIconBadgeProps {
  specialty: MedicalSpecialty | string;
  size?: 'sm' | 'md';
  className?: string;
}

export function SpecialtyIconBadge({ specialty, size = 'md', className = '' }: SpecialtyIconBadgeProps) {
  const Icon = getSpecialtyIcon(specialty);
  const box = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const icon = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div
      className={`${box} rounded-full bg-brand-muted flex items-center justify-center shrink-0 ${className}`}
      aria-hidden
    >
      <Icon className={`${icon} text-primary`} />
    </div>
  );
}

export function formatSpecialtyLabel(specialty?: string | null, customSpecialty?: string | null): string {
  if (!specialty) return 'General';
  if (specialty === 'other') {
    if (customSpecialty && customSpecialty.trim()) {
      return `Other — ${customSpecialty.trim()}`;
    }
    return 'Other';
  }
  return specialty.replace(/_/g, ' ');
}
