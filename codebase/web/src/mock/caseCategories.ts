export type CaseCategory = {
  id: string;
  label: string;
  subcategories: { id: string; label: string }[];
};

export const CASE_CATEGORIES: CaseCategory[] = [
  {
    id: 'cat-senior-services',
    label: 'Senior Social Services',
    subcategories: [
      { id: 'sub-seniors-at-risk', label: 'Seniors at Risk' },
      { id: 'sub-in-home-support', label: 'In-Home Support' },
      { id: 'sub-nutrition-programs', label: 'Nutrition Programs' },
    ],
  },
  {
    id: 'cat-parenting-support',
    label: 'Parenting Support Programs',
    subcategories: [
      { id: 'sub-youth-empowerment', label: 'Youth Empowerment Groups' },
      { id: 'sub-family-resource', label: 'Family Resource Center' },
      { id: 'sub-parent-education', label: 'Parent Education' },
    ],
  },
  {
    id: 'cat-mental-health',
    label: 'Mental Health Services',
    subcategories: [
      { id: 'sub-crisis-response', label: 'Crisis Response' },
      { id: 'sub-outpatient-counseling', label: 'Outpatient Counseling' },
      { id: 'sub-peer-support', label: 'Peer Support' },
    ],
  },
  {
    id: 'cat-community-services',
    label: 'Community Social Services',
    subcategories: [
      { id: 'sub-housing-assistance', label: 'Housing Assistance' },
      { id: 'sub-employment-support', label: 'Employment Support' },
      { id: 'sub-general-intake', label: 'General Intake' },
    ],
  },
];

const CAT_BY_ID = Object.fromEntries(CASE_CATEGORIES.map((c) => [c.id, c]));
const SUB_BY_ID: Record<string, { category: CaseCategory; subcategory: { id: string; label: string } }> = {};
CASE_CATEGORIES.forEach((cat) => {
  cat.subcategories.forEach((sub) => {
    SUB_BY_ID[sub.id] = { category: cat, subcategory: sub };
  });
});

export function categoryLabel(categoryId?: string): string {
  return CAT_BY_ID[categoryId ?? '']?.label ?? categoryId ?? '—';
}

export function subcategoryLabel(subcategoryId?: string): string {
  return SUB_BY_ID[subcategoryId ?? '']?.subcategory.label ?? subcategoryId ?? '—';
}

export function programLabel(client: { caseSubcategoryId?: string; caseCategoryId?: string }): string {
  return subcategoryLabel(client.caseSubcategoryId) || categoryLabel(client.caseCategoryId);
}
