import Link from 'next/link';
import { Briefcase, Brain, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Briefcase,
    title: 'Track Applications',
    description:
      'Manage your job hunt from one place with a Kanban-style pipeline from Saved through to Offer.',
  },
  {
    icon: Brain,
    title: 'AI-Powered Insights',
    description:
      'Paste a job posting and get structured data extraction, fit scoring, and tailored cover letters.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description:
      'See response rates, time-in-stage breakdowns, and activity trends across your applications.',
  },
] as const;

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-lg font-semibold">Kariro</span>
        <nav aria-label="Main navigation" className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get started</Link>
          </Button>
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Your job search, organized and AI-powered
          </h1>
          <p className="mt-4 max-w-lg text-lg text-muted-foreground">
            Kariro helps you track applications, analyze job postings, and land your next role faster.
          </p>
          <div className="mt-8 flex gap-3">
            <Button size="lg" asChild>
              <Link href="/register">Get started free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </section>

        <section aria-labelledby="features-heading" className="border-t bg-muted/40 px-6 py-20">
          <h2 id="features-heading" className="sr-only">
            Features
          </h2>
          <div className="mx-auto grid max-w-4xl gap-10 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex flex-col items-center text-center">
                <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-6 text-primary" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground">
        <p>Kariro &mdash; AI-powered job application tracker</p>
      </footer>
    </div>
  );
}
