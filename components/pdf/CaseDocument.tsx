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

// ==========================================
// DESIGN SYSTEM & TOKENS (pdfTheme)
// ==========================================
const pdfTheme = {
  colors: {
    primary: '#064e3b',       // Forest Green (Hospital report brand color)
    textPrimary: '#1e293b',   // Dark Slate (Readable body text, not pure black)
    textSecondary: '#475569', // Slate Gray for labels and sub-details
    border: '#cbd5e1',        // Slate Border
    borderLight: '#e2e8f0',   // Light gray for inner grid lines
    bgNeutral: '#f8fafc',     // Slate-50 for demographics box & alternating table rows
    highlightGreen: '#15803d',// Primary green-700 for approval status
    bgHighlightGreen: '#f0fdf4', // Light green bg for approval banner
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
  }
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
  // Running Header (Fixed, hides on page 1)
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
  // Running Footer (Fixed on all pages)
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
  // Cover / Header Banner (Page 1)
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
  // Patient Demographics Box (Page 1)
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
    width: '35%',
    fontFamily: pdfTheme.fonts.bodyBold,
    fontSize: 8.5,
    color: pdfTheme.colors.textSecondary,
  },
  gridValue: {
    width: '65%',
    fontSize: 8.5,
    color: pdfTheme.colors.textPrimary,
  },
  // Section Headings
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
  // Tables
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: pdfTheme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: pdfTheme.colors.border,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: pdfTheme.colors.borderLight,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableRowAlternating: {
    backgroundColor: pdfTheme.colors.bgNeutral,
  },
  tableCellHeader: {
    fontSize: 8.5,
    fontFamily: pdfTheme.fonts.bodyBold,
    color: pdfTheme.colors.textSecondary,
  },
  tableCell: {
    fontSize: 8.5,
  },
  // Vital Signs Grid
  vitalSignsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: pdfTheme.colors.border,
    borderRadius: 4,
    marginVertical: 6,
  },
  vitalItem: {
    width: '25%',
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: pdfTheme.colors.borderLight,
    borderBottomWidth: 1,
    borderBottomColor: pdfTheme.colors.borderLight,
    backgroundColor: '#ffffff',
  },
  vitalLabel: {
    fontSize: 7.5,
    fontFamily: pdfTheme.fonts.bodyBold,
    color: pdfTheme.colors.textSecondary,
    marginBottom: 2,
  },
  vitalVal: {
    fontSize: 9,
    color: pdfTheme.colors.textPrimary,
  },
  // Investigation Images
  imageRowContainer: {
    padding: 8,
    backgroundColor: pdfTheme.colors.bgNeutral,
    borderBottomWidth: 1,
    borderBottomColor: pdfTheme.colors.border,
    alignItems: 'center',
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
  // References
  referencesCard: {
    borderWidth: 1,
    borderColor: pdfTheme.colors.border,
    borderRadius: 4,
    padding: 8,
    backgroundColor: pdfTheme.colors.bgNeutral,
  },
  referencesNotice: {
    fontSize: 8,
    color: pdfTheme.colors.textSecondary,
    marginBottom: 6,
    lineHeight: 1.4,
  },
  referenceItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: 2,
  },
  referenceBullet: {
    marginRight: 6,
    color: pdfTheme.colors.primary,
  },
  referenceText: {
    fontSize: 8.5,
    flex: 1,
  },
  referenceLink: {
    color: '#2563eb',
    textDecoration: 'underline',
  },
  // Signoff Box (Approved Banner)
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

// ==========================================
// MODULAR COMPONENT RENDERERS
// ==========================================

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
              {caseData.title.length > 40 ? `${caseData.title.slice(0, 40)}...` : caseData.title} | ID: {caseData.patient_details?.patient_id || 'N/A'}
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
  return (
    <View style={styles.banner}>
      <View style={styles.bannerTop}>
        <Text style={styles.brandText}>MEDIKARYA CASE STUDIO</Text>
        <Text style={styles.reportType}>OFFICIAL CLINICAL CASE REPORT</Text>
      </View>
      <Text style={styles.caseTitle}>{caseData.title}</Text>
      <Text style={styles.caseMeta}>
        Specialty: {formatSpecialtyLabel(caseData.specialty)}   |   Difficulty: {caseData.difficulty.toUpperCase()}   |   Author: {author?.name || 'Medical Contributor'}
      </Text>
    </View>
  );
}

