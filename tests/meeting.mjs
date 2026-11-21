import assert from 'node:assert/strict'
import { meetingDate, meetingLabel } from '../src/logic/meeting.js'
const base = new Date(2026, 10, 21, 22, 50)
const today = meetingDate('Сегодня', '13:30', base)
const tomorrow = meetingDate('Завтра', '13:30', base)
assert.ok(today < base)
assert.ok(tomorrow > base)
assert.equal(today.getHours(), 13)
assert.equal(tomorrow.getDate(), 22)
assert.equal(meetingDate('Сегодня', 'bad', base), null)
assert.match(meetingLabel({ at: new Date().toISOString(), time: '12:00' }), /Сегодня/)
console.log('Meetings: dates and past/future checks passed.')
