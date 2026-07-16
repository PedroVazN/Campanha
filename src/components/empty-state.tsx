import Link from "next/link";
import { Inbox } from "lucide-react";

type Props = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({ title, description, actionLabel, actionHref }: Props) {
  return (
    <div className="panel px-6 py-14 text-center">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-[12px] bg-accent-soft border border-[rgb(184_106_61_/_20%)] text-accent">
        <Inbox className="h-5 w-5" strokeWidth={2} />
      </div>
      <p className="font-display text-xl font-bold text-ink tracking-tight">{title}</p>
      <p className="text-muted mt-2 max-w-md mx-auto text-sm leading-relaxed">{description}</p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="btn-primary inline-flex mt-6">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
