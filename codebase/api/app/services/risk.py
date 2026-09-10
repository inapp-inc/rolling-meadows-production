from app.catalog.risk_domains import domains_for_subcategory

RATING_MAP = {"Low": 1, "Medium": 2, "Moderate": 2, "High": 3}


def calc_composite(ratings: dict[str, str], domains: list[str] | None = None) -> dict:
    domains = domains or []
    score = 0
    count = 0
    for domain in domains:
        level = ratings.get(domain)
        if level:
            score += RATING_MAP.get(level, 0)
            count += 1
    if not count:
        return {"compositeScore": 0, "overallRisk": "Low"}
    avg = score / count
    overall = "High" if avg >= 2.5 else "Medium" if avg >= 1.5 else "Low"
    return {"compositeScore": round(avg * 25), "overallRisk": overall}


def calc_for_subcategory(subcategory_id: str, ratings: dict[str, str]) -> dict:
    domains = domains_for_subcategory(subcategory_id)
    return calc_composite(ratings, domains)
