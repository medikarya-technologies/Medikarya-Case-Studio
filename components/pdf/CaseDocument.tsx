import { Document, Page, Text, View, StyleSheet, Image, Link } from '@react-pdf/renderer';
import type { Case, User, CustomField } from '@/lib/types';
import type { ResolvedImageMap } from '@/app/actions/attachment-actions';
import { formatSpecialtyLabel } from '@/lib/specialtyIcons';
import { PDFRichText } from './PDFRichText';

function PDFCustomFields({
  customFields,
  sectionId,
}: {
  customFields?: CustomField[];
  sectionId: string;
}) {
  const fields = customFields?.filter((cf) => cf.sectionId === sectionId) || [];
  if (fields.length === 0) return null;

  return (
    <View style={{ marginTop: 6, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: '#cbd5e1' }}>
      {fields.map((cf, idx) => (
        <View key={idx} style={{ marginBottom: 6 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', color: '#475569', fontSize: 8.5, marginBottom: 2 }}>
            {cf.label} [Custom]:
          </Text>
          <PDFRichText content={cf.value || 'N/A'} primaryColor={pdfTheme.colors.primary} />
        </View>
      ))}
    </View>
  );
}

const pdfTheme = {
  colors: {
    primary: '#064e3b',       // Forest Green
    textPrimary: '#1e293b',   // Dark Slate
    textSecondary: '#475569', // Slate Gray
    border: '#cbd5e1',        // Slate Border
    borderLight: '#e2e8f0',   // Light gray
    bgNeutral: '#f8fafc',     // Slate-50
    highlightGreen: '#15803d',// Primary green-700
    bgHighlightGreen: '#f0fdf4',
  },
  fonts: {
    title: 'Times-Bold',
    header: 'Times-Bold',
    body: 'Helvetica',
    bodyBold: 'Helvetica-Bold',
  },
  spacing: {
    pagePaddingTop: 60,
    pagePaddingBottom: 65,
    pagePaddingHorizontal: 40,
    sectionGap: 16,
    elementGap: 6,
  },
};

const styles = StyleSheet.create({
  page: {
    paddingTop: pdfTheme.spacing.pagePaddingTop,
    paddingBottom: pdfTheme.spacing.pagePaddingBottom,
    paddingHorizontal: pdfTheme.spacing.pagePaddingHorizontal,
    fontSize: 9.5,
    fontFamily: pdfTheme.fonts.body,
    color: pdfTheme.colors.textPrimary,
    lineHeight: 1.45,
  },
  runningHeader: {
    position: 'absolute',
    top: 25,
    left: pdfTheme.spacing.pagePaddingHorizontal,
    right: pdfTheme.spacing.pagePaddingHorizontal,
    borderBottomWidth: 0.5,
    borderBottomColor: pdfTheme.colors.border,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  runningHeaderText: {
    fontSize: 7.5,
    fontFamily: pdfTheme.fonts.body,
    color: pdfTheme.colors.textSecondary,
  },
  runningHeaderBranding: {
    fontSize: 7.5,
    fontFamily: pdfTheme.fonts.bodyBold,
    color: pdfTheme.colors.primary,
  },
  runningFooter: {
    position: 'absolute',
    bottom: 30,
    left: pdfTheme.spacing.pagePaddingHorizontal,
    right: pdfTheme.spacing.pagePaddingHorizontal,
    borderTopWidth: 0.5,
    borderTopColor: pdfTheme.colors.border,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  runningFooterText: {
    fontSize: 7.5,
    fontFamily: pdfTheme.fonts.body,
    color: pdfTheme.colors.textSecondary,
  },
  runningFooterPage: {
    fontSize: 7.5,
    fontFamily: pdfTheme.fonts.bodyBold,
    color: pdfTheme.colors.textSecondary,
  },
  banner: {
    borderBottomWidth: 2,
    borderBottomColor: pdfTheme.colors.primary,
    paddingBottom: 8,
    marginBottom: 14,
  },
  bannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  brandText: {
    fontSize: 10,
    fontFamily: pdfTheme.fonts.bodyBold,
    color: pdfTheme.colors.primary,
    letterSpacing: 1,
  },
  reportType: {
    fontSize: 9,
    fontFamily: pdfTheme.fonts.bodyBold,
    color: pdfTheme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  caseTitle: {
    fontSize: 20,
    fontFamily: pdfTheme.fonts.title,
    color: pdfTheme.colors.primary,
    lineHeight: 1.25,
    marginBottom: 4,
  },
  caseMeta: {
    fontSize: 8.5,
    color: pdfTheme.colors.textSecondary,
    fontFamily: pdfTheme.fonts.body,
  },
  demographicsBox: {
    borderWidth: 1,
    borderColor: pdfTheme.colors.border,
    borderRadius: 4,
    backgroundColor: pdfTheme.colors.bgNeutral,
    padding: 10,
    marginBottom: 14,
  },
  demographicsTitle: {
    fontSize: 9,
    fontFamily: pdfTheme.fonts.bodyBold,
    color: pdfTheme.colors.primary,
    borderBottomWidth: 0.5,
    borderBottomColor: pdfTheme.colors.border,
    paddingBottom: 4,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCol: {
    width: '50%',
    paddingVertical: 2,
    flexDirection: 'row',
  },
  gridLabel: {
    width: '40%',
    fontFamily: pdfTheme.fonts.bodyBold,
    fontSize: 8.5,
    color: pdfTheme.colors.textSecondary,
  },
  gridValue: {
    width: '60%',
    fontSize: 8.5,
    color: pdfTheme.colors.textPrimary,
  },
  sectionContainer: {
    marginBottom: pdfTheme.spacing.sectionGap,
  },
  sectionTitle: {
    fontFamily: pdfTheme.fonts.header,
    fontSize: 11.5,
    color: pdfTheme.colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: pdfTheme.colors.primary,
    paddingBottom: 2,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    paddingLeft: 2,
  },
  paragraph: {
    marginBottom: 6,
  },
  boldLabel: {
    fontFamily: pdfTheme.fonts.bodyBold,
    color: pdfTheme.colors.textSecondary,
  },
  imageRowContainer: {
    padding: 8,
    backgroundColor: pdfTheme.colors.bgNeutral,
    borderBottomWidth: 1,
    borderBottomColor: pdfTheme.colors.border,
    alignItems: 'center',
    marginVertical: 4,
  },
  imageLabel: {
    fontSize: 7.5,
    fontFamily: pdfTheme.fonts.bodyBold,
    color: pdfTheme.colors.textSecondary,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  investigationImage: {
    maxHeight: 220,
    maxWidth: '95%',
    objectFit: 'contain',
    borderRadius: 4,
  },
  approvalBox: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1.5,
    borderColor: pdfTheme.colors.highlightGreen,
    borderRadius: 4,
    backgroundColor: pdfTheme.colors.bgHighlightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvalHeader: {
    fontSize: 10,
    fontFamily: pdfTheme.fonts.bodyBold,
    color: pdfTheme.colors.highlightGreen,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  approvalDetails: {
    fontSize: 8,
    color: pdfTheme.colors.textSecondary,
  },
});

function RunningHeader({ caseData }: { caseData: Case }) {
  return (
    <View
      style={styles.runningHeader}
      fixed
      render={({ pageNumber }) => {
        if (pageNumber === 1) return null;
        return (
          <>
            <Text style={styles.runningHeaderBranding}>MediKarya Case Report</Text>
            <Text style={styles.runningHeaderText}>
              {caseData.title.length > 40 ? `${caseData.title.slice(0, 40)}...` : caseData.title} | Case No: {caseData.patient_details?.case_no || caseData.patient_details?.patient_id || 'N/A'}
            </Text>
          </>
        );
      }}
    />
  );
}

function RunningFooter() {
  return (
    <View style={styles.runningFooter} fixed>
      <Text style={styles.runningFooterText}>
        Generated via MediKarya • Exported on {new Date().toLocaleDateString()}
      </Text>
      <Text
        style={styles.runningFooterPage}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

function PatientBanner({ caseData, author }: { caseData: Case; author?: User }) {
  const authorLine = caseData.original_author_name
    ? `Written by: ${caseData.original_author_name}   |   Uploaded by: ${author?.name || 'Medical Contributor'}`
    : `Author: ${author?.name || 'Medical Contributor'}`;

  return (
    <View style={styles.banner}>
      <View style={styles.bannerTop}>
        <Text style={styles.brandText}>MEDIKARYA CASE STUDIO</Text>
        <Text style={styles.reportType}>OFFICIAL CLINICAL CASE REPORT</Text>
      </View>
      <Text style={styles.caseTitle}>{caseData.title}</Text>
      <Text style={styles.caseMeta}>
        Specialty: {formatSpecialtyLabel(caseData.specialty)}   |   Difficulty: {caseData.difficulty.toUpperCase()}   |   {authorLine}
      </Text>
    </View>
  );
}

function DemographicsBox({ caseData }: { caseData: Case }) {
  const pd = caseData.patient_details;
  if (!pd) return null;

  return (
    <View style={styles.demographicsBox}>
      <Text style={styles.demographicsTitle}>1. Patient Details</Text>
      <View style={styles.grid}>
        <View style={styles.gridCol}>
          <Text style={styles.gridLabel}>Case No:</Text>
          <Text style={styles.gridValue}>{pd.case_no || pd.patient_id || 'N/A'}</Text>
        </View>
        <View style={styles.gridCol}>
          <Text style={styles.gridLabel}>Patient Name:</Text>
          <Text style={[styles.gridValue, { fontFamily: pdfTheme.fonts.bodyBold }]}>{pd.patient_name || 'N/A'}</Text>
        </View>
        <View style={styles.gridCol}>
          <Text style={styles.gridLabel}>Age / Sex:</Text>
          <Text style={styles.gridValue}>
            {pd.age != null ? `${pd.age} yrs` : 'N/A'} / {(pd.sex || pd.gender || 'N/A').toUpperCase()}
          </Text>
        </View>
        <View style={styles.gridCol}>
          <Text style={styles.gridLabel}>Religion:</Text>
          <Text style={styles.gridValue}>{pd.religion || 'N/A'}</Text>
        </View>
        <View style={styles.gridCol}>
          <Text style={styles.gridLabel}>Occupation:</Text>
          <Text style={styles.gridValue}>{pd.occupation || 'N/A'}</Text>
        </View>
        <View style={styles.gridCol}>
          <Text style={styles.gridLabel}>Date of Admission:</Text>
          <Text style={styles.gridValue}>{pd.date_of_admission || (pd.presenting_date ? new Date(pd.presenting_date).toLocaleDateString() : 'N/A')}</Text>
        </View>
        <View style={[styles.gridCol, { width: '100%' }]}>
          <Text style={[styles.gridLabel, { width: '20%' }]}>Address:</Text>
          <Text style={[styles.gridValue, { width: '80%' }]}>{pd.address || pd.location || 'N/A'}</Text>
        </View>
      </View>
      <PDFCustomFields customFields={caseData.custom_fields} sectionId="patient_details" />
    </View>
  );
}

function ClinicalSection({ title, children }: { title: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle} minPresenceAhead={45}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );
}

function ApprovalSignoff({ caseData }: { caseData: Case }) {
  if (!caseData.approved_at) return null;
  return (
    <View style={styles.approvalBox} wrap={false}>
      <Text style={styles.approvalHeader}>APPROVED FOR CLINICAL REVIEW</Text>
      <Text style={styles.approvalDetails}>
        Verified by Reviewer   |   Approval Date: {new Date(caseData.approved_at).toLocaleDateString()}
      </Text>
    </View>
  );
}

export function CaseDocument({
  caseData,
  author,
  resolvedImages,
}: {
  caseData: Case;
  author?: User;
  resolvedImages?: ResolvedImageMap;
}) {
  const h = caseData.history;
  const gpe = caseData.general_physical_examination;
  const sys = caseData.systemic_examination;
  const loc = caseData.local_examination;
  const dx = caseData.diagnosis;
  const invsInfo = caseData.investigations_info;

  const localRegion = loc?.region?.trim() || caseData.examination_findings?.local?.location_extent?.trim() || '';
  const localTitle = localRegion ? `5. Local Examination (${localRegion})` : '5. Local Examination';

  const confirmationAttachments = caseData.attachments?.filter((a) => a.investigation_group === 'confirmation') || [];
  const stagingAttachments = caseData.attachments?.filter((a) => a.investigation_group === 'staging') || [];

  const renderSingleImage = (url: string, label: string) => {
    if (!url || !url.trim()) return null;
    const trimmedUrl = url.trim();
    const resolved = resolvedImages?.[trimmedUrl];

    if (resolved && !resolved.success) {
      return (
        <View style={styles.imageRowContainer} wrap={false}>
          <Text style={styles.imageLabel}>{label}:</Text>
          <Text style={{ fontSize: 8, color: '#94a3b8', fontStyle: 'italic', marginTop: 2 }}>
            [Image unavailable ({resolved.error || 'Fetch failed'}): {trimmedUrl.length > 40 ? `${trimmedUrl.slice(0, 40)}...` : trimmedUrl}]
          </Text>
        </View>
      );
    }

    const imageSrc = resolved?.dataUri || trimmedUrl;

    return (
      <View style={styles.imageRowContainer} wrap={false}>
        <Text style={styles.imageLabel}>{label}:</Text>
        <Image src={imageSrc} style={styles.investigationImage} />
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <RunningHeader caseData={caseData} />
        <RunningFooter />

        <PatientBanner caseData={caseData} author={author} />
        <DemographicsBox caseData={caseData} />

        {/* 2. History */}
        {(h || caseData.chief_complaint_history) && (
          <ClinicalSection title="2. History">
            <View style={styles.paragraph}>
              <Text style={styles.boldLabel}>Presenting Complaints: </Text>
              <PDFRichText content={h?.presenting_complaints || caseData.chief_complaint_history?.chief_complaint || 'N/A'} primaryColor={pdfTheme.colors.primary} />
            </View>
            <View style={styles.paragraph}>
              <Text style={styles.boldLabel}>History of Present Illness: </Text>
              <PDFRichText content={h?.history_of_present_illness || caseData.chief_complaint_history?.hpi_additional || 'N/A'} primaryColor={pdfTheme.colors.primary} />
            </View>
            {h?.past_history && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Past History: </Text>
                <PDFRichText content={h.past_history} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {h?.personal_history && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Personal History: </Text>
                <PDFRichText content={h.personal_history} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {h?.treatment_history && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Treatment History: </Text>
                <PDFRichText content={h.treatment_history} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {h?.family_history && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Family History: </Text>
                <PDFRichText content={h.family_history} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {h?.menstrual_history && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Menstrual History: </Text>
                <PDFRichText content={h.menstrual_history} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {h?.obstetric_history && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Obstetric History: </Text>
                <PDFRichText content={h.obstetric_history} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {h?.socio_economic_history && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Socio-economic History: </Text>
                <PDFRichText content={h.socio_economic_history} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {h?.any_other && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Any Other: </Text>
                <PDFRichText content={h.any_other} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            <PDFCustomFields customFields={caseData.custom_fields} sectionId="history" />
          </ClinicalSection>
        )}

        {/* 3. General Physical Examination */}
        {(gpe || caseData.examination_findings) && (
          <ClinicalSection title="3. General Physical Examination">
            <View style={styles.grid}>
              {gpe?.consciousness_orientation && (
                <View style={styles.gridCol}><Text style={styles.gridLabel}>Consciousness / Orientation: </Text><Text style={styles.gridValue}>{gpe.consciousness_orientation}</Text></View>
              )}
              {gpe?.pulse && (
                <View style={styles.gridCol}><Text style={styles.gridLabel}>Pulse: </Text><Text style={styles.gridValue}>{gpe.pulse}</Text></View>
              )}
              {gpe?.bp && (
                <View style={styles.gridCol}><Text style={styles.gridLabel}>Blood Pressure (BP): </Text><Text style={styles.gridValue}>{gpe.bp}</Text></View>
              )}
              {gpe?.respiratory_rate && (
                <View style={styles.gridCol}><Text style={styles.gridLabel}>Respiratory Rate: </Text><Text style={styles.gridValue}>{gpe.respiratory_rate}</Text></View>
              )}
              {gpe?.temperature && (
                <View style={styles.gridCol}><Text style={styles.gridLabel}>Temperature: </Text><Text style={styles.gridValue}>{gpe.temperature}</Text></View>
              )}
              {gpe?.jvp && (
                <View style={styles.gridCol}><Text style={styles.gridLabel}>JVP: </Text><Text style={styles.gridValue}>{gpe.jvp}</Text></View>
              )}
              {gpe?.pallor && (
                <View style={styles.gridCol}><Text style={styles.gridLabel}>Pallor: </Text><Text style={styles.gridValue}>{gpe.pallor}</Text></View>
              )}
              {gpe?.cyanosis && (
                <View style={styles.gridCol}><Text style={styles.gridLabel}>Cyanosis: </Text><Text style={styles.gridValue}>{gpe.cyanosis}</Text></View>
              )}
              {gpe?.icterus && (
                <View style={styles.gridCol}><Text style={styles.gridLabel}>Icterus: </Text><Text style={styles.gridValue}>{gpe.icterus}</Text></View>
              )}
              {gpe?.peripheral_oedema && (
                <View style={styles.gridCol}><Text style={styles.gridLabel}>Peripheral Oedema: </Text><Text style={styles.gridValue}>{gpe.peripheral_oedema}</Text></View>
              )}
              {gpe?.clubbing && (
                <View style={styles.gridCol}><Text style={styles.gridLabel}>Clubbing: </Text><Text style={styles.gridValue}>{gpe.clubbing}</Text></View>
              )}
            </View>

            {gpe?.lymph_nodes && (
              <View style={[styles.paragraph, { marginTop: 4 }]}>
                <Text style={styles.boldLabel}>Lymph Nodes: </Text>
                <Text>
                  {[
                    gpe.lymph_nodes.cervical ? `Cervical: ${gpe.lymph_nodes.cervical}` : null,
                    gpe.lymph_nodes.axillary ? `Axillary: ${gpe.lymph_nodes.axillary}` : null,
                    gpe.lymph_nodes.inguinal ? `Inguinal: ${gpe.lymph_nodes.inguinal}` : null,
                  ].filter(Boolean).join('  |  ') || 'Normal'}
                </Text>
              </View>
            )}

            {gpe?.other_significant_findings && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Other Significant Findings: </Text>
                <PDFRichText content={gpe.other_significant_findings} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            <PDFCustomFields customFields={caseData.custom_fields} sectionId="general_physical_examination" />
          </ClinicalSection>
        )}

        {/* 4. Systemic Examination */}
        {(sys || caseData.examination_findings?.systemic) && (
          <ClinicalSection title="4. Systemic Examination">
            {sys?.respiratory_system && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Respiratory System: </Text>
                <PDFRichText content={sys.respiratory_system} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {sys?.cardiovascular_system && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Cardiovascular System: </Text>
                <PDFRichText content={sys.cardiovascular_system} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {sys?.nervous_system && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Nervous System: </Text>
                <PDFRichText content={sys.nervous_system} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {sys?.genito_urinary_system && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Genito-Urinary System: </Text>
                <PDFRichText content={sys.genito_urinary_system} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {sys?.gastrointestinal_system && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Gastrointestinal System: </Text>
                <PDFRichText content={sys.gastrointestinal_system} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            <PDFCustomFields customFields={caseData.custom_fields} sectionId="systemic_examination" />
          </ClinicalSection>
        )}

        {/* 5. Local Examination */}
        {loc && (
          <ClinicalSection title={localTitle}>
            {loc.inspection && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Inspection: </Text>
                <PDFRichText content={loc.inspection} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {loc.palpation && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Palpation: </Text>
                <PDFRichText content={loc.palpation} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {loc.percussion && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Percussion: </Text>
                <PDFRichText content={loc.percussion} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {loc.auscultation && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Auscultation: </Text>
                <PDFRichText content={loc.auscultation} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            <PDFCustomFields customFields={caseData.custom_fields} sectionId="local_examination" />
          </ClinicalSection>
        )}

        {/* 6. Diagnosis */}
        {(dx || caseData.diagnosis_management) && (
          <ClinicalSection title="6. Diagnosis">
            <View style={styles.paragraph}>
              <Text style={styles.boldLabel}>Provisional Diagnosis: </Text>
              <PDFRichText content={dx?.provisional_diagnosis || caseData.diagnosis_management?.provisional_diagnosis || caseData.diagnosis_management?.final_diagnosis || 'N/A'} primaryColor={pdfTheme.colors.primary} />
            </View>
            {(dx?.differential_diagnosis || caseData.diagnosis_management?.differential_diagnoses) && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Differential Diagnosis: </Text>
                <PDFRichText content={dx?.differential_diagnosis || caseData.diagnosis_management?.differential_diagnoses?.join(', ') || 'N/A'} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            <PDFCustomFields customFields={caseData.custom_fields} sectionId="diagnosis" />
          </ClinicalSection>
        )}

        {/* 7. Investigations */}
        <ClinicalSection title="7. Investigations">
          {/* 7.1 Confirmation */}
          <View style={{ marginBottom: 10 }}>
            <Text style={[styles.boldLabel, { color: pdfTheme.colors.primary, fontSize: 10, marginBottom: 2 }]}>
              7.1 Investigations for Confirmation of Diagnosis:
            </Text>
            <PDFRichText content={invsInfo?.investigations_confirmation || 'No written findings specified.'} primaryColor={pdfTheme.colors.primary} />
            {confirmationAttachments.map((att, idx) => (
              <View key={`conf-${idx}`}>
                {att.file_type === 'image' ? (
                  renderSingleImage(att.public_url, `Confirmation Report Scan — ${att.file_name}`)
                ) : (
                  <Text style={{ fontSize: 8, color: '#2563eb', marginTop: 2 }}>
                    PDF Attachment: <Link src={att.public_url}>{att.file_name}</Link>
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* 7.2 Staging */}
          <View style={{ marginBottom: 10 }}>
            <Text style={[styles.boldLabel, { color: pdfTheme.colors.primary, fontSize: 10, marginBottom: 2 }]}>
              7.2 Investigations for Determining Extent of Disease (Staging):
            </Text>
            <PDFRichText content={invsInfo?.investigations_staging || 'No written findings specified.'} primaryColor={pdfTheme.colors.primary} />
            {stagingAttachments.map((att, idx) => (
              <View key={`stag-${idx}`}>
                {att.file_type === 'image' ? (
                  renderSingleImage(att.public_url, `Staging Report Scan — ${att.file_name}`)
                ) : (
                  <Text style={{ fontSize: 8, color: '#2563eb', marginTop: 2 }}>
                    PDF Attachment: <Link src={att.public_url}>{att.file_name}</Link>
                  </Text>
                )}
              </View>
            ))}
          </View>
          <PDFCustomFields customFields={caseData.custom_fields} sectionId="investigations" />
        </ClinicalSection>

        {/* Legacy Fields Section if present on old cases */}
        {(caseData.diagnosis_management?.treatment_plan || caseData.diagnosis_management?.outcome || (caseData.learning_points && caseData.learning_points.length > 0)) && (
          <ClinicalSection title="Legacy Case Data">
            {caseData.diagnosis_management?.treatment_plan && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Treatment & Management Plan: </Text>
                <PDFRichText content={caseData.diagnosis_management.treatment_plan} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {caseData.diagnosis_management?.outcome && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Outcome: </Text>
                <PDFRichText content={caseData.diagnosis_management.outcome} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {caseData.learning_points && caseData.learning_points.length > 0 && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Learning Points: </Text>
                <Text>{caseData.learning_points.join('; ')}</Text>
              </View>
            )}
          </ClinicalSection>
        )}

        <ApprovalSignoff caseData={caseData} />
      </Page>
    </Document>
  );
}
