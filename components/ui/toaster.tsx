'use client';

import { Toaster as Sonner, toast } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'bg-card border border-border shadow-lg rounded-lg',
          description: 'text-muted-foreground',
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
