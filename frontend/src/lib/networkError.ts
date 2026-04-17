type ErrorWithOptionalFields = {
    message?: unknown;
    status?: unknown;
    statusText?: unknown;
    body?: unknown;
};

function asCleanString(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function pickBodyMessage(body: unknown): string | null {
    const bodyString = asCleanString(body);
    if (bodyString) {
        return bodyString;
    }

    if (!body || typeof body !== "object") {
        return null;
    }

    const bodyRecord = body as Record<string, unknown>;
    const keys = ["message", "error", "detail", "details", "reason", "title"];

    for (const key of keys) {
        const value = asCleanString(bodyRecord[key]);
        if (value) {
            return value;
        }
    }

    return null;
}

function summarizeHttpStatus(status: unknown, statusText: unknown): string | null {
    if (typeof status !== "number") {
        return null;
    }

    const text = asCleanString(statusText);
    return text ? `HTTP ${status} ${text}` : `HTTP ${status}`;
}

export function getNetworkErrorMessage(error: unknown, fallbackMessage: string): string {
    const defaultMessage = fallbackMessage.trim() || "Request failed.";

    if (typeof error === "string" && error.trim().length > 0) {
        return error.trim();
    }

    if (!error || typeof error !== "object") {
        return defaultMessage;
    }

    const possibleError = error as ErrorWithOptionalFields;
    const bodyMessage = pickBodyMessage(possibleError.body);
    const statusSummary = summarizeHttpStatus(possibleError.status, possibleError.statusText);

    if (bodyMessage && statusSummary) {
        return `${bodyMessage} (${statusSummary})`;
    }

    if (bodyMessage) {
        return bodyMessage;
    }

    const errorMessage = asCleanString(possibleError.message);
    if (errorMessage) {
        return errorMessage;
    }

    if (statusSummary) {
        return `${defaultMessage} ${statusSummary}`;
    }

    return defaultMessage;
}