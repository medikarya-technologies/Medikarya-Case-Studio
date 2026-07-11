import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  FileText,
  Users,
  Shield,
  PenTool,
  Send,
  CheckCircle,
  Download,
  ArrowRight,
} from 'lucide-react';
import { auth, currentUser } from '@clerk/nextjs/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getOrCreateUser } from '@/lib/supabase/queries';
import { Logo } from '@/components/layout/Logo';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants';

const steps = [
  {
    icon: PenTool,
    title: 'Write',
    description:
      'Use structured templates to draft patient details, history, examination, investigations, and management.',
  },
  {
    icon: Send,
    title: 'Submit',
    description:
      'Send your completed case to faculty reviewers for constructive feedback and academic oversight.',
  },
  {
    icon: CheckCircle,
    title: 'Review & Approve',
    description:
      'Reviewers evaluate clinical accuracy and structure, approving cases or requesting targeted revisions.',
  },
  {
    icon: Download,
    title: 'Export PDF',
    description:
      'Build your portfolio with professionally formatted, approved case reports ready to share.',
  },
];

const features = [
  {
    icon: FileText,
    title: 'Structured Case Templates',
    description:
      'Guided multi-step forms for cardiology, internal medicine, emergency medicine, and more.',
  },
  {
    icon: Users,
    title: 'Faculty Review & Feedback',
    description:
      'Get meaningful review from professors and peers before your case is approved.',
  },
  {
    icon: Download,
    title: 'Professional PDF Export',
    description:
      'Export approved cases as polished PDFs for portfolios, presentations, and study groups.',
  },
  {
    icon: Shield,
    title: 'Role-Based Dashboards',
    description:
      'Tailored views for authors, reviewers, and admins with secure access controls.',
  },
];

export default async function Home() {
  const { userId } = await auth();
  const clerkUser = await currentUser();

  if (userId && clerkUser) {
    const user = await getOrCreateUser(
      userId,
      clerkUser.fullName || clerkUser.username || 'Unknown User',
      clerkUser.emailAddresses[0]?.emailAddress || ''
    );
    const role = user.role as 'author' | 'reviewer' | 'admin';

    if (role === 'reviewer') {
      redirect('/dashboard/reviewer');
    } else if (role === 'admin') {
      redirect('/dashboard/admin');
    } else {
      redirect('/dashboard/author');
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-muted/60 via-surface to-background" />
        <div className="relative px-4 sm:px-6 py-16 sm:py-24 max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-brand-muted px-4 py-2 rounded-full text-primary font-medium text-sm">
            <Logo size={22} />
            <span>{APP_NAME}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground leading-tight tracking-tight">
            Practice writing real
            <span className="text-primary"> clinical case reports</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {APP_DESCRIPTION}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
            <Link href="/sign-up">
              <Button size="lg" className="h-12 px-8 text-base w-full sm:w-auto">
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-8 text-base w-full sm:w-auto hover:border-primary hover:text-primary"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 bg-card border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2>How It Works</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              From first draft to approved portfolio piece — a clear workflow built for medical education.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <Card
                  key={step.title}
                  className="shadow-sm hover:shadow-md hover:border-primary/20 transition-all border-border relative"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {i + 1}
                      </span>
                      <div className="bg-brand-muted p-2.5 rounded-lg">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2>Built for Medical Education</h2>
            <p className="text-muted-foreground mt-3">
              Purpose-built tools for students, faculty, and program administrators.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="shadow-sm hover:shadow-md hover:border-secondary/30 transition-all border-border"
                >
                  <CardHeader className="flex flex-row items-start gap-4 pb-2">
                    <div className="bg-secondary/10 p-3 rounded-lg shrink-0">
                      <Icon className="w-6 h-6 text-secondary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground pl-[4.5rem]">
                    {feature.description}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 bg-sidebar text-sidebar-foreground">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-white text-3xl sm:text-4xl font-bold">
            Start building your case portfolio today
          </h2>
          <p className="text-lg text-sidebar-foreground/70">
            Join medical students and faculty using {APP_NAME} to create, review, and share
            high-quality clinical case reports.
          </p>
          <Link href="/sign-up">
            <Button
              size="lg"
              className="h-12 px-8 bg-card text-primary hover:bg-brand-muted font-semibold"
            >
              Sign Up for Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-6 py-8 border-t border-border bg-card">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="font-medium text-foreground">{APP_NAME}</span>
          </div>
          <p>© {new Date().getFullYear()} MediKarya. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
