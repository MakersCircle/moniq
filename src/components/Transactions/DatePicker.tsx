'use client';

import * as React from 'react';
import { format, parseISO, isValid, parse } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface DatePickerProps {
  date: string;
  onChange: (date: string) => void;
  fixedWeeks?: boolean;
  rangeAnchor?: string;
  rangeStart?: string;
  rangeEnd?: string;
  rangeSelectionRole?: 'from' | 'to';
  onCompleteRange?: (firstDate: string, secondDate: string, role: 'from' | 'to') => void;
  tabIndex?: number;
  id?: string;
}

export function DatePicker({
  date,
  onChange,
  fixedWeeks,
  rangeAnchor,
  rangeStart,
  rangeEnd,
  rangeSelectionRole,
  onCompleteRange,
  tabIndex,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(() => {
    const d = parseISO(date);
    return isValid(d) ? format(d, 'dd/MM/yyyy') : '';
  });
  const [month, setMonth] = React.useState<Date | undefined>(() => {
    const d = parseISO(date);
    return isValid(d) ? d : undefined;
  });
  const [hoveredDate, setHoveredDate] = React.useState<Date>();
  const [pendingRangeDate, setPendingRangeDate] = React.useState<Date>();

  // Track focus to prevent prop updates from clobbering user input
  const [isFocused, setIsFocused] = React.useState(false);

  // Sync prop -> input ONLY when not focused (external changes)
  const [prevDate, setPrevDate] = React.useState(date);
  if (date !== prevDate && !isFocused) {
    setPrevDate(date);
    const d = parseISO(date);
    if (isValid(d)) {
      setInputValue(format(d, 'dd/MM/yyyy'));
      setMonth(d);
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9/-]/g, '');
    setInputValue(val);

    if (val.length < 1) return;

    // Try various formats for real-time calendar feedback
    // We only call onChange if it's a "complete" looking date (length >= 8 for ddmmyyyy or includes separators)
    const formats = [
      'dd/MM/yyyy',
      'dd-MM-yyyy',
      'ddMMyyyy',
      'dd/MM/yy',
      'dd-MM-yy',
      'ddMMyy',
      'dd/MM',
      'dd-MM',
      'ddMM',
      'd/M',
      'd-M',
      'dM',
      'd',
    ];

    for (const fmt of formats) {
      const parsed = parse(val, fmt, new Date());
      if (isValid(parsed)) {
        const back = format(parsed, fmt);
        if (back === val || val.replace(/[-/]/g, '') === back.replace(/[-/]/g, '')) {
          // If it looks complete (has year or separators), sync to parent immediately
          // Otherwise, just update local calendar for feedback
          if (val.length >= 8 || val.includes('/') || val.includes('-')) {
            onChange(format(parsed, 'yyyy-MM-dd'));
          }
          setMonth(parsed);
          break;
        }
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);

    // Final attempt to parse and sync
    const formats = [
      'dd/MM/yyyy',
      'dd-MM-yyyy',
      'ddMMyyyy',
      'dd/MM/yy',
      'dd-MM-yy',
      'ddMMyy',
      'dd/MM',
      'dd-MM',
      'ddMM',
      'd/M',
      'd-M',
      'dM',
      'd',
    ];
    for (const fmt of formats) {
      const parsed = parse(inputValue, fmt, new Date());
      if (isValid(parsed)) {
        const back = format(parsed, fmt);
        if (back === inputValue || inputValue.replace(/[-/]/g, '') === back.replace(/[-/]/g, '')) {
          const iso = format(parsed, 'yyyy-MM-dd');
          onChange(iso);
          setInputValue(format(parsed, 'dd/MM/yyyy'));
          setMonth(parsed);
          return;
        }
      }
    }

    // If invalid, revert to prop date
    const d = parseISO(date);
    if (isValid(d)) {
      setInputValue(format(d, 'dd/MM/yyyy'));
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Select all text on focus for easier overwriting
    // Handled in InputGroupInput if supported, or via ref
  };

  const selectedDate = React.useMemo(() => {
    const d = parseISO(date);
    return isValid(d) ? d : undefined;
  }, [date]);
  const anchorDate = rangeAnchor ? parseISO(rangeAnchor) : pendingRangeDate || undefined;
  const selectedRangeStart = rangeStart ? parseISO(rangeStart) : undefined;
  const selectedRangeEnd = rangeEnd ? parseISO(rangeEnd) : undefined;
  const previewStart =
    anchorDate && hoveredDate ? (anchorDate < hoveredDate ? anchorDate : hoveredDate) : undefined;
  const previewEnd =
    anchorDate && hoveredDate ? (anchorDate > hoveredDate ? anchorDate : hoveredDate) : undefined;
  const previewRange =
    previewStart && previewEnd ? { from: previewStart, to: previewEnd } : undefined;
  const selectedRange =
    selectedRangeStart && selectedRangeEnd
      ? { from: selectedRangeStart, to: selectedRangeEnd }
      : undefined;
  const activeRange = previewRange || selectedRange;
  const activeRangeEndpoints = previewRange
    ? [previewStart, previewEnd].filter((value): value is Date => Boolean(value))
    : [selectedRangeStart, selectedRangeEnd].filter((value): value is Date => Boolean(value));

  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={e => {
          handleFocus();
          e.currentTarget.select();
        }}
        placeholder="DD/MM/YYYY"
        tabIndex={tabIndex}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      />

      <InputGroupAddon align="inline-end">
        <Popover
          open={open}
          onOpenChange={nextOpen => {
            setOpen(nextOpen);
            setHoveredDate(undefined);
            if (!nextOpen) setPendingRangeDate(undefined);
          }}
        >
          <PopoverTrigger asChild>
            <InputGroupButton variant="ghost" size="icon-xs" aria-label="Select date">
              <CalendarIcon />
            </InputGroupButton>
          </PopoverTrigger>

          <PopoverContent
            className="w-auto p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
            onMouseLeave={() => setHoveredDate(undefined)}
          >
            <Calendar
              mode="single"
              fixedWeeks={fixedWeeks}
              selected={selectedDate}
              modifiers={{
                customRange: activeRange ? [activeRange] : [],
                customRangeEndpoint: activeRangeEndpoints,
              }}
              month={month}
              onMonthChange={setMonth}
              onDayMouseEnter={day => setHoveredDate(day)}
              onSelect={d => {
                if (d) {
                  setHoveredDate(undefined);
                  if (onCompleteRange && rangeSelectionRole && !rangeAnchor) {
                    if (!pendingRangeDate) {
                      setPendingRangeDate(d);
                      onChange(format(d, 'yyyy-MM-dd'));
                      return;
                    }

                    onCompleteRange(
                      format(pendingRangeDate, 'yyyy-MM-dd'),
                      format(d, 'yyyy-MM-dd'),
                      rangeSelectionRole
                    );
                    setPendingRangeDate(undefined);
                    setOpen(false);
                    return;
                  }

                  onChange(format(d, 'yyyy-MM-dd'));
                  setOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  );
}
