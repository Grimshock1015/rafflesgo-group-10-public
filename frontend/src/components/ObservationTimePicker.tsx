import { Box, Button, Field, Flex, Input, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { LuClock3 } from "react-icons/lu";

type ObservationTimePickerProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

function parseTimeString(value: string): { hour: string; minute: string } | null {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;

  const [hour, minute] = value.split(":").map(Number);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return {
    hour: `${hour}`.padStart(2, "0"),
    minute: `${minute}`.padStart(2, "0"),
  };
}

function buildTime(hour: string, minute: string): string {
  return `${hour}:${minute}`;
}

function to12Hour(hour24: string): { hour: string; meridiem: "AM" | "PM" } {
  const hourNumber = Number(hour24);

  if (hourNumber === 0) {
    return { hour: "12", meridiem: "AM" };
  }

  if (hourNumber === 12) {
    return { hour: "12", meridiem: "PM" };
  }

  if (hourNumber > 12) {
    return { hour: `${hourNumber - 12}`.padStart(2, "0"), meridiem: "PM" };
  }

  return { hour: `${hourNumber}`.padStart(2, "0"), meridiem: "AM" };
}

function to24Hour(hour12: string, meridiem: "AM" | "PM"): string {
  const parsedHour = Number(hour12);

  if (meridiem === "AM") {
    return `${parsedHour % 12}`.padStart(2, "0");
  }

  return `${parsedHour % 12 + 12}`.padStart(2, "0");
}

function formatDisplayTime(value: string): string {
  const parsed = parseTimeString(value);
  if (!parsed) return value;

  const converted = to12Hour(parsed.hour);
  return `${converted.hour}:${parsed.minute} ${converted.meridiem}`;
}

export function ObservationTimePicker({
  id,
  label,
  value,
  onChange,
  required = false,
}: ObservationTimePickerProps) {
  const initialParsedTime = parseTimeString(value);
  const initialDisplayTime = initialParsedTime
    ? to12Hour(initialParsedTime.hour)
    : { hour: "08", meridiem: "AM" as const };
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [draftHour, setDraftHour] = useState(initialDisplayTime.hour);
  const [draftMinute, setDraftMinute] = useState(initialParsedTime?.minute ?? "00");
  const [draftMeridiem, setDraftMeridiem] = useState<"AM" | "PM">(initialDisplayTime.meridiem);
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

  const selectedTime = parseTimeString(value);

  function handleInputChange(nextValue: string) {
    setInputValue(nextValue);

    if (nextValue === "") {
      onChange("");
      return;
    }

    const parsed = parseTimeString(nextValue);
    if (parsed) {
      const converted = to12Hour(parsed.hour);
      setDraftHour(converted.hour);
      setDraftMinute(parsed.minute);
      setDraftMeridiem(converted.meridiem);
      onChange(nextValue);
    }
  }

  function handleInputBlur() {
    if (inputValue === "" || parseTimeString(inputValue)) {
      return;
    }

    setInputValue(value);
  }

  function commitTime(hour12: string, minute: string, meridiem: "AM" | "PM", shouldClose = false) {
    const nextValue = buildTime(to24Hour(hour12, meridiem), minute);
    setDraftHour(hour12);
    setDraftMinute(minute);
    setDraftMeridiem(meridiem);
    setInputValue(nextValue);
    onChange(nextValue);
    if (shouldClose) {
      setIsOpen(false);
    }
  }

  function handleSegmentChange(segment: "hour" | "minute", nextValue: string) {
    const digitsOnly = nextValue.replace(/\D/g, "").slice(0, 2);

    if (segment === "hour") {
      setDraftHour(digitsOnly);
      if (digitsOnly.length === 2 && draftMinute.length === 2) {
        const parsedHour = Number(digitsOnly);
        const parsedMinute = Number(draftMinute);
        if (parsedHour >= 1 && parsedHour <= 12 && parsedMinute >= 0 && parsedMinute <= 59) {
          commitTime(digitsOnly, draftMinute, draftMeridiem);
        }
      }
      return;
    }

    setDraftMinute(digitsOnly);
    if (draftHour.length === 2 && digitsOnly.length === 2) {
      const parsedHour = Number(draftHour);
      const parsedMinute = Number(digitsOnly);
      if (parsedHour >= 1 && parsedHour <= 12 && parsedMinute >= 0 && parsedMinute <= 59) {
        commitTime(draftHour, digitsOnly, draftMeridiem);
      }
    }
  }

  function normalizeSegment(segment: "hour" | "minute") {
    if (segment === "hour") {
      if (draftHour === "") return;
      const normalizedHour = `${Math.min(12, Math.max(1, Number(draftHour) || 1))}`.padStart(2, "0");
      setDraftHour(normalizedHour);
      if (draftMinute.length === 2) {
        commitTime(normalizedHour, draftMinute, draftMeridiem);
      }
      return;
    }

    if (draftMinute === "") return;
    const normalizedMinute = `${Math.min(59, Number(draftMinute) || 0)}`.padStart(2, "0");
    setDraftMinute(normalizedMinute);
    if (draftHour.length === 2) {
      commitTime(draftHour, normalizedMinute, draftMeridiem);
    }
  }

  function setNow() {
    const now = new Date();
    const hour = `${now.getHours()}`.padStart(2, "0");
    const roundedMinute = Math.round(now.getMinutes() / 5) * 5;
    const adjustedHour = roundedMinute === 60 ? `${(now.getHours() + 1) % 24}`.padStart(2, "0") : hour;
    const minute = `${roundedMinute % 60}`.padStart(2, "0");
    const converted = to12Hour(adjustedHour);
    commitTime(converted.hour, minute, converted.meridiem, true);
  }

  function handleEnterKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const parsed = parseTimeString(inputValue);
    if (parsed) {
      const converted = to12Hour(parsed.hour);
      commitTime(converted.hour, parsed.minute, converted.meridiem, true);
      return;
    }

    if (draftHour !== "") {
      normalizeSegment("hour");
    }

    if (draftMinute !== "") {
      normalizeSegment("minute");
    }

    const normalizedHour = draftHour === "" ? "" : `${Math.min(12, Math.max(1, Number(draftHour) || 1))}`.padStart(2, "0");
    const normalizedMinute = draftMinute === "" ? "" : `${Math.min(59, Number(draftMinute) || 0)}`.padStart(2, "0");

    if (normalizedHour.length === 2 && normalizedMinute.length === 2) {
      commitTime(normalizedHour, normalizedMinute, draftMeridiem, true);
    }
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
            onKeyDown={handleEnterKey}
            placeholder="HH:MM"
            required={required}
            onFocus={() => setIsOpen(true)}
            bg="var(--bg-card)"
            color="var(--text-primary)"
            borderColor="var(--border-color)"
          />
          <Button
            type="button"
            variant="outline"
            aria-label="Open clock menu"
            onClick={() => setIsOpen((open) => !open)}
            color="var(--text-primary)"
            borderColor="var(--border-color)"
            bg="var(--bg-card)"
          >
            <LuClock3 />
          </Button>
        </Flex>

        {isOpen ? (
          <Box
            position="absolute"
            top="calc(100% + 0.5rem)"
            left="0"
            width="min(24rem, 100vw - 2rem)"
            bg="var(--bg-card)"
            borderWidth="1px"
            borderColor="var(--border-color)"
            borderRadius="lg"
            boxShadow="lg"
            p={4}
            zIndex="popover"
            color="var(--text-primary)"
          >
            <Flex align="center" justify="space-between" mb={3}>
              <Text fontWeight="semibold">
                {selectedTime ? formatDisplayTime(value) : "Choose a time"}
              </Text>
              <Button type="button" variant="ghost" size="sm" color="var(--text-primary)" onClick={setNow}>
                Now
              </Button>
            </Flex>

            <Flex gap={3} align="end">
              <Box flex="1">
                <Text fontSize="sm" color="var(--text-secondary)" mb={2}>
                  Hour
                </Text>
                <Input
                  value={draftHour}
                  onChange={(event) => handleSegmentChange("hour", event.target.value)}
                  onBlur={() => normalizeSegment("hour")}
                  onKeyDown={handleEnterKey}
                  onFocus={(event) => event.target.select()}
                  onClick={(event) => event.currentTarget.select()}
                  placeholder="HH"
                  inputMode="numeric"
                  maxLength={2}
                  textAlign="center"
                  px={3}
                  bg="var(--bg-card)"
                  color="var(--text-primary)"
                  borderColor="var(--border-color)"
                />
              </Box>

              <Text fontSize="xl" pb={2} color="var(--text-secondary)">:</Text>

              <Box flex="1">
                <Text fontSize="sm" color="var(--text-secondary)" mb={2}>
                  Minute
                </Text>
                <Input
                  value={draftMinute}
                  onChange={(event) => handleSegmentChange("minute", event.target.value)}
                  onBlur={() => {
                    normalizeSegment("minute");
                    if (draftHour.length === 2) {
                      setIsOpen(false);
                    }
                  }}
                  onKeyDown={handleEnterKey}
                  onFocus={(event) => event.target.select()}
                  onClick={(event) => event.currentTarget.select()}
                  placeholder="MM"
                  inputMode="numeric"
                  maxLength={2}
                  textAlign="center"
                  px={3}
                  bg="var(--bg-card)"
                  color="var(--text-primary)"
                  borderColor="var(--border-color)"
                />
              </Box>
            </Flex>

            <Flex gap={2} mt={4}>
              {(["AM", "PM"] as const).map((meridiem) => (
                <Button
                  key={meridiem}
                  type="button"
                  size="sm"
                  flex="1"
                  bg={draftMeridiem === meridiem ? "var(--primary-green)" : "transparent"}
                  color={draftMeridiem === meridiem ? "var(--text-inverse)" : "var(--text-primary)"}
                  borderWidth="1px"
                  borderColor={draftMeridiem === meridiem ? "var(--primary-green)" : "var(--border-color)"}
                  _hover={{
                    bg: draftMeridiem === meridiem ? "var(--secondary-green)" : "var(--bg-hover)",
                  }}
                  onClick={() => {
                    setDraftMeridiem(meridiem);
                    if (draftHour.length === 2 && draftMinute.length === 2) {
                      commitTime(draftHour, draftMinute, meridiem);
                    }
                  }}
                >
                  {meridiem}
                </Button>
              ))}
            </Flex>

            <Flex justify="space-between" mt={4}>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                color="var(--text-secondary)"
                onClick={() => {
                  setDraftHour("");
                  setDraftMinute("");
                  setDraftMeridiem("AM");
                  setInputValue("");
                  onChange("");
                  setIsOpen(false);
                }}
              >
                Clear
              </Button>
            </Flex>
          </Box>
        ) : null}
      </Box>
    </Field.Root>
  );
}
