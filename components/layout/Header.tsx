'use client';

import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';

export function Header() {
  const { user, isSignedIn } = useUser();

  return (
    <header className="bg-card border-b border-border px-4 py-2">
      <div className="flex justify-end items-center">
        {!isSignedIn ? (
          <div className="flex gap-2">
            <SignInButton mode="modal">
              <button className="px-4 py-2 text-foreground hover:text-primary font-medium transition-colors">Sign in</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-brand-light font-medium transition-colors">Sign up</button>
            </SignUpButton>
          </div>
        ) : (
          <UserButton />
        )}
      </div>
    </header>
  );
}
