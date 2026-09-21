# OEE downtime analysis — 17 September 2026

## Delivered

Dashboard analysis defaults to the previous calendar month with its own date range, machine, mould, reason and remarks/search filters. All production-entry pages for the selected period are loaded before calculating results (maximum 100 pages; larger datasets require a shorter range). Filters then operate on the complete loaded period, not a single table page.

The table groups records by machine and downtime reason and shows entry count, distinct recorded dates, and share of matching reason-recorded entries. Highest-frequency pairs appear first. Expandable entry dates and remarks support investigation. These are recorded production entries, **not confirmed individual stoppage events**. Missing reasons or missing entries are not evidence of uptime.

## Backend required for time-based analysis

The inspected `/swagger/OEE/swagger.json` production-entry DTO contains a reason and machineOnTime, but no downtime duration, stoppage start/end, or scheduled operating minutes. Consequently the UI does not claim lost hours or time-based downtime percentages.

For these metrics, provide stoppage events with machine ID, reason ID, start/end or duration, planned/unplanned classification, and scheduled operating minutes per machine/shift. Define overlap handling and shift boundaries. Then calculate reason downtime minutes / scheduled minutes, and reason minutes / total downtime minutes separately.

Corrective-action ownership, due dates and resolution history need persistent backend endpoints before an action tracker can be implemented. Current review priority is descriptive frequency only, not an automatic root-cause diagnosis.

## Verification limitations

Automated tests cover grouping, percentage denominator, missing data, multi-page loading, errors and cancellation. Authenticated live API results and browser layout have not been verified in this update. API authorization remains authoritative; users without production-entry read access will see the load error rather than invented analytics.
