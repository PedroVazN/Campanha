"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import {
  getBrasiliaParts,
  isProjectionReminderDay,
  isProjectionReminderWindow,
  msUntilNextReminder,
  PROJECTION_REMINDER_BODY,
  PROJECTION_REMINDER_TITLE,
} from "@/lib/projection-reminder";

const DISMISS_KEY = "sgi-projection-reminder-dismissed";
const NOTIFIED_KEY = "sgi-projection-reminder-notified";

export function ProjectionReminder({ role }: { role: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (role !== "VENDEDOR") return;

    function refreshVisibility() {
      const br = getBrasiliaParts();
      const dismissed = localStorage.getItem(DISMISS_KEY);
      const active = isProjectionReminderWindow();
      setVisible(active && dismissed !== br.dateKey);
    }

    refreshVisibility();

    // Notificação do browser às 9h (ou imediatamente se já passou das 9 no dia de lembrete)
    async function maybeNotify() {
      if (!isProjectionReminderWindow()) return;
      const br = getBrasiliaParts();
      if (localStorage.getItem(NOTIFIED_KEY) === br.dateKey) return;

      if (typeof Notification === "undefined") return;

      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") return;

      new Notification(`SGI 4.0 — ${PROJECTION_REMINDER_TITLE}`, {
        body: PROJECTION_REMINDER_BODY,
        tag: `sgi-proj-${br.dateKey}`,
      });
      localStorage.setItem(NOTIFIED_KEY, br.dateKey);
    }

    maybeNotify();

    // Agenda o próximo disparo (seg/qua 9h)
    let timer: ReturnType<typeof setTimeout> | undefined;
    function schedule() {
      const wait = msUntilNextReminder();
      timer = setTimeout(async () => {
        refreshVisibility();
        await maybeNotify();
        schedule();
      }, Math.min(wait, 2147483647));
    }
    schedule();

    // Se ainda não é 9h mas é seg/qua, revalida a cada minuto
    const interval = setInterval(() => {
      if (isProjectionReminderDay()) refreshVisibility();
    }, 60_000);

    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(interval);
    };
  }, [role]);

  if (role !== "VENDEDOR" || !visible) return null;

  return (
    <div
      className="mb-4 rounded-[var(--radius)] border border-warn/30 bg-warn-soft px-4 py-3 flex flex-wrap items-start gap-3"
      role="status"
    >
      <Bell className="h-5 w-5 text-warn shrink-0 mt-0.5" strokeWidth={2} />
      <div className="flex-1 min-w-[200px]">
        <p className="font-medium text-ink text-sm">{PROJECTION_REMINDER_TITLE}</p>
        <p className="text-sm text-muted mt-0.5">{PROJECTION_REMINDER_BODY}</p>
        <Link href="/projecoes" className="inline-flex mt-2 text-sm font-semibold text-accent hover:underline">
          Ir para projeções
        </Link>
      </div>
      <button
        type="button"
        className="text-muted hover:text-ink cursor-pointer p-1"
        aria-label="Dispensar lembrete de hoje"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, getBrasiliaParts().dateKey);
          setVisible(false);
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
