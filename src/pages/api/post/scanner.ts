export const prerender = false

import type { APIRoute } from "astro"
import { serviceSupabase } from "../../../lib/supabase"
import { parseKioskCsv, parseGraduationYear } from "../../../lib/kiosk-csv"

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData()

        // make sure the key is correct
        const key = request.headers.get("key")
        if (!key || key != import.meta.env.KIOSK_KEY) return new Response("Authorization key is incorrect.", { status: 403 })

        // fetch data from supabase
        let { data: attendance, error } = await serviceSupabase
            .from("attendance")
            .select("id_number, checked_out, only_checked_in, graduation_year")

        if (error || !attendance) return new Response("Error fetching user attendance: " + error?.message, { status: 500 })

        let { data: meetings, error: error1 } = await serviceSupabase
            .from("meetings")
            .select("*")
        
        if (error1 || !meetings) return new Response("Error fetching meetings: " + error1?.message, { status: 500 })

        // converts the array of objects into one object
        const attendanceObj = attendance.reduce((obj, { id_number, checked_out, only_checked_in }) => {
            obj[id_number] = { checked_out: new Set(checked_out || []), only_checked_in: new Set(only_checked_in || []) }
            return obj
        }, {} as Record<string, { checked_out: Set<string>, only_checked_in: Set<string> }>)

        const graduationYears = Object.fromEntries(attendance.map(({ id_number, graduation_year }) => [id_number, graduation_year]))

        interface Attendee { 
            checkin_time: string, 
            checkout_time: string, 
            total_hours: string
        }

        const meetingsObj = meetings.reduce((obj, { date, attendees, num_checkins, num_checkouts, checkout_rate_percent }) => {
            obj[date] = { attendees: Object.fromEntries((attendees || []).map((attendee: Attendee & { id: string }) => [attendee.id, attendee])), num_checkins, num_checkouts, checkout_rate_percent }
            return obj
        }, {} as Record<string, { attendees: Record<string, Attendee>, num_checkins: string, num_checkouts: string, checkout_rate_percent: string }>)

        // read the meetings file
        const meetingsFile = formData.get("meetings") as File
        if (!meetingsFile) return new Response("Meetings file missing.", { status: 500 })

        // parse the meetings data
        const meetingsText = await new Blob([meetingsFile], { type: "text/csv" }).text()
        const meetingsData = parseKioskCsv(meetingsText, ["date", "num_checkins", "num_checkouts", "checkout_rate_percent"])
        
        // updates the meetings
        meetingsData.forEach((row) => {
            const { date, num_checkins, num_checkouts, checkout_rate_percent } = row
            meetingsObj[new Date(date).toISOString().split("T")[0]] = { attendees: {}, num_checkins, num_checkouts, checkout_rate_percent }

            // adds the meeting to the list of all the meetings
            attendanceObj["all"].checked_out.add(date)
        })

        // read the checkin file
        const checkinsFile = formData.get("checkins") as File
        if (!checkinsFile) return new Response("Checkins file missing.", { status: 500 })

        // parse the checkin data
        const checkinsText = await new Blob([checkinsFile], { type: "text/csv" }).text()
        const checkinsData = parseKioskCsv(checkinsText, ["date", "id_number", "checkin_time", "checkout_time", "total_hours"])

        // updates the user attendance
        checkinsData.forEach((row) => {
            const { date, id_number: id, checkin_time, checkout_time, total_hours } = row

            // inits the key value pair if the key doesn't exist (ie the id is new)
            if (!(id in attendanceObj))
                attendanceObj[id] = { checked_out: new Set(), only_checked_in: new Set() }

            // adds the new meeting to the correct list
            attendanceObj[id][checkout_time !== "" ? "checked_out" : "only_checked_in"].add(date)

            // removes the date from the only checked in if they have now checked out
            if (checkout_time !== "") attendanceObj[id]["only_checked_in"].delete(date)

            // adds student to attendees of meeting
            if (!(id in meetingsObj[date].attendees))
                meetingsObj[date].attendees[id] = { checkin_time, checkout_time, total_hours }
        })

        // read the attendance file
        const attendanceFile = formData.get("attendance") as File
        if (!attendanceFile) return new Response("Attendance file missing.", { status: 500 })

        // parse the attendance data
        const attendanceText = await new Blob([attendanceFile], { type: "text/csv" }).text()
        const attendanceData = parseKioskCsv(attendanceText, ["id_number", "first_name", "last_name", "num_checkins", "attendance_rate_percent", "num_checkouts", "checkout_rate_percent", "total_hours", "average_hours"])

        // convert the attendance data into an array of objects
        const newAttendanceData = attendanceData.map((
            { id_number, first_name, last_name, graduation_year, num_checkins, attendance_rate_percent, num_checkouts, checkout_rate_percent, total_hours, average_hours }) => {
            const checked_out = Array.from(attendanceObj[id_number].checked_out)
            const only_checked_in = Array.from(attendanceObj[id_number].only_checked_in)

            return { id_number, first_name, last_name, graduation_year: parseGraduationYear(graduation_year) ?? graduationYears[id_number] ?? null, num_checkins, attendance_rate_percent, num_checkouts, checkout_rate_percent, total_hours, average_hours, checked_out, only_checked_in }
        })
        
        newAttendanceData.push( { 
            id_number: "all",
            graduation_year: null,
            first_name: "",
            last_name: "",
            num_checkins: "0",
            attendance_rate_percent: "",
            num_checkouts: "0",
            checkout_rate_percent: "", 
            total_hours: "0",
            average_hours: "0",
            checked_out: Array.from(attendanceObj["all"].checked_out),
            only_checked_in: Array.from(attendanceObj["all"].only_checked_in) 
        })

        // upsert the attendance data
        const { error: error2 } = await serviceSupabase
            .from("attendance")
            .upsert(newAttendanceData)

        if (error2) return new Response("Error upserting attendance data: " + error2.message, { status: 500 })

        // convert the meetings data into an array of objects
        const newMeetingsData = []
        for (const date in meetingsObj) {
            const { attendees, num_checkins, num_checkouts, checkout_rate_percent } = meetingsObj[date]
            const attendeesArr = []
            for (const id in attendees) {
                const { checkin_time, checkout_time, total_hours } = attendees[id]
                attendeesArr.push({ id, checkin_time, checkout_time, total_hours })
            }
            newMeetingsData.push({ date, attendees: attendeesArr.sort((a, b) => a.checkin_time.localeCompare(b.checkin_time)), num_checkins, num_checkouts, checkout_rate_percent })
        }

        // upsert the meetings data
        const { error: error3 } = await serviceSupabase
            .from("meetings")
            .upsert(newMeetingsData)

        if (error3) return new Response("Error upserting meetings data: " + error3.message, { status: 500 })

        return new Response("Successfully posted data.", { status: 200 })
    } catch (error) {
        return new Response("Error posting data: " + error, { status: 500 })
    }
}
