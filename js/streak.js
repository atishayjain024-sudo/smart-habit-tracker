/**
 * streak.js — GitHub-style Contribution Heatmap, Streak Counter,
 * Longest Streak Badge & Monthly View
 *
 * Module pattern mirrors timer.js. Exposed as window.Streak so
 * app.js can call window.Streak.init() alongside other modules.
 *
 * Data shape stored in localStorage key "streakData":
 *   { "YYYY-MM-DD": <number 0-3 habits completed that day> }
 *
 * For the presentation demo we seed realistic-looking data if the
 * store is empty, so the UI is never blank on first load.
 */

(() => {
  // ─────────────────────────────────────────────
  //  HELPERS
  // ─────────────────────────────────────────────

  /** Return today as "YYYY-MM-DD" in local time */
  function toKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  /** Add/subtract days from a date (non-mutating) */
  function shiftDate(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  /** Return an array of "YYYY-MM-DD" strings for the last N days */
  function lastNDays(n) {
    const today = new Date();
    const keys = [];
    for (let i = n - 1; i >= 0; i--) keys.push(toKey(shiftDate(today, -i)));
    return keys;
  }

  // ─────────────────────────────────────────────
  //  DATA LAYER
  // ─────────────────────────────────────────────

  const STORAGE_KEY = "streakData";

  function loadData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }

  /**
   * Seed demo data so the heatmap is never empty on a fresh load.
   * Creates 53 weeks of realistic activity (matching the heatmap grid).
   * Only runs once — if any data already exists it's skipped.
   */
  function seedDemoData() {
    const existing = loadData();
    if (Object.keys(existing).length > 0) return;

    const today = new Date();
    const data = {};

    // 371 days back ≈ 53 weeks for the full grid
    for (let i = 370; i >= 0; i--) {
      const key = toKey(shiftDate(today, -i));

      // Simulate realistic streaks: ~70 % days active, random intensity
      const roll = Math.random();
      if (roll < 0.12) {
        data[key] = 0; // rest day
      } else if (roll < 0.38) {
        data[key] = 1;
      } else if (roll < 0.68) {
        data[key] = 2;
      } else {
        data[key] = 3;
      }
    }

    // Guarantee a clean 14-day current streak for dramatic effect
    for (let i = 0; i < 14; i++) {
      data[toKey(shiftDate(today, -i))] = 3;
    }

    saveData(data);
  }

  // Public: call this from app.js or habit-complete logic to record a day
  function recordDay(habitsCompleted, totalHabits) {
  const data = loadData();
  const ratio = totalHabits > 0 ? habitsCompleted / totalHabits : 0;
  // ratio is always 0.0 → 1.0 regardless of how many habits exist
  data[toKey(new Date())] = ratio;
  saveData(data);
  renderAll();
 }

  // ─────────────────────────────────────────────
  //  STREAK CALCULATIONS
  // ─────────────────────────────────────────────

  function calcCurrentStreak(data) {
    const today = new Date();
    let streak = 0;
    let i = 0;

    while (true) {
      const key = toKey(shiftDate(today, -i));
      if (data[key] && data[key] > 0) {
        streak++;
        i++;
      } else {
        break;
      }
    }
    return streak;
  }

  function calcLongestStreak(data) {
    const keys = Object.keys(data).sort();
    let max = 0;
    let current = 0;

    keys.forEach((key) => {
      if (data[key] > 0) {
        current++;
        if (current > max) max = current;
      } else {
        current = 0;
      }
    });
    return max;
  }

  function calcTotalActiveDays(data) {
    return Object.values(data).filter((v) => v > 0).length;
  }

  function calcWeeklyRate(data) {
    // % of days active over last 7 days
    const keys = lastNDays(7);
    const active = keys.filter((k) => data[k] && data[k] > 0).length;
    return Math.round((active / 7) * 100);
  }

  // ─────────────────────────────────────────────
  //  HEATMAP (GitHub-style 53-week grid)
  // ─────────────────────────────────────────────

  function buildHeatmap(data) {
    const wrapper = document.getElementById("streak-heatmap-wrap");
    if (!wrapper) return;

    const today = new Date();

    // ── month labels ──────────────────────────────
    const labelRow = document.getElementById("streak-month-labels");
    if (labelRow) {
      labelRow.innerHTML = "";
      const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      let lastMonth = -1;
      const colCount = 53;

      for (let col = 0; col < colCount; col++) {
        // The rightmost column = this week, leftmost = 52 weeks ago
        const colSundayOffset = (today.getDay() === 0 ? 0 : today.getDay()); // days since last Sun
        const daysBack = (colCount - 1 - col) * 7 + colSundayOffset;
        const colDate = shiftDate(today, -daysBack);
        const m = colDate.getMonth();

        const cell = document.createElement("div");
        cell.className = "hm-month-label";

        if (m !== lastMonth) {
          cell.textContent = MONTHS[m];
          lastMonth = m;
        }
        labelRow.appendChild(cell);
      }
    }

    // ── day labels (Mon / Wed / Fri) ──────────────
    // rendered via CSS content, no DOM needed

    // ── grid cells ────────────────────────────────
    const grid = document.getElementById("streak-heatmap-grid");
    if (!grid) return;
    grid.innerHTML = "";

    // Build a flat list of 371 days (53 weeks × 7) ending today
    // arranged column-by-column (Sun → Sat), oldest first
    const today_dow = today.getDay(); // 0 Sun … 6 Sat
    // How many cells in the last (rightmost) column including today?
    const cellsInLastCol = today_dow + 1; // Sun=1 … Sat=7
    const totalCells = 52 * 7 + cellsInLastCol;

    const cells = [];
    for (let i = totalCells - 1; i >= 0; i--) {
      const d = shiftDate(today, -i);
      const key = toKey(d);
      const val = data[key] !== undefined ? data[key] : -1; // -1 = future / no data
      cells.push({ key, val, date: d });
    }

    // Pad so the first cell is always Sunday
    // cells[0] is oldest; its DOW tells us the column offset
    const firstDow = cells[0].date.getDay();
    const paddedCells = Array(firstDow).fill(null).concat(cells);

    paddedCells.forEach((cell) => {
      const el = document.createElement("div");
      el.className = "hm-cell";

      if (!cell) {
        el.classList.add("hm-empty");
      } else {
        const v = cell.val;
        if (v < 0)      el.classList.add("hm-level-0");   // future
        else if (v === 0) el.classList.add("hm-level-0");
        else if (v === 1) el.classList.add("hm-level-1");
        else if (v === 2) el.classList.add("hm-level-2");
        else              el.classList.add("hm-level-3");

        // Tooltip
        el.title = cell.val > 0
          ? `${cell.key} — ${cell.val} habit${cell.val > 1 ? "s" : ""} completed`
          : `${cell.key} — no activity`;
      }

      grid.appendChild(el);
    });
  }

  // ─────────────────────────────────────────────
  //  MONTHLY VIEW
  // ─────────────────────────────────────────────

  let monthOffset = 0; // 0 = current month, -1 = last month, etc.

  function buildMonthlyView(data) {
    const title = document.getElementById("streak-month-title");
    const grid  = document.getElementById("streak-monthly-grid");
    if (!title || !grid) return;

    const today = new Date();
    const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const MONTHS_LONG = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];

    title.textContent = `${MONTHS_LONG[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

    grid.innerHTML = "";

    // Day-of-week headers
    ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach((d) => {
      const h = document.createElement("div");
      h.className = "mv-day-header";
      h.textContent = d;
      grid.appendChild(h);
    });

    // First day of month's DOW = blank padding
    const firstDow = viewDate.getDay();
    for (let p = 0; p < firstDow; p++) {
      const blank = document.createElement("div");
      blank.className = "mv-cell mv-blank";
      grid.appendChild(blank);
    }

    // Days in month
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
      const key = toKey(cellDate);
      const val = data[key] !== undefined ? data[key] : -1;
      const isToday = toKey(today) === key;
      const isFuture = cellDate > today;

      const cell = document.createElement("div");
      cell.className = "mv-cell";
      if (isToday) cell.classList.add("mv-today");
      if (isFuture) cell.classList.add("mv-future");

      // Intensity dot
      const dot = document.createElement("div");
      dot.className = "mv-dot";
      if (!isFuture && val > 0) {
        dot.classList.add(`mv-dot-level-${val}`);
      }

      const num = document.createElement("span");
      num.className = "mv-num";
      num.textContent = d;

      cell.appendChild(num);
      cell.appendChild(dot);
      grid.appendChild(cell);
    }

    // Prev / Next button states
    const prevBtn = document.getElementById("streak-month-prev");
    const nextBtn = document.getElementById("streak-month-next");
    if (prevBtn) prevBtn.disabled = false;
    if (nextBtn) nextBtn.disabled = monthOffset >= 0;
  }

  // ─────────────────────────────────────────────
  //  STAT CARDS INSIDE THE STREAK PANEL
  // ─────────────────────────────────────────────

  function updateStats(data) {
    const current  = calcCurrentStreak(data);
    const longest  = calcLongestStreak(data);
    const total    = calcTotalActiveDays(data);
    const rate     = calcWeeklyRate(data);

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    set("streak-current",  current);
    set("streak-longest",  longest);
    set("streak-total",    total);
    set("streak-rate",     rate + "%");

    // Animate the fire emoji on the badge when streak ≥ 7
    const badge = document.getElementById("streak-badge");
    if (badge) {
      badge.className = "streak-badge" + (longest >= 7 ? " streak-badge-gold" : "");
    }
  }

  function getLevel(val) {
  if (val <= 0)    return 0;   // no activity
  if (val <= 0.33) return 1;   // completed up to 33%
  if (val <= 0.66) return 2;   // completed up to 66%
  return 3;                    // completed over 66%
}
  // ─────────────────────────────────────────────
  //  RENDER ALL
  // ─────────────────────────────────────────────

  function renderAll() {
    const data = loadData();
    buildHeatmap(data);
    buildMonthlyView(data);
    updateStats(data);
  }

  // ─────────────────────────────────────────────
  //  INIT
  // ─────────────────────────────────────────────

  function init() {
    seedDemoData();
    renderAll();

    // Month nav buttons
    const prevBtn = document.getElementById("streak-month-prev");
    const nextBtn = document.getElementById("streak-month-next");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        monthOffset--;
        buildMonthlyView(loadData());
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (monthOffset < 0) {
          monthOffset++;
          buildMonthlyView(loadData());
        }
      });
    }

    // Demo toggle: mark today active / inactive
    const demoBtn = document.getElementById("streak-demo-btn");
    if (demoBtn) {
      demoBtn.addEventListener("click", () => {
        const data = loadData();
        const todayKey = toKey(new Date());
        data[todayKey] = data[todayKey] > 0 ? 0 : 3;
        saveData(data);
        renderAll();
      });
    }
  }

  // Expose module
  window.Streak = { init, recordDay };

  // Auto-init if app.js is not loaded (standalone use)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();