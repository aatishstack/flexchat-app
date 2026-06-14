"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { forwardRef, useImperativeHandle, useRef } from "react";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

export interface TurnstileWidgetRef {
  reset: () => void;
}

export const TurnstileWidget = forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(
  ({ onVerify, onExpire, onError }, ref) => {
    const turnstileRef = useRef<TurnstileInstance>(null);
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    useImperativeHandle(ref, () => ({
      reset: () => {
        turnstileRef.current?.reset();
      },
    }));

    if (!siteKey) {
      if (process.env.NODE_ENV === "production") {
        console.error("[TURNSTILE] Site key is missing in production.");
      }
      return null;
    }

    return (
      <div className="flex justify-center my-4">
        <Turnstile
          ref={turnstileRef}
          siteKey={siteKey}
          onSuccess={onVerify}
          onExpire={onExpire}
          onError={onError}
          options={{
            theme: "dark",
          }}
        />
      </div>
    );
  }
);

TurnstileWidget.displayName = "TurnstileWidget";
