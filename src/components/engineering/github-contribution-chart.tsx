"use client";

import { useEffect, useState } from "react";
import { ResultFigures } from "@/components/result-figures";
import { GithubHeatmap } from "@/components/engineering/github-heatmap";
import { GithubRangeControl } from "@/components/engineering/github-range-control";
import { LAST_12_MONTHS, type ContributionRange } from "@/lib/github";
import type { ResultFigure } from "@/lib/types";

const QUERY_PARAM = "contrib";

/** Client half of the GitHub activity band. All ranges are fetched
 * server-side up front (src/lib/github.ts), so switching between them here
 * is just picking a different slice of `ranges` — zero extra network calls. */
export function GithubContributionChart({ ranges }: { ranges: ContributionRange[] }) {
  const DEFAULT_KEY = ranges[0]?.key ?? LAST_12_MONTHS;

  // Starts at the default so the prerendered HTML is deterministic and
  // matches the client's first render exactly (no hydration mismatch). The
  // real URL is read in a mount effect below, not with next/navigation's
  // useSearchParams: calling that from a client component on this
  // statically-rendered route forces a Suspense bailout and the route stops
  // being prerendered.
  const [selectedKey, setSelectedKey] = useState(DEFAULT_KEY);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get(QUERY_PARAM);
    const match = fromUrl && ranges.some((r) => r.key === fromUrl) ? fromUrl : null;
    if (match && match !== DEFAULT_KEY) {
      setSelectedKey(match); // eslint-disable-line react-hooks/set-state-in-effect -- reconciling with the URL on mount, not a render loop
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(key: string) {
    setSelectedKey(key);
    const params = new URLSearchParams(window.location.search);
    if (key === DEFAULT_KEY) {
      params.delete(QUERY_PARAM);
    } else {
      params.set(QUERY_PARAM, key);
    }
    const query = params.toString();
    const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    // replaceState, not pushState: toggling a filter isn't a navigation and
    // shouldn't fill the back button with history entries.
    window.history.replaceState(null, "", url);
  }

  if (ranges.length === 0) return null;

  const active = ranges.find((r) => r.key === selectedKey) ?? ranges[0];

  const results: ResultFigure[] = [{ figure: `${active.total}`, caption: "contributions" }];

  return (
    <>
      <GithubRangeControl
        options={ranges.map((r) => ({ key: r.key, label: r.label }))}
        selected={active.key}
        onChange={handleChange}
      />
      <ResultFigures results={results} countUp />
      <GithubHeatmap days={active.days} />
    </>
  );
}
