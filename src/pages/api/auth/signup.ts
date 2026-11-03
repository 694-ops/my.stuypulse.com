export const prerender = false

import type { APIRoute } from "astro"
import { supabase } from "../../../lib/supabase"

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
    const formData = await request.formData()
    const osis = formData.get("osis")?.toString()
    const password = formData.get("password")?.toString()

    // handling errors with osis and password input
    if (!osis || !password) return new Response("OSIS and password are required", { status: 400 })
    if (osis.length != 9 || isNaN(Number(osis))) return new Response("Invalid OSIS", { status: 400 })
    if (password.length < 6) return new Response("Password too short", { status: 400 })

    // checks if the osis exists in the database
    const { data, error } = await supabase.from("attendance").select("id_number").eq("id_number", osis)

    if (error) return new Response("Error fetching database", { status: 500 })
    if (data.length == 0) return new Response("OSIS not in database", { status: 500 })

    // register with supabase and handle any errors
    const { error: signUpError } = await supabase.auth.signUp({ email: osis + "@email.com", password })
    if (signUpError) return new Response(signUpError.message, { status: 500 })

    // log in with supabase and handle any errors
    const { data: loginData, error: logInError } = await supabase.auth.signInWithPassword({
        email: osis + "@email.com",
        password,
    })
    if (logInError) return new Response(logInError.message, { status: 500 })

    // save the account session using cookies
    const { access_token, refresh_token } = loginData.session
    cookies.set("sb-access-token", access_token, {
        path: "/",
    })
    cookies.set("sb-refresh-token", refresh_token, {
        path: "/",
    })

    return redirect("/dashboard")
}
