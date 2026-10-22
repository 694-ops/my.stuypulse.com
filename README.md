# MyPulse
A website for StuyPulse members to track their attendance.

For documentation, visit [this link](https://docs.google.com/document/d/1YYvSsouOimYmmZP7nLjP3gyBHZ6w8mmlSXS-C2qMfFo/edit?usp=sharing).

## Graduation year

The kiosk's attendance CSV can include `graduation_year`. The scanner endpoint reads
CSV column headers, so exports with or without that optional column are supported.
Years must be between 1900 and 2200. A blank or omitted year preserves the member's
existing year. The dashboard shows the year beside the member's name (for example,
`Jane Doe '2028`); members without a year display only their name.

The live `mypulse` database migration `add_attendance_graduation_year` adds:

```sql
alter table public.attendance
    add column graduation_year smallint
    check (graduation_year between 1900 and 2200);
```

Run the scanner import regression tests with `node --test tests/kiosk-import.test.mjs`.
