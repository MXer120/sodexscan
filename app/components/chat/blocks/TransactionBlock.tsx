"use client";

import { toast } from "sonner";
import { ExternalLink, Copy, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/app/lib/utils";

export interface TransactionBlockProps {
  hash?: string;
  from?: string;
  to?: string;
  token?: string;
  tokenContract?: string;
  expectedToken?: string;
  expectedContract?: string;
  amount?: string;
  chain?: string;
  status?: "success" | "unrecognized" | "pending" | "failed";
  note?: string;
  label?: string;
}

function copyText(text: string, label: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(`${label} copied`, { duration: 1500 }),
    () => toast.error("Copy failed"),
  );
}

function shortHash(h: string) {
  return h.length > 16 ? `${h.slice(0, 10)}…${h.slice(-6)}` : h;
}

function shortAddr(a: string) {
  return a.length > 12 ? `${a.slice(0, 8)}…${a.slice(-4)}` : a;
}

const STATUS_CONFIG = {
  success:      { icon: CheckCircle,    color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Confirmed" },
  unrecognized: { icon: AlertTriangle,  color: "text-amber-500",   bg: "bg-amber-500/10 border-amber-500/20",     label: "Unrecognised by Sodex" },
  pending:      { icon: Clock,          color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20",       label: "Pending" },
  failed:       { icon: AlertTriangle,  color: "text-red-500",     bg: "bg-red-500/10 border-red-500/20",         label: "Failed" },
};

export function TransactionBlock({ props = {} }: { props?: TransactionBlockProps }) {
  const {
    hash, from, to, token, tokenContract,
    expectedToken, expectedContract,
    amount, chain = "Polygon", status = "unrecognized", note, label,
  } = props;

  const st = STATUS_CONFIG[status] ?? STATUS_CONFIG.unrecognized;
  const StatusIcon = st.icon;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className={cn("px-4 py-3 border-b flex items-center gap-3", st.bg)}>
        <StatusIcon className={cn("size-4 shrink-0", st.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">{label ?? "Transaction"}</p>
          <p className={cn("text-[11px] font-medium", st.color)}>{st.label}</p>
        </div>
        {hash && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => copyText(hash, "TX hash")}
              className="p-1 rounded hover:bg-black/10 transition-colors" title="Copy hash">
              <Copy className="size-3 text-muted-foreground" />
            </button>
            <a href={`https://polygonscan.com/tx/${hash}`} target="_blank" rel="noopener noreferrer"
              className="p-1 rounded hover:bg-black/10 transition-colors" title="View on Polygonscan">
              <ExternalLink className="size-3 text-muted-foreground" />
            </a>
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="divide-y divide-border/50">
        {hash && (
          <Row label="TX Hash">
            <button onClick={() => copyText(hash, "TX hash")}
              className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              {shortHash(hash)} <Copy className="size-2.5" />
            </button>
          </Row>
        )}
        {chain && <Row label="Chain"><span className="text-xs font-medium">{chain}</span></Row>}
        {from && (
          <Row label="From">
            <button onClick={() => copyText(from, "Address")}
              className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              {shortAddr(from)} <Copy className="size-2.5" />
            </button>
          </Row>
        )}
        {amount && token && (
          <Row label="Amount sent">
            <div className="text-right">
              <span className="text-xs font-semibold">{amount} </span>
              <span className={cn("text-xs font-bold", status === "unrecognized" ? "text-amber-500" : "text-foreground")}>{token}</span>
              {tokenContract && (
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{shortAddr(tokenContract)}</p>
              )}
            </div>
          </Row>
        )}
        {expectedToken && (
          <Row label="Sodex expects">
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-500">{expectedToken}</span>
              {expectedContract && (
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{shortAddr(expectedContract)}</p>
              )}
            </div>
          </Row>
        )}
      </div>

      {/* Note */}
      {note && (
        <div className="px-4 py-3 border-t bg-muted/20">
          <p className="text-[11px] text-muted-foreground leading-relaxed">{note}</p>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide shrink-0">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
