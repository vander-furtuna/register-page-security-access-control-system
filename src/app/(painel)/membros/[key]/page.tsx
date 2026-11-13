import type { Metadata } from "next";

import { MemberScreen } from "./member-screen";

export const metadata: Metadata = { title: "Membro" };

/** Tela 04 · Detalhe do membro (`docs/design/telas/04-membro.png`). `key` é a chave de `users/*`. */
export default async function MembroPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <MemberScreen memberKey={decodeURIComponent(key)} />;
}
