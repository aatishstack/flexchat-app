"use client";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { ThemeProvider } from "next-themes";

import { Toaster } from "sonner";

const queryClient = new QueryClient();

interface Props {
  children: React.ReactNode;
}

export default function Providers({
  children,
}: Props) {
  return (
    <QueryClientProvider client={queryClient}>

      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
      >
        {children}

        <Toaster richColors />
      </ThemeProvider>
    </QueryClientProvider>
  );
}