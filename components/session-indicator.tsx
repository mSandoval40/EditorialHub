"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { clearStoredToken, fetchMe, getStoredToken } from "@/lib/api";

type SessionIndicatorProps = {
  style?: CSSProperties;
  activePrefix?: string;
  visitorLabel?: string;
};

export function SessionIndicator({
  style,
  activePrefix = "",
  visitorLabel = "Visitante",
}: SessionIndicatorProps) {
  const [label, setLabel] = useState(visitorLabel);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const token = getStoredToken();

      if (!token) {
        if (!cancelled) {
          setLabel(visitorLabel);
        }
        return;
      }

      try {
        const me = await fetchMe(token);
        if (!cancelled) {
          setLabel(activePrefix ? `${activePrefix}${me.email}` : me.email);
        }
      } catch {
        clearStoredToken();
        if (!cancelled) {
          setLabel(visitorLabel);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [activePrefix, visitorLabel]);

  return <span style={style}>{label}</span>;
}
