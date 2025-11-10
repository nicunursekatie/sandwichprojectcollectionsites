## Running Tests

The project now uses [Vitest](https://vitest.dev/) with Testing Library helpers to validate core logic (date utilities, calendar generation, etc.). Follow these steps to run the suite locally:

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run the test suite**
   ```bash
   npm test
   ```

   Vitest will discover files ending in `.test.js` / `.test.jsx` and execute them in a jsdom environment.

3. **Watch mode (optional)**
   ```bash
   npx vitest --watch
   ```

### What’s Covered

- `app.helpers.test.js` checks:
  - `getNextWednesday` date calculations
  - 12-hour formatting for drop-off times
  - ICS generation via `buildCalendarEvent`, including fallbacks when hosts don’t provide clean closing times

### Adding More Tests

- Put additional unit tests alongside the code they exercise (e.g. `some-module.test.js`).
- If you pull JSX into standalone components, you can import them in tests and use `@testing-library/react` to assert on rendered output and interactions.

### Troubleshooting

- If imports fail, ensure `app.helpers.js` is required via CommonJS (`require(...)`) inside tests. The helper file exposes a UMD-style export, so both the browser and Vitest can consume it.
- If dates don’t line up, pass an explicit `baseDate` into `buildCalendarEvent` so the tests stay deterministic regardless of the machine’s local timezone.

