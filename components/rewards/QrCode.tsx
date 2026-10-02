import QRCode from 'qrcode';

// A QR code drawn as plain SVG on the server (no image file, no script in the browser), so it prints as sharply as
// the text around it. Used on certificates: scanning it opens the certificate's verification page.

export function QrCode({ value, style, color = '#16302B' }: { value: string; style?: React.CSSProperties; color?: string }) {
  // "M" recovers from about 15% damage: enough for a printed, photographed or slightly creased certificate.
  const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const size = modules.size;
  const quiet = 2; // the blank margin scanners need around the code
  let path = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (modules.get(x, y)) path += `M${x + quiet},${y + quiet}h1v1h-1z`;
    }
  }
  const box = size + quiet * 2;
  return (
    <svg viewBox={`0 0 ${box} ${box}`} style={style} role="img" aria-label="QR code: scan to verify this certificate" shapeRendering="crispEdges">
      <rect width={box} height={box} fill="#ffffff" />
      <path d={path} fill={color} />
    </svg>
  );
}
