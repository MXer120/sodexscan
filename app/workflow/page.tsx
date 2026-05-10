"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import WorkflowBuilder from "@/app/components/workflow/WorkflowBuilder";
import "@/app/styles/workflow.css";

export default function WorkflowPage() {
  useEffect(() => {
    toast.info("Workflow Builder — Coming Soon", {
      description: "Full workflow automation is in development. This is a preview.",
      position: "top-right",
      duration: 5000,
    });
  }, []);

  return <WorkflowBuilder />;
}
