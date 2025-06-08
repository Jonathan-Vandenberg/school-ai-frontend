"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

export type Option = {
  value: string
  label: string
  sublabel?: string
}

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  showSelectAll?: boolean
  hideBadgesInTrigger?: boolean
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
  emptyText = "No options found.",
  className,
  disabled = false,
  showSelectAll = true,
  hideBadgesInTrigger = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  const handleSelect = React.useCallback(
    (value: string) => {
      const updatedSelected = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
      
      onChange(updatedSelected)
    },
    [selected, onChange]
  )

  const handleSelectAll = React.useCallback(() => {
    if (selected.length === filteredOptions.length) {
      onChange([])
    } else {
      onChange(filteredOptions.map((option) => option.value))
    }
  }, [selected.length, onChange])

  const handleClear = React.useCallback(() => {
    onChange([])
  }, [onChange])

  // Filter options based on search term
  const filteredOptions = React.useMemo(() => {
    if (!searchTerm) return options
    return options.filter(option => 
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (option.sublabel && option.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [options, searchTerm])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-auto min-h-10 px-3 py-2 flex-wrap", className)}
          disabled={disabled}
        >
          <div className="flex flex-wrap items-center gap-1 flex-1">
            {selected.length === 0 || hideBadgesInTrigger ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selected.map((value) => {
                const option = options.find((opt) => opt.value === value)
                return (
                  <Badge
                    key={value}
                    variant="secondary"
                    className="mr-1 mb-1 text-xs"
                  >
                    {option?.label}
                    <div
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          e.stopPropagation()
                          handleSelect(value)
                        }
                      }}
                      onMouseDown={(e) => {
                        console.log('🖱️ X button mouseDown for value:', value)
                        e.preventDefault()
                        e.stopPropagation()
                        e.stopImmediatePropagation()
                        handleSelect(value)
                      }}
                      onClick={(e) => {
                        console.log('🔘 X button onClick for value:', value)
                        e.preventDefault()
                        e.stopPropagation()
                        e.stopImmediatePropagation()
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </div>
                  </Badge>
                )
              })
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-[--radix-dropdown-menu-trigger-width] p-0" 
        align="start"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* Search Input */}
        <div className="p-2">
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8"
          />
        </div>
        
        {/* Scrollable Content */}
        <div className="max-h-[300px] overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground text-center">
              {emptyText}
            </div>
          ) : (
            <>
              {/* Select All Option */}
              {showSelectAll && (
                <>
                  <DropdownMenuCheckboxItem
                    checked={selected.length === filteredOptions.length && filteredOptions.length > 0}
                    onCheckedChange={handleSelectAll}
                    onSelect={(e) => e.preventDefault()}
                    className="cursor-pointer py-2"
                  >
                    <span className="font-medium">
                      {selected.length === filteredOptions.length ? "Deselect all" : "Select all"}
                    </span>
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                </>
              )}
              
              {/* Options */}
              {filteredOptions.map((option) => {
                const isSelected = selected.includes(option.value)
                return (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={isSelected}
                    onCheckedChange={() => handleSelect(option.value)}
                    onSelect={(e) => e.preventDefault()}
                    className="cursor-pointer py-2"
                  >
                    <div className="flex flex-col flex-1 ml-2">
                      <span className="font-medium">{option.label}</span>
                      {option.sublabel && (
                        <span className="text-sm text-muted-foreground">
                          {option.sublabel}
                        </span>
                      )}
                    </div>
                  </DropdownMenuCheckboxItem>
                )
              })}
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 