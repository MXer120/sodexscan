import { cn } from "@/app/lib/utils";

export function AiLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/favicon.png"
      alt="CommunityScan AI"
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
