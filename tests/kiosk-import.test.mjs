import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as csv from '../src/lib/kiosk-csv.ts'

const columns = ['id_number', 'first_name', 'last_name', 'num_checkins', 'attendance_rate_percent', 'num_checkouts', 'checkout_rate_percent', 'total_hours', 'average_hours']

async function upload(withYear, year = '2028') {
    const writes = {}
    const database = {
        attendance: [{ id_number: '123456789', checked_out: [], only_checked_in: [], graduation_year: 2027 }, { id_number: 'all', checked_out: ['2026-10-20'], only_checked_in: [], graduation_year: null }],
        meetings: [{ date: '2026-10-20', attendees: [{ id: '123456789', checkin_time: '2026-10-20T15:00:00', checkout_time: '2026-10-20T17:00:00', total_hours: '2.00' }], num_checkins: '1', num_checkouts: '1', checkout_rate_percent: '100%' }],
    }
    const serviceSupabase = { from(table) { return {
        select: async () => ({ data: database[table], error: null }),
        upsert: async rows => { writes[table] = rows; return { error: null } },
    } } }
    const source = readFileSync(new URL('../src/pages/api/post/scanner.ts', import.meta.url), 'utf8').replaceAll('import.meta.env.KIOSK_KEY', '"test-key"')
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const exports = {}
    vm.runInNewContext(output, { exports, require: path => path.endsWith('kiosk-csv') ? csv : { serviceSupabase }, Response, Blob, console })
    const form = new FormData()
    const headers = [...columns]
    const values = ['123456789', 'Jane', 'Doe', '2', '100%', '1', '50%', '2.00', '2.00']
    if (withYear) { headers.splice(3, 0, 'graduation_year'); values.splice(3, 0, year) }
    form.set('attendance', new File([headers.join(',') + '\r\n' + values.join(',') + '\r\n'], 'attendance.csv'))
    form.set('meetings', new File(['date,num_checkins,num_checkouts,checkout_rate_percent\n2026-10-21,1,1,100%\n'], 'meetings.csv'))
    form.set('checkins', new File([`date,id_number,first_name,last_name,${withYear ? 'graduation_year,' : ''}checkin_time,checkout_time,total_hours\n2026-10-21,123456789,Jane,Doe,${withYear ? year + ',' : ''}2026-10-21T15:00:00,2026-10-21T17:00:00,2.00\n`], 'checkins.csv'))
    const request = new Request('https://example.test/api/post/scanner', { method: 'POST', headers: { key: 'test-key' }, body: form })
    const response = await exports.POST({ request })
    return { response, writes }
}

test('current kiosk columns store graduation year without shifting statistics or times', async () => {
    const { response, writes } = await upload(true)
    assert.equal(response.status, 200, await response.text())
    const member = writes.attendance[0]
    assert.equal(member.graduation_year, 2028)
    assert.equal(member.num_checkins, '2')
    assert.equal(member.attendance_rate_percent, '100%')
    assert.equal(member.num_checkouts, '1')
    assert.equal(member.checkout_rate_percent, '50%')
    assert.equal(member.total_hours, '2.00')
    assert.equal(member.average_hours, '2.00')
    assert.equal(member.safety_test, undefined)
    assert.equal(member.dues, undefined)
    const meeting = writes.meetings.find(row => row.date === '2026-10-21')
    assert.equal(meeting.attendees[0].checkin_time, '2026-10-21T15:00:00')
    assert.equal(meeting.attendees[0].checkout_time, '2026-10-21T17:00:00')
    assert.equal(meeting.attendees[0].total_hours, '2.00')
    assert.equal(writes.meetings.find(row => row.date === '2026-10-20').attendees.length, 1)
})

for (const [label, withYear, year] of [['legacy', false, ''], ['blank year', true, '']]) {
    test(`${label} export preserves an existing graduation year`, async () => {
        const { response, writes } = await upload(withYear, year)
        assert.equal(response.status, 200, await response.text())
        assert.equal(writes.attendance[0].graduation_year, 2027)
        assert.equal(writes.attendance[0].num_checkins, '2')
    })
}

test('invalid graduation year rejects the upload before database writes', async () => {
    const { response, writes } = await upload(true, 'twenty')
    assert.equal(response.status, 500)
    assert.deepEqual(writes, {})
})

test('CSV reader supports reordered columns, quoted names, CRLF, and missing-column errors', () => {
    const [row] = csv.parseKioskCsv('\ufefflast_name,graduation_year,id_number,first_name\r\n"Doe, Jr.",2028,123456789,"Jane ""JJ"""\r\n', ['id_number', 'first_name', 'last_name'])
    assert.equal(row.last_name, 'Doe, Jr.')
    assert.equal(row.first_name, 'Jane "JJ"')
    assert.equal(row.graduation_year, '2028')
    assert.throws(() => csv.parseKioskCsv('id_number\n123456789', ['first_name']), /Missing CSV column/)
})
