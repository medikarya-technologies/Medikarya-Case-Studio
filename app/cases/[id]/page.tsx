'use client';

import { use, useState, useEffect, memo } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/case/StatusBadge';
import { BackButton } from '@/components/ui/BackButton';
import { Case, CustomField } from '@/lib/types';
import { Edit, AlertTriangle, CheckCircle2, XCircle, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchCaseById, fetchCurrentUser, approveCaseAction, requestChangesAction } from '@/app/actions/case-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
const ExportPDFButton = dynamic(
  () => import('@/components/pdf/ExportPDFButton').then((mod) => mod.ExportPDFButton),
  { ssr: false }
);
import { CaseComments } from '@/components/case/CaseComments';
import { AttachmentGallery } from '@/components/attachments/AttachmentGallery';
import type { User } from '@/lib/types';
import { getCaseCompleteness } from '@/lib/case-completeness';
import { ReviewHistoryTimeline } from '@/components/case/ReviewHistoryTimeline';
import { ApproveConfirmModal, RequestChangesModal } from '@/components/case/ReviewerActionDialogs';

const SectionCustomFields = memo(function SectionCustomFields({
  customFields,
  sectionId,
}: {
  customFields?: CustomField[];
  sectionId: string;
}) {
  const fields = customFields?.filter((cf) => cf.sectionId === sectionId) || [];
  if (fields.length === 0) return null;

  return (
    <div className="pt-4 border-t mt-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Case Custom Fields
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((cf) => (
          <div
            key={cf.id}
            className="p-3 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/40"
          >
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-foreground">{cf.label}</p>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/60 dark:text-amber-300 dark:border-amber-700"
              >
                Custom
              </Badge>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{cf.value || 'N/A'}</p>
          </div>
        ))}
      </div>
    </div>
  );
});

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoaded } = useUser();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRequestChangesOpen, setIsRequestChangesOpen] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const [caseData, user] = await Promise.all([fetchCaseById(id), fetchCurrentUser()]);
        if (caseData) setCaseData(caseData);
        setCurrentUser(user);
      } catch (e) {
        console.error('Error fetching case:', e);
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoaded) {
      fetchCase();
    }
  }, [id, isLoaded]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-40" />
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const reloadCase = async () => {
    try {
      const updated = await fetchCaseById(id);
      if (updated) setCaseData(updated);
    } catch (e) {
      console.error('Error reloading case:', e);
    }
  };

  const handleApproveConfirm = async () => {
    if (!caseData) return;
    setIsSubmittingReview(true);
    try {
      await approveCaseAction(caseData.id);
      toast.success('Case approved successfully');
      setIsApproveOpen(false);
      await reloadCase();
    } catch (e) {
      console.error('Error approving case:', e);
      toast.error('Failed to approve case');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleRequestChangesConfirm = async (commentsJsonString: string) => {
    if (!caseData) return;
    setIsSubmittingReview(true);
    try {
      await requestChangesAction(caseData.id, commentsJsonString);
      toast.success('Changes requested successfully');
      setIsRequestChangesOpen(false);
      await reloadCase();
    } catch (e) {
      console.error('Error requesting changes:', e);
      toast.error('Failed to request changes');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(`section-${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-amber-500', 'ring-offset-2');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-amber-500', 'ring-offset-2');
      }, 2500);
    }
  };

  if (!caseData) return <div>Case not found</div>;

  const canEdit = (caseData.status === 'draft' || caseData.status === 'changes_requested');
  const isReviewerOrAdmin = currentUser?.role === 'reviewer' || currentUser?.role === 'admin';
  const completeness = getCaseCompleteness(caseData);

  const backHref =
    currentUser?.role === 'admin'
      ? '/dashboard/admin/cases'
      : currentUser?.role === 'reviewer'
        ? '/dashboard/reviewer'
        : '/dashboard/author/cases';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <BackButton href={backHref} />

      {/* Reviewer Action Bar (Prominent at top when reviewing) */}
      {isReviewerOrAdmin && caseData.status === 'submitted' && (
        <Card className="border-2 border-primary/30 bg-primary/5 shadow-md">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                <span>Review Action Required</span>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                  {completeness.score}% Complete
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground">
                Review clinical content and either Approve or Request Changes with section feedback.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                className="text-amber-700 border-amber-400 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                onClick={() => setIsRequestChangesOpen(true)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Request Changes
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setIsApproveOpen(true)}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve Case
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incomplete Fields Summary Banner */}
      {completeness.incompleteItems.length > 0 && (
        <Card className="border-amber-400/50 bg-amber-50/60 dark:bg-amber-950/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-semibold text-sm">
                Incomplete or Thin Fields ({completeness.incompleteItems.length}) — Case is {completeness.score}% complete
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {completeness.incompleteItems.map((item, idx) => (
              <Button
                key={idx}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => scrollToSection(item.sectionId)}
                className="h-7 text-xs bg-background hover:bg-amber-100 dark:hover:bg-amber-900/60 border-amber-300 dark:border-amber-700 gap-1 text-amber-900 dark:text-amber-200"
              >
                <span>{item.sectionTitle}:</span>
                <span className="font-semibold">{item.fieldName}</span>
                <ArrowRight className="w-3 h-3 opacity-60" />
              </Button>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{caseData.title}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{caseData.specialty}</Badge>
                <Badge>{caseData.difficulty}</Badge>
                {caseData.tags?.map((tag, i) => (
                  <Badge key={i} variant="outline">{tag}</Badge>
                ))}
              </div>
              <p className="text-gray-500 mt-2">
                Created: {new Date(caseData.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
              <StatusBadge status={caseData.status} />
              <ExportPDFButton caseData={caseData} author={caseData.author} />
              {canEdit && (
                <Link href={`/cases/${id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Patient Details */}
          {caseData.patient_details && (
            <Card id="section-patient_details" className="transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Patient Details</CardTitle>
                  {completeness.isIncompleteSection('patient_details') && (
                    <Badge variant="outline" className="text-xs text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Incomplete
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {caseData.patient_details.patient_id && <div><p className="text-sm text-gray-500">Patient ID</p><p>{caseData.patient_details.patient_id}</p></div>}
                {caseData.patient_details.age && <div><p className="text-sm text-gray-500">Age</p><p>{caseData.patient_details.age}</p></div>}
                {caseData.patient_details.gender && <div><p className="text-sm text-gray-500">Gender</p><p>{caseData.patient_details.gender}</p></div>}
                {caseData.patient_details.occupation && <div><p className="text-sm text-gray-500">Occupation</p><p>{caseData.patient_details.occupation}</p></div>}
                {caseData.patient_details.location && <div><p className="text-sm text-gray-500">Location</p><p>{caseData.patient_details.location}</p></div>}
                {caseData.patient_details.presenting_date && <div><p className="text-sm text-gray-500">Presenting Date</p><p>{new Date(caseData.patient_details.presenting_date).toLocaleDateString()}</p></div>}
                <div className="col-span-2">
                  <SectionCustomFields customFields={caseData.custom_fields} sectionId="patient_details" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chief Complaint & HPI */}
          {caseData.chief_complaint_history && (
            <Card id="section-chief_complaint" className="transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Chief Complaint & History of Present Illness</CardTitle>
                  {completeness.isIncompleteSection('chief_complaint') && (
                    <Badge variant="outline" className="text-xs text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Incomplete
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div><p className="text-sm text-gray-500">Chief Complaint</p><p>{caseData.chief_complaint_history.chief_complaint}</p></div>
                {caseData.chief_complaint_history.hpi_duration && <div><p className="text-sm text-gray-500">Duration</p><p>{caseData.chief_complaint_history.hpi_duration}</p></div>}
                {caseData.chief_complaint_history.hpi_onset && <div><p className="text-sm text-gray-500">Onset</p><p>{caseData.chief_complaint_history.hpi_onset}</p></div>}
                {caseData.chief_complaint_history.hpi_aggravating && <div><p className="text-sm text-gray-500">Aggravating Factors</p><p>{caseData.chief_complaint_history.hpi_aggravating}</p></div>}
                {caseData.chief_complaint_history.hpi_relieving && <div><p className="text-sm text-gray-500">Relieving Factors</p><p>{caseData.chief_complaint_history.hpi_relieving}</p></div>}
                {caseData.chief_complaint_history.hpi_additional && <div><p className="text-sm text-gray-500">Additional History</p><p className="whitespace-pre-wrap">{caseData.chief_complaint_history.hpi_additional}</p></div>}
                {caseData.chief_complaint_history.associated_symptoms && <div><p className="text-sm text-gray-500">Associated Symptoms</p><p className="whitespace-pre-wrap">{caseData.chief_complaint_history.associated_symptoms}</p></div>}
                <SectionCustomFields customFields={caseData.custom_fields} sectionId="chief_complaint" />
              </CardContent>
            </Card>
          )}

          {/* Medical History */}
          <Card id="section-medical_history" className="transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Medical & Personal History</CardTitle>
                {completeness.isIncompleteSection('medical_history') && (
                  <Badge variant="outline" className="text-xs text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Incomplete
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {caseData.medical_history?.past_medical_history && caseData.medical_history.past_medical_history.length > 0 && (
                <div><p className="text-sm text-gray-500">Past Medical History</p><div className="flex flex-wrap gap-2 mt-1">{caseData.medical_history.past_medical_history.map((item, i) => <Badge key={i} variant="outline">{item}</Badge>)}</div>{caseData.medical_history.custom_medical_history && <p className="mt-2">{caseData.medical_history.custom_medical_history}</p>}</div>
              )}
              {caseData.medical_history?.family_history && <div><p className="text-sm text-gray-500">Family History</p><p className="whitespace-pre-wrap">{caseData.medical_history.family_history}</p></div>}
              {(caseData.medical_history?.social_history_smoking || caseData.medical_history?.social_history_alcohol || caseData.medical_history?.social_history_occupation) && (
                <div><p className="text-sm text-gray-500">Social History</p><div className="space-y-1">{caseData.medical_history.social_history_smoking && <p>Smoking: {caseData.medical_history.social_history_smoking}</p>}{caseData.medical_history.social_history_alcohol && <p>Alcohol: {caseData.medical_history.social_history_alcohol}</p>}{caseData.medical_history.social_history_occupation && <p>Occupation Risk: {caseData.medical_history.social_history_occupation}</p>}</div></div>
              )}
              {caseData.medical_history?.allergies && caseData.medical_history.allergies.length > 0 && (
                <div><p className="text-sm text-gray-500">Allergies</p><div className="flex flex-wrap gap-2 mt-1">{caseData.medical_history.allergies.map((item, i) => <Badge key={i} variant="outline">{item}</Badge>)}</div></div>
              )}
              <SectionCustomFields customFields={caseData.custom_fields} sectionId="medical_history" />
            </CardContent>
          </Card>

          {/* Current Medications */}
          {caseData.current_medications && caseData.current_medications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Current Medications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {caseData.current_medications.map((med, i) => (
                    <div key={i} className="border rounded-lg p-3">
                      <p className="font-semibold">{med.name}</p>
                      <p className="text-sm text-gray-500">{med.dose} • {med.frequency}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Review of Systems */}
          {caseData.review_of_systems && (
            <Card>
              <CardHeader>
                <CardTitle>Review of Systems</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {caseData.review_of_systems.constitutional && <div><p className="text-sm text-gray-500">Constitutional</p><p className="whitespace-pre-wrap">{caseData.review_of_systems.constitutional}</p></div>}
                {caseData.review_of_systems.cardiovascular && <div><p className="text-sm text-gray-500">Cardiovascular</p><p className="whitespace-pre-wrap">{caseData.review_of_systems.cardiovascular}</p></div>}
                {caseData.review_of_systems.respiratory && <div><p className="text-sm text-gray-500">Respiratory</p><p className="whitespace-pre-wrap">{caseData.review_of_systems.respiratory}</p></div>}
                {caseData.review_of_systems.gastrointestinal && <div><p className="text-sm text-gray-500">GI</p><p className="whitespace-pre-wrap">{caseData.review_of_systems.gastrointestinal}</p></div>}
                {caseData.review_of_systems.neurological && <div><p className="text-sm text-gray-500">Neurological</p><p className="whitespace-pre-wrap">{caseData.review_of_systems.neurological}</p></div>}
                {caseData.review_of_systems.musculoskeletal && <div><p className="text-sm text-gray-500">MSK</p><p className="whitespace-pre-wrap">{caseData.review_of_systems.musculoskeletal}</p></div>}
                {caseData.review_of_systems.dermatological && <div><p className="text-sm text-gray-500">Dermatological</p><p className="whitespace-pre-wrap">{caseData.review_of_systems.dermatological}</p></div>}
                {caseData.review_of_systems.psychiatric && <div><p className="text-sm text-gray-500">Psychiatric</p><p className="whitespace-pre-wrap">{caseData.review_of_systems.psychiatric}</p></div>}
                {caseData.review_of_systems.other && <div><p className="text-sm text-gray-500">Other</p><p className="whitespace-pre-wrap">{caseData.review_of_systems.other}</p></div>}
              </CardContent>
            </Card>
          )}

          {/* Examination Findings */}
          {caseData.examination_findings && (
            <Card id="section-examination" className="transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Examination Findings</CardTitle>
                  {completeness.isIncompleteSection('examination') && (
                    <Badge variant="outline" className="text-xs text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Incomplete
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {caseData.examination_findings.general_appearance && <div><p className="text-sm text-gray-500">General Appearance</p><p className="whitespace-pre-wrap">{caseData.examination_findings.general_appearance}</p></div>}
                <div>
                  <p className="text-sm text-gray-500">Vital Signs</p>
                  <div className="grid grid-cols-4 gap-4 mt-2">
                    {caseData.examination_findings.vital_signs?.bp_systolic && caseData.examination_findings.vital_signs?.bp_diastolic && <div><p className="text-xs text-gray-500">BP</p><p>{caseData.examination_findings.vital_signs.bp_systolic}/{caseData.examination_findings.vital_signs.bp_diastolic}</p></div>}
                    {caseData.examination_findings.vital_signs?.hr && <div><p className="text-xs text-gray-500">HR</p><p>{caseData.examination_findings.vital_signs.hr} bpm</p></div>}
                    {caseData.examination_findings.vital_signs?.rr && <div><p className="text-xs text-gray-500">RR</p><p>{caseData.examination_findings.vital_signs.rr}</p></div>}
                    {caseData.examination_findings.vital_signs?.temp && <div><p className="text-xs text-gray-500">Temp</p><p>{caseData.examination_findings.vital_signs.temp}°C</p></div>}
                    {caseData.examination_findings.vital_signs?.spo2 && <div><p className="text-xs text-gray-500">SpO2</p><p>{caseData.examination_findings.vital_signs.spo2}%</p></div>}
                    {caseData.examination_findings.vital_signs?.weight && <div><p className="text-xs text-gray-500">Weight</p><p>{caseData.examination_findings.vital_signs.weight} kg</p></div>}
                    {caseData.examination_findings.vital_signs?.height && <div><p className="text-xs text-gray-500">Height</p><p>{caseData.examination_findings.vital_signs.height} cm</p></div>}
                    {caseData.examination_findings.vital_signs?.bmi && <div><p className="text-xs text-gray-500">BMI</p><p>{caseData.examination_findings.vital_signs.bmi}</p></div>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   {caseData.examination_findings.systemic?.cardiovascular && <div><p className="text-sm text-gray-500">Cardiovascular</p><p className="whitespace-pre-wrap">{caseData.examination_findings.systemic.cardiovascular}</p></div>}
                  {caseData.examination_findings.systemic?.respiratory && <div><p className="text-sm text-gray-500">Respiratory</p><p className="whitespace-pre-wrap">{caseData.examination_findings.systemic.respiratory}</p></div>}
                  {caseData.examination_findings.systemic?.gastrointestinal && <div><p className="text-sm text-gray-500">GI</p><p className="whitespace-pre-wrap">{caseData.examination_findings.systemic.gastrointestinal}</p></div>}
                  {caseData.examination_findings.systemic?.neurological && <div><p className="text-sm text-gray-500">Neurological</p><p className="whitespace-pre-wrap">{caseData.examination_findings.systemic.neurological}</p></div>}
                  {caseData.examination_findings.systemic?.musculoskeletal && <div><p className="text-sm text-gray-500">MSK</p><p className="whitespace-pre-wrap">{caseData.examination_findings.systemic.musculoskeletal}</p></div>}
                  {caseData.examination_findings.systemic?.dermatological && <div><p className="text-sm text-gray-500">Dermatological</p><p className="whitespace-pre-wrap">{caseData.examination_findings.systemic.dermatological}</p></div>}
                  {caseData.examination_findings.systemic?.thyroid && <div><p className="text-sm text-gray-500">Thyroid</p><p className="whitespace-pre-wrap">{caseData.examination_findings.systemic.thyroid}</p></div>}
                </div>
                <SectionCustomFields customFields={caseData.custom_fields} sectionId="examination" />
              </CardContent>
            </Card>
          )}

          {/* Investigations */}
          {((caseData.investigations && caseData.investigations.length > 0) || (caseData.attachments && caseData.attachments.length > 0)) && (
            <Card id="section-investigations" className="transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Investigations & Reports</CardTitle>
                  {completeness.isIncompleteSection('investigations') && (
                    <Badge variant="outline" className="text-xs text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Incomplete
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {caseData.investigations && caseData.investigations.length > 0 && (
                  <div className="space-y-4">
                    {caseData.investigations.map((inv, i) => {
                      const invAttachments = caseData.attachments?.filter(
                        (a) => a.investigation_id === inv.id
                      ) || [];
                      return (
                        <Card key={i} className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{inv.test_name}</p>
                              <Badge variant="outline">{inv.type}</Badge>
                            </div>
                            {inv.date && <p className="text-sm text-gray-500">{new Date(inv.date).toLocaleDateString()}</p>}
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            {inv.result && <div><p className="text-sm text-gray-500">Result</p><p>{inv.result}</p></div>}
                            {inv.normal_range && <div><p className="text-sm text-gray-500">Normal Range</p><p>{inv.normal_range}</p></div>}
                          </div>
                          {inv.interpretation && <div className="mt-4"><p className="text-sm text-gray-500">Interpretation</p><p className="whitespace-pre-wrap">{inv.interpretation}</p></div>}
                          {inv.image_url && (
                            <div className="mt-4 border rounded-md overflow-hidden bg-gray-50 p-2 max-w-md mx-auto">
                              <p className="text-xs text-gray-500 mb-1">Attached Scan / Image</p>
                              <Image
                                src={inv.image_url}
                                alt={`${inv.test_name} scan`}
                                width={600}
                                height={400}
                                unoptimized
                                className="max-h-60 w-auto object-contain mx-auto rounded"
                              />
                            </div>
                          )}
                          {invAttachments.length > 0 && (
                            <div className="mt-4 pt-3 border-t">
                              <p className="text-xs font-semibold text-gray-500 mb-2">Linked Scans & Files</p>
                              <AttachmentGallery attachments={invAttachments} canDelete={false} />
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* All Case Attachments Gallery */}
                {caseData.attachments && caseData.attachments.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold text-sm mb-3">All Case Attachments & Reports</h4>
                    <AttachmentGallery
                      attachments={caseData.attachments}
                      canDelete={canEdit && (currentUser?.id === caseData.author_id || currentUser?.role === 'admin')}
                      onAttachmentDeleted={(deletedId) => {
                        setCaseData((prev) =>
                          prev
                            ? {
                                ...prev,
                                attachments: prev.attachments?.filter((a) => a.id !== deletedId),
                              }
                            : prev
                        );
                      }}
                    />
                  </div>
                )}
                <SectionCustomFields customFields={caseData.custom_fields} sectionId="investigations" />
              </CardContent>
            </Card>
          )}

          {/* Diagnosis & Management */}
          {caseData.diagnosis_management && (
            <Card id="section-diagnosis" className="transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Diagnosis & Management</CardTitle>
                  {completeness.isIncompleteSection('diagnosis') && (
                    <Badge variant="outline" className="text-xs text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Incomplete
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {caseData.diagnosis_management.provisional_diagnosis && <div><p className="text-sm text-gray-500">Provisional Diagnosis</p><p>{caseData.diagnosis_management.provisional_diagnosis}</p></div>}
                {caseData.diagnosis_management.differential_diagnoses && caseData.diagnosis_management.differential_diagnoses.length > 0 && <div><p className="text-sm text-gray-500">Differential Diagnoses</p><ul className="list-disc list-inside mt-1">{caseData.diagnosis_management.differential_diagnoses.map((ddx, i) => <li key={i}>{ddx}</li>)}</ul></div>}
                {caseData.diagnosis_management.final_diagnosis && <div><p className="text-sm text-gray-500">Final Diagnosis</p><p>{caseData.diagnosis_management.final_diagnosis}</p></div>}
                {caseData.diagnosis_management.treatment_plan && <div><p className="text-sm text-gray-500">Treatment Plan</p><p className="whitespace-pre-wrap">{caseData.diagnosis_management.treatment_plan}</p></div>}
                {caseData.diagnosis_management.medications_prescribed && caseData.diagnosis_management.medications_prescribed.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500">Medications Prescribed</p>
                    <div className="space-y-2 mt-1">
                      {caseData.diagnosis_management.medications_prescribed.map((med, i) => (
                        <div key={i} className="border rounded-lg p-3">
                          <p className="font-semibold">{med.drug}</p>
                          <p className="text-sm text-gray-500">{med.dose} • {med.frequency} • {med.duration}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {caseData.diagnosis_management.follow_up_plan && <div><p className="text-sm text-muted-foreground">Follow-up Plan</p><p className="whitespace-pre-wrap">{caseData.diagnosis_management.follow_up_plan}</p></div>}
                {caseData.diagnosis_management.prognosis && <div><p className="text-sm text-muted-foreground">Prognosis</p><p className="whitespace-pre-wrap">{caseData.diagnosis_management.prognosis}</p></div>}
                {caseData.diagnosis_management.outcome && (
                  <div>
                    <p className="text-sm text-muted-foreground">Outcome</p>
                    <p className="whitespace-pre-wrap">{caseData.diagnosis_management.outcome}</p>
                  </div>
                )}
                {caseData.diagnosis_management.reference_pdfs && caseData.diagnosis_management.reference_pdfs.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500 font-semibold mb-2">Attached References</p>
                    <div className="space-y-2">
                      {caseData.diagnosis_management.reference_pdfs.map((pdf, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <a href={pdf.url} target="_blank" rel="noopener noreferrer">
                            {pdf.filename || 'Scanned Report'}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <SectionCustomFields customFields={caseData.custom_fields} sectionId="diagnosis" />
              </CardContent>
            </Card>
          )}

          {/* Learning Points */}
          {caseData.learning_points && caseData.learning_points.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Learning Points</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2">
                  {caseData.learning_points.map((point, i) => <li key={i}>{point}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}

        </CardContent>
      </Card>

      {/* Review History Timeline for both Reviewers and Authors */}
      <ReviewHistoryTimeline reviews={caseData.reviews} onJumpToSection={scrollToSection} />

      {caseData.status !== 'draft' && <CaseComments caseId={id} />}

      {/* In-App Action Modals */}
      <ApproveConfirmModal
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        onConfirm={handleApproveConfirm}
        caseTitle={caseData.title}
        isSubmitting={isSubmittingReview}
      />
      <RequestChangesModal
        isOpen={isRequestChangesOpen}
        onClose={() => setIsRequestChangesOpen(false)}
        onConfirm={handleRequestChangesConfirm}
        caseTitle={caseData.title}
        isSubmitting={isSubmittingReview}
      />
    </div>
  );
}
