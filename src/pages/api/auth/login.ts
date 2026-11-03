export const prerender = false

import type { APIRoute } from "astro"
import { supabase } from "../../../lib/supabase"
import { isAdmin } from "../../../lib/access"

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
    const formData = await request.formData()
    const osis = formData.get("osis")?.toString()
    const password = formData.get("password")?.toString()

    // handling errors with osis and password input
    if (!osis || !password) return new Response("OSIS and password are required", { status: 400 })
    if (!isAdmin(osis) && (osis.length != 9 || isNaN(Number(osis)))) return new Response("Invalid OSIS", { status: 400 })

    // log in with supabase and handle any errors
    const { data, error } = await supabase.auth.signInWithPassword({ email: osis + "@email.com", password })
    if (error) return new Response(error.message, { status: 500 })

    // save the account session using cookies
    const { access_token, refresh_token } = data.session
    cookies.set("sb-access-token", access_token, {
        path: "/",
    })
    cookies.set("sb-refresh-token", refresh_token, {
        path: "/",
    })

    return redirect("/dashboard")
}