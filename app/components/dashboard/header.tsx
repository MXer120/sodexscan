"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { SidebarTrigger } from "@/app/components/ui/sidebar";
import { ThemeToggle } from "@/app/components/theme-toggle";
import {
  PanelLeft,
  Check,
  RefreshCw,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/app/components/ui/dropdown-menu";
import { useDashboardStore, type LayoutDensity } from "@/app/store/dashboard-store";

const densityLabels: Record<LayoutDensity, string> = {
  default: "Default",
  compact: "Compact",
  comfortable: "Comfortable",
};

interface DashboardHeaderProps {
  title?: string;
  showLayoutEditor?: boolean;
}

export function DashboardHeader({
  title = "Dashboard",
  showLayoutEditor = false,
}: DashboardHeaderProps) {
  const showAlertBanner = useDashboardStore((state) => state.showAlertBanner);
  const showStatsCards = useDashboardStore((state) => state.showStatsCards);
  const showChart = useDashboardStore((state) => state.showChart);
  const showTable = useDashboardStore((state) => state.showTable);
  const layoutDensity = useDashboardStore((state) => state.layoutDensity);
  const setShowAlertBanner = useDashboardStore((state) => state.setShowAlertBanner);
  const setShowStatsCards = useDashboardStore((state) => state.setShowStatsCards);
  const setShowChart = useDashboardStore((state) => state.setShowChart);
  const setShowTable = useDashboardStore((state) => state.setShowTable);
  const setLayoutDensity = useDashboardStore((state) => state.setLayoutDensity);
  const resetLayout = useDashboardStore((state) => state.resetLayout);

  return (
    <header className="w-full flex items-center gap-3 px-4 sm:px-6 py-4 border-b bg-background">
      <SidebarTrigger className="-ml-1" />
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="hidden sm:flex items-center -space-x-2 hover:opacity-80 transition-opacity">
            {["sarah","james","emily"].map((seed) => (
              <Avatar key={seed} className="size-7 ring-2 ring-background">
                <AvatarImage src={`https://api.dicebear.com/9.x/glass/svg?seed=${seed}`} />
                <AvatarFallback>{seed[0].toUpperCase()}</AvatarFallback>
              </Avatar>
            ))}
            <div className="flex size-7 items-center justify-center rounded-full ring-2 ring-background bg-muted">
              <Plus className="size-3" />
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">Team Members</DropdownMenuLabel>
          {[
            { seed: "sarah", name: "Sarah M.", role: "Designer" },
            { seed: "james", name: "James K.", role: "Engineer" },
            { seed: "emily", name: "Emily R.", role: "Manager" },
          ].map((m) => (
            <DropdownMenuItem key={m.seed} className="gap-3">
              <Avatar className="size-7">
                <AvatarImage src={`https://api.dicebear.com/9.x/glass/svg?seed=${m.seed}`} />
                <AvatarFallback>{m.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{m.name}</span>
                <span className="text-xs text-muted-foreground">{m.role}</span>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2">
            <UserPlus className="size-4" />Invite member
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2">
            <Users className="size-4" />Manage team
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="hidden sm:block h-5 w-px bg-border" />

      <ThemeToggle />

      {showLayoutEditor && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
              <PanelLeft className="size-4" />
              Edit Layout
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
              Layout Density
            </DropdownMenuLabel>
            {(Object.keys(densityLabels) as LayoutDensity[]).map((key) => (
              <DropdownMenuItem key={key} onClick={() => setLayoutDensity(key)}>
                {densityLabels[key]}
                {layoutDensity === key && (
                  <Check className="size-4 ml-auto" />
                )}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
              Show / Hide Sections
            </DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={showAlertBanner}
              onCheckedChange={setShowAlertBanner}
            >
              Alert Banner
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showStatsCards}
              onCheckedChange={setShowStatsCards}
            >
              Statistics Cards
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showChart}
              onCheckedChange={setShowChart}
            >
              Financial Flow Chart
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={showTable}
              onCheckedChange={setShowTable}
            >
              Employees Table
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={resetLayout}>
              <RefreshCw className="size-4 mr-2" />
              Reset to Default
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
