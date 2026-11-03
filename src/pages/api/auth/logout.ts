export const prerender = false

import type { APIRoute } from "astro"

export const GET: APIRoute = async ({ cookies, redirect }) => {
    // logs out by deleting the cookies
    cookies.delete("sb-access-token", { path: "/" })
    cookies.delete("sb-refresh-token", { path: "/" })

    // redirects to login
    return redirect("/")
}
