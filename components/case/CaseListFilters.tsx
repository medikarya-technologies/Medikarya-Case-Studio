'use client';

import { memo } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { MedicalSpecialty } from '@/lib/types';
import { formatSpecialtyLabel } from '@/lib/specialtyIcons';

const SPECIALTIES: MedicalSpecialty[] = [
  'cardiology',
  'pulmonology',
  'gastroenterology',
  'neurology',
  'orthopedics',
  'dermatology',
  'emergency_medicine',
  'family_medicine',
  'internal_medicine',
  'pediatrics',
  'other',
];

const STATUSES = ['draft', 'submitted', 'approved', 'changes_requested'] as const;

interface CaseListFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  specialty: string;
  onSpecialtyChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  addedFilter?: string;
  onAddedFilterChange?: (value: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export const CaseListFilters = memo(function CaseListFilters({
  search,
  onSearchChange,
  specialty,
  onSpecialtyChange,
  status,
  onStatusChange,
  addedFilter,
  onAddedFilterChange,
  onClear,
  hasActiveFilters,
}: CaseListFiltersProps) {
  const selectClass =
    'flex h-10 w-full sm:w-auto rounded-md border border-input bg-card px-3 py-2 text-sm min-w-[140px]';

  return (
    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
      <div className="relative flex-1 max-w-md min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by title…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <select
        value={specialty}
        onChange={(e) => onSpecialtyChange(e.target.value)}
        className={selectClass}
        aria-label="Filter by specialty"
      >
        <option value="all">All specialties</option>
        {SPECIALTIES.map((s) => (
          <option key={s} value={s}>
            {formatSpecialtyLabel(s)}
          </option>
        ))}
      </select>
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className={selectClass}
        aria-label="Filter by status"
      >
        <option value="all">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
      {onAddedFilterChange && addedFilter !== undefined && (
        <select
          value={addedFilter}
          onChange={(e) => onAddedFilterChange(e.target.value)}
          className={selectClass}
          aria-label="Filter by platform added status"
        >
          <option value="all">All Platform Status</option>
          <option value="not_added">Not Added (Backlog)</option>
          <option value="added">Added</option>
        </select>
      )}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="shrink-0">
          <X className="h-4 w-4 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  );
});

export function filterCases<T extends { title: string; specialty?: string; custom_specialty?: string | null; status: string; added_to_platform?: boolean }>(
  cases: T[],
  search: string,
  specialty: string,
  status: string,
  addedFilter: string = 'all'
): T[] {
  return cases.filter((c) => {
    const q = search.trim().toLowerCase();
    const customSpecialty = c.custom_specialty?.toLowerCase() || '';
    const matchesSearch =
      !q ||
      c.title.toLowerCase().includes(q) ||
      customSpecialty.includes(q);
    const matchesSpecialty =
      specialty === 'all' ||
      c.specialty === specialty ||
      (specialty === 'other' && (c.specialty === 'other' || customSpecialty.length > 0)) ||
      (customSpecialty.includes(specialty.toLowerCase()));
    const matchesStatus = status === 'all' || c.status === status;
    const matchesAdded =
      addedFilter === 'all'
        ? true
        : addedFilter === 'added'
        ? !!c.added_to_platform
        : !c.added_to_platform;
    return matchesSearch && matchesSpecialty && matchesStatus && matchesAdded;
  });
}
