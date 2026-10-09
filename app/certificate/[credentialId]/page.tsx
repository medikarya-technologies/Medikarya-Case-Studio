import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Logo } from '@/components/layout/Logo';
import { getCertificate, type Certificate } from '@/lib/rewards/server';
import { CERTIFICATE_SIGNATORY, VERIFY_URL } from '@/lib/rewards/config';
import { PrintButton } from './print-button';
// The handwriting font for the signature, served from this site (no outside request when a certificate is opened or printed).
import '@fontsource/caveat/600.css';
import { QrCode } from '@/components/rewards/QrCode';

// A certificate, as a page that prints on one landscape A4 sheet (or saves as a PDF). Anyone with the credential id
// can open it; the id is checked on medikarya.in/verify/<id>, which is the link to put on LinkedIn.

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ credentialId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { credentialId } = await params;
  return { title: `Certificate ${credentialId} | MediKarya`, robots: { index: false } };
}

// On a development machine only, /certificate/MK-0000-00000 (a contributor), /certificate/MK-0000-00001 (an
// internship) and /certificate/MK-0000-00002 (a workshop) show these samples, to check the layout without real data.
const SAMPLE: Certificate = {
  id: 'sample',
  credential_id: 'MK-0000-00000',
  kind: 'contributor',
  user_id: null,
  recipient_name: 'Sample Recipient Name',
  title: 'Senior Contributor',
  detail: 'for 5 clinical cases published on MediKarya',
  issued_at: '2026-01-01T06:00:00Z',
  revoked: false,
};

const SAMPLE_INTERNSHIP: Certificate = {
  id: 'sample-internship',
  credential_id: 'MK-0000-00001',
  kind: 'internship',
  user_id: null,
  recipient_name: 'Sample Intern Name',
  title: 'Developer Intern',
  detail: "Completed an internship at MediKarya Technologies Pvt. Ltd. from 3 July 2026 to 2 September 2026. Built and developed MediKarya's Case Studio.",
  issued_at: '2026-09-02T06:30:00Z',
  revoked: false,
};

const SAMPLE_WORKSHOP: Certificate = {
  id: 'sample-workshop',
  credential_id: 'MK-0000-00002',
  kind: 'workshop',
  user_id: null,
  recipient_name: 'Sample Student Name',
  title: 'Clinical Reasoning Workshop',
  detail: 'held at Maulana Azad Medical College, New Delhi on 24 October 2026, working through 2 simulated patient cases on MediKarya',
  issued_at: '2026-10-24T12:30:00Z',
  revoked: false,
};

// The words around the name and the title, by kind of certificate.
const HEADING: Record<Certificate['kind'], string> = {
  contributor: 'Certificate of Recognition',
  reviewer: 'Certificate of Recognition',
  advisory_board: 'Certificate of Recognition',
  internship: 'Internship Completion Certificate',
  workshop: 'Certificate of Participation',
};
const LEAD: Record<Certificate['kind'], string> = {
  contributor: 'has been recognised as',
  reviewer: 'has been recognised as',
  advisory_board: 'is a member of the',
  internship: 'has successfully completed an internship as',
  workshop: 'has taken part in the',
};

function closingLine(c: Certificate): string {
  if (c.kind === 'internship') return c.detail.replace(/^Completed an internship at /, 'at ');
  // a workshop's line already says where it was held and that it was on MediKarya
  if (c.kind === 'workshop') return `${c.detail}.`;
  return `${c.detail}, the clinical simulation platform for medical students.`;
}

const INK = '#16302B';
const GREEN = '#2F7A5C';
const SOFT = '#5B6F69';
const SIGNATURE_INK = '#1E3A8A';

