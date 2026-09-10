"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof import("./ScoreHistoryChart").ScoreHistoryChart>;

/** Loads the Recharts-based chart only on pages that use it, after hydration. */
export const ScoreHistoryChart = dynamic<Props>(() => import("./ScoreHistoryChart").then((m) => m.ScoreHistoryChart), {
  ssr: false,
  loading: () => <div className="animate-pulse rounded-lg bg-surface-2" style={{ height: 260 }} aria-busy="true" aria-label="Loading chart" />,
});
