export interface FarmingMethod {
  id: string;
  name: string;
  nameTe: string;
  purpose: string;
  /** Tailwind classes from the design system for the method's chip. */
  tone: string;
}

export const METHODS: FarmingMethod[] = [
  {
    id: "beejamrutham",
    name: "Beejamrutham",
    nameTe: "బీజామృతం",
    purpose: "Seed treatment that protects seedlings from soil-borne disease.",
    tone: "bg-turmeric-soft text-soil",
  },
  {
    id: "jeevamrutham",
    name: "Jeevamrutham",
    nameTe: "జీవామృతం",
    purpose: "Liquid culture that multiplies soil microbes and feeds the crop.",
    tone: "bg-leaf-soft text-primary",
  },
  {
    id: "ghanajeevamrutham",
    name: "Ghanajeevamrutham",
    nameTe: "ఘనజీవామృతం",
    purpose: "Solid, dried form of Jeevamrutham applied before sowing.",
    tone: "bg-soil-soft text-soil",
  },
  {
    id: "neemastram",
    name: "Neemastram",
    nameTe: "నీమాస్త్రం",
    purpose: "Neem based spray for sucking pests and small caterpillars.",
    tone: "bg-leaf-soft text-primary",
  },
  {
    id: "agniastram",
    name: "Agniastram",
    nameTe: "అగ్నిఅస్త్రం",
    purpose: "Strong spray for stem borers, pod borers and fruit borers.",
    tone: "bg-saffron-soft text-saffron",
  },
  {
    id: "brahmastram",
    name: "Brahmastram",
    nameTe: "బ్రహ్మాస్త్రం",
    purpose: "Spray for large caterpillars and severe pest attacks.",
    tone: "bg-sky-soft text-sky",
  },
  {
    id: "dashaparni",
    name: "Dashaparni Kashayam",
    nameTe: "దశపర్ణి కషాయం",
    purpose: "Ten-leaf extract that controls most pests and diseases.",
    tone: "bg-turmeric-soft text-soil",
  },
  {
    id: "mulching",
    name: "Mulching",
    nameTe: "ఆచ్ఛాదన",
    purpose: "Cover the soil with crop residue to keep moisture in.",
    tone: "bg-soil-soft text-soil",
  },
];

export function findMethod(id: string) {
  return METHODS.find((method) => method.id === id) ?? METHODS[1];
}
