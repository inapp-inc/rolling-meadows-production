"""Service/event catalog (mirrors reportEngine.js EVENTS)."""

EVENTS = [
    {"id": "evt-meals", "label": "Community meals program"},
    {"id": "evt-holiday", "label": "Holiday assistance"},
    {"id": "evt-safety", "label": "Home safety visit"},
    {"id": "evt-food-pantry", "label": "Food pantry"},
    {"id": "evt-therapy", "label": "Therapy group"},
    {"id": "evt-court-advocacy", "label": "Court advocacy"},
    {"id": "evt-crisis-counseling", "label": "Crisis counseling"},
    {"id": "evt-flu-awareness", "label": "Flu awareness workshop"},
]

EVENT_BY_ID = {e["id"]: e for e in EVENTS}
