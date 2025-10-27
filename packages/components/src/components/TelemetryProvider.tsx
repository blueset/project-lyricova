"use client";

import React, { Suspense, useEffect, type ReactNode } from "react";
import posthog from "posthog-js";
import { PostHogProvider, usePostHog } from "posthog-js/react";
import clarity from "@microsoft/clarity";
import { usePathname, useSearchParams } from "next/navigation";

interface TelemetryProviderProps {
  children: ReactNode;
  clarityProjectId?: string;
  postHogKey?: string;
  postHogHost?: string;
}

export function TelemetryProvider({
  children,
  clarityProjectId,
  postHogKey,
  postHogHost,
}: TelemetryProviderProps) {
  useEffect(() => {
    // Initialize Microsoft Clarity if project ID is provided
    if (clarityProjectId) {
      clarity.init(clarityProjectId);
      (window as any).clarity("consentv2", {
        ad_Storage: "granted",
        analytics_Storage: "granted",
      });
    }

    // Initialize PostHog if API key is provided
    if (postHogKey) {
      posthog.init(postHogKey, {
        api_host: postHogHost || "https://us.i.posthog.com",
        ui_host: "https://us.posthog.com",
        loaded: (posthog) => {
          if (process.env.NODE_ENV === "development") {
            posthog.debug();
          }
        },
        capture_pageview: false, // Disable automatic pageview capture, we'll handle it manually
        capture_pageleave: true, // Capture when user leaves the page
      });
    }

    return () => {
      // Cleanup PostHog if it was initialized
      if (postHogKey && posthog) {
        posthog.reset();
      }
    };
  }, [clarityProjectId, postHogKey, postHogHost]);

  // If PostHog is configured, wrap children with PostHogProvider
  if (postHogKey) {
    return (
      <PostHogProvider client={posthog}>
        <SuspendedPostHogPageView />
        {children}
      </PostHogProvider>
    );
  }

  // If only Clarity is configured or no analytics, just render children
  return <>{children}</>;
}

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  // Track pageviews
  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + "?" + searchParams.toString();
      }

      posthog.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams, posthog]);

  return null;
}

// Wrap PostHogPageView in Suspense to avoid the useSearchParams usage above
// from de-opting the whole app into client-side rendering
// See: https://nextjs.org/docs/messages/deopted-into-client-rendering
function SuspendedPostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  );
}
