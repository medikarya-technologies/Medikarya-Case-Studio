'use client';

import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';

export function Header() {
  const { user, isSignedIn } = useUser();

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex justify-end items-center">
        {!isSignedIn ? (
          <div className="flex gap-2">
            <SignInButton mode="modal">
              <button className="px-4 py-2 text-gray-700 hover:text-blue-600">Sign in</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Sign up</button>
            </SignUpButton>
          </div>
        ) : (
          <UserButton />
        )}
      </div>
    </header>
  );
}
