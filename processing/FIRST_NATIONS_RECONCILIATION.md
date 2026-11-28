# First Nations data: reconciliation

At first the First Nations tables did not add up to the national totals, so Chapter 5 was put on hold. This note explains the gaps and the method that brought the chapter back into scope.

## The gaps, and what causes them

| Gap | Size | Cause |
|---|---|---|
| First Nations + non-Indigenous is less than the national annual total | 462–869 a year (2011–2021) | Records where Indigenous status is **not stated**. These are in the national total but in neither group. |
| The 2014 age block falls short | 2,576 | In Jul–Dec 2014 BITRE suppressed whole cells as `n.p.` (not published), including non-Indigenous 65+ (about 2,100) and ages 0–7. |
| Counterparty block | no gap | It has no `n.p.` cells, so it is the clean source for First Nations annual totals. |

## Method

1. **`n.p.` becomes missing, never zero.** The String to Number step turns `n.p.` into a missing value: 124 rows in `hosp` and 370 rows in `cases`. Missing values are left out downstream, the same way in KNIME and in the Python reference.
2. **Records with status not stated are left out.** Each group is compared only with itself. We do not force First Nations and non-Indigenous to add up to the national total.
3. **Shares use published cells only.** In `ch5_first_nations_profile.csv` the road-user shares are taken over published cells. Each row also has a count of suppressed half-year cells (`np_cells`, 14 per group for 2016–21), so the chart can flag them.
4. **The profile uses a 2016–21 window.** Bed days are only comparable from July 2015, so the profile pools 2016–21, the same window as Chapter 3.
5. **Rates use ABS back-cast population.** We use the First Nations population back-cast after the 2021 Census: 806,090 (2011), 898,515 (2016) and 983,709 (2021). The older 2011 figure (669,900) has been superseded, and mixing the two series overstates growth. The non-Indigenous population is ERP minus First Nations, so it also includes people whose status is unknown.

## Checks

- `ch5_first_nations_trend.csv`: the First Nations and non-Indigenous annual totals match the First Nations file `T1` exactly in all 11 years (see `processing/VALIDATION.md`).
- First Nations hospitalisations went from 1,167 to 2,220 (+90%), against +15% for non-Indigenous people. Per 100,000 people: First Nations 144.8 / 185.8 / 225.7 and non-Indigenous 148.6 / 157.5 / 148.8 (2011 / 2016 / 2021).

## Caveats the chapter must state

- Better recording of Indigenous status over the decade may explain part of the rise.
- Records with status not stated, and `n.p.` cells, are left out.
- Remoteness is where the patient usually lives, not where the crash happened.
- The road-user mix is a set of shares, not rates. There is no exposure data.

These caveats appear in the Chapter 5 board notes and in the site's Methods section.
