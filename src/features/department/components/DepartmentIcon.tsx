import type { CSSProperties } from "react";
import {
  Component1Icon,
  MagnifyingGlassIcon,
  PlusIcon,
  Cross2Icon,
  CheckIcon,
  ChevronDownIcon,
  Pencil2Icon,
  TrashIcon,
  ReloadIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  LayersIcon,
  CubeIcon,
  PersonIcon,
  BarChartIcon,
  FileTextIcon,
  GearIcon,
  GlobeIcon,
  IdCardIcon,
  MixerHorizontalIcon,
  CopyIcon,
  GridIcon,
  RowsIcon,
  ComponentInstanceIcon,
  ActivityLogIcon,
  PauseIcon,
  CheckCircledIcon,
  BackpackIcon,
  KeyboardIcon,
  LightningBoltIcon,
  CounterClockwiseClockIcon,
} from "@radix-ui/react-icons";

const icons = {
  building: Component1Icon,
  search: MagnifyingGlassIcon,
  plus: PlusIcon,
  close: Cross2Icon,
  check: CheckIcon,
  down: ChevronDownIcon,
  edit: Pencil2Icon,
  trash: TrashIcon,
  refresh: ReloadIcon,
  alert: ExclamationTriangleIcon,
  arrow: ArrowRightIcon,
  layers: LayersIcon,
  cube: CubeIcon,
  person: PersonIcon,
  chart: BarChartIcon,
  file: FileTextIcon,
  gear: GearIcon,
  globe: GlobeIcon,
  idCard: IdCardIcon,
  sliders: MixerHorizontalIcon,
  copy: CopyIcon,
  grid: GridIcon,
  rows: RowsIcon,
  org: ComponentInstanceIcon,
  pulse: ActivityLogIcon,
  pause: PauseIcon,
  ok: CheckCircledIcon,
  briefcase: BackpackIcon,
  keyboard: KeyboardIcon,
  bolt: LightningBoltIcon,
  clock: CounterClockwiseClockIcon,
};

export type DepartmentIconName = keyof typeof icons;

export function Icon({
  name,
  className,
  style,
}: {
  name: DepartmentIconName;
  className?: string;
  style?: CSSProperties;
}) {
  const Component = icons[name];
  return <Component className={className} style={style} aria-hidden="true" />;
}

export function resolveDepartmentIcon(name: string): DepartmentIconName {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

  if (normalized.includes("cong nghe") || normalized.includes("cntt") || normalized.includes("it") || normalized.includes("so hoa")) {
    return "gear";
  }
  if (normalized.includes("dieu hanh") || normalized.includes("hoi dong") || normalized.includes("tong giam doc") || normalized.includes("ban giam doc")) {
    return "layers";
  }
  if (normalized.includes("nhan su") || normalized.includes("hanh chinh") || normalized.includes("dao tao") || normalized.includes("tuyen dung")) {
    return "person";
  }
  if (normalized.includes("tai chinh") || normalized.includes("ke toan") || normalized.includes("dau tu") || normalized.includes("kinh doanh") || normalized.includes("ke hoach")) {
    return "chart";
  }
  if (normalized.includes("phap che") || normalized.includes("kiem soát") || normalized.includes("kiem toan") || normalized.includes("thanh tra") || normalized.includes("ho so")) {
    return "file";
  }
  if (normalized.includes("du an") || normalized.includes("ky thuat") || normalized.includes("xay dung") || normalized.includes("cong truong") || normalized.includes("van hanh")) {
    return "cube";
  }
  if (normalized.includes("truyen thong") || normalized.includes("doi ngoai") || normalized.includes("quan he")) {
    return "globe";
  }
  return "building";
}
