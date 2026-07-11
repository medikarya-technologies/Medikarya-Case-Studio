import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFViewer,
} from '@react-pdf/renderer';
import { Case, CaseSection, User } from '@/lib/types';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 30,
    textAlign: 'center',
    color: '#666',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    borderBottom: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 5,
  },
  sectionContent: {
    lineHeight: 1.6,
    marginBottom: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 10,
    textAlign: 'center',
    color: '#999',
  },
  approval: {
    marginTop: 40,
    padding: 20,
    border: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    textAlign: 'center',
  },
});

interface CasePDFProps {
  caseData: Case;
  sections: CaseSection[];
  author?: User;
}

const sectionLabels: Record<string, string> = {
  chief_complaint: 'Chief Complaint',
  history: 'History of Present Illness',
  examination: 'Physical Examination',
  diagnosis: 'Diagnosis',
  treatment: 'Treatment',
  outcome: 'Outcome',
};

export function CasePDF({ caseData, sections, author }: CasePDFProps) {
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <PDFViewer style={{ width: '100%', height: '600px' }}>
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.title}>{caseData.title}</Text>
          {author && (
            <Text style={styles.subtitle}>By: {author.name}</Text>
          )}

          {sortedSections.map((section) => (
            <View key={section.id}>
              <Text style={styles.sectionTitle}>
                {sectionLabels[section.section_type] || section.section_type}
              </Text>
              <Text style={styles.sectionContent}>{section.content}</Text>
            </View>
          ))}

          {caseData.approved_at && (
            <View style={styles.approval}>
              <Text style={{ fontWeight: 'bold' }}>APPROVED</Text>
              <Text>Date: {new Date(caseData.approved_at).toLocaleDateString()}</Text>
            </View>
          )}

          <Text style={styles.footer}>
            MediKarya Case Report - Generated on {new Date().toLocaleDateString()}
          </Text>
        </Page>
      </Document>
    </PDFViewer>
  );
}
