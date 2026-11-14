import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança em todas as rotas. Sem CSP completa de propósito: o Firebase usa
 * vários domínios (Auth, Realtime Database por WebSocket, popup do Google) e uma CSP errada
 * derruba o login; `frame-ancestors` já impede o painel de ser embutido em outro site.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // o login com Google abre um popup que precisa falar com esta janela
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
