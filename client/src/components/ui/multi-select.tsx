import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectTag {
  id: number | string;
  label: string;
  locationIds: string[];
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  maxDisplayedItems?: number;
  enableTags?: boolean;
  tags?: MultiSelectTag[];
}

export function MultiSelect({
  options = [],
  selected = [],
  onChange,
  placeholder = "Select items...",
  searchPlaceholder = "Search...",
  emptyMessage = "No items found.",
  className,
  disabled = false,
  maxDisplayedItems = 3,
  enableTags = false,
  tags = [],
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  const handleSelect = (value: string, checked: boolean | "indeterminate") => {
    if (checked === "indeterminate") return;

    const newSelected = checked
      ? [...selected, value]
      : selected.filter((item) => item !== value);
    onChange(newSelected);
  };

  const handleToggle = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const handleTagToggle = (tag: MultiSelectTag) => {
    const tagLocationIds = tag.locationIds || [];
    const isTagSelected = tagLocationIds.every((id) => selected.includes(id));

    let newSelected: string[];
    if (isTagSelected) {
      // Remove all tag locations from selected
      newSelected = selected.filter((id) => !tagLocationIds.includes(id));
    } else {
      // Add all tag locations to selected (avoid duplicates)
      const toAdd = tagLocationIds.filter((id) => !selected.includes(id));
      newSelected = [...selected, ...toAdd];
    }

    onChange(newSelected);
  };

  const getTagSelectionState = (
    tag: MultiSelectTag,
  ): "checked" | "indeterminate" | false => {
    const tagLocationIds = tag.locationIds || [];
    const selectedCount = tagLocationIds.filter((id) =>
      selected.includes(id),
    ).length;

    if (selectedCount === 0) return false;
    if (selectedCount === tagLocationIds.length) return "checked";
    return "indeterminate";
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const selectedLabels = selected
    .map((value) => {
      const option = options.find((opt) => opt.value === value);
      return option?.label || value;
    })
    .filter(Boolean);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchValue.toLowerCase()),
  );

  const displayText = React.useMemo(() => {
    if (selected.length === 0) return placeholder;
    if (selected.length <= maxDisplayedItems) {
      return selectedLabels.join(", ");
    }
    return `${selectedLabels.slice(0, maxDisplayedItems).join(", ")} +${
      selected.length - maxDisplayedItems
    } more`;
  }, [selected, selectedLabels, maxDisplayedItems, placeholder]);

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate">{displayText}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <div className="p-2">
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="mb-2"
            />
            {selected.length > 0 && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {selected.length} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-auto p-1 text-xs"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
          <Separator />
          <ScrollArea className="max-h-64">
            {enableTags && tags.length > 0 && (
              <>
                <div className="p-2">
                  <div className="text-xs font-semibold text-muted-foreground mb-1">
                    QUICK SELECT TAGS
                  </div>
                  <div className="space-y-1">
                    {tags.map((tag) => {
                      const state = getTagSelectionState(tag);
                      return (
                        <div
                          key={tag.id}
                          className="flex items-center space-x-2 p-1 hover:bg-accent rounded cursor-pointer"
                          onClick={() => handleTagToggle(tag)}
                        >
                          <Checkbox
                            checked={state}
                            onCheckedChange={() => {}}
                            className="pointer-events-none"
                          />
                          <span className="text-sm flex-1">{tag.label}</span>
                          <span className="text-xs text-muted-foreground">
                            ({tag.locationIds.length})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Separator />
              </>
            )}
            <div className="p-2">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredOptions.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2 p-1 hover:bg-accent rounded cursor-pointer"
                      onClick={() => handleToggle(option.value)}
                    >
                      <Checkbox
                        checked={selected.includes(option.value)}
                        onCheckedChange={(checked) =>
                          handleSelect(option.value, checked)
                        }
                        className="pointer-events-none"
                      />
                      <span className="text-sm flex-1">{option.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedLabels.slice(0, maxDisplayedItems).map((label, index) => (
            <Badge
              key={selected[index]}
              variant="secondary"
              className="text-xs"
            >
              {label}
              <button
                className="ml-1 hover:text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  handleToggle(selected[index]);
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selected.length > maxDisplayedItems && (
            <Badge variant="outline" className="text-xs">
              +{selected.length - maxDisplayedItems} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}