export default async function CertificatePage({ params }: Props) {
  const { credentialId } = await params;
  const id = decodeURIComponent(credentialId);
  const sample = process.env.NODE_ENV !== 'production' ? [SAMPLE, SAMPLE_INTERNSHIP, SAMPLE_WORKSHOP].find((c) => c.credential_id === id) : undefined;
  const certificate = sample ?? (await getCertificate(id).catch(() => null));
  if (!certificate) notFound();

  const issued = new Date(certificate.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const verifyUrl = `${VERIFY_URL}/${certificate.credential_id}`;

  return (
    <main className="cert-page min-h-screen bg-surface px-4 py-8 print:bg-white print:p-0">
      <style>{`@page { size: A4 landscape; margin: 0; } @media print { .no-print { display: none !important; } html, body { background: #fff !important; } .cert-page { min-height: 0 !important; } .cert-frame { width: 297mm !important; } .cert-sheet { width: 297mm !important; height: 209mm !important; aspect-ratio: auto !important; box-shadow: none !important; overflow: hidden !important; } }`}</style>

      <div className="no-print mx-auto mb-5 flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">
            {certificate.title} · {certificate.recipient_name}
          </p>
          <p className="text-sm text-muted-foreground">
            For LinkedIn: add it under Licences &amp; certifications with credential ID <span className="font-mono">{certificate.credential_id}</span> and credential URL{' '}
            <span className="font-mono">{verifyUrl}</span>
          </p>
        </div>
        <PrintButton />
      </div>

      {certificate.revoked ? (
        <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-lg font-semibold text-foreground">This certificate has been withdrawn.</p>
          <p className="mt-1 text-muted-foreground">Credential {certificate.credential_id} is no longer valid.</p>
        </div>
      ) : (
        <div className="cert-frame mx-auto max-w-5xl print:max-w-none" style={{ containerType: 'inline-size' }}>
          <div
            // On paper it is exactly one landscape A4 sheet (a millimetre short, so rounding never spills onto a second page).
            className="cert-sheet"
            style={{ aspectRatio: '297 / 210', background: '#FFFEFA', color: INK, padding: '2.2cqw', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
          >
            <div
              style={{ height: '100%', border: `0.35cqw solid ${GREEN}`, outline: `0.1cqw solid ${GREEN}`, outlineOffset: '-1cqw', padding: '4.5cqw 6cqw 3.5cqw', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1cqw' }}>
                <span style={{ width: '4.2cqw', height: '4.2cqw', display: 'inline-flex' }}>
                  <Logo size={100} className="h-full w-full" />
                </span>
                <span style={{ fontSize: '2.9cqw', fontWeight: 800, letterSpacing: '-0.02em' }}>MediKarya</span>
              </div>

              <p style={{ marginTop: '3.8cqw', fontSize: '1.35cqw', letterSpacing: '0.42em', textTransform: 'uppercase', color: GREEN, fontWeight: 600 }}>{HEADING[certificate.kind]}</p>
              <p style={{ marginTop: '3.6cqw', fontSize: '1.5cqw', color: SOFT }}>This is to certify that</p>
              <p style={{ marginTop: '1.2cqw', fontSize: '4.6cqw', lineHeight: 1.1, fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700 }}>{certificate.recipient_name}</p>
              <div style={{ marginTop: '1.4cqw', width: '34cqw', height: '0.12cqw', background: GREEN, opacity: 0.5 }} />
              <p style={{ marginTop: '2.4cqw', fontSize: '1.5cqw', color: SOFT }}>{LEAD[certificate.kind]}</p>
              <p style={{ marginTop: '0.8cqw', fontSize: '3cqw', fontWeight: 700, color: GREEN }}>{certificate.title}</p>
              <p style={{ marginTop: '1.5cqw', fontSize: '1.55cqw', maxWidth: '62cqw', lineHeight: 1.5 }}>
                {closingLine(certificate)}
              </p>

              <div style={{ marginTop: 'auto', width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', textAlign: 'left' }}>
                {/* Scan to check it: the code opens this certificate's page on medikarya.in, which says who it was issued to, for what, and that it is valid. */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.4cqw' }}>
                  <div style={{ textAlign: 'center' }}>
                    <QrCode value={verifyUrl} color={INK} style={{ width: '9cqw', height: '9cqw', display: 'block', border: `0.1cqw solid ${GREEN}` }} />
                    <p style={{ marginTop: '0.4cqw', fontSize: '0.95cqw', letterSpacing: '0.18em', textTransform: 'uppercase', color: GREEN, fontWeight: 600 }}>Scan to verify</p>
                  </div>
                  <div style={{ fontSize: '1.15cqw', color: SOFT, lineHeight: 1.6, paddingBottom: '1.6cqw' }}>
                    <p>
                      Issued on <span style={{ color: INK, fontWeight: 600 }}>{issued}</span>
                    </p>
                    <p>
                      Credential ID <span style={{ color: INK, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>{certificate.credential_id}</span>
                    </p>
                  </div>
                </div>

                <div style={{ textAlign: 'center', minWidth: '22cqw' }}>
                  {/* The signatory's name as a handwritten signature, in pen blue. */}
                  <p aria-hidden style={{ fontFamily: "'Caveat', cursive", fontWeight: 600, fontSize: '3.9cqw', lineHeight: 1, color: SIGNATURE_INK, transform: 'rotate(-2deg)', whiteSpace: 'nowrap', paddingBottom: '0.5cqw' }}>
                    {CERTIFICATE_SIGNATORY.name}
                  </p>
                  <div style={{ borderTop: `0.1cqw solid ${INK}`, marginTop: '0.4cqw', paddingTop: '0.6cqw' }}>
                    <p style={{ fontSize: '1.4cqw', fontWeight: 700 }}>{CERTIFICATE_SIGNATORY.name}</p>
                    <p style={{ fontSize: '1.15cqw', color: SOFT }}>{CERTIFICATE_SIGNATORY.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
