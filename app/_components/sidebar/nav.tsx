import { NavItem } from "./nav-item";

const navigationItems = [
  { href: "/", label: "Inicio" },
  { href: "/inventory", label: "Inventario" },
  { href: "/sales/new", label: "Nueva venta" },
  { href: "/sales", label: "Ventas" },
  { href: "/settings", label: "Ajustes" },
];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href;
}

type SidebarNavProps = {
  pathname: string;
};

export function SidebarNav({ pathname }: SidebarNavProps) {
  return (
    <nav aria-label="Navegación principal" className="flex flex-wrap gap-2 lg:flex-col">
      {navigationItems.map((item) => (
        <NavItem
          key={item.href}
          href={item.href}
          label={item.label}
          active={isActiveRoute(pathname, item.href)}
        />
      ))}
    </nav>
  );
}

