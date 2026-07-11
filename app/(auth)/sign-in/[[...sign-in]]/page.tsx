import { SignIn } from '@clerk/nextjs';
import { Logo } from '@/components/layout/Logo';
import { APP_NAME } from '@/lib/constants';

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-6">
      <div className="flex items-center gap-3 mb-8">
        <Logo size={40} />
        <span className="text-xl font-bold text-foreground">{APP_NAME}</span>
      </div>
      <SignIn />
    </div>
  );
}
