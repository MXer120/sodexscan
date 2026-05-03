import ToolsPage from "@/app/components/tools/ToolsPage";
import { GridPattern } from "@/app/components/ui/grid-pattern";

export const metadata = {
  title: "Tools | CommunityScan SoDEX",
  description: "A collection of on-chain and off-chain tools: LARP Detector, Reverse Search, and RefCode Identifier.",
};

export default function Tools() {
  return (
    <div className="relative min-h-full bg-background">
      <GridPattern className="pointer-events-none fixed inset-0" />
      <div className="relative z-10">
        <ToolsPage />
      </div>
    </div>
  );
}
