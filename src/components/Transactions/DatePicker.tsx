"use client"

import * as React from "react"
import { format, parseISO, isValid, parse } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

interface DatePickerProps {
  date: string
  onChange: (date: string) => void
}

export function DatePicker({ date, onChange }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [month, setMonth] = React.useState<Date | undefined>()

  // sync display value
  React.useEffect(() => {
    const d = parseISO(date)
    if (isValid(d)) {
      setInputValue(format(d, "dd/MM/yyyy"))
      setMonth(d)
    }
  }, [date])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)

    const parsed = parse(val, "dd/MM/yyyy", new Date())
    if (isValid(parsed)) {
      onChange(format(parsed, "yyyy-MM-dd"))
      setMonth(parsed)
    }
  }

  const selectedDate = React.useMemo(() => {
    const d = parseISO(date)
    return isValid(d) ? d : undefined
  }, [date])

  return (
    <InputGroup>
      <InputGroupInput
        value={inputValue}
        onChange={handleInputChange}
        placeholder="DD/MM/YYYY"
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setOpen(true)
          }
        }}
      />

      <InputGroupAddon align="inline-end">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <InputGroupButton
              variant="ghost"
              size="icon-xs"
              aria-label="Select date"
            >
              <CalendarIcon />
            </InputGroupButton>
          </PopoverTrigger>

          <PopoverContent
            className="w-auto p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="single"
              selected={selectedDate}
              month={month}
              onMonthChange={setMonth}
              onSelect={(d) => {
                if (d) {
                  onChange(format(d, "yyyy-MM-dd"))
                  setOpen(false)
                }
              }}
            />
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  )
}