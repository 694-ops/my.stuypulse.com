// Fake Supabase for previewing the UI locally. Every person and date below is made up.
// Nothing here talks to the real project, so it is safe to log in and click around.
//
//   node scripts/mock-supabase.mjs
//   SUPABASE_URL=http://127.0.0.1:54399 SUPABASE_ANON_KEY=mock SUPABASE_SERVICE_ROLE_KEY=mock npx astro dev --port 4394
//
// Log in with OSIS 100000001 (member), 100000002 (member with things outstanding) admin or testadmin.
// Any password works.
import { createServer } from "node:http"

const PORT = 54399
const today = new Date()

function daysAgo(n) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - n)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// meetings every few days, ending with two in the future
const offsets = [-12, -10, -7, -5, -2, ...Array.from({ length: 56 }, (_, i) => 1 + Math.floor(i * 2.4))]
// MOCK_EMPTY=1 previews the screens before any meeting has happened
const allDates = process.env.MOCK_EMPTY ? [] : offsets.map(daysAgo)
const pastDates = process.env.MOCK_EMPTY ? [] : offsets.filter((n) => n > 0).map(daysAgo)

const people = [
    {
        id_number: "100000001",
        first_name: "Avery",
        last_name: "Lindqvist",
        graduation_year: 2028,
        safety_test: true,
        dues: true,
        miss: [8, 21, 22, 37],
        noOut: [5, 30],
    },
    {
        id_number: "100000002",
        first_name: "Rowan",
        last_name: "Okonkwo-Bellweather",
        graduation_year: 2027,
        safety_test: false,
        dues: true,
        miss: [1, 3, 7, 11, 12, 16, 24, 25, 26, 40, 41],
        noOut: [0, 5, 9, 30, 45],
    },
    {
        id_number: "100000003",
        first_name: "Sam",
        last_name: "Takahashi",
        graduation_year: null,
        safety_test: true,
        dues: false,
        miss: [4, 19],
        noOut: [33],
    },
    {
        id_number: "100000004",
        first_name: "",
        last_name: "",
        graduation_year: null,
        safety_test: false,
        dues: false,
        miss: [0, 1, 2, 3],
        noOut: [6],
    },
]

// fills out the roster so the team and meeting screens look like a real season
const firsts = [
    "Jordan",
    "Priya",
    "Mateo",
    "Lena",
    "Kofi",
    "Hana",
    "Theo",
    "Noor",
    "Ezra",
    "Mina",
    "Dante",
    "Yuki",
    "Tariq",
    "Sofia",
    "Owen",
    "Amara",
]
const lasts = [
    "Varga",
    "Nakamura",
    "Osei",
    "Reyes",
    "Haddad",
    "Lund",
    "Baptiste",
    "Kowal",
    "Rahman",
    "Ferro",
    "Adeyemi",
    "Choi",
    "Marsh",
    "Petrov",
    "Sandoval",
    "Quill",
]
for (let i = 0; i < 32; i++) {
    people.push({
        id_number: String(100000010 + i),
        first_name: firsts[i % 16],
        last_name: lasts[(i * 5) % 16],
        graduation_year: 2027 + (i % 4),
        safety_test: i % 7 !== 0,
        dues: i % 5 !== 0,
        miss: Array.from({ length: 56 }, (_, n) => n).filter((n) => (n * 7 + i * 13) % 11 < 1 + (i % 3)),
        noOut: Array.from({ length: 56 }, (_, n) => n).filter((n) => (n * 3 + i * 17) % 19 === 0),
    })
}

function attendanceRow(p) {
    const only_checked_in = pastDates.filter((_, i) => p.noOut.includes(i))
    const checked_out = pastDates.filter((_, i) => !p.noOut.includes(i) && !p.miss.includes(i))
    const checkins = checked_out.length + only_checked_in.length
    const hours = checked_out.length * 3.25
    return {
        id_number: p.id_number,
        first_name: p.first_name,
        last_name: p.last_name,
        graduation_year: p.graduation_year,
        safety_test: p.safety_test,
        dues: p.dues,
        num_checkins: String(checkins),
        attendance_rate_percent: `${((checkins / Math.max(pastDates.length, 1)) * 100).toFixed(2)}%`,
        num_checkouts: String(checked_out.length),
        checkout_rate_percent: `${((checked_out.length / Math.max(checkins, 1)) * 100).toFixed(2)}%`,
        total_hours: hours.toFixed(2),
        average_hours: (hours / Math.max(checkins, 1)).toFixed(2),
        checked_out,
        only_checked_in,
    }
}

