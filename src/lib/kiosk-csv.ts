export function parseKioskCsv(text: string, requiredHeaders: string[]): Record<string, string>[] {
    const rows: string[][] = []
    let row: string[] = []
    let value = ""
    let quoted = false

    for (let i = 0; i < text.length; i++) {
        const char = text[i]
        if (char === '"') {
            if (quoted && text[i + 1] === '"') {
                value += '"'
                i++
            } else quoted = !quoted
        } else if (!quoted && (char === "," || char === "\n" || char === "\r")) {
            row.push(value)
            value = ""
            if (char !== ",") {
                if (row.some((cell) => cell !== "")) rows.push(row)
                row = []
                if (char === "\r" && text[i + 1] === "\n") i++
            }
        } else value += char
    }
    if (quoted) throw new Error("Unclosed CSV quote")
    row.push(value)
    if (row.some((cell) => cell !== "")) rows.push(row)

    const headers = (rows.shift() || []).map((header) => header.trim())
    for (const header of requiredHeaders) {
        if (!headers.includes(header)) throw new Error(`Missing CSV column: ${header}`)
    }
    return rows.map((cells) => {
        if (cells.length !== headers.length) throw new Error("CSV row does not match its header")
        return Object.fromEntries(headers.map((header, i) => [header, cells[i]]))
    })
}

export function parseGraduationYear(value: string | undefined): number | null {
    if (!value?.trim()) return null
    if (!/^\d{4}$/.test(value.trim())) throw new Error("Graduation year must be a four-digit year")
    const year = Number(value)
    if (year < 1900 || year > 2200) throw new Error("Graduation year is outside the supported range")
    return year
}
