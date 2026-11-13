import { ArrowLeft, SearchX } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <Logo className="mb-10" />
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <SearchX className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        The page you are looking for does not exist. It may have moved, or the link may be
        incorrect.
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" /> Back home
          </Link>
        </Button>
        <Button asChild>
          <Link to="/dashboard">Open dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
