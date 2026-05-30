"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Phone,
  ShieldCheck,
} from "lucide-react";
import {
  motion,
} from "framer-motion";

import { useAuth } from "@/hooks/useAuth";
import { updateCurrentUser } from "@/services/user.service";
import { useToastStore } from "@/store/toast-store";
import { useAuthStore } from "@/stores/auth.store";

const COUNTRIES = [
  {
    id: "in",
    label: "India",
    code: "91",
    example: "98765 43210",
    min: 10,
    max: 10,
  },
  {
    id: "us",
    label: "United States",
    code: "1",
    example: "555 010 2020",
    min: 10,
    max: 10,
  },
  {
    id: "gb",
    label: "United Kingdom",
    code: "44",
    example: "7400 123456",
    min: 9,
    max: 10,
  },
  {
    id: "ae",
    label: "United Arab Emirates",
    code: "971",
    example: "50 123 4567",
    min: 8,
    max: 9,
  },
  {
    id: "ca",
    label: "Canada",
    code: "1",
    example: "416 555 0100",
    min: 10,
    max: 10,
  },
  {
    id: "au",
    label: "Australia",
    code: "61",
    example: "412 345 678",
    min: 9,
    max: 9,
  },
  {
    id: "de",
    label: "Germany",
    code: "49",
    example: "1512 3456789",
    min: 10,
    max: 12,
  },
] as const;

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export default function PhoneOnboardingGate() {
  const {
    user,
    isHydrated,
    isAuthenticated,
  } = useAuth();
  const updateUser = useAuthStore(
    (state) => state.updateUser,
  );
  const pushToast = useToastStore(
    (state) => state.pushToast,
  );
  const [countryCode, setCountryCode] =
    useState("in");
  const [phone, setPhone] =
    useState("");
  const [isSaving, setIsSaving] =
    useState(false);
  const [saveError, setSaveError] =
    useState<string | null>(null);

  const country = useMemo(
    () =>
      COUNTRIES.find(
        (item) => item.id === countryCode,
      ) ?? COUNTRIES[0],
    [countryCode],
  );
  const digits = onlyDigits(phone);
  const normalizedPhone = `+${country.code}${digits}`;
  const phoneIsValid =
    digits.length >= country.min &&
    digits.length <= country.max;
  const phoneNumberKnown =
    user?.phoneNumber !== undefined;
  const needsPhoneNumber =
    phoneNumberKnown && !user?.phoneNumber;

  if (
    !isHydrated ||
    !isAuthenticated ||
    !user ||
    !phoneNumberKnown ||
    !needsPhoneNumber
  ) {
    return null;
  }

  async function savePhoneNumber() {
    if (!phoneIsValid || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const updatedUser = await updateCurrentUser({
        phoneNumber: normalizedPhone,
      });

      updateUser(updatedUser);
      setSaveError(null);
      pushToast({
        title: "Mobile number added",
        message: "Your profile is ready across FlexChat.",
        variant: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Please check the number and try again.";

      setSaveError(message);
      pushToast({
        title: "Could not save mobile number",
        message,
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[320] flex items-end justify-center bg-black/70 p-3 text-white backdrop-blur-2xl sm:items-center sm:p-5">
      <motion.div
        initial={{
          opacity: 0,
          y: 24,
          scale: 0.96,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          type: "spring",
          stiffness: 280,
          damping: 30,
        }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#07111B]/95 shadow-2xl shadow-black/40"
      >
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2481CC]/15 text-[#7CC5FF]">
              <Phone size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">
                Add your mobile number
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Required once for account discovery and profile identity.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <label
            htmlFor="phone-country"
            className="block text-sm font-medium text-zinc-300"
          >
            Country
          </label>
          <select
            id="phone-country"
            value={countryCode}
            onChange={(event) => {
              setCountryCode(event.target.value);
              setPhone("");
              setSaveError(null);
            }}
            disabled={isSaving}
            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm text-white outline-none transition focus:border-[#2481CC]/55 disabled:cursor-wait disabled:opacity-70"
          >
            {COUNTRIES.map((item) => (
              <option
                key={item.id}
                value={item.id}
                className="bg-[#07111B]"
              >
                {item.label} (+{item.code})
              </option>
            ))}
          </select>

          <div>
            <label
              htmlFor="phone-number"
              className="block text-sm font-medium text-zinc-300"
            >
              Mobile number
            </label>
            <div
              className={`mt-2 flex overflow-hidden rounded-2xl border bg-white/[0.05] transition ${
                saveError
                  ? "border-rose-300/45 focus-within:border-rose-300/70"
                  : "border-white/10 focus-within:border-[#2481CC]/55"
              }`}
            >
              <div className="flex h-12 items-center border-r border-white/10 px-4 text-sm font-semibold text-[#9BD0FF]">
                +{country.code}
              </div>
              <input
                id="phone-number"
                inputMode="tel"
                autoComplete="tel-national"
                value={phone}
                onChange={(event) => {
                  setSaveError(null);
                  setPhone(
                    event.target.value
                      .replace(/[^\d\s()-]/g, "")
                      .slice(0, 18),
                  );
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void savePhoneNumber();
                  }
                }}
                disabled={isSaving}
                placeholder={country.example}
                className="h-12 min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-zinc-600 disabled:cursor-wait"
              />
            </div>
            {saveError ? (
              <div className="mt-2 flex items-start gap-2 rounded-2xl border border-rose-300/15 bg-rose-500/[0.08] px-3 py-2 text-xs leading-relaxed text-rose-100">
                <AlertCircle
                  size={14}
                  className="mt-0.5 shrink-0 text-rose-200"
                />
                <span>{saveError}</span>
              </div>
            ) : (
              <p
                className={`mt-2 text-xs ${
                  digits && !phoneIsValid
                    ? "text-amber-200"
                    : "text-zinc-500"
                }`}
              >
                {digits && !phoneIsValid
                  ? `Use ${country.min === country.max ? country.min : `${country.min}-${country.max}`} digits for ${country.label}.`
                  : "You will not be asked again after this is saved."}
              </p>
            )}
          </div>

          <div className="grid grid-cols-[2.5rem_1fr] gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-300">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2481CC]/15 text-[#9BD0FF]">
              <ShieldCheck size={18} />
            </div>
            <p className="leading-relaxed">
              Number changes will require verification later. This step only
              attaches your first mobile number to the account.
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 p-5">
          <button
            type="button"
            onClick={() => {
              void savePhoneNumber();
            }}
            disabled={!phoneIsValid || isSaving}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2481CC] text-sm font-semibold text-white transition hover:bg-[#2F8ED8] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isSaving ? (
              <Loader2
                size={18}
                className="motion-safe:animate-spin"
              />
            ) : (
              <CheckCircle2 size={18} />
            )}
            Continue
          </button>
        </div>
      </motion.div>
    </div>
  );
}