const attendance = [
    ...people.map(attendanceRow),
    { id_number: "all", first_name: "", last_name: "", checked_out: allDates, only_checked_in: [] },
]

// like the real data, older meetings kept only their totals, not who came or when
const TIMES_SAVED_FOR_DAYS = 60
const timesSavedSince = daysAgo(TIMES_SAVED_FOR_DAYS)

const meetings = pastDates.map((date) => {
    const attendees = people.flatMap((p) => {
        const row = attendanceRow(p)
        const out = row.checked_out.includes(date)
        if (!out && !row.only_checked_in.includes(date)) return []
        return [
            {
                id: p.id_number,
                checkin_time: `${date} 15:${String(5 + (Number(p.id_number) % 40)).padStart(2, "0")}:00`,
                checkout_time: out
                    ? `${date} ${17 + (Number(p.id_number) % 2)}:${String(10 + (Number(p.id_number) % 45)).padStart(2, "0")}:00`
                    : "",
                total_hours: out
                    ? (2 + (Number(p.id_number) % 2) + (Number(p.id_number) % 45) / 60).toFixed(2)
                    : "0.00",
            },
        ]
    })
    const outs = attendees.filter((a) => a.checkout_time).length
    return {
        date,
        attendees: date >= timesSavedSince ? attendees : [],
        num_checkins: String(attendees.length),
        num_checkouts: String(outs),
        checkout_rate_percent: `${((outs / Math.max(attendees.length, 1)) * 100).toFixed(2)}%`,
    }
})

function base64url(value) {
    return Buffer.from(JSON.stringify(value)).toString("base64url")
}

function session(osis) {
    const exp = Math.floor(Date.now() / 1000) + 86400
    const email = `${osis}@email.com`
    const user = {
        id: osis,
        aud: "authenticated",
        role: "authenticated",
        email,
        app_metadata: {},
        user_metadata: {},
        created_at: "2026-01-01T00:00:00Z",
    }
    const access_token = `${base64url({ alg: "none", typ: "JWT" })}.${base64url({ sub: osis, email, exp })}.mock`
    return {
        access_token,
        refresh_token: `mock-${osis}`,
        token_type: "bearer",
        expires_in: 86400,
        expires_at: exp,
        user,
    }
}

function applyFilters(rows, params) {
    let result = rows
    for (const [column, expression] of params) {
        if (["select", "order"].includes(column)) continue
        if (expression.startsWith("eq.")) result = result.filter((r) => String(r[column]) === expression.slice(3))
        if (expression.startsWith("neq.")) result = result.filter((r) => String(r[column]) !== expression.slice(4))
        if (expression.startsWith("in.(")) {
            const values = expression
                .slice(4, -1)
                .split(",")
                .map((v) => v.replace(/"/g, ""))
            result = result.filter((r) => values.includes(String(r[column])))
        }
    }
    const order = params.get("order")
    if (order) {
        const [column, direction] = order.split(".")
        result = [...result].sort(
            (a, b) => String(a[column]).localeCompare(String(b[column])) * (direction === "desc" ? -1 : 1),
        )
    }
    return result
}

createServer(async (req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
    let body = ""
    for await (const chunk of req) body += chunk

    const send = (status, data) => {
        res.writeHead(status, {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
            "access-control-allow-headers": "*",
        })
        res.end(JSON.stringify(data))
    }

    if (url.pathname === "/auth/v1/token" || url.pathname === "/auth/v1/signup") {
        const email = JSON.parse(body || "{}").email
        const osis = email?.split("@")[0]
        if (!["admin", "testadmin"].includes(osis) && !people.some((p) => p.id_number === osis))
            return send(400, { error_code: "invalid_credentials", msg: "Invalid login credentials" })
        return send(200, session(osis))
    }

    if (url.pathname === "/auth/v1/user") {
        const token = req.headers.authorization?.split(" ")[1]?.split(".")[1]
        const { email, sub } = JSON.parse(Buffer.from(token, "base64url").toString())
        return send(200, session(sub).user && { ...session(sub).user, email })
    }

    if (url.pathname === "/rest/v1/attendance") return send(200, applyFilters(attendance, url.searchParams))
    if (url.pathname === "/rest/v1/meetings") return send(200, applyFilters(meetings, url.searchParams))

    send(404, { message: `mock has no route for ${url.pathname}` })
}).listen(PORT, "127.0.0.1", () => console.log(`mock supabase on http://127.0.0.1:${PORT}`))
