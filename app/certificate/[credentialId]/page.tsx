import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Logo } from '@/components/layout/Logo';
import { getCertificate, type Certificate } from '@/lib/rewards/server';
import { CERTIFICATE_SIGNATORY, VERIFY_URL } from '@/lib/rewards/config';
import { OptionalImage, PrintButton } from './print-button';

// A certificate, as a page that prints on one landscape A4 sheet (or saves as a PDF). Anyone with the credential id
// can open it; the id is checked on medikarya.in/verify/<id>, which is the link to put on LinkedIn.

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ credentialId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { credentialId } = await params;
  return { title: `Certificate ${credentialId} | MediKarya`, robots: { index: false } };
}

// On a development machine only, /certificate/MK-0000-00000 shows this sample, to check the layout without real data.
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

const INK = '#16302B';
const GREEN = '#2F7A5C';
const SOFT = '#5B6F69';

export default async function CertificatePage({ params }: Props) {
  const { credentialId } = await params;
  const id = decodeURIComponent(credentialId);
  const certificate = process.env.NODE_ENV !== 'production' && id === SAMPLE.credential_id ? SAMPLE : await getCertificate(id).catch(() => null);
  if (!certificate) notFound();

  const issued = new Date(certificate.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const verifyUrl = `${VERIFY_URL}/${certificate.credential_id}`;

  return (
    <main className="min-h-screen bg-surface px-4 py-8 print:bg-white print:p-0">
      <style>{`@page { size: A4 landscape; margin: 0; } @media print { .no-print { display: none !important; } html, body { background: #fff !important; } }`}</style>

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
        <div className="mx-auto max-w-5xl print:max-w-none" style={{ containerType: 'inline-size' }}>
          <div
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

              <p style={{ marginTop: '3.8cqw', fontSize: '1.35cqw', letterSpacing: '0.42em', textTransform: 'uppercase', color: GREEN, fontWeight: 600 }}>Certificate of Recognition</p>
              <p style={{ marginTop: '3.6cqw', fontSize: '1.5cqw', color: SOFT }}>This is to certify that</p>
              <p style={{ marginTop: '1.2cqw', fontSize: '4.6cqw', lineHeight: 1.1, fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 700 }}>{certificate.recipient_name}</p>
              <div style={{ marginTop: '1.4cqw', width: '34cqw', height: '0.12cqw', background: GREEN, opacity: 0.5 }} />
              <p style={{ marginTop: '2.4cqw', fontSize: '1.5cqw', color: SOFT }}>{certificate.kind === 'advisory_board' ? 'is a member of the' : 'has been recognised as'}</p>
              <p style={{ marginTop: '0.8cqw', fontSize: '3cqw', fontWeight: 700, color: GREEN }}>{certificate.title}</p>
              <p style={{ marginTop: '1.5cqw', fontSize: '1.55cqw', maxWidth: '62cqw', lineHeight: 1.5 }}>
                {certificate.detail}, the clinical simulation platform for medical students.
              </p>

              <div style={{ marginTop: 'auto', width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', textAlign: 'left' }}>
                <div style={{ fontSize: '1.15cqw', color: SOFT, lineHeight: 1.6 }}>
                  <p>
                    Issued on <span style={{ color: INK, fontWeight: 600 }}>{issued}</span>
                  </p>
                  <p>
                    Credential ID <span style={{ color: INK, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>{certificate.credential_id}</span>
                  </p>
                  <p>Verify at {verifyUrl.replace('https://', '')}</p>
                </div>

                <OptionalImage src="/certificate-assets/stamp.png" alt="" style={{ height: '9cqw', width: 'auto', opacity: 0.9 }} />

                <div style={{ textAlign: 'center', minWidth: '22cqw' }}>
                  <OptionalImage src="/certificate-assets/signature.png" alt="" style={{ height: '5cqw', width: 'auto', margin: '0 auto' }} />
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
