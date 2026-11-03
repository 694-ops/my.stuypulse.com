// turns "2026-10-31" into "Oct 31, 2026", and leaves anything else as it came
export function formatMeetingDate(date: string) {
    const parsed = new Date(`${date}T00:00:00Z`)
    if (isNaN(parsed.getTime())) return date

    return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
}

// the kiosk's rate columns are text, so make sure they read as one percent sign either way
export function formatPercent(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") return "-"

    return String(value).replace(/\s*%$/, "") + "%"
}

// the season runs with the school year, so it starts each September 1st. the kiosk's
// attendance rate counts the same meetings, so the battery and the percentage agree
export function seasonStart(today: string) {
    const [year, month] = today.split("-").map(Number)
    return `${month >= 9 ? year : year - 1}-09-01`
}

// today's date as YYYY-MM-DD at the shop, since the server runs in UTC
export function todayAtShop() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" })
}
