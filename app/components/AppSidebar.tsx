"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/app/components/ui/sidebar";
import { Input } from "@/app/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/app/components/ui/dropdown-menu";
import { cn } from "@/app/lib/utils";
import { GradientAvatar } from "@/app/components/ui/gradient-avatar";
import { useSessionContext } from "@/app/lib/SessionContext";
import { supabase } from "@/app/lib/supabaseClient";
import {
  LayoutDashboard, Search, BookmarkCheck, Bell, Repeat2,
  Folder, ChevronDown, ChevronRight, MessageSquare, Settings, HelpCircle,
  Plus, Check, User, LogOut, Sparkles, GitMerge, BarChart3,
  Wrench, FileBarChart, FolderSearch, ShieldAlert, FlaskConical,
  MoreHorizontal, Map, Languages, Key,
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard",  href: "/",          exact: true  },
  { icon: Search,          label: "Scanner",     href: "/tracker",   exact: false },
  { icon: BookmarkCheck,   label: "Watchlist",   href: "/watchlist", exact: false },
  { icon: Bell,            label: "Alerts",      href: "/alerts",    exact: false },
  { icon: Repeat2,         label: "Copy Trade",  href: "/copy",      exact: false },
];

// All additional pages shown in the "More" hover popup
const moreItems = [
  { icon: GitMerge,     label: "Workflows",      href: "/workflow"       },
  { icon: BarChart3,    label: "Aggregator",     href: "/aggregator"     },
  { icon: FileBarChart, label: "Reports",        href: "/reports"        },
  { icon: Wrench,       label: "Tools",          href: "/tools"          },
  { icon: ShieldAlert,  label: "LARP Detector",  href: "/larp-detector"  },
  { icon: FolderSearch, label: "Reverse Search", href: "/reverse-search" },
  { icon: FlaskConical, label: "Incoming",       href: "/incoming"       },
  { icon: Map,          label: "Roadmap",        href: "/roadmap"        },
];

const favorites = [
  { icon: Folder, label: "Reimbursements" },
  { icon: Folder, label: "Timesheets"     },
  { icon: Folder, label: "Overtime Logs"  },
];


// Portal-based hover popup — escapes sidebar overflow clipping
function MoreMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.right + 8 });
    }
    setOpen(true);
  };
  const hide = () => {
    timerRef.current = setTimeout(() => setOpen(false), 120);
  };

  const popup = open ? createPortal(
    <div
      className="fixed w-52 bg-popover border border-border rounded-lg shadow-xl p-1 z-[9999]"
      style={{ top: pos.top, left: pos.left }}
      onMouseEnter={() => { if (timerRef.current) clearTimeout(timerRef.current); }}
      onMouseLeave={hide}
    >
      {moreItems.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </div>,
    document.body
  ) : null;

  return (
    <SidebarMenuItem>
      <div ref={triggerRef} onMouseEnter={show} onMouseLeave={hide}>
        <SidebarMenuButton
          className="h-[38px]"
          isActive={moreItems.some(i => pathname.startsWith(i.href))}
        >
          <MoreHorizontal className="size-5" />
          <span className="flex-1">More</span>
          <ChevronRight className="size-4 text-muted-foreground opacity-60" />
        </SidebarMenuButton>
      </div>
      {popup}
    </SidebarMenuItem>
  );
}

export default function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const [favoritesOpen, setFavoritesOpen] = React.useState(true);
  const { user, openAuthModal } = useSessionContext();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href) && href !== "/";

  return (
    <Sidebar collapsible="offcanvas" className="lg:!border-r-0" {...props}>

      {/* ── Header ── */}
      <SidebarHeader className="p-5 pb-0">
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 outline-none">
              <div className="size-7 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center ring-1 ring-white/40 shadow-lg" />
              <span className="font-medium text-muted-foreground">CommunityScan</span>
              <ChevronDown className="size-3 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">Workspaces</DropdownMenuLabel>
              <DropdownMenuItem>
                <div className="size-5 rounded-full bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 mr-2" />
                CommunityScan Sodex <Check className="size-4 ml-auto" />
              </DropdownMenuItem>
              <DropdownMenuItem>
                <div className="size-5 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 mr-2" />
                Workspace 2
              </DropdownMenuItem>
              <DropdownMenuItem>
                <div className="size-5 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 mr-2" />
                Workspace 3
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem><Plus className="size-4 mr-2" />Create Workspace</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem><Settings className="size-4 mr-2" />Workspace Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive"><LogOut className="size-4 mr-2" />Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarHeader>

      {/* ── Content ── */}
      <SidebarContent className="px-5 pt-5">

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search Anything..." className="pl-9 pr-10 h-9 bg-background" />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-muted px-1.5 py-0.5 rounded text-[11px] text-muted-foreground font-medium">⌘K</div>
        </div>

        {/* CommunityScan AI — below search */}
        <SidebarGroup className="p-0 mb-1">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/ai"} className="h-[38px]">
                  <Link href="/ai">
                    <Sparkles className="size-5 text-[#6e3ff3]" />
                    <span className="bg-clip-text text-transparent bg-linear-to-r from-[#6e3ff3] to-[#df3674]">
                      CommunityScan AI
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Main nav */}
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton asChild isActive={active} className="h-[38px]">
                      <Link href={item.href}>
                        <item.icon className="size-5" />
                        <span className="flex-1">{item.label}</span>
                        {active && <ChevronRight className="size-4 text-muted-foreground opacity-60" />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* More — hover popup with all extra pages */}
              <MoreMenu pathname={pathname} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Favorites */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="flex items-center gap-1.5 px-0 text-[10px] font-semibold tracking-wider text-muted-foreground">
            <button onClick={() => setFavoritesOpen(!favoritesOpen)} className="flex items-center gap-1.5 cursor-pointer">
              <ChevronDown className={cn("size-3.5 transition-transform", !favoritesOpen && "-rotate-90")} />
              FAVORITES
            </button>
          </SidebarGroupLabel>
          {favoritesOpen && (
            <SidebarGroupContent>
              <SidebarMenu className="mt-2">
                {favorites.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton className="h-[38px]">
                      <item.icon className="size-5 text-foreground" />
                      <span className="text-muted-foreground">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>


      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="px-5 pb-5">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-accent transition-colors text-left outline-none cursor-pointer">
                <GradientAvatar storageKey="sidebar-user-avatar" size={32} rounded="full" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate leading-none mb-0.5">My Account</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <MoreHorizontal className="size-4 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-56">
              <DropdownMenuLabel className="font-normal pb-1">
                <p className="text-sm font-medium">My Account</p>
                <p className="text-xs text-muted-foreground font-normal">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile"><User className="size-4 mr-2" />Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings"><Settings className="size-4 mr-2" />Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings?section=api-keys"><Key className="size-4 mr-2" />API Keys</Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
                <Languages className="size-4 mr-2" />
                Language
                <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium">Soon</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
                <HelpCircle className="size-4 mr-2" />Help Center
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
                <MessageSquare className="size-4 mr-2" />Feedback
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="size-4 mr-2" />Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            onClick={openAuthModal}
            className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-accent transition-colors text-left outline-none cursor-pointer"
          >
            <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <User className="size-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate leading-none mb-0.5">Sign In</p>
              <p className="text-xs text-muted-foreground truncate">Log in to your account</p>
            </div>
          </button>
        )}
      </SidebarFooter>

    </Sidebar>
  );
}
