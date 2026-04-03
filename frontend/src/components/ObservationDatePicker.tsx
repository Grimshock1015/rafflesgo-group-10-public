import { Box, Button, Field, Flex, Grid, Input, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { LuCalendarDays, LuChevronLeft, LuChevronRight } from "react-icons/lu";

type ObservationDatePickerProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseDateString(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCalendarDays(month: Date): Array<Date | null> {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const days: Array<Date | null> = [];

  for (let i = 0; i < start.getDay(); i += 1) {
    days.push(null);
  }

  for (let day = 1; day <= end.getDate(); day += 1) {
    days.push(new Date(month.getFullYear(), month.getMonth(), day));
  }

  return days;
}

export function ObservationDatePicker({
  id,
  label,
  value,
  onChange,
  required = false,
}: ObservationDatePickerProps) {
  const initialSelectedDate = parseDateString(value);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [visibleMonth, setVisibleMonth] = useState<Date>(
    () => initialSelectedDate ?? new Date()
  );
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const selectedDate = parseDateString(value);
  const calendarDays = getCalendarDays(visibleMonth);

  function commitValue(nextValue: string) {
    setInputValue(nextValue);
    onChange(nextValue);
  }

  function handleInputChange(nextValue: string) {
    setInputValue(nextValue);

    if (nextValue === "") {
      onChange("");
      return;
    }

    if (parseDateString(nextValue)) {
      onChange(nextValue);
    }
  }

  function handleInputBlur() {
    if (inputValue === "" || parseDateString(inputValue)) {
      return;
    }

    setInputValue(value);
  }

  function selectDate(date: Date) {
    const nextValue = toIsoDateString(date);
    commitValue(nextValue);
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setIsOpen(false);
  }

  return (
    <Field.Root required={required}>
      <Field.Label htmlFor={id}>
        {label}
        {required ? <Field.RequiredIndicator /> : null}
      </Field.Label>
      <Box ref={rootRef} position="relative">
        <Flex gap={2}>
          <Input
            id={id}
            value={inputValue}
            onChange={(event) => handleInputChange(event.target.value)}
            onBlur={handleInputBlur}
            placeholder="YYYY-MM-DD"
            required={required}
            onFocus={() => setIsOpen(true)}
            bg="var(--bg-card)"
            color="var(--text-primary)"
            borderColor="var(--border-color)"
          />
          <Button
            type="button"
            variant="outline"
            aria-label="Open calendar"
            onClick={() => setIsOpen((open) => !open)}
            color="var(--text-primary)"
            borderColor="var(--border-color)"
            bg="var(--bg-card)"
          >
            <LuCalendarDays />
          </Button>
        </Flex>

        {isOpen ? (
          <Box
            position="absolute"
            top="calc(100% + 0.5rem)"
            left="0"
            width="min(22rem, 100vw - 2rem)"
            bg="var(--bg-card)"
            borderWidth="1px"
            borderColor="var(--border-color)"
            borderRadius="lg"
            boxShadow="lg"
            p={4}
            zIndex="popover"
            color="var(--text-primary)"
          >
            <Flex align="center" justify="space-between" mb={4}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                color="var(--text-primary)"
                onClick={() =>
                  setVisibleMonth(
                    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1)
                  )
                }
              >
                <LuChevronLeft />
              </Button>
              <Text fontWeight="semibold">
                {visibleMonth.toLocaleDateString("en-SG", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                color="var(--text-primary)"
                onClick={() =>
                  setVisibleMonth(
                    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1)
                  )
                }
              >
                <LuChevronRight />
              </Button>
            </Flex>

            <Grid templateColumns="repeat(7, 1fr)" gap={2} mb={2}>
              {WEEKDAY_LABELS.map((weekday) => (
                <Text
                  key={weekday}
                  textAlign="center"
                  fontSize="sm"
                  color="var(--text-secondary)"
                  fontWeight="medium"
                >
                  {weekday}
                </Text>
              ))}
            </Grid>

            <Grid templateColumns="repeat(7, 1fr)" gap={2}>
              {calendarDays.map((day, index) =>
                day ? (
                  <Button
                    key={toIsoDateString(day)}
                    type="button"
                    size="sm"
                    variant="ghost"
                    bg={
                      selectedDate && toIsoDateString(day) === toIsoDateString(selectedDate)
                        ? "var(--primary-green)"
                        : "transparent"
                    }
                    color={
                      selectedDate && toIsoDateString(day) === toIsoDateString(selectedDate)
                        ? "var(--text-inverse)"
                        : "var(--text-primary)"
                    }
                    _hover={{
                      bg:
                        selectedDate && toIsoDateString(day) === toIsoDateString(selectedDate)
                          ? "var(--secondary-green)"
                          : "var(--bg-hover)",
                    }}
                    onClick={() => selectDate(day)}
                  >
                    {day.getDate()}
                  </Button>
                ) : (
                  <Box key={`empty-${index}`} />
                )
              )}
            </Grid>

            <Flex justify="space-between" mt={4}>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                color="var(--text-secondary)"
                onClick={() => {
                  commitValue("");
                  setIsOpen(false);
                }}
              >
                Clear
              </Button>
              <Button
                type="button"
                size="sm"
                bg="var(--primary-green)"
                color="var(--text-inverse)"
                _hover={{ bg: "var(--secondary-green)" }}
                onClick={() => selectDate(new Date())}
              >
                Today
              </Button>
            </Flex>
          </Box>
        ) : null}
      </Box>
    </Field.Root>
  );
}
