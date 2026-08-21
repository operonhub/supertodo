import Link from 'next/link';
import { Logo } from '@/components/Logo';

export function CustomerPageHeader({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <header className="bg-verde px-4 py-3 shadow-md">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <Link href="/" aria-label="Ir a la tienda">
          <Logo className="h-11 w-auto" />
        </Link>
        <Link
          href={backHref}
          className="rounded-full bg-white/10 px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-white/20"
        >
          ← {backLabel}
        </Link>
      </div>
    </header>
  );
}
