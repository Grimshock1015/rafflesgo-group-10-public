export function formatTimestamp(value?: string) {
    if (!value) return "No submissions yet";

    return new Intl.DateTimeFormat("en-SG", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}
