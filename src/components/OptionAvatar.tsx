import { hueFromString, initialsFromString } from "../lib/avatarColor";

export default function OptionAvatar({
  name,
  size = "lg",
}: {
  name: string;
  size?: "sm" | "lg";
}) {
  const hue = hueFromString(name);
  const initials = initialsFromString(name);
  const dims = size === "lg" ? "h-14 w-14 text-xl" : "h-8 w-8 text-xs";

  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-2xl font-bold text-white shadow-sm ${dims}`}
      style={{
        background: `linear-gradient(135deg, oklch(0.62 0.12 ${hue}), oklch(0.5 0.14 ${(hue + 40) % 360}))`,
      }}
    >
      {initials}
    </span>
  );
}
