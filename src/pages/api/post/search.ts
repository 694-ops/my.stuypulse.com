export const prerender = false

import type { APIRoute } from "astro"
import { supabase } from "../../../lib/supabase"

export const POST: APIRoute = async ({ request, redirect }) => {
    const formData = await request.formData()
    const name = formData.get("name")?.toString() || ""

    const { data, error } = await supabase.from("attendance").select("id_number, first_name, last_name")

    if (error) return new Response("Error fetching names.", { status: 500 })
    else {
        for (const { id_number, first_name, last_name } of data)
            if (first_name + " " + last_name === name || id_number === name)
                return new Response(`/dashboard?osis=${id_number}`, { status: 200 })
    }

    return new Response("Name not found.", { status: 500 })
}
