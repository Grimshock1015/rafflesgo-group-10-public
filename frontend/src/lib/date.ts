import type { DateValue } from "@chakra-ui/react";

export const toIsoDateTime = (value?: DateValue): string => {
    if (!value) return "";

    const calendarDate = value as DateValue & {
        year?: number;
        month?: number;
        day?: number;
        toDate?: (timeZone: string) => Date;
    };

    if (typeof calendarDate.year === "number" && typeof calendarDate.month === "number" && typeof calendarDate.day === "number") {
        return new Date(Date.UTC(calendarDate.year, calendarDate.month - 1, calendarDate.day, 0, 0, 0, 0)).toISOString();
    }

    if (typeof calendarDate.toDate === "function") {
        return calendarDate.toDate("UTC").toISOString();
    }

    return "";
};
