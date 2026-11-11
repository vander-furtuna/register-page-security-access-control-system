import {
  ActivityIcon,
  LayoutGridIcon,
  MemoryStickIcon,
  UserPlusIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { LockDeviceIcon } from "@/components/brand/icons";

export type NavItem = {
  href: string;
  label: string;
  /** Rótulo curto da barra inferior do celular. */
  short?: string;
  icon: LucideIcon | ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  /** Aparece na barra inferior (≤ 640px). */
  mobile?: boolean;
};

export const mainNav: NavItem[] = [
  { href: "/", label: "Visão geral", short: "Início", icon: LayoutGridIcon, mobile: true },
  { href: "/membros", label: "Membros", icon: UsersIcon, mobile: true },
  { href: "/cadastro", label: "Novo cadastro", short: "Cadastro", icon: UserPlusIcon, mobile: true },
  { href: "/registros", label: "Registros de acesso", short: "Registros", icon: ActivityIcon, mobile: true },
];

/** Grupo "Fechadura": o que mexe na memória do aparelho. */
export const lockNav: NavItem[] = [
  { href: "/credenciais", label: "Credenciais", icon: MemoryStickIcon },
  { href: "/dispositivo", label: "Dispositivo", icon: LockDeviceIcon },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
