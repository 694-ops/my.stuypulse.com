import test from 'node:test'
import assert from 'node:assert/strict'
import { isAdmin } from '../src/lib/access.ts'

test('only listed logins are admins', () => {
    assert.equal(isAdmin('admin'), true)
    assert.equal(isAdmin('testadmin'), true)
    assert.equal(isAdmin('123456789'), false)
    assert.equal(isAdmin('Admin'), false)
    assert.equal(isAdmin(''), false)
    assert.equal(isAdmin(undefined), false)
    assert.equal(isAdmin(null), false)
})
