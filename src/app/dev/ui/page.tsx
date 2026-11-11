import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Showcase } from "./showcase";

export const metadata: Metadata = { title: "Componentes", robots: { index: false } };

/**
 * Vitrine dos componentes base no design system, para comparar com
 * `docs/design-system/componentes/*.html`. Só existe em desenvolvimento.
 */
export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Showcase />;
}
