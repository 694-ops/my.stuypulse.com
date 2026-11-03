import test from 'node:test'
import assert from 'node:assert/strict'
import { formatClock, memberDays } from '../src/lib/days.ts'

test('kiosk times read as a 12-hour clock', () => {
    assert.equal(formatClock('2026-10-12 15:32:00'), '3:32 PM')
    assert.equal(formatClock('2026-10-12T09:05:00'), '9:05 AM')
    assert.equal(formatClock('2026-10-12 00:10:00'), '12:10 AM')
    assert.equal(formatClock('2026-10-12 12:00:00'), '12:00 PM')
    assert.equal(formatClock(''), '')
    assert.equal(formatClock(null), '')
})

test('a member gets only their own times', () => {
    const days = memberDays([
        {
            date: '2026-10-12',
            attendees: [
                { id: '1', checkin_time: '2026-10-12 15:30:00', checkout_time: '2026-10-12 18:00:00', total_hours: '2.50' },
                { id: '2', checkin_time: '2026-10-12 15:40:00', checkout_time: '', total_hours: '0.00' },
            ],
        },
        { date: '2026-10-14', attendees: null },
    ], '2')

    assert.deepEqual(days['2026-10-12'], { checkin: '3:40 PM', checkout: '', hours: '' })
    assert.deepEqual(days['2026-10-14'], { checkin: '', checkout: '', hours: '' })
    assert.deepEqual(memberDays(null, '2'), {})
})