function DemographicsBox({ caseData }: { caseData: Case }) {
  const pd = caseData.patient_details;
  if (!pd) return null;

  return (
    <View style={styles.demographicsBox}>
      <Text style={styles.demographicsTitle}>Patient Demographics</Text>
      <View style={styles.grid}>
        <View style={styles.gridCol}>
          <Text style={styles.gridLabel}>Patient ID:</Text>
          <Text style={styles.gridValue}>{pd.patient_id || 'N/A'}</Text>
        </View>
        <View style={styles.gridCol}>
          <Text style={styles.gridLabel}>Presenting Date:</Text>
          <Text style={styles.gridValue}>{pd.presenting_date ? new Date(pd.presenting_date).toLocaleDateString() : 'N/A'}</Text>
        </View>
        <View style={styles.gridCol}>
          <Text style={styles.gridLabel}>Age / Gender:</Text>
          <Text style={styles.gridValue}>
            {pd.age != null ? `${pd.age} yrs` : 'N/A'} / {pd.gender || 'N/A'}
          </Text>
        </View>
        <View style={styles.gridCol}>
          <Text style={styles.gridLabel}>Occupation:</Text>
          <Text style={styles.gridValue}>{pd.occupation || 'N/A'}</Text>
        </View>
        <View style={styles.gridCol}>
          <Text style={styles.gridLabel}>Location:</Text>
          <Text style={styles.gridValue}>{pd.location || 'N/A'}</Text>
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

function VitalSignsBox({ exam }: { exam: any }) {
  const vitals = exam?.vital_signs;
  if (!vitals) return null;

  // Render vitals in a nice, compact grid
  const items = [
    { label: 'BP (Systolic/Diastolic)', val: vitals.bp_systolic && vitals.bp_diastolic ? `${vitals.bp_systolic}/${vitals.bp_diastolic} mmHg` : null },
    { label: 'Heart Rate (HR)', val: vitals.hr ? `${vitals.hr} bpm` : null },
    { label: 'Respiratory Rate (RR)', val: vitals.rr ? `${vitals.rr} /min` : null },
    { label: 'Temperature (Temp)', val: vitals.temp ? `${vitals.temp} °F` : null },
    { label: 'Oxygen Saturation (SpO2)', val: vitals.spo2 ? `${vitals.spo2} %` : null },
    { label: 'Weight', val: vitals.weight ? `${vitals.weight} kg` : null },
    { label: 'Height', val: vitals.height ? `${vitals.height} cm` : null },
    { label: 'Body Mass Index (BMI)', val: vitals.bmi ? `${vitals.bmi} kg/m²` : null },
  ].filter(i => i.val !== null);

  if (items.length === 0) return null;

  return (
    <View wrap={false}>
      <Text style={[styles.boldLabel, { fontSize: 9.5, marginTop: 6, marginBottom: 2 }]}>Vital Signs:</Text>
      <View style={styles.vitalSignsGrid}>
        {items.map((item, idx) => (
          <View key={idx} style={[styles.vitalItem, idx >= 4 ? { borderBottomWidth: 0 } : {}, (idx + 1) % 4 === 0 ? { borderRightWidth: 0 } : {}]}>
            <Text style={styles.vitalLabel}>{item.label}</Text>
            <Text style={styles.vitalVal}>{item.val}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MedicationsTable({ caseData }: { caseData: Case }) {
  const medications = caseData.current_medications;
  if (!medications || medications.length === 0) return null;

  return (
    <View style={styles.table} wrap={false}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableCellHeader, { width: '45%' }]}>Current Medication Name</Text>
        <Text style={[styles.tableCellHeader, { width: '25%' }]}>Dose</Text>
        <Text style={[styles.tableCellHeader, { width: '30%' }]}>Frequency</Text>
      </View>
      {medications.map((med, idx) => (
        <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlternating : {}, idx === medications.length - 1 ? { borderBottomWidth: 0 } : {}]} wrap={false}>
          <Text style={[styles.tableCell, { width: '45%' }]}>{med.name}</Text>
          <Text style={[styles.tableCell, { width: '25%' }]}>{med.dose}</Text>
          <Text style={[styles.tableCell, { width: '30%' }]}>{med.frequency}</Text>
        </View>
      ))}
    </View>
  );
}

function PrescribedMedicationsTable({ caseData }: { caseData: Case }) {
  const meds = caseData.diagnosis_management?.medications_prescribed;
  if (!meds || meds.length === 0) return null;

  return (
    <View wrap={false}>
      <Text style={[styles.boldLabel, { fontSize: 9.5, marginTop: 8, marginBottom: 2 }]}>Medications Prescribed:</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCellHeader, { width: '35%' }]}>Drug Name</Text>
          <Text style={[styles.tableCellHeader, { width: '20%' }]}>Dose</Text>
          <Text style={[styles.tableCellHeader, { width: '25%' }]}>Frequency</Text>
          <Text style={[styles.tableCellHeader, { width: '20%' }]}>Duration</Text>
        </View>
        {meds.map((med, idx) => (
          <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlternating : {}, idx === meds.length - 1 ? { borderBottomWidth: 0 } : {}]} wrap={false}>
            <Text style={[styles.tableCell, { width: '35%', fontFamily: pdfTheme.fonts.bodyBold }]}>{med.drug}</Text>
            <Text style={[styles.tableCell, { width: '20%' }]}>{med.dose}</Text>
            <Text style={[styles.tableCell, { width: '25%' }]}>{med.frequency}</Text>
            <Text style={[styles.tableCell, { width: '20%' }]}>{med.duration}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function InvestigationsTable({
  caseData,
  resolvedImages,
}: {
  caseData: Case;
  resolvedImages?: ResolvedImageMap;
}) {
  const investigations = caseData.investigations;
  const imageAttachments = caseData.attachments?.filter((a) => a.file_type === 'image') || [];

  if ((!investigations || investigations.length === 0) && imageAttachments.length === 0) return null;

  const renderSingleImage = (url: string, label: string) => {
    if (!url || !url.trim()) return null;

    const trimmedUrl = url.trim();
    const resolved = resolvedImages?.[trimmedUrl];

    if (resolved && !resolved.success) {
      return (
        <View style={styles.imageRowContainer} wrap={false}>
          <Text style={styles.imageLabel}>{label}:</Text>
          <Text style={{ fontSize: 8, color: '#94a3b8', fontStyle: 'italic', marginTop: 2 }}>
            [Image unavailable ({resolved.error || 'Fetch failed'}): {trimmedUrl.length > 50 ? `${trimmedUrl.slice(0, 50)}...` : trimmedUrl}]
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
    <View style={{ width: '100%' }}>
      {investigations && investigations.length > 0 && (
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellHeader, { width: '25%' }]}>Test (Type)</Text>
            <Text style={[styles.tableCellHeader, { width: '12%' }]}>Date</Text>
            <Text style={[styles.tableCellHeader, { width: '20%' }]}>Result</Text>
            <Text style={[styles.tableCellHeader, { width: '18%' }]}>Normal Range</Text>
            <Text style={[styles.tableCellHeader, { width: '25%' }]}>Interpretation</Text>
          </View>
          {investigations.map((inv, idx) => {
            const invImages = imageAttachments.filter((a) => a.investigation_id === inv.id);
            const hasAnyImage = Boolean(inv.image_url) || invImages.length > 0;
            return (
              <View key={idx} wrap={false} style={{ borderBottomWidth: idx === investigations.length - 1 ? 0 : 1, borderBottomColor: pdfTheme.colors.borderLight }}>
                <View style={[styles.tableRow, idx % 2 === 1 && !hasAnyImage ? styles.tableRowAlternating : {}, { borderBottomWidth: 0 }]}>
                  <Text style={[styles.tableCell, { width: '25%', fontFamily: pdfTheme.fonts.bodyBold }]}>
                    {inv.test_name} ({inv.type.toUpperCase()})
                  </Text>
                  <Text style={[styles.tableCell, { width: '12%', fontSize: 8 }]}>
                    {inv.date ? new Date(inv.date).toLocaleDateString() : 'N/A'}
                  </Text>
                  <Text style={[styles.tableCell, { width: '20%' }]}>{inv.result || 'N/A'}</Text>
                  <Text style={[styles.tableCell, { width: '18%' }]}>{inv.normal_range || 'N/A'}</Text>
                  <Text style={[styles.tableCell, { width: '25%' }]}>{inv.interpretation || 'N/A'}</Text>
                </View>
                {inv.image_url && renderSingleImage(inv.image_url, `Attached scan for ${inv.test_name}`)}
                {invImages.map((att, imgIdx) =>
                  renderSingleImage(att.public_url, `Attached scan (${att.file_name})`)
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Unlinked general image attachments */}
      {imageAttachments
        .filter((a) => !a.investigation_id || !investigations?.some((i) => i.id === a.investigation_id))
        .map((att, idx) => (
          <View key={idx} style={{ marginTop: 6 }}>
            {renderSingleImage(att.public_url, `Attached Investigation Image — ${att.file_name}`)}
          </View>
        ))}
    </View>
  );
}

function ReferencesSection({ caseData }: { caseData: Case }) {
  const refs = caseData.diagnosis_management?.reference_pdfs || [];
  const pdfAttachments = caseData.attachments?.filter((a) => a.file_type === 'pdf') || [];

  if (refs.length === 0 && pdfAttachments.length === 0) return null;

  return (
    <View style={styles.sectionContainer} wrap={false}>
      <Text style={styles.sectionTitle} minPresenceAhead={40}>Attached References & PDF Reports</Text>
      <View style={styles.referencesCard}>
        <Text style={styles.referencesNotice}>
          The following reference documents and PDF lab reports were uploaded with this case.
          Clickable direct links to the reference documents are provided below:
        </Text>
        {refs.map((ref, idx) => (
          <View key={`ref-${idx}`} style={styles.referenceItem}>
            <Text style={styles.referenceBullet}>•</Text>
            <Text style={styles.referenceText}>
              <Text style={styles.boldLabel}>{ref.filename || 'Scanned Reference Document'}: </Text>
              <Link src={ref.url} style={styles.referenceLink}>
                {ref.url}
              </Link>
            </Text>
          </View>
        ))}
        {pdfAttachments.map((att, idx) => (
          <View key={`att-${idx}`} style={styles.referenceItem}>
            <Text style={styles.referenceBullet}>•</Text>
            <Text style={styles.referenceText}>
              <Text style={styles.boldLabel}>{att.file_name} ({Math.round(att.file_size / 1024)} KB): </Text>
              <Link src={att.public_url} style={styles.referenceLink}>
                {att.public_url}
              </Link>
            </Text>
          </View>
        ))}
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

// ==========================================
// MAIN CASE DOCUMENT COMPONENT
// ==========================================

export function CaseDocument({
  caseData,
  author,
  resolvedImages,
}: {
  caseData: Case;
  author?: User;
  resolvedImages?: ResolvedImageMap;
}) {
  const pd = caseData.patient_details;
  const cc = caseData.chief_complaint_history;
  const mh = caseData.medical_history;
  const exam = caseData.examination_findings;
  const dx = caseData.diagnosis_management;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Running Header & Footer */}
        <RunningHeader caseData={caseData} />
        <RunningFooter />

        {/* Title and Demographics */}
        <PatientBanner caseData={caseData} author={author} />
        <DemographicsBox caseData={caseData} />

        {/* 1. Chief Complaint & History */}
        {cc && (
          <ClinicalSection title="Chief Complaint & HPI">
            <View style={styles.paragraph}>
              <Text style={styles.boldLabel}>Chief Complaint: </Text>
              <PDFRichText content={cc.chief_complaint} primaryColor={pdfTheme.colors.primary} />
            </View>
            <View style={styles.grid}>
              {cc.hpi_onset && (
                <View style={[styles.gridCol, { width: '50%' }]}>
                  <Text style={styles.gridLabel}>Onset: </Text>
                  <Text style={styles.gridValue}>{cc.hpi_onset}</Text>
                </View>
              )}
              {cc.hpi_duration && (
                <View style={[styles.gridCol, { width: '50%' }]}>
                  <Text style={styles.gridLabel}>Duration: </Text>
                  <Text style={styles.gridValue}>{cc.hpi_duration}</Text>
                </View>
              )}
              {cc.hpi_aggravating && (
                <View style={[styles.gridCol, { width: '50%' }]}>
                  <Text style={styles.gridLabel}>Aggravating: </Text>
                  <Text style={styles.gridValue}>{cc.hpi_aggravating}</Text>
                </View>
              )}
              {cc.hpi_relieving && (
                <View style={[styles.gridCol, { width: '50%' }]}>
                  <Text style={styles.gridLabel}>Relieving: </Text>
                  <Text style={styles.gridValue}>{cc.hpi_relieving}</Text>
                </View>
              )}
            </View>
            {cc.associated_symptoms && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Associated Symptoms: </Text>
                <PDFRichText content={cc.associated_symptoms} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {cc.hpi_additional && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Additional HPI Notes: </Text>
                <PDFRichText content={cc.hpi_additional} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            <PDFCustomFields customFields={caseData.custom_fields} sectionId="chief_complaint" />
          </ClinicalSection>
        )}

        {/* 2. Past Medical / Personal History */}
        {(mh || (caseData.current_medications && caseData.current_medications.length > 0)) && (
          <ClinicalSection title="Medical & Personal History">
            {mh?.past_medical_history && mh.past_medical_history.length > 0 && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Past Medical History (PMH): </Text>
                <Text>{mh.past_medical_history.join(', ')}</Text>
              </View>
            )}
            {mh?.custom_medical_history && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Clinical History Details: </Text>
                <PDFRichText content={mh.custom_medical_history} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {mh?.family_history && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Family History: </Text>
                <PDFRichText content={mh.family_history} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {mh?.allergies && mh.allergies.length > 0 && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Allergies: </Text>
                <Text>{mh.allergies.join(', ')}</Text>
              </View>
            )}
            {/* Social History */}
            {(mh?.social_history_smoking || mh?.social_history_alcohol || mh?.social_history_occupation) && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Social History: </Text>
                <Text>
                  {[
                    mh.social_history_smoking ? `Smoking: ${mh.social_history_smoking}` : null,
                    mh.social_history_alcohol ? `Alcohol: ${mh.social_history_alcohol}` : null,
                    mh.social_history_occupation ? `Occupation Context: ${mh.social_history_occupation}` : null,
                  ].filter(Boolean).join('  |  ')}
                </Text>
              </View>
            )}
            {/* Current Medications Table */}
            {caseData.current_medications && caseData.current_medications.length > 0 && (
              <View>
                <Text style={[styles.boldLabel, { marginTop: 4, marginBottom: 2 }]}>Current Medications:</Text>
                <MedicationsTable caseData={caseData} />
              </View>
            )}
            <PDFCustomFields customFields={caseData.custom_fields} sectionId="medical_history" />
          </ClinicalSection>
        )}

        {/* 3. Examination Findings */}
        {exam && (
          <ClinicalSection title="Examination Findings">
            {exam.general_appearance && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>General Appearance: </Text>
                <PDFRichText content={exam.general_appearance} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {/* Vitals Grid Table */}
            <VitalSignsBox exam={exam} />
            {/* Systemic Exam */}
            {exam.systemic && Object.values(exam.systemic).some(Boolean) && (
              <View style={{ marginTop: 6 }}>
                <Text style={styles.boldLabel}>Systemic Examination:</Text>
                <View style={styles.grid}>
                  {exam.systemic.cardiovascular && (
                    <View style={[styles.gridCol, { width: '50%' }]}>
                      <Text style={styles.gridLabel}>Cardiovascular: </Text>
                      <PDFRichText content={exam.systemic.cardiovascular} primaryColor={pdfTheme.colors.primary} />
                    </View>
                  )}
                  {exam.systemic.respiratory && (
                    <View style={[styles.gridCol, { width: '50%' }]}>
                      <Text style={styles.gridLabel}>Respiratory: </Text>
                      <PDFRichText content={exam.systemic.respiratory} primaryColor={pdfTheme.colors.primary} />
                    </View>
                  )}
                  {exam.systemic.gastrointestinal && (
                    <View style={[styles.gridCol, { width: '50%' }]}>
                      <Text style={styles.gridLabel}>Gastrointestinal: </Text>
                      <PDFRichText content={exam.systemic.gastrointestinal} primaryColor={pdfTheme.colors.primary} />
                    </View>
                  )}
                  {exam.systemic.neurological && (
                    <View style={[styles.gridCol, { width: '50%' }]}>
                      <Text style={styles.gridLabel}>Neurological: </Text>
                      <PDFRichText content={exam.systemic.neurological} primaryColor={pdfTheme.colors.primary} />
                    </View>
                  )}
                  {exam.systemic.musculoskeletal && (
                    <View style={[styles.gridCol, { width: '50%' }]}>
                      <Text style={styles.gridLabel}>Musculoskeletal: </Text>
                      <PDFRichText content={exam.systemic.musculoskeletal} primaryColor={pdfTheme.colors.primary} />
                    </View>
                  )}
                  {exam.systemic.dermatological && (
                    <View style={[styles.gridCol, { width: '50%' }]}>
                      <Text style={styles.gridLabel}>Dermatological: </Text>
                      <PDFRichText content={exam.systemic.dermatological} primaryColor={pdfTheme.colors.primary} />
                    </View>
                  )}
                  {exam.systemic.thyroid && (
                    <View style={[styles.gridCol, { width: '50%' }]}>
                      <Text style={styles.gridLabel}>Thyroid: </Text>
                      <PDFRichText content={exam.systemic.thyroid} primaryColor={pdfTheme.colors.primary} />
                    </View>
                  )}
                </View>
              </View>
            )}
            <PDFCustomFields customFields={caseData.custom_fields} sectionId="examination" />
          </ClinicalSection>
        )}

        {/* 4. Investigations (Table with inline X-rays/scans) */}
        {((caseData.investigations && caseData.investigations.length > 0) || (caseData.attachments && caseData.attachments.some(a => a.file_type === 'image'))) && (
          <ClinicalSection title="Investigations">
            <InvestigationsTable caseData={caseData} resolvedImages={resolvedImages} />
            <PDFCustomFields customFields={caseData.custom_fields} sectionId="investigations" />
          </ClinicalSection>
        )}

        {/* 5. Diagnosis & Management Plan */}
        {dx && (
          <ClinicalSection title="Diagnosis & Management Plan">
            {dx.provisional_diagnosis && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Provisional Diagnosis: </Text>
                <PDFRichText content={dx.provisional_diagnosis} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {dx.differential_diagnoses && dx.differential_diagnoses.length > 0 && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Differential Diagnoses: </Text>
                <Text>{dx.differential_diagnoses.join(', ')}</Text>
              </View>
            )}
            {dx.final_diagnosis && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Final Diagnosis: </Text>
                <PDFRichText content={dx.final_diagnosis} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {dx.treatment_plan && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Treatment & Management Plan: </Text>
                <PDFRichText content={dx.treatment_plan} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {/* Prescribed Medications Table */}
            <PrescribedMedicationsTable caseData={caseData} />
            {dx.follow_up_plan && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Follow-up Plan: </Text>
                <PDFRichText content={dx.follow_up_plan} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {dx.prognosis && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Prognosis: </Text>
                <PDFRichText content={dx.prognosis} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            {dx.outcome && (
              <View style={styles.paragraph}>
                <Text style={styles.boldLabel}>Outcome: </Text>
                <PDFRichText content={dx.outcome} primaryColor={pdfTheme.colors.primary} />
              </View>
            )}
            <PDFCustomFields customFields={caseData.custom_fields} sectionId="diagnosis" />
          </ClinicalSection>
        )}

        {/* 6. References Appendix */}
        <ReferencesSection caseData={caseData} />

        {/* 7. Learning Points */}
        {caseData.learning_points && caseData.learning_points.length > 0 && (
          <ClinicalSection title="Learning Points">
            {caseData.learning_points.map((pt, idx) => (
              <View key={idx} style={{ marginBottom: 4 }}>
                <PDFRichText content={pt} primaryColor={pdfTheme.colors.primary} />
              </View>
            ))}
          </ClinicalSection>
        )}

        {/* 8. Approval Banner */}
        <ApprovalSignoff caseData={caseData} />
      </Page>
    </Document>
  );
}
