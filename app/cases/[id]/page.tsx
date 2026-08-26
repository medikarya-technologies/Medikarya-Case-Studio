'use client';

import { use, useState, useEffect, memo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/case/StatusBadge';
import { BackButton } from '@/components/ui/BackButton';
import { Case, CustomField } from '@/lib/types';
import { Edit, AlertTriangle, CheckCircle2, XCircle, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
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
import { RichTextRenderer } from '@/components/ui/RichTextRenderer';

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
                className="text-xs px-1.5 py-0 bg-amber-100 text-amber-950 border-amber-400 dark:bg-amber-950/80 dark:text-amber-100 dark:border-amber-700 font-medium"
              >
                Custom
              </Badge>
            </div>
            <RichTextRenderer content={cf.value || 'N/A'} />
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
  const [isLegacyExpanded, setIsLegacyExpanded] = useState(false);

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
            <Skeleton className="h-8 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
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

  const canEdit = caseData.status === 'draft' || caseData.status === 'changes_requested';
  const isReviewerOrAdmin = currentUser?.role === 'reviewer' || currentUser?.role === 'admin';
  const completeness = getCaseCompleteness(caseData);

  const backHref =
    currentUser?.role === 'admin'
      ? '/dashboard/admin/cases'
      : currentUser?.role === 'reviewer'
      ? '/dashboard/reviewer'
      : '/dashboard/author/cases';

  // Dynamic Local Examination Heading
  const localRegion = caseData.local_examination?.region?.trim() || caseData.examination_findings?.local?.location_extent?.trim() || '';
  const localTitle = localRegion ? `Local Examination (${localRegion})` : 'Local Examination';

  // Check if legacy data exists on old cases
  const hasLegacyData =
    Boolean(caseData.diagnosis_management?.treatment_plan) ||
    Boolean(caseData.diagnosis_management?.outcome) ||
    Boolean(caseData.learning_points && caseData.learning_points.length > 0) ||
    Boolean(caseData.current_medications && caseData.current_medications.length > 0) ||
    Boolean(caseData.review_of_systems && Object.values(caseData.review_of_systems).some(Boolean));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <BackButton href={backHref} />

      {/* Reviewer Action Bar */}
      {isReviewerOrAdmin && caseData.status === 'submitted' && (
        <Card className="border-2 border-primary/30 bg-primary/5 shadow-md">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                <span>Review Action Required</span>
                <Badge variant="secondary">{completeness.score}% Complete</Badge>
              </h3>
              <p className="text-xs text-muted-foreground">
                Review clinical content and either Approve or Request Changes.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                className="text-amber-800 border-amber-500 bg-amber-50 hover:bg-amber-600 hover:text-white"
                onClick={() => setIsRequestChangesOpen(true)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Request Changes
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setIsApproveOpen(true)}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve Case
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incomplete Fields Summary Banner */}
      {completeness.incompleteItems.length > 0 && (
        <Card className="border-amber-400/80 bg-amber-100/70 dark:bg-amber-950/70 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-950 dark:text-amber-100">
              <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0" />
              <span className="font-semibold text-sm">
                Incomplete Fields ({completeness.incompleteItems.length}) — Case is {completeness.score}% complete
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
                className="h-7 text-xs gap-1 text-amber-950 font-medium"
              >
                <span>{item.sectionTitle}:</span>
                <span className="font-semibold">{item.fieldName}</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-80" />
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
              <div className="text-sm text-muted-foreground mt-2 space-y-0.5">
                {caseData.original_author_name ? (
                  <>
                    <p><span className="font-semibold text-foreground">Written by:</span> {caseData.original_author_name}</p>
                    <p><span className="font-semibold text-foreground">Uploaded by:</span> {caseData.author?.name || 'Unknown'}</p>
                  </>
                ) : (
                  <p><span className="font-semibold text-foreground">Author:</span> {caseData.author?.name || 'Unknown'}</p>
                )}
                <p className="text-xs pt-1">Created: {new Date(caseData.created_at).toLocaleDateString()}</p>
              </div>
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
          {/* Section 1: Patient Details */}
          <Card id="section-patient_details">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>1. Patient Details</CardTitle>
                {completeness.isIncompleteSection('patient_details') && (
                  <Badge variant="outline" className="text-xs text-amber-950 bg-amber-100 border-amber-400">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Incomplete
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div><p className="text-xs text-muted-foreground">Case No.</p><p className="font-medium text-sm">{caseData.patient_details?.case_no || 'N/A'}</p></div>
              <div><p className="text-xs text-muted-foreground">Patient Name <span className="text-destructive">*</span></p><p className="font-semibold text-sm">{caseData.patient_details?.patient_name || 'N/A'}</p></div>
              <div><p className="text-xs text-muted-foreground">Age <span className="text-destructive">*</span></p><p className="font-medium text-sm">{caseData.patient_details?.age != null ? `${caseData.patient_details.age} yrs` : 'N/A'}</p></div>
              <div><p className="text-xs text-muted-foreground">Sex <span className="text-destructive">*</span></p><p className="font-medium text-sm capitalize">{caseData.patient_details?.sex || caseData.patient_details?.gender || 'N/A'}</p></div>
              <div><p className="text-xs text-muted-foreground">Religion</p><p className="font-medium text-sm">{caseData.patient_details?.religion || 'N/A'}</p></div>
              <div><p className="text-xs text-muted-foreground">Occupation</p><p className="font-medium text-sm">{caseData.patient_details?.occupation || 'N/A'}</p></div>
              <div><p className="text-xs text-muted-foreground">Address</p><p className="font-medium text-sm">{caseData.patient_details?.address || caseData.patient_details?.location || 'N/A'}</p></div>
              <div><p className="text-xs text-muted-foreground">Date of Admission</p><p className="font-medium text-sm">{caseData.patient_details?.date_of_admission || (caseData.patient_details?.presenting_date ? new Date(caseData.patient_details.presenting_date).toLocaleDateString() : 'N/A')}</p></div>
              <div className="col-span-2 sm:col-span-4">
                <SectionCustomFields customFields={caseData.custom_fields} sectionId="patient_details" />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: History */}
          <Card id="section-history">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>2. History</CardTitle>
                {completeness.isIncompleteSection('history') && (
                  <Badge variant="outline" className="text-xs text-amber-950 bg-amber-100 border-amber-400">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Incomplete
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Presenting Complaints <span className="text-destructive">*</span></p>
                <RichTextRenderer content={caseData.history?.presenting_complaints || caseData.chief_complaint_history?.chief_complaint || 'N/A'} className="mt-1" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">History of Present Illness <span className="text-destructive">*</span></p>
                <RichTextRenderer content={caseData.history?.history_of_present_illness || caseData.chief_complaint_history?.hpi_additional || 'N/A'} className="mt-1" />
              </div>
              {caseData.history?.past_history && (
                <div><p className="text-xs font-semibold text-muted-foreground uppercase">Past History</p><RichTextRenderer content={caseData.history.past_history} className="mt-1" /></div>
              )}
              {caseData.history?.personal_history && (
                <div><p className="text-xs font-semibold text-muted-foreground uppercase">Personal History</p><RichTextRenderer content={caseData.history.personal_history} className="mt-1" /></div>
              )}
              {caseData.history?.treatment_history && (
                <div><p className="text-xs font-semibold text-muted-foreground uppercase">Treatment History</p><RichTextRenderer content={caseData.history.treatment_history} className="mt-1" /></div>
              )}
              {caseData.history?.family_history && (
                <div><p className="text-xs font-semibold text-muted-foreground uppercase">Family History</p><RichTextRenderer content={caseData.history.family_history} className="mt-1" /></div>
              )}
              {caseData.history?.menstrual_history && (
                <div><p className="text-xs font-semibold text-muted-foreground uppercase">Menstrual History</p><RichTextRenderer content={caseData.history.menstrual_history} className="mt-1" /></div>
              )}
              {caseData.history?.obstetric_history && (
                <div><p className="text-xs font-semibold text-muted-foreground uppercase">Obstetric History</p><RichTextRenderer content={caseData.history.obstetric_history} className="mt-1" /></div>
              )}
              {caseData.history?.socio_economic_history && (
                <div><p className="text-xs font-semibold text-muted-foreground uppercase">Socio-economic History</p><RichTextRenderer content={caseData.history.socio_economic_history} className="mt-1" /></div>
              )}
              {caseData.history?.any_other && (
                <div><p className="text-xs font-semibold text-muted-foreground uppercase">Any Other Notes</p><RichTextRenderer content={caseData.history.any_other} className="mt-1" /></div>
              )}
              <SectionCustomFields customFields={caseData.custom_fields} sectionId="history" />
            </CardContent>
          </Card>

          {/* Section 3: General Physical Examination */}
          <Card id="section-general_physical_examination">
            <CardHeader><CardTitle>3. General Physical Examination</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {caseData.general_physical_examination?.consciousness_orientation && (
                  <div><p className="text-xs text-muted-foreground">Consciousness / Orientation</p><p className="font-medium text-sm">{caseData.general_physical_examination.consciousness_orientation}</p></div>
                )}
                {caseData.general_physical_examination?.pulse && (
                  <div><p className="text-xs text-muted-foreground">Pulse</p><p className="font-medium text-sm">{caseData.general_physical_examination.pulse}</p></div>
                )}
                {caseData.general_physical_examination?.bp && (
                  <div><p className="text-xs text-muted-foreground">Blood Pressure</p><p className="font-medium text-sm">{caseData.general_physical_examination.bp}</p></div>
                )}
                {caseData.general_physical_examination?.respiratory_rate && (
                  <div><p className="text-xs text-muted-foreground">Respiratory Rate</p><p className="font-medium text-sm">{caseData.general_physical_examination.respiratory_rate}</p></div>
                )}
                {caseData.general_physical_examination?.temperature && (
                  <div><p className="text-xs text-muted-foreground">Temperature</p><p className="font-medium text-sm">{caseData.general_physical_examination.temperature}</p></div>
                )}
                {caseData.general_physical_examination?.jvp && (
                  <div><p className="text-xs text-muted-foreground">JVP</p><p className="font-medium text-sm">{caseData.general_physical_examination.jvp}</p></div>
                )}
                {caseData.general_physical_examination?.pallor && (
                  <div><p className="text-xs text-muted-foreground">Pallor</p><p className="font-medium text-sm">{caseData.general_physical_examination.pallor}</p></div>
                )}
                {caseData.general_physical_examination?.cyanosis && (
                  <div><p className="text-xs text-muted-foreground">Cyanosis</p><p className="font-medium text-sm">{caseData.general_physical_examination.cyanosis}</p></div>
                )}
                {caseData.general_physical_examination?.icterus && (
                  <div><p className="text-xs text-muted-foreground">Icterus</p><p className="font-medium text-sm">{caseData.general_physical_examination.icterus}</p></div>
                )}
                {caseData.general_physical_examination?.peripheral_oedema && (
                  <div><p className="text-xs text-muted-foreground">Peripheral Oedema</p><p className="font-medium text-sm">{caseData.general_physical_examination.peripheral_oedema}</p></div>
                )}
                {caseData.general_physical_examination?.clubbing && (
                  <div><p className="text-xs text-muted-foreground">Clubbing</p><p className="font-medium text-sm">{caseData.general_physical_examination.clubbing}</p></div>
                )}
              </div>

              {/* Lymph Nodes Sub-fields */}
              {caseData.general_physical_examination?.lymph_nodes && (
                <div className="p-3 border rounded-md bg-muted/20 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Lymph Nodes</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div><span className="text-xs text-muted-foreground">Cervical: </span><span className="font-medium">{caseData.general_physical_examination.lymph_nodes.cervical || 'N/A'}</span></div>
                    <div><span className="text-xs text-muted-foreground">Axillary: </span><span className="font-medium">{caseData.general_physical_examination.lymph_nodes.axillary || 'N/A'}</span></div>
                    <div><span className="text-xs text-muted-foreground">Inguinal: </span><span className="font-medium">{caseData.general_physical_examination.lymph_nodes.inguinal || 'N/A'}</span></div>
                  </div>
                </div>
              )}

              {caseData.general_physical_examination?.other_significant_findings && (
                <div><p className="text-xs font-semibold text-muted-foreground uppercase">Other Significant Findings</p><RichTextRenderer content={caseData.general_physical_examination.other_significant_findings} className="mt-1" /></div>
              )}
              <SectionCustomFields customFields={caseData.custom_fields} sectionId="general_physical_examination" />
            </CardContent>
          </Card>

          {/* Section 4: Systemic Examination */}
          {caseData.systemic_examination && Object.values(caseData.systemic_examination).some(Boolean) && (
            <Card id="section-systemic_examination">
              <CardHeader><CardTitle>4. Systemic Examination</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {caseData.systemic_examination.respiratory_system && <div><p className="text-xs font-semibold text-muted-foreground uppercase">Respiratory System</p><RichTextRenderer content={caseData.systemic_examination.respiratory_system} className="mt-1" /></div>}
                {caseData.systemic_examination.cardiovascular_system && <div><p className="text-xs font-semibold text-muted-foreground uppercase">Cardiovascular System</p><RichTextRenderer content={caseData.systemic_examination.cardiovascular_system} className="mt-1" /></div>}
                {caseData.systemic_examination.nervous_system && <div><p className="text-xs font-semibold text-muted-foreground uppercase">Nervous System</p><RichTextRenderer content={caseData.systemic_examination.nervous_system} className="mt-1" /></div>}
                {caseData.systemic_examination.genito_urinary_system && <div><p className="text-xs font-semibold text-muted-foreground uppercase">Genito-Urinary System</p><RichTextRenderer content={caseData.systemic_examination.genito_urinary_system} className="mt-1" /></div>}
                {caseData.systemic_examination.gastrointestinal_system && <div><p className="text-xs font-semibold text-muted-foreground uppercase">Gastrointestinal System</p><RichTextRenderer content={caseData.systemic_examination.gastrointestinal_system} className="mt-1" /></div>}
                <SectionCustomFields customFields={caseData.custom_fields} sectionId="systemic_examination" />
              </CardContent>
            </Card>
          )}

          {/* Section 5: Local Examination */}
          {caseData.local_examination && Object.values(caseData.local_examination).some(Boolean) && (
            <Card id="section-local_examination">
              <CardHeader><CardTitle>5. {localTitle}</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {caseData.local_examination.inspection && <div><p className="text-xs font-semibold text-muted-foreground uppercase">Inspection</p><RichTextRenderer content={caseData.local_examination.inspection} className="mt-1" /></div>}
                {caseData.local_examination.palpation && <div><p className="text-xs font-semibold text-muted-foreground uppercase">Palpation</p><RichTextRenderer content={caseData.local_examination.palpation} className="mt-1" /></div>}
                {caseData.local_examination.percussion && <div><p className="text-xs font-semibold text-muted-foreground uppercase">Percussion</p><RichTextRenderer content={caseData.local_examination.percussion} className="mt-1" /></div>}
                {caseData.local_examination.auscultation && <div><p className="text-xs font-semibold text-muted-foreground uppercase">Auscultation</p><RichTextRenderer content={caseData.local_examination.auscultation} className="mt-1" /></div>}
                <div className="col-span-1 sm:col-span-2">
                  <SectionCustomFields customFields={caseData.custom_fields} sectionId="local_examination" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 6: Diagnosis */}
          <Card id="section-diagnosis">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>6. Diagnosis</CardTitle>
                {completeness.isIncompleteSection('diagnosis') && (
                  <Badge variant="outline" className="text-xs text-amber-950 bg-amber-100 border-amber-400">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Incomplete
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Provisional Diagnosis <span className="text-destructive">*</span></p>
                <RichTextRenderer content={caseData.diagnosis?.provisional_diagnosis || caseData.diagnosis_management?.provisional_diagnosis || caseData.diagnosis_management?.final_diagnosis || 'N/A'} className="mt-1" />
              </div>
              {caseData.diagnosis?.differential_diagnosis && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Differential Diagnosis</p>
                  <RichTextRenderer content={caseData.diagnosis.differential_diagnosis} className="mt-1" />
                </div>
              )}
              <SectionCustomFields customFields={caseData.custom_fields} sectionId="diagnosis" />
            </CardContent>
          </Card>

          {/* Section 7: Investigations */}
          <Card id="section-investigations">
            <CardHeader><CardTitle>7. Investigations</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {/* 7.1 Confirmation of Diagnosis */}
              <div className="p-4 border rounded-lg space-y-3 bg-muted/10">
                <h4 className="font-bold text-sm text-foreground">7.1 Investigations for Confirmation of Diagnosis</h4>
                <RichTextRenderer content={caseData.investigations_info?.investigations_confirmation || 'No written findings specified.'} />
                <div className="pt-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Confirmation Scans & Reports</p>
                  <AttachmentGallery
                    attachments={caseData.attachments?.filter((a) => a.investigation_group === 'confirmation') || []}
                    canDelete={canEdit && (currentUser?.id === caseData.author_id || currentUser?.role === 'admin')}
                  />
                </div>
              </div>

              {/* 7.2 Staging / Extent of Disease */}
              <div className="p-4 border rounded-lg space-y-3 bg-muted/10">
                <h4 className="font-bold text-sm text-foreground">7.2 Investigations for Determining Extent of Disease (Staging)</h4>
                <RichTextRenderer content={caseData.investigations_info?.investigations_staging || 'No written findings specified.'} />
                <div className="pt-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Staging Scans & Reports</p>
                  <AttachmentGallery
                    attachments={caseData.attachments?.filter((a) => a.investigation_group === 'staging') || []}
                    canDelete={canEdit && (currentUser?.id === caseData.author_id || currentUser?.role === 'admin')}
                  />
                </div>
              </div>

              {/* General Attachments */}
              {caseData.attachments && caseData.attachments.filter((a) => !a.investigation_group).length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">General Attachments</p>
                  <AttachmentGallery
                    attachments={caseData.attachments.filter((a) => !a.investigation_group)}
                    canDelete={canEdit && (currentUser?.id === caseData.author_id || currentUser?.role === 'admin')}
                  />
                </div>
              )}
              <SectionCustomFields customFields={caseData.custom_fields} sectionId="investigations" />
            </CardContent>
          </Card>

          {/* Collapsible Legacy Case Data Section */}
          {hasLegacyData && (
            <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/10">
              <CardHeader
                className="cursor-pointer flex flex-row items-center justify-between"
                onClick={() => setIsLegacyExpanded(!isLegacyExpanded)}
              >
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base text-amber-900 dark:text-amber-200">
                    Legacy Case Data
                  </CardTitle>
                  <Badge variant="outline" className="text-xs border-amber-400 text-amber-900">
                    Pre-consolidation Fields
                  </Badge>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isLegacyExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CardHeader>

              {isLegacyExpanded && (
                <CardContent className="space-y-4 pt-2 border-t text-sm">
                  {caseData.diagnosis_management?.treatment_plan && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Treatment / Management Plan</p>
                      <RichTextRenderer content={caseData.diagnosis_management.treatment_plan} className="mt-1" />
                    </div>
                  )}
                  {caseData.diagnosis_management?.outcome && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Outcome</p>
                      <RichTextRenderer content={caseData.diagnosis_management.outcome} className="mt-1" />
                    </div>
                  )}
                  {caseData.learning_points && caseData.learning_points.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Learning Points</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        {caseData.learning_points.map((pt, i) => (
                          <li key={i}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {caseData.current_medications && caseData.current_medications.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Current Medications</p>
                      <div className="space-y-1 mt-1">
                        {caseData.current_medications.map((m, i) => (
                          <p key={i} className="text-xs">• {m.name} — {m.dose} ({m.frequency})</p>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Review History Timeline */}
      <ReviewHistoryTimeline reviews={caseData.reviews} onJumpToSection={scrollToSection} />

      {caseData.status !== 'draft' && <CaseComments caseId={id} />}

      {/* Review Modals */}
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
