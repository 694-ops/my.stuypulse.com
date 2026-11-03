// logins that get the admin view. to add one, create its account in supabase as <name>@email.com,
// then add the name here
export const ADMIN_OSIS = ["admin", "testadmin"]

export function isAdmin(osis: string | null | undefined) {
    return !!osis && ADMIN_OSIS.includes(osis)
}
