import { initials } from "@/lib/format";

export default function Avatar({
  name,
  image,
}: {
  name: string;
  image: string | null;
}) {
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element -- Google avatar URL, any host
    <img
      src={image}
      alt=""
      className="h-8 w-8 shrink-0 rounded-full object-cover"
    />
  ) : (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold text-muted"
    >
      {initials(name)}
    </span>
  );
}
