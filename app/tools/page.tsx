import { redirect } from "next/navigation";

// Tools library has moved into the AI page (/ai → Tools tab).
export default function ToolsRedirect() {
  redirect("/ai?view=tools");
}
