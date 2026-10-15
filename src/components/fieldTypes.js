// Shared between CampaignFieldsBuilder (admin defines fields) and
// DynamicFieldInput (renders one field's input) — kept in one place so the
// two never drift out of sync with routes/campaigns.js's own SALES_FIELD_TYPES/
// GUEST_FIELD_TYPES. tKey resolves under the 'admin' i18n namespace's
// builders.fieldTypes.* (CampaignFieldsBuilder is the only renderer of these
// labels — a plain data module like this one can't call useTranslation()
// itself, see builders.fieldTypes.* for the actual translated text).
export const SALES_FIELD_TYPES = [
  { value: 'text', tKey: 'salesText' },
  { value: 'dropdown', tKey: 'salesDropdown' },
  { value: 'multi_choice', tKey: 'salesMultiChoice' },
  { value: 'date', tKey: 'salesDate' },
  // Date + time in one value (an appointment) — the AI assistant can fill it
  // from a note like "mardi à 14h" (routes/campaigns.js SALES_FIELD_TYPES).
  { value: 'datetime', tKey: 'salesDateTime' },
  // Long list searched by typing (the admin fills the list), and the two predefined French geographic lists
  // A number the rep notes (e.g. the lead's budget): feeds the dashboard's profitability card
  { value: 'number', tKey: 'salesNumber' },
  { value: 'search_choice', tKey: 'salesSearchChoice' },
  { value: 'fr_department', tKey: 'salesDepartment' },
  { value: 'fr_region', tKey: 'salesRegion' },
];

export const GUEST_FIELD_TYPES = [
  { value: 'text', tKey: 'guestText' },
  { value: 'email', tKey: 'guestEmail' },
  { value: 'phone', tKey: 'guestPhone' },
  { value: 'dropdown', tKey: 'guestDropdown' },
  { value: 'single_choice', tKey: 'guestSingleChoice' },
  { value: 'multi_choice', tKey: 'guestMultiChoice' },
  { value: 'checkbox', tKey: 'guestCheckbox' },
  { value: 'date', tKey: 'guestDate' },
  { value: 'number', tKey: 'guestNumber' },
  { value: 'search_choice', tKey: 'guestSearchChoice' },
  { value: 'fr_department', tKey: 'guestDepartment' },
  { value: 'fr_region', tKey: 'guestRegion' },
];

export const CHOICE_FIELD_TYPES = new Set(['dropdown', 'single_choice', 'multi_choice', 'search_choice']);
// Lists that are built in (no options to type): the answer is one of the 101 départements / 18 régions
export const PRESET_FIELD_TYPES = new Set(['fr_department', 'fr_region']);
