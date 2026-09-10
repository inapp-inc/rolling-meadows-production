from datetime import date, datetime

CADENCE = {
    "High": {"days": 7, "label": "Weekly"},
    "Medium": {"days": 30, "label": "Monthly"},
    "Moderate": {"days": 30, "label": "Monthly"},
    "Low": {"days": 90, "label": "Quarterly"},
}


def cadence_for_risk(risk_level: str | None) -> dict:
    entry = CADENCE.get(risk_level or "", CADENCE["Medium"])
    return {"days": entry["days"], "label": entry["label"]}


def follow_up_status(risk_level: str | None, last_contact_date: str | None) -> dict:
    cadence = cadence_for_risk(risk_level)
    if not last_contact_date:
        days_since = None
        overdue = False
    else:
        last = datetime.fromisoformat(last_contact_date).date() if isinstance(last_contact_date, str) else last_contact_date
        days_since = (date.today() - last).days
        overdue = days_since >= cadence["days"]
    return {
        **cadence,
        "daysSinceLastContact": days_since,
        "overdue": overdue,
        "daysOverdue": max(0, (days_since or 0) - cadence["days"]) if days_since is not None else 0,
    }
