import type { SVGProps } from "react";

/**
 * Ícones de marca do PET Lock, recortados das janelas do logo
 * (`docs/design-system/assets/`). Traço em `currentColor`: a cor vem da classe
 * (`text-finger-ink`, `text-rfid-ink`…). Use no lugar de `Fingerprint`/`Nfc` do Lucide.
 * Decorativos por padrão (`aria-hidden`); passe `aria-label` + `role="img"` quando o ícone
 * carregar significado sozinho.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };

function a11y(props: IconProps) {
  const labelled = props["aria-label"] !== undefined || props["aria-labelledby"] !== undefined;
  return labelled ? { role: "img" } : { "aria-hidden": true as const };
}

export function FingerIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="19 75 36 36"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...a11y(props)}
      {...props}
    >
      <path d="M28.349 103.019C28.3757 102.974 28.4031 102.929 28.4312 102.885C30.4779 99.6311 31.6627 95.7836 31.6627 91.6406C31.6627 88.3026 34.3687 85.5965 37.7069 85.5965C41.045 85.5965 43.751 88.3026 43.751 91.6406C43.751 93.1775 43.6463 94.6907 43.4438 96.1738M40.2443 106.515C41.1687 104.67 41.9265 102.727 42.4981 100.707M48.299 102.417C49.2736 98.9926 49.7953 95.3776 49.7953 91.6405C49.7953 84.9643 44.3833 79.5522 37.7071 79.5522C35.5053 79.5522 33.441 80.1409 31.663 81.1694M24.1078 98.2348C25.0759 96.2421 25.6189 94.0047 25.6189 91.6405C25.6189 89.4387 26.2075 87.3744 27.2361 85.5963M37.7069 91.6408C37.7069 96.9554 36.1826 101.914 33.5474 106.103" />
    </svg>
  );
}

export function RfidIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="72.9 72.65 40 40"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...a11y(props)}
      {...props}
    >
      <path d="M100.633 84.9447C104.889 89.2008 104.889 96.1012 100.633 100.357M85.2208 100.357C80.9648 96.101 80.9648 89.2006 85.2208 84.9447M80.0833 105.495C72.99 98.4013 72.99 86.9006 80.0833 79.8072M105.771 79.8073C112.864 86.9007 112.864 98.4013 105.771 105.495M96.5598 92.651C96.5598 94.6572 94.9334 96.2837 92.927 96.2837C90.9207 96.2837 89.2943 94.6572 89.2943 92.651C89.2943 90.6446 90.9207 89.0182 92.927 89.0182C94.9334 89.0182 96.5598 90.6446 96.5598 92.651Z" />
    </svg>
  );
}

/**
 * Símbolo simplificado da fechadura. `colored` pinta as janelas com as cores de marca
 * (LCD verde, digital azul, cartão amarelo); sem ele, tudo em `currentColor`.
 */
export function LockDeviceIcon({ size = 18, colored = false, ...props }: IconProps & { colored?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...a11y(props)}
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <rect x="6" y="6" width="12" height="4" rx="1" className={colored ? "stroke-lock" : undefined} />
      <rect x="6" y="13" width="5" height="5" rx="1" className={colored ? "stroke-finger" : undefined} />
      <rect x="13" y="13" width="5" height="5" rx="1" className={colored ? "stroke-rfid" : undefined} />
    </svg>
  );
}
