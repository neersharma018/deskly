const root = "/media/after-hours";

export const editorial = {
  keyboard: `${root}/keyboard.webp`,
  detail: `${root}/key-detail.webp`,
  workspace: `${root}/workspace.webp`,
  focus: `${root}/focus.webp`,
  night: `${root}/night.webp`,
  walnut: `${root}/walnut.webp`,
} as const;

export const workspaceEdition = {
  hero: "/media/workspace-edition/walnut-workspace.webp",
  assembly: "/media/workspace-edition/keyboard-assembly.webp",
  craftsmanship: "/media/workspace-edition/keyboard-edge.webp",
} as const;

// The seed uses category artwork as a stand-in. Store-managed image URLs pass through.
const sampleMedia: Record<string, { src: string; alt: string }> = {
  "/media/keys.webp": { src: editorial.keyboard, alt: "Graphite mechanical keyboard on a wooden desk" },
  "/media/mats.webp": { src: `${root}/mat.webp`, alt: "Felt desk mat beneath a keyboard and trackpad" },
  "/media/lighting.webp": { src: `${root}/lamp.webp`, alt: "Black desk lamp illuminating a workspace" },
  "/media/stands.webp": { src: `${root}/stand.webp`, alt: "Laptop on an adjustable desk stand" },
  "/media/cables.webp": { src: `${root}/cable.webp`, alt: "Close-up of a cable connector against a dark surface" },
  "/media/tech.webp": { src: `${root}/hub.webp`, alt: "USB-C hub beside a laptop" },
};

export function samplePhoto(src: string, slug?: string) {
  if (src === "/media/keys.webp" && slug?.includes("mouse")) {
    return { src: `${root}/mouse.webp`, alt: "Black wireless mouse on a dark surface" };
  }
  return Object.hasOwn(sampleMedia, src) ? sampleMedia[src] : undefined;
}
