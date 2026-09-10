import re


def normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (text or "").lower())


def normalize_phone(phone: str) -> str:
    return re.sub(r"\D", "", phone or "")


def levenshtein(a: str, b: str) -> int:
    if not a:
        return len(b)
    if not b:
        return len(a)
    matrix = [[0] * (len(a) + 1) for _ in range(len(b) + 1)]
    for i in range(len(b) + 1):
        matrix[i][0] = i
    for j in range(len(a) + 1):
        matrix[0][j] = j
    for i in range(1, len(b) + 1):
        for j in range(1, len(a) + 1):
            cost = 0 if b[i - 1] == a[j - 1] else 1
            matrix[i][j] = min(
                matrix[i - 1][j - 1] + cost,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j] + 1,
            )
    return matrix[len(b)][len(a)]


def score_duplicate(partial: dict, client: dict) -> tuple[int, list[str]]:
    name = normalize(partial.get("name", ""))
    phone = normalize(partial.get("phone", ""))
    dob = partial.get("dob") or ""
    score = 0
    fields: list[str] = []

    c_name = normalize(client.get("name", ""))
    c_phone = normalize(client.get("phone", ""))

    if name and c_name:
        dist = levenshtein(name, c_name)
        if dist == 0:
            score += 50
            fields.append("name")
        elif dist <= 2:
            score += 35
            fields.append("name")
        elif c_name in name or name in c_name:
            score += 25
            fields.append("name")

    if phone and c_phone and (c_phone in phone or phone in c_phone):
        score += 40
        fields.append("phone")

    if dob and client.get("dob") == dob:
        score += 30
        fields.append("dob")

    return score, fields


def find_duplicates(partial: dict, clients: list[dict], *, exclude_id: str | None = None, threshold: int = 25) -> list[dict]:
    matches = []
    for client in clients:
        if exclude_id and client.get("_id") == exclude_id:
            continue
        score, fields = score_duplicate(partial, client)
        if score >= threshold:
            matches.append({"client": client, "score": score, "matched_fields": fields})
    matches.sort(key=lambda m: m["score"], reverse=True)
    return matches


def pairs_among(clients: list[dict], threshold: int = 25) -> list[dict]:
    pairs = []
    for i, client in enumerate(clients):
        for other in clients[i + 1 :]:
            partial = {"name": client.get("name"), "phone": client.get("phone"), "dob": client.get("dob")}
            hits = find_duplicates(partial, [other], exclude_id=client.get("_id"), threshold=threshold)
            if hits:
                score, fields = score_duplicate(partial, other)
                pairs.append(
                    {
                        "client_a": client,
                        "client_b": other,
                        "score": score,
                        "matched_fields": fields,
                    }
                )
    return pairs
