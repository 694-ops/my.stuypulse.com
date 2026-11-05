import { formatMeetingDate, seasonStart } from "./format.ts"

export type CellKind = "present" | "partial" | "absent"

export interface Cell {
    key: string
    kind: CellKind
    // how full the cell is, from 0 to 1
    level: number
    label: string
    href?: string
}

const MIN_LEVEL = 0.15

// this season's meetings so far, with the calendar's rules: a past meeting with no scan is a miss,
// and today isn't past yet
export function memberCells(
    allMeetings: string[] | null,
    checkedOut: string[] | null,
    onlyCheckedIn: string[] | null,
    today: string,
): Cell[] {
    const start = seasonStart(today)
    const past = [...(allMeetings || [])].sort().filter((date) => date >= start && date < today)

    return past.map((date): Cell => {
        const name = formatMeetingDate(date)

        if (onlyCheckedIn?.includes(date))
            return { key: date, kind: "partial", level: 0.5, label: `${name}: No checkout` }
        if (checkedOut?.includes(date)) return { key: date, kind: "present", level: 1, label: `${name}: Present` }
        return { key: date, kind: "absent", level: 0, label: `${name}: Missed` }
    })
}

interface TeamMeeting {
    date: string
    num_checkins: string | number
    num_checkouts: string | number
}

function toCount(value: string | number) {
    const count = Number(value)
    return isNaN(count) ? 0 : Math.max(count, 0)
}

// one cell per meeting this season, filled to that meeting's share of the biggest turnout
export function teamCells(meetings: TeamMeeting[], today: string): Cell[] {
    const start = seasonStart(today)
    const shown = [...meetings].filter(({ date }) => date >= start).sort((a, b) => a.date.localeCompare(b.date))
    const busiest = Math.max(1, ...shown.map(({ num_checkins }) => toCount(num_checkins)))

    return shown.map(({ date, num_checkins, num_checkouts }) => {
        const checkins = toCount(num_checkins)

        return {
            key: date,
            kind: checkins ? "present" : "absent",
            level: checkins ? Math.max(MIN_LEVEL, checkins / busiest) : 0,
            label: `${formatMeetingDate(date)}: ${checkins} in, ${toCount(num_checkouts)} out`,
            href: `/dashboard?meeting=${date}`,
        }
    })
}

interface Attendee {
    id: string
    total_hours: string
    checkout_time: string
}

// one cell per person at a meeting, filled by how long they stayed
export function meetingCells(attendees: Attendee[], names: Record<string, string>): Cell[] {
    const longest = Math.max(0.01, ...attendees.map(({ total_hours }) => toCount(total_hours)))

    return attendees.map(({ id, total_hours, checkout_time }) => {
        const name = names[id] || id
        const href = `/dashboard?osis=${id}`

        if (!checkout_time) return { key: id, kind: "partial", level: 0.5, label: `${name}: No checkout`, href }

        return {
            key: id,
            kind: "present",
            level: Math.max(MIN_LEVEL, toCount(total_hours) / longest),
            label: `${name}: ${total_hours} hours`,
            href,
        }
    })
}

// the log in screen's picture, which isn't anyone's real attendance
export function sampleCells(): Cell[] {
    return "pppppcppappppppcpppap".split("").map((kind, i) => ({
        key: String(i),
        kind: kind === "a" ? "absent" : kind === "c" ? "partial" : "present",
        level: kind === "p" ? 1 : kind === "c" ? 0.5 : 0,
        label: "",
    }))
}

export function cellSummary(cells: Cell[]) {
    const count = (kind: CellKind) => cells.filter((cell) => cell.kind === kind).length

    return `${count("present")} full, ${count("partial")} half, and ${count("absent")} empty`
}
