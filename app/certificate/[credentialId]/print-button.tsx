'use client';

import { useEffect, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PrintButton() {
  return (
    <Button onClick={() => window.print()}>
      <Printer className="mr-2 h-4 w-4" /> Print or save as PDF
    </Button>
  );
}

/** The signature and the stamp are image files in public/certificate-assets/; until they are added, nothing is shown in their place. */
export function OptionalImage({ src, alt, style }: { src: string; alt: string; style: React.CSSProperties }) {
  const ref = useRef<HTMLImageElement>(null);
  const [missing, setMissing] = useState(false);
  // The image can fail before the page becomes interactive, when onError is not listening yet.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setMissing(true);
  }, []);
  if (missing) return <span />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={src} alt={alt} style={style} onError={() => setMissing(true)} />;
}
