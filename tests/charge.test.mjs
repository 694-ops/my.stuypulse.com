import test from 'node:test'
import assert from 'node:assert/strict'
import { meetingCells, memberCells, teamCells } from '../src/lib/charge.ts'
import { seasonStart } from '../src/lib/format.ts'

test('a member cell shows full, half or empty, and skips meetings still to come', () => {
    const cells = memberCells(
        ['2026-10-01', '2026-10-02', '2026-10-03', '2026-11-02', '2026-11-03'],
        ['2026-10-01'],
        ['2026-10-02'],
        '2026-11-02',
    )

    assert.deepEqual(cells.map(({ kind }) => kind), ['present', 'partial', 'absent'])
    assert.deepEqual(cells.map(({ level }) => level), [1, 0.5, 0])
    assert.equal(cells[1].label, 'Oct 2, 2026: No checkout')
})

test('missing lists from the database do not throw', () => {
    assert.deepEqual(memberCells(null, null, null, '2026-11-02'), [])
    assert.equal(memberCells(['2026-10-01'], null, null, '2026-11-02')[0].kind, 'absent')
})

test('the season starts each September 1st', () => {
    assert.equal(seasonStart('2026-11-03'), '2026-09-01')
    assert.equal(seasonStart('2026-09-01'), '2026-09-01')
    assert.equal(seasonStart('2026-08-31'), '2025-09-01')
    assert.equal(seasonStart('2027-03-15'), '2026-09-01')
})

test('member cells start at the season, however long the history', () => {
    const cells = memberCells(['2026-05-28', '2026-06-15', '2026-09-14', '2026-10-02', '2026-11-02'], ['2026-09-14', '2026-06-15'], [], '2026-11-03')

    assert.deepEqual(cells.map(({ key }) => key), ['2026-09-14', '2026-10-02', '2026-11-02'])
    assert.deepEqual(cells.map(({ kind }) => kind), ['present', 'absent', 'absent'])
})

test('team cells sort by date, scale to the busiest meeting and link to it', () => {
    const cells = teamCells([
        { date: '2026-10-02', num_checkins: '10', num_checkouts: '5' },
        { date: '2026-10-01', num_checkins: '20', num_checkouts: '20' },
        { date: '2026-10-03', num_checkins: 'bad', num_checkouts: '' },
        { date: '2026-05-28', num_checkins: '99', num_checkouts: '99' },
    ], '2026-11-03')

    assert.deepEqual(cells.map(({ key }) => key), ['2026-10-01', '2026-10-02', '2026-10-03'])
    assert.deepEqual(cells.map(({ level }) => level), [1, 0.5, 0])
    assert.equal(cells[2].kind, 'absent')
    assert.equal(cells[0].href, '/dashboard?meeting=2026-10-01')
})

test('meeting cells scale to the longest stay and no checkout shows half', () => {
    const cells = meetingCells([
        { id: '1', total_hours: '4.00', checkout_time: 'x' },
        { id: '2', total_hours: '0.00', checkout_time: '' },
    ], { 1: 'Avery' })

    assert.equal(cells[0].level, 1)
    assert.equal(cells[0].label, 'Avery: 4.00 hours')
    assert.equal(cells[1].kind, 'partial')
    assert.equal(cells[1].label, '2: No checkout')
})
