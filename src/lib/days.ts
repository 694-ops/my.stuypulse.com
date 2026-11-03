export interface DayStats {
    // empty when the member didn't scan that day
    checkin: string
    checkout: string
    hours: string
}

interface MeetingRow {
    date: string
    attendees: { id: string; total_hours: string; checkin_time: string; checkout_time: string }[] | null
}

// turns the kiosk's "2026-10-12 15:32:00" into "3:32 PM", or "" if there's no time to read
export function formatClock(time: string | null | undefined) {
    const match = /(\d{1,2}):(\d{2})/.exec((time || "").substring(10))
    if (!match) return ""

    const hours = Number(match[1])
    if (hours > 23) return ""

    return `${hours % 12 || 12}:${match[2]} ${hours < 12 ? "AM" : "PM"}`
}

// one member's own times at every meeting, so the calendar can show a day without asking the server again.
// nothing about anyone else reaches the page
export function memberDays(meetings: MeetingRow[] | null, id: string | undefined): Record<string, DayStats> {
    const days: Record<string, DayStats> = {}

    for (const { date, attendees } of meetings || []) {
        const mine = (attendees || []).find((attendee) => attendee.id === id)
        const checkout = formatClock(mine?.checkout_time)

        days[date] = {
            checkin: formatClock(mine?.checkin_time),
            checkout,
            hours: checkout && mine?.total_hours ? mine.total_hours : "",
        }
    }

    return days
}
