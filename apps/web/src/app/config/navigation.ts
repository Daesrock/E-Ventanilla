/** Menú y títulos centralizados. Las visibilidades representan solo perfiles de demo. */
import {
  LayoutDashboard,
  Building2,
  Files,
  CalendarClock,
  CalendarDays,
  ChartNoAxesCombined,
  UsersRound,
  Settings2,
  type LucideIcon,
} from 'lucide-react';

export interface NavigationItem {
  path: string;
  label: string;
  icon: LucideIcon;
  section: 'principal' | 'sistema';
}
export const navigation: NavigationItem[] = [
  { path: '/inicio', label: 'Inicio', icon: LayoutDashboard, section: 'principal' },
  { path: '/sedes', label: 'Sedes', icon: Building2, section: 'principal' },
  { path: '/tramites', label: 'Trámites', icon: Files, section: 'principal' },
  { path: '/disponibilidad', label: 'Horarios', icon: CalendarClock, section: 'principal' },
  { path: '/citas', label: 'Citas', icon: CalendarDays, section: 'principal' },
  { path: '/reportes', label: 'Reportes', icon: ChartNoAxesCombined, section: 'principal' },
  { path: '/usuarios', label: 'Responsables', icon: UsersRound, section: 'principal' },
  { path: '/configuracion', label: 'Configuración', icon: Settings2, section: 'sistema' },
];
