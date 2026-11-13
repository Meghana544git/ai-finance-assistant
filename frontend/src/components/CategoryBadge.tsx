import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CATEGORY_ICONS, categoryColor } from "@/utils/categories";

interface CategoryBadgeProps {
  category: string;
  showIcon?: boolean;
  source?: string;
}

export function CategoryBadge({ category, showIcon = true, source }: CategoryBadgeProps) {
  const Icon = CATEGORY_ICONS[category] ?? CATEGORY_ICONS.Other;
  const color = categoryColor(category);

  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge variant="outline" className="gap-1.5 border-border/80 bg-white py-1 font-medium text-slate-600">
        {showIcon && <Icon className="h-3 w-3" style={{ color }} />}
        {category}
      </Badge>
      {source === "ml" && (
        <span
          title="Category suggested by the ML classifier"
          className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-600"
        >
          <Sparkles className="h-2.5 w-2.5" /> AI
        </span>
      )}
      {source === "corrected" && (
        <span
          title="You corrected the model's suggestion"
          className="inline-flex items-center rounded-full bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-600"
        >
          Edited
        </span>
      )}
    </span>
  );
}
