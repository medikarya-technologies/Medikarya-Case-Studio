import QRCode from 'qrcode';
import { NextResponse } from 'next/server';
import { getCertificate } from '@/lib/rewards/server';
import { VERIFY_URL } from '@/lib/rewards/config';

// The certificate's QR code as a picture (PNG, 1024 px), to place on a certificate designed elsewhere, such as a
// letterhead. It holds nothing but the address of the certificate's verification page.

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ credentialId: string }> }) {
  const { credentialId } = await params;
  const certificate = await getCertificate(decodeURIComponent(credentialId)).catch(() => null);
  if (!certificate) return new NextResponse('Not found', { status: 404 });

  const png = await QRCode.toBuffer(`${VERIFY_URL}/${certificate.credential_id}`, {
    errorCorrectionLevel: 'M',
    width: 1024,
    margin: 2,
    color: { dark: '#16302B', light: '#FFFFFF' },
  });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${certificate.credential_id}-qr.png"`,
      'Cache-Control': 'no-store',
    },
  });
}
