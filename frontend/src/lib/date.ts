import type { DateValue } from "@chakra-ui/react";

export const toIsoDateTime = (value?: DateValue): string => {
    if (!value) return "";
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const dateValue = value as DateValue & { toDate: (timeZone: string) => Date };
    return dateValue.toDate(timeZone).toISOString();
};
