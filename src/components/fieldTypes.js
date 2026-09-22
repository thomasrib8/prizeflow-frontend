// Shared between CampaignFieldsBuilder (admin defines fields) and
// DynamicFieldInput (renders one field's input) — kept in one place so the
// two never drift out of sync with routes/campaigns.js's own SALES_FIELD_TYPES/
// GUEST_FIELD_TYPES.
export const SALES_FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'multi_choice', label: 'Multiple choice' },
  { value: 'date', label: 'Date' },
];

export const GUEST_FIELD_TYPES = [
  { value: 'text', label: 'Free text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'single_choice', label: 'Single choice' },
  { value: 'multi_choice', label: 'Multiple choice' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
];

export const CHOICE_FIELD_TYPES = new Set(['dropdown', 'single_choice', 'multi_choice']);
