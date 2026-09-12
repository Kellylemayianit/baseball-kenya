/**
 * matchFormModal.js — create/edit modal for a match record. Purely
 * presentational: the caller supplies `teams`, an optional existing
 * `match` (edit mode), and an `onSubmit` handler that performs the
 * actual save and returns a Promise.
 */
import { el, mount } from "../utilities/helpers.js";
import { icon } from "../utilities/icons.js";

function toLocalInputValue(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * @param {object} opts
 * @param {Array} opts.teams
 * @param {object} [opts.match] - existing match for edit mode
 * @param {(payload: object) => Promise<any>} opts.onSubmit
 * @param {() => void} opts.onClose
 */
export function openMatchFormModal({ teams, match = null, onSubmit, onClose }) {
  const isEdit = Boolean(match);
  const errorSlot = el("div", { class: "form-error", role: "alert" });

  const teamOptions = (selectedId) =>
    teams.map((t) => el("option", { value: t.id, selected: t.id === selectedId || undefined }, [t.name]));

  const homeSelect = el("select", { id: "field-home", required: true }, teamOptions(match?.homeTeamId));
  const awaySelect = el("select", { id: "field-away", required: true }, teamOptions(match?.awayTeamId));
  const venueInput = el("input", {
    id: "field-venue",
    type: "text",
    required: true,
    value: match?.venue || "",
    placeholder: "e.g. Ngong Road Diamond",
  });
  const dateInput = el("input", {
    id: "field-date",
    type: "datetime-local",
    required: true,
    value: toLocalInputValue(match?.date) || "",
  });
  const statusSelect = el(
    "select",
    { id: "field-status" },
    ["scheduled", "live", "final"].map((s) =>
      el("option", { value: s, selected: s === (match?.status || "scheduled") || undefined }, [
        s[0].toUpperCase() + s.slice(1),
      ])
    )
  );
  const homeScoreInput = el("input", {
    id: "field-home-score",
    type: "number",
    min: "0",
    value: match?.homeScore ?? "",
    placeholder: "—",
  });
  const awayScoreInput = el("input", {
    id: "field-away-score",
    type: "number",
    min: "0",
    value: match?.awayScore ?? "",
    placeholder: "—",
  });

  const submitBtn = el("button", { class: "btn btn-primary", type: "submit" }, [
    isEdit ? "Save changes" : "Schedule match",
  ]);
  const cancelBtn = el("button", { class: "btn btn-secondary", type: "button", onClick: () => close() }, [
    "Cancel",
  ]);

  const form = el(
    "form",
    {
      onSubmit: async (event) => {
        event.preventDefault();
        mount(errorSlot, "");

        if (homeSelect.value === awaySelect.value) {
          mount(errorSlot, "Home and away teams must be different.");
          return;
        }

        const payload = {
          homeTeamId: homeSelect.value,
          awayTeamId: awaySelect.value,
          venue: venueInput.value.trim(),
          date: new Date(dateInput.value).toISOString(),
          status: statusSelect.value,
          homeScore: homeScoreInput.value === "" ? null : Number(homeScoreInput.value),
          awayScore: awayScoreInput.value === "" ? null : Number(awayScoreInput.value),
        };

        submitBtn.disabled = true;
        submitBtn.textContent = "Saving…";
        try {
          await onSubmit(payload);
          close();
        } catch (err) {
          mount(errorSlot, err.message || "Something went wrong. Please try again.");
          submitBtn.disabled = false;
          submitBtn.textContent = isEdit ? "Save changes" : "Schedule match";
        }
      },
    },
    [
      el("div", { class: "modal__body" }, [
        el("div", { class: "form-row" }, [
          field("Home team", homeSelect),
          field("Away team", awaySelect),
        ]),
        field("Venue", venueInput),
        el("div", { class: "form-row" }, [
          field("Date & time", dateInput),
          field("Status", statusSelect),
        ]),
        el("div", { class: "form-row" }, [
          field("Home score", homeScoreInput),
          field("Away score", awayScoreInput),
        ]),
        errorSlot,
      ]),
      el("div", { class: "modal__foot" }, [cancelBtn, submitBtn]),
    ]
  );

  function field(label, inputEl) {
    return el("div", { class: "form-field" }, [
      el("label", { for: inputEl.id }, [label]),
      inputEl,
    ]);
  }

  const overlay = el(
    "div",
    {
      class: "modal-overlay",
      onClick: (e) => {
        if (e.target === overlay) close();
      },
    },
    [
      el("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "modal-title" }, [
        el("div", { class: "modal__head" }, [
          el("h3", { id: "modal-title" }, [isEdit ? "Edit match" : "Schedule a new match"]),
          el("button", { class: "icon-btn", type: "button", "aria-label": "Close dialog", onClick: () => close() }, [
            el("span", { html: icon("close") }),
          ]),
        ]),
        form,
      ]),
    ]
  );

  function onKeydown(e) {
    if (e.key === "Escape") close();
  }

  function close() {
    document.removeEventListener("keydown", onKeydown);
    overlay.remove();
    onClose && onClose();
  }

  document.addEventListener("keydown", onKeydown);
  document.body.append(overlay);
  homeSelect.focus();

  return { close };
}
