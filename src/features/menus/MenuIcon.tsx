import * as icons from "@radix-ui/react-icons";

export const menuIconOptions = Object.keys(icons).sort().map(name => ({
  id: name, name: name.replace(/Icon$/, ""), icon: <MenuIcon name={name} />,
}));

export function MenuIcon({ name }: { name?: string | null }) {
  const Icon = name && Object.hasOwn(icons, name) ? icons[name as keyof typeof icons] : null;
  return Icon ? <Icon aria-hidden="true" /> : null;
}
