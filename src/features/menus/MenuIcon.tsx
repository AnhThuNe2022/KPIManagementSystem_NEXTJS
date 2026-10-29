import * as icons from "@radix-ui/react-icons";

export const menuIconOptions = Object.keys(icons).sort().map(name => ({
  id: name, name: name.replace(/Icon$/, ""), icon: <MenuIcon name={name} />,
}));

export function MenuIcon({ name, className, fallback = false }: { name?: string | null; className?: string; fallback?: boolean }) {
  const Icon = name && Object.hasOwn(icons, name) ? icons[name as keyof typeof icons] : fallback ? icons.HamburgerMenuIcon : null;
  return Icon ? <Icon className={className} aria-hidden="true" /> : null;
}
