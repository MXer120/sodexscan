import { cn } from "@/app/lib/utils";

export function AiLogo({ className, green }: { className?: string; green?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/favicon.png"
      alt="CommunityScan AI"
      className={cn("shrink-0 object-contain", className)}
      style={green ? { filter: "hue-rotate(140deg) saturate(1.5) brightness(1.05)" } : undefined}
    />
  );
}
