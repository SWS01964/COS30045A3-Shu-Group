# Data sources

Accessed 2026-11-27. Raw supplementary files: `data/supplementary/raw/`. Earlier record: `SOURCES_2026-11-17.md`.
Items marked UNVERIFIED could not be fetched in this check (BITRE and data.gov.au pages timed out or returned HTTP 403) and must be confirmed by hand.

## Datasets

| Dataset | Publisher | Title | URL | Release / version | Accessed | Licence | Use | Caveats |
|---|---|---|---|---|---|---|---|---|
| BITRE hospitalised injury file 1 (national) | BITRE | National hospitalised injuries 2011 to 2021 | https://www.bitre.gov.au/node/973 (listed on https://www.bitre.gov.au/publications/ongoing/hospitalised-injury) | September 2023, XLSX ~5.5 MB (from search listing) | 2026-11-27 | UNVERIFIED. data.gov.au-style catalogue listing reportedly says "No Licence Provided"; BITRE page not fetchable | Main project data: hospitalised road-crash injuries by year, age, road user etc. | Source is AIHW hospital records; counts are hospitalisations, not people. Licence unclear: cite BITRE, check before redistributing raw files. |
| BITRE hospitalised injury file 2 (First Nations) | BITRE | First Nations Peoples hospitalised injuries (spreadsheet) | https://www.bitre.gov.au/publications/ongoing/hospitalised-injury | UNVERIFIED (file title/date not confirmed) | 2026-11-27 | UNVERIFIED (catalogue reportedly "No Licence Provided") | First Nations breakdown | Rates need the ABS First Nations population denominators below. |
| BITRE hospitalised injury file 3 | BITRE | UNVERIFIED (third file name not confirmed; confirm against `data/` folder) | https://www.bitre.gov.au/publications/ongoing/hospitalised-injury | UNVERIFIED | 2026-11-27 | UNVERIFIED | Fill in from project files | |
| BITRE data dictionary | BITRE | Hospitalised Injury Data Dictionary (September 2023) | https://bitre.gov.au/sites/default/files/documents/hospitalised-injury-data-dictionary-september-2023.pdf | September 2023 | 2026-11-27 | UNVERIFIED | Variable definitions | URL taken from search result, not fetched. |
| ABS Estimated Resident Population (ERP), by single year of age | ABS | National, state and territory population, dataflow `ABS:ERP_Q(1.0.0)` | https://data.api.abs.gov.au/rest/data/ABS,ERP_Q/1.3..AUS.Q?startPeriod=2011-Q2&endPeriod=2021-Q2 | Pulled 2026-11-16/17 (reference period to March 2026); revised series rebased after 2021 Census | 2026-11-17 (file re-checked 2026-11-27) | CC BY 4.0 (VERIFIED: https://www.abs.gov.au/website-privacy-copyright-and-disclaimer) | Rate denominators (30 June, Q2) 2011-2021 | `raw/ABS_ERP_Q_AUS_persons_2011Q2-2021Q2.csv`: 4,920 rows, 11 columns, 120 age codes x 41 quarters. Use single ages 0-100 (`100` = 100+); they sum exactly to the `TOT` row. Aggregate codes (e.g. `8599`, `A15`) double-count if summed. |
| Australian Road Deaths Database (ARDD), fatalities | BITRE (via data.gov.au) | ARDD Fatalities October 2023 (`ardd_fatalities.csv`) | https://data.gov.au/data/dataset/australian-road-deaths-database | Updated 11/12/2023 per earlier record | 2026-11-17 (file re-checked 2026-11-27) | CC BY 3.0 AU per earlier record 2026-11-17; UNVERIFIED this session (data.gov.au returned HTTP 403) | Context: annual road deaths 2011-2021 | `raw/ardd_fatalities.csv`: 55,360 data rows, 23 columns, years 1989-2023 (trailing empty column in header). Later BITRE revisions may change recent years slightly. |
| ABS Estimates of Aboriginal and Torres Strait Islander Australians | ABS | Estimates of Aboriginal and Torres Strait Islander Australians, June 2021 (also June 2016; Estimates and Projections 2011 to 2031) | https://www.abs.gov.au/statistics/people/aboriginal-and-torres-strait-islander-peoples/estimates-aboriginal-and-torres-strait-islander-australians/30-june-2021 | 31/08/2023 (final, 2021 Census-based) | 2026-11-27 | CC BY 4.0 (site-wide statement, VERIFIED) | First Nations population denominators / share of population | Use 2021 from the 2021 release. 2011 and 2016 originals are not comparable with 2021: ABS has since back-cast them (see below). |

## Verified facts

| Fact | Value | Source URL | Status |
|---|---|---|---|
| ARDD annual deaths 2011-2021 (local file) | 1277, 1300, 1186, 1150, 1206, 1294, 1223, 1135, 1186, 1097, 1130 | `raw/ardd_fatalities.csv` (computed) | VERIFIED (local) |
| ERP total, 30 June 2011 (local file) | 22,340,024 | `raw/ABS_ERP_Q_AUS_persons_2011Q2-2021Q2.csv` (computed) | VERIFIED (local) |
| ERP total, 30 June 2021 (local file) | 25,685,412 | same file (computed) | VERIFIED (local) |
| First Nations population, 30 June 2021 | 983,700 (983,709 in table), 3.8% of total; released 31/08/2023 | https://www.abs.gov.au/statistics/people/aboriginal-and-torres-strait-islander-peoples/estimates-aboriginal-and-torres-strait-islander-australians/30-june-2021 | VERIFIED |
| First Nations population, 30 June 2016 (original, final) | 798,400, 3.3%; released 31/08/2018 | https://abs.gov.au/statistics/people/aboriginal-and-torres-strait-islander-peoples/estimates-aboriginal-and-torres-strait-islander-australians/jun-2016 | VERIFIED (superseded by back-cast) |
| First Nations population, 30 June 2011 (original, 2011 Census-based) | 669,900 (about 3.0% not stated on the page fetched) | same 2016 release page (quotes 669,900 for June 2011); the June 2011 page URL returned 404 | VERIFIED value; 3.0% UNVERIFIED |
| Back-cast First Nations population, 30 June 2011 | 806,090 | https://www.abs.gov.au/statistics/people/aboriginal-and-torres-strait-islander-peoples/estimates-and-projections-aboriginal-and-torres-strait-islander-australians/latest-release (published 24/07/2024; page dated 25/03/2025) | VERIFIED |
| Back-cast First Nations population, 30 June 2016 | 898,515 | same page | VERIFIED |
| First Nations 2021 in the same series | 983,709 | same page | VERIFIED |
| ABS licence | CC BY 4.0 International | https://www.abs.gov.au/website-privacy-copyright-and-disclaimer | VERIFIED |
| ARDD licence | CC BY 3.0 AU | https://data.gov.au/data/dataset/australian-road-deaths-database | UNVERIFIED this session (HTTP 403); recorded 2026-11-17 |
| BITRE hospitalised injury licence | Not CC BY 4.0 confirmed; catalogue reportedly "No Licence Provided" | https://www.bitre.gov.au/publications/ongoing/hospitalised-injury | UNVERIFIED (page timed out twice) |
| First Nations population file used by the workflow | `raw/abs_first_nations_population.csv` (year, fn_population, source): back-cast 30 June 2011, 2016 and 2021 = 806,090 / 898,515 / 983,709, from ABS "Estimates and Projections, Aboriginal and Torres Strait Islander Australians, 2011 to 2031" (URL in the file). Read by Ch5 in KNIME for the per-100,000 rates; non-Indigenous population = ERP all ages minus this. | same page as above | VERIFIED |
