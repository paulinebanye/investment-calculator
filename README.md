# Investment Calculator

> ## Table of contents

* [Overview](#overview)
* [Project Goals](#project-goals)
* [Core Features](#core-features)
* [Architecture Overview](#architecture-overview)
* [Technologies](#technologies)
* [Repository Structure](#repository-structure)
* [Project Setup](#project-setup)
* [Using the Calculator](#using-the-calculator)

  * [Premium Yield Investment](#premium-yield-investment)
  * [Top-up and Rollover Drawer](#top-up-and-rollover-drawer)
  * [Enhanced Dollar Investment](#enhanced-dollar-investment)
  * [Product Settings](#product-settings)
* [How the Numbers Are Calculated](#how-the-numbers-are-calculated)
* [Worked Examples](#worked-examples)
* [Calculation Guidelines](#calculation-guidelines)
* [Common Validation Messages](#common-validation-messages)
* [Known Limitations](#known-limitations)
* [Testing and Verification](#testing-and-verification)
* [Project Status](#project-status)
* [Contributing](#contributing)

---

# Overview

<p align="justify">

This repository contains a browser-based investment calculator for two products:

* **Premium Yield Investment (PYI)** in naira (₦)
* **Enhanced Dollar Investment (EDI)** in US dollars ($)

The calculator works out gross interest, withholding tax (WHT), net interest, payout schedules, maturity values, top-ups, replacement investments and rollovers. Results update as the user types.

Instead of relying on a spreadsheet, this project turns the Investment Module logic (`calculateInterest()` and `createInvestmentRepaymentSchedule()`) into a single shareable web page that anyone on the team can open, with no installation and no login.

The calculation rules follow the product spreadsheet, which is treated as the source of truth.

Currently, this project covers:

* Premium Yield Investment (Regular and Flat, Months and Days tenors)
* Interest payment types: Maturity, Monthly, Quarterly, Biannual and Upfront
* Top-up, replacement investment and rollover for Premium Yield
* Enhanced Dollar Investment maturity, early liquidation, top-up and rollover

</p>

> Figures are estimates for illustration. Rates are typed in by the user, while the live system picks them from a rate ladder.

---

# Project Goals

The calculator was created to solve a common production issue:

> A spreadsheet can be correct for one scenario and silently wrong for another.

Examples include:

* rounding differences of a few kobo that become significant on large amounts
* yearly bonus days placed in the wrong payout
* WHT or penalties applied twice
* payout schedules that do not reconcile with the summary
* top-ups that include interest already paid out

The calculator keeps one set of rules, applies them to every scenario, and shows the same figures the live system should produce.

---

# Core Features

* Premium Yield and Enhanced Dollar calculators in one page
* Regular (365-day) and Flat (360-day) rate types
* Month and day tenors
* Maturity, Monthly, Quarterly, Biannual and Upfront interest payments
* Payment schedule with one row per payout
* Regular-month yearly bonus (5 days per completed year)
* Top-up (keep or extend maturity), the investment it creates, and rollover drawer
* Editable product settings (WHT, penalties, denominators, bonus days, minimums)
* Input validation with clear messages
* Copy summary to clipboard
* Landscape layout on wide screens and a single column on phones
* Light and dark mode

---

# Architecture Overview

The calculator is divided into four layers, each in its own place.

| Layer                | Responsibility                                                      |
| -------------------- | ------------------------------------------------------------------- |
| Input Panel          | `index.html`: collects the principal, tenor, rate and payment options |
| Calculation Logic    | `js/logic.js`: pure functions for Premium Yield, replacement investment and EDI |
| Rendering Layer      | `js/app.js`: builds the result cards, breakdown groups and payment schedule |
| Product Settings     | Settings panel: WHT rate, penalties, denominators, bonus and minimums |

`js/logic.js` has no dependencies and never touches the page, so the same file runs in the browser and in the Node tests.

---

# Technologies

| Stack                     | Usage                                      |
| ------------------------- | ------------------------------------------ |
| **HTML / CSS**            | Page structure and responsive layout       |
| **Vanilla JavaScript**    | Calculation logic and rendering            |
| **Google Fonts (Figtree)** | Typography, with a system-font fallback   |
| **Node.js (optional)**    | Test runner and single-file build script   |
| **Playwright**            | Browser checks used during verification    |
| **LibreOffice**           | Recalculating the source workbook for tests |

---

# Repository Structure

```bash
investment-calculator/
│
├── index.html              # Page markup only
│
├── css/
│   └── styles.css          # All styling (light/dark, responsive layout)
│
├── js/
│   ├── logic.js            # Calculation rules (no DOM, runs in browser and Node)
│   └── app.js              # UI: reads the form, calls the logic, renders results
│
├── tests/
│   └── logic.test.js       # Automated checks for the calculation rules
│
├── scripts/
│   └── build-single.js     # Bundles everything into one HTML file
│
├── package.json
├── vercel.json             # Serves the folder as a static site
├── .gitignore
└── README.md
```

Where to make a change:

| Change                                         | File            |
| ---------------------------------------------- | --------------- |
| A calculation rule, rounding or a minimum      | `js/logic.js`   |
| What is shown, labels, validation messages     | `js/app.js`     |
| Form fields or page layout                     | `index.html`    |
| Colours, spacing or responsive behaviour       | `css/styles.css` |

---

# Project Setup

There are no dependencies to install. Node 18 or later is only needed to run the tests and the build script.

## Clone the Repository

```bash
git clone https://github.com/paulinebanye/<repo-name>
cd <repo-name>
```

---

## Open the Calculator

Double-click `index.html`, or serve the folder locally:

```bash
npm start
```

Then open `http://localhost:8080`.

---

## Run the Tests

```bash
npm test
```

---

## Bundle a Single File

```bash
npm run bundle
```

This writes `dist/investment-calculator.html` with the CSS and JavaScript inlined. Use it for emailing the calculator or publishing it as one page.

---

## Host the Calculator

Upload the project folder (or `dist/investment-calculator.html`) to any static host, for example GitHub Pages, Netlify or an internal web server.

On Vercel, import the repository and leave the framework preset on **Other**. `vercel.json` already tells Vercel there is no build step and that the project root is the site, so no build or output settings are needed.

Everything runs in the browser and no data is sent anywhere.

---

# Using the Calculator

## Premium Yield Investment

Choose the options at the top of the input panel:

| Option                | Choices                                           |
| --------------------- | ------------------------------------------------- |
| Rate type             | Regular (365) or Flat (360)                       |
| Tenor type            | Months or Days                                    |
| Interest payment type | Maturity, Monthly, Quarterly, Biannual or Upfront |

Then enter the principal, tenor and annual rate.

The results show:

* interest calculation (daily interest, base interest, bonus, gross, WHT, upfront penalty and net)
* payout schedule (regular and final payouts, balance and expected funds at maturity)
* a payment schedule table with one row per payout

---

## Top-up and Rollover Drawer

Switch on **Include top-up and rollover** to open the drawer. It has three tabs:

| Tab         | Use                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------- |
| Top-up      | Days elapsed and top-up amount, with optional top-up date and original maturity date         |
| New terms   | Keep or extend the maturity, the new rate and the new rate type                              |
| Rollover    | Days processed after maturity, extra money added and cash-out for a part rollover            |

Top-up applies to active, non-upfront investments only. Rollover applies to matured investments.

The results show only the scenario for the open tab: Top-up and New terms show the top-up and the investment it creates, while Rollover shows the rollover figures. Nothing from the other scenario appears.

When a top-up is allowed and the replacement investment is valid, the headline figure and the payment schedule switch to the replacement investment (the new principal, rate, tenure and payment type). The original investment's figures stay in the breakdown, labelled "Original investment". The schedule starts on the top-up date: interest earned so far is added to the new principal, so the first payout is due one payout period after the top-up. Enter the top-up date to see actual payout dates.

On the **New terms** tab you choose what happens to the maturity:

| Choice                    | What the calculator does                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Keep original maturity    | The new tenure is the time left. With the top-up date and original maturity entered, it is counted from the dates |
| Extend maturity           | You enter a new tenure, counted from the top-up date. The maturity is the later of the original and the new date |

In both cases the payment type stays the same as the original, and the tenure is in the same unit as the original (months or days).

**How the time left is counted.** Each complete month counts as 30 days, plus the leftover days. Example: 25 Nov 2026 to 18 Feb 2027 is 2 complete months plus 24 days, so 84 days left.

**Completing the payout cycle (always applies).** Monthly, quarterly and biannual investments run in whole payout periods (30, 90 or 180 days), and the backend does not allow anything shorter. So when a top-up keeps the original maturity, the time left is rounded up to the next whole period and the maturity moves out by the difference. Examples: a monthly investment with 10 days left stays a full 30 days (maturity +20 days); a quarterly investment with 84 days left becomes 90 days (maturity +6 days). With 60 days left on a monthly investment nothing moves.

When both dates are entered, the results show the new maturity date.

---

## Enhanced Dollar Investment

Switch the product to **Enhanced Dollar (EDI, $)**.

* Day tenor only, with interest paid at maturity
* Minimum investment of $5 and minimum tenor of 90 days (both editable in Product settings)
* Regular (365) or Flat (360) basis
* Optional early liquidation, top-up and rollover drawer

---

## Product Settings

Open **Product settings** below the results to change:

| Setting                                | Default          |
| -------------------------------------- | ---------------- |
| WHT rate                               | 10%              |
| Upfront penalty                        | 10% (placeholder) |
| Regular and flat day-count denominator | 365 and 360      |
| Days per complete month                | 30               |
| Bonus days per completed year          | 5                |
| Minimum investment (PYI)               | ₦100,000         |
| Minimum tenor, months (PYI)            | 3 months         |
| Minimum tenor, days (PYI)              | 90 days          |
| Minimum tenor, quarterly interest      | 6 months (180 days) |
| Minimum tenor, biannual interest       | 12 months (360 days) |
| EDI WHT rate                           | 10% (placeholder) |
| EDI early-liquidation penalty          | 0% (placeholder)  |
| Minimum investment (EDI)               | $5               |
| Minimum tenor (EDI)                    | 90 days          |

The upfront penalty, withholding tax and the rates are configurable in the live system. The values marked as placeholders are examples, not confirmed figures.

---

# How the Numbers Are Calculated

## Daily Interest

```text
daily interest = principal × rate ÷ denominator
```

The denominator is 365 for Regular and 360 for Flat.

---

## Interest-Bearing Days

| Tenor  | Days                    |
| ------ | ----------------------- |
| Months | months × 30             |
| Days   | the actual days entered |

---

## Yearly Bonus

* Regular month tenors earn 5 extra days per completed 12 months
* The bonus is paid in the payout that completes each year (the 12th monthly, 4th quarterly or 2nd biannual payout)
* Flat and day tenors earn no bonus

---

## Gross, WHT and Net

Amounts are worked out at full precision and rounded once, so net can differ by a kobo from gross minus WHT:

```text
gross = round(daily interest × (base days + bonus days), 2)
WHT   = round(gross × WHT rate, 2)
net   = round(gross × (1 − WHT rate), 2)
```

For Upfront investments, net also deducts the upfront penalty:

```text
net = round(gross × (1 − WHT rate) − gross × penalty rate, 2)
```

Upfront net interest is paid on the start date and the principal returns at maturity.

---

## Payouts

Monthly, quarterly and biannual payouts cover 30, 90 and 180 days.

* each regular payout is `round(daily interest × days in the payout, 2)`
* each payout's WHT and net are rounded on their own
* the final payout is the remaining base interest, plus the bonus when the tenor ends on a year boundary

Because each payout is rounded on its own, the schedule total can differ from the summary net by a kobo or two. The calculator displays this difference, and it mirrors the live system.

---

## Expected Funds at Maturity

```text
expected funds = principal + net interest on the final payout
```

Earlier payouts are treated as already settled. For Upfront, expected funds equal the principal.

---

## Top-up

For active, non-upfront investments:

```text
value carried = principal + unpaid accrued gross − WHT on it
new principal = value carried + top-up amount
```

Interest already paid out is excluded, and the net is rounded once. There is no minimum top-up amount.

---

## Investment After Top-up

A top-up closes the old investment and starts a new one on the top-up date, priced on the new principal. The payment type and the tenure unit (months or days) always match the original. The rate and rate type can be changed.

| Maturity choice   | New tenure                                                                  | New maturity date                                                      |
| ----------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Keep original     | time left: complete months × 30 days plus leftover days between the top-up date and the maturity | the original maturity plus the extra days needed to finish the payout cycle |
| Extend            | entered by the user, counted from the top-up date                           | the later of the original maturity and the top-up date plus the tenure |

* expected funds = new principal + net interest on the final payout
* the 5 bonus days are added in the payout that completes each year of the new investment (for example months 12 and 24)
* when interest is paid at maturity there is no payout cycle, so the time left is used as it is

---

## Rollover

For matured investments:

```text
full rollover = principal + unpaid net interest + post-maturity net interest
```

* add extra money for a rollover with extra money
* subtract the cash-out for a part rollover
* post-maturity net interest = round(daily interest × extra days × (1 − WHT rate), 2): the extra days after maturity have not been paid for, so they are added once and rounded once
* a rollover starts a new investment that the customer sets up like any new one. The calculator works out the new principal only

---

## Enhanced Dollar Investment

```text
gross = round(daily interest × tenor days, 2)
WHT   = round(gross × WHT rate, 2)
net   = gross − WHT
```

* accrued interest for liquidation and top-up is kept at full precision, and only the net accrued is rounded
* liquidation penalty = net accrued × penalty rate (0% once matured)

---

# Worked Examples

| Case                                         | Result                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| PYI, ₦100,000 at 16%, 3 months, maturity     | Gross ₦3,945.21, WHT ₦394.52, net ₦3,550.68                                                  |
| PYI, ₦500,000,000 at 24%, 13 months, monthly | Gross ₦129,863,013.70, WHT ₦12,986,301.37, net ₦116,876,712.33, expected funds ₦508,876,712.31 |
| EDI, $5,000 at 8%, 180 days, Regular         | Gross $197.26, WHT $19.73, net $177.53                                                      |

In the ₦500,000,000 example, month 12 gross is ₦11,506,849.32 including the ₦1,643,835.62 bonus, and month 13 gross is ₦9,863,013.68.

---

# Calculation Guidelines

## Always round at the same points

Round gross, WHT and net once from full-precision values. Never round an intermediate figure and then reuse it.

---

## Keep the schedule and the summary separate

Each payout is rounded on its own, so the schedule total can differ from the summary net by a kobo or two.

Bad:

```text
forcing the final payout to balance the totals
```

Good:

```text
showing the reconciliation difference
```

---

## Do not reuse interest already paid

Top-ups must exclude interest already paid out in monthly, quarterly or biannual payouts.

---

## Treat the spreadsheet as the source of truth

If a rule changes in the product spreadsheet, update the calculator and this README together.

---

# Common Validation Messages

| Message                                     | Cause                                                     |
| ------------------------------------------- | --------------------------------------------------------- |
| Tenor must be a positive whole number       | Tenor is empty, zero, negative or has decimals            |
| Tenor must be a multiple of 3 months        | Quarterly interest with a month tenor that is not a multiple of 3 |
| Tenor must be a multiple of 6 months        | Biannual interest with a month tenor that is not a multiple of 6  |
| Enter a principal above zero                | Principal is empty or zero                                |
| Minimum investment is ₦100,000              | PYI principal is below the minimum                        |
| Minimum tenor is 3 months                   | PYI month tenor is below the minimum                      |
| Minimum tenor is 90 days                    | PYI day tenor is below the minimum                        |
| Minimum tenor is 6 months for quarterly interest | Quarterly interest needs at least 6 months (180 days) |
| Minimum tenor is 12 months for biannual interest | Biannual interest needs at least 12 months (360 days) |
| Cash-out on part rollover is more than the rollover value | Cash-out is larger than the rollover value  |
| Days elapsed is beyond the tenor            | EDI days elapsed exceeds the tenor, so accrual stops at maturity |
| Minimum investment is $5                    | EDI principal is below the minimum                        |
| Minimum tenor is 90 days                    | EDI tenor is below the minimum (this message also appears for Premium Yield day tenors) |
| New tenure must be a multiple of N months for … interest | Extend maturity with a month tenor that does not suit the payment type |

---

# Known Limitations

* rates are typed in, with no rate table lookup (the live system picks the rate from a configurable table that has not been shared yet)
* the latest spreadsheet no longer has a top-up sheet, so the investment after a top-up is not checked against it. It follows the rules from the product owner, listed above
* a tenure chosen on the Extend option that is not a multiple of the payout period is blocked for month tenors. For day tenors the last payout covers the leftover days, as it does for a new day-tenor investment
* leap years: the product owner has said customers get 6 extra days in a leap year, but the spreadsheet uses a fixed 5 bonus days and has no start date, so this is not modelled yet
* the quarterly and biannual minimum tenors are counted in 30-day months for day tenors (180 and 360 days). This needs confirming
* the payment-type minimums do not apply to the investment created by a top-up, which only has to complete its payout cycle
* a rollover is not turned into a new investment: only the new principal is worked out
* currency conversion and maximum amounts are not modelled
* the 365-day denominator ignores leap years

---

# Testing and Verification

The calculation logic was verified against the product spreadsheet by recalculating copies of the workbook with randomised inputs and comparing every output with the calculator's.

The checks covered:

* all Premium Yield scenarios (Regular and Flat, Months and Days, every payment type)
* the repayment schedule
* top-up and rollover figures
* Enhanced Dollar Investment

The most recent run used the latest spreadsheet ("Premium Yield Investment Calculator 8"): 80 random cases, 76,035 values compared, 0 differences. The earlier spreadsheet, which still had the top-up sheet, was checked the same way: 39,528 values, 0 differences.

The whole page was also swept in a real browser: every rate type, tenor type and payment type, with the drawer off and on for each tab, plus Enhanced Dollar. The checks looked for broken numbers, page errors, headline figures that disagree with the schedule, and the input panel needing to scroll on short windows.

The repository also includes automated tests for the worked examples, the minimums (including the quarterly and biannual ones), the top-up rules and the tenor rules:

```bash
npm test
```

If the spreadsheet rules change, repeat the spreadsheet check and add or update a test before updating the calculator.

---

# Project Status

This project is actively under development and is being tested.

---

# Contributing

Contributions are welcome.

Before contributing:

* Put calculation changes in `js/logic.js`, display changes in `js/app.js`, layout in `index.html` and styling in `css/styles.css`
* Run `npm test` and check the worked examples above after every change
* Keep rounding rules identical to the product spreadsheet
* Add or update a test in `tests/logic.test.js` when a rule changes
* Update this README when a calculation rule changes
* Test on both a wide screen and a phone-sized window

---

# Final Note

This calculator is designed to answer one critical question:

> “Do the figures on screen match what the live system will pay?”

The system automates that check for every product, tenor and payment type.

---

###### README created by `Pauline Banye`
