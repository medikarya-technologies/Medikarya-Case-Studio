'use client';

import { use, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/case/StatusBadge';
import { BackButton } from '@/components/ui/BackButton';
import { Case } from '@/lib/types';
import { Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchCaseById, fetchCurrentUser } from '@/app/actions/case-actions';
import { Skeleton } from '@/components/ui/skeleton';
const ExportPDFButton = dynamic(
  () => import('@/components/pdf/ExportPDFButton').then((mod) => mod.ExportPDFButton),
  { ssr: false }
);
import { CaseComments } from '@/components/case/CaseComments';
import { AttachmentGallery } from '@/components/attachments/AttachmentGallery';
import type { User } from '@/lib/types';

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoaded } = useUser();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  if (!caseData) return <div>Case not found</div>;

  const canEdit = (caseData.status === 'draft' || caseData.status === 'changes_requested');

  const backHref =
    currentUser?.role === 'admin'
      ? '/dashboard/admin/cases'
      : currentUser?.role === 'reviewer'
        ? '/dashboard/reviewer'
        : '/dashboard/author/cases';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <BackButton href={backHref} />

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
            <Card>
              <CardHeader>
                <CardTitle>Patient Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {caseData.patient_details.patient_id && <div><p className="text-sm text-gray-500">Patient ID</p><p>{caseData.patient_details.patient_id}</p></div>}
                {caseData.patient_details.age && <div><p className="text-sm text-gray-500">Age</p><p>{caseData.patient_details.age}</p></div>}
                {caseData.patient_details.gender && <div><p className="text-sm text-gray-500">Gender</p><p>{caseData.patient_details.gender}</p></div>}
                {caseData.patient_details.occupation && <div><p className="text-sm text-gray-500">Occupation</p><p>{caseData.patient_details.occupation}</p></div>}
                {caseData.patient_details.location && <div><p className="text-sm text-gray-500">Location</p><p>{caseData.patient_details.location}</p></div>}
                {caseData.patient_details.presenting_date && <div><p className="text-sm text-gray-500">Presenting Date</p><p>{new Date(caseData.patient_details.presenting_date).toLocaleDateString()}</p></div>}
              </CardContent>
            </Card>
          )}

          {/* Chief Complaint & HPI */}
          {caseData.chief_complaint_history && (
            <Card>
              <CardHeader>
                <CardTitle>Chief Complaint & History of Present Illness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div><p className="text-sm text-gray-500">Chief Complaint</p><p>{caseData.chief_complaint_history.chief_complaint}</p></div>
                {caseData.chief_complaint_history.hpi_duration && <div><p className="text-sm text-gray-500">Duration</p><p>{caseData.chief_complaint_history.hpi_duration}</p></div>}
                {caseData.chief_complaint_history.hpi_onset && <div><p className="text-sm text-gray-500">Onset</p><p>{caseData.chief_complaint_history.hpi_onset}</p></div>}
                {caseData.chief_complaint_history.hpi_aggravating && <div><p className="text-sm text-gray-500">Aggravating Factors</p><p>{caseData.chief_complaint_history.hpi_aggravating}</p></div>}
                {caseData.chief_complaint_history.hpi_relieving && <div><p className="text-sm text-gray-500">Relieving Factors</p><p>{caseData.chief_complaint_history.hpi_relieving}</p></div>}
                {caseData.chief_complaint_history.hpi_additional && <div><p className="text-sm text-gray-500">Additional History</p><p className="whitespace-pre-wrap">{caseData.chief_complaint_history.hpi_additional}</p></div>}
                {caseData.chief_complaint_history.associated_symptoms && <div><p className="text-sm text-gray-500">Associated Symptoms</p><p className="whitespace-pre-wrap">{caseData.chief_complaint_history.associated_symptoms}</p></div>}
              </CardContent>
            </Card>
          )}

          {/* Medical History */}
          <Card>
            <CardHeader>
              <CardTitle>Medical & Personal History</CardTitle>
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
            <Card>
              <CardHeader>
                <CardTitle>Examination Findings</CardTitle>
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
              </CardContent>
            </Card>
          )}

          {/* Investigations */}
          {((caseData.investigations && caseData.investigations.length > 0) || (caseData.attachments && caseData.attachments.length > 0)) && (
            <Card>
              <CardHeader>
                <CardTitle>Investigations & Reports</CardTitle>
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
                              <img
                                src={inv.image_url}
                                alt={`${inv.test_name} scan`}
                                className="max-h-60 w-auto object-contain mx-auto rounded"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
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
              </CardContent>
            </Card>
          )}

          {/* Diagnosis & Management */}
          {caseData.diagnosis_management && (
            <Card>
              <CardHeader>
                <CardTitle>Diagnosis & Management</CardTitle>
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

      {caseData.status !== 'draft' && <CaseComments caseId={id} />}
    </div>
  );
}
