"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TaskParamProps } from "@/schema/task"

// Options may be stored as JSON ({"label": "...", "value": "..."}) or as plain
// strings (e.g. "Discord"), where the string is both the label and the value.
function parseOption(op: string): { label: string; value: string } {
  try {
    const parsed = JSON.parse(op)
    if (parsed && typeof parsed === "object" && "value" in parsed) {
      return { label: String(parsed.label ?? parsed.value), value: String(parsed.value) }
    }
  } catch {
    // Not JSON: fall through to the plain-string form.
  }
  return { label: op, value: op }
}

export default function SelectorParam({ param, updateNodeParamValue, value, disabled }: TaskParamProps) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <Label htmlFor={param.name} className="text-sm font-medium ">
        {param.name}
        {param.required && <span className="text-red-500">*</span>}
      </Label>
      <Select
        disabled={disabled}
        onValueChange={(val) => {
          updateNodeParamValue(val)
        }}
        value={value}
        defaultValue={value}
      >
        <SelectTrigger className="w-full">
          <SelectValue className="cursor-pointer" placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup className="bg-background ">
            <SelectLabel className="">Options</SelectLabel>
            {param.options &&
              param.options.map((op) => {
                const option = parseOption(op)
                return (
                  <SelectItem className="cursor-pointer" key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                )
              })}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}
