from pathlib import Path
from xml.sax.saxutils import escape


OUT_DIR = Path(__file__).resolve().parent
FONT = "'Helvetica Neue', Helvetica, Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif"
COLORS = {
    "bg": "#ffffff",
    "text": "#111827",
    "muted": "#6b7280",
    "gray": "#6b7280",
    "stroke": "#d1d5db",
    "blue": "#2563eb",
    "red": "#dc2626",
    "green": "#16a34a",
    "purple": "#9333ea",
    "orange": "#ea580c",
    "teal": "#0d9488",
    "box": "#ffffff",
    "blue_fill": "#eff6ff",
    "red_fill": "#fef2f2",
    "green_fill": "#f0fdf4",
    "purple_fill": "#faf5ff",
    "orange_fill": "#fff7ed",
    "teal_fill": "#f0fdfa",
    "gray_fill": "#f9fafb",
}


def esc(value):
    return escape(str(value), {"\"": "&quot;"})


def svg_start(lines, width, height, title):
    lines.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">')
    lines.append("<style>")
    lines.append(f"text {{ font-family: {FONT}; fill: {COLORS['text']}; }}")
    lines.append(".title { font-size: 24px; font-weight: 700; }")
    lines.append(".label { font-size: 14px; font-weight: 650; }")
    lines.append(".small { font-size: 11px; fill: #6b7280; }")
    lines.append(".tiny { font-size: 10px; fill: #6b7280; }")
    lines.append(".entity-header { font-size: 14px; font-weight: 700; }")
    lines.append(".field { font-size: 11px; fill: #374151; }")
    lines.append("</style>")
    lines.append("<defs>")
    for name in ("blue", "red", "green", "purple", "orange", "gray"):
        color = COLORS[name]
        lines.append(f'<marker id="arrow-{name}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">')
        lines.append(f'<polygon points="0 0, 10 3.5, 0 7" fill="{color}"/>')
        lines.append("</marker>")
    lines.append('<filter id="softShadow" x="-10%" y="-10%" width="120%" height="130%">')
    lines.append('<feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#111827" flood-opacity="0.08"/>')
    lines.append("</filter>")
    lines.append("</defs>")
    lines.append(f'<rect width="{width}" height="{height}" fill="{COLORS["bg"]}"/>')
    lines.append(f'<text x="40" y="42" class="title">{esc(title)}</text>')


def finish(lines, filename):
    lines.append("</svg>")
    (OUT_DIR / filename).write_text("\n".join(lines), encoding="utf-8")


def lane(lines, x, y, w, h, title, color):
    lines.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{color}" fill-opacity="0.035" stroke="{color}" stroke-width="1.2" stroke-dasharray="7,5"/>')
    lines.append(f'<text x="{x + 14}" y="{y + 21}" fill="{color}" font-size="11" font-weight="700">{esc(title)}</text>')


def box(lines, x, y, w, h, title, subtitle=None, fill=None, stroke=None):
    fill = fill or COLORS["box"]
    stroke = stroke or COLORS["stroke"]
    lines.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{fill}" stroke="{stroke}" stroke-width="1.5" filter="url(#softShadow)"/>')
    lines.append(f'<text x="{x + w / 2}" y="{y + 27}" text-anchor="middle" class="label">{esc(title)}</text>')
    parts = [] if subtitle is None else (subtitle if isinstance(subtitle, list) else [subtitle])
    for index, part in enumerate(parts[:3]):
        lines.append(f'<text x="{x + w / 2}" y="{y + 47 + index * 15}" text-anchor="middle" class="small">{esc(part)}</text>')


def db(lines, cx, top, w, h, title, fill="#eff6ff", stroke="#2563eb"):
    rx = w / 2
    ry = w / 7
    x = cx - rx
    lines.append(f'<ellipse cx="{cx}" cy="{top}" rx="{rx}" ry="{ry}" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>')
    lines.append(f'<rect x="{x}" y="{top}" width="{w}" height="{h}" fill="{fill}" stroke="none"/>')
    lines.append(f'<line x1="{x}" y1="{top}" x2="{x}" y2="{top + h}" stroke="{stroke}" stroke-width="1.5"/>')
    lines.append(f'<line x1="{x + w}" y1="{top}" x2="{x + w}" y2="{top + h}" stroke="{stroke}" stroke-width="1.5"/>')
    lines.append(f'<ellipse cx="{cx}" cy="{top + h}" rx="{rx}" ry="{ry}" fill="#dbeafe" stroke="{stroke}" stroke-width="1.5"/>')
    lines.append(f'<text x="{cx}" y="{top + h / 2 + 5}" text-anchor="middle" class="label">{esc(title)}</text>')


def arrow(lines, points, color="blue", label=None, dashed=False, width=1.8):
    path = "M " + " L ".join(f"{x} {y}" for x, y in points)
    dash = ' stroke-dasharray="5,4"' if dashed else ""
    lines.append(f'<path d="{path}" fill="none" stroke="{COLORS[color]}" stroke-width="{width}" marker-end="url(#arrow-{color})"{dash}/>')
    if label and len(points) >= 2:
        x1, y1 = points[len(points) // 2 - 1]
        x2, y2 = points[len(points) // 2]
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        lines.append(f'<rect x="{mx - 54}" y="{my - 20}" width="108" height="18" rx="9" fill="#ffffff" opacity="0.94"/>')
        lines.append(f'<text x="{mx}" y="{my - 7}" text-anchor="middle" class="tiny">{esc(label)}</text>')


def legend(lines, x, y, entries):
    lines.append(f'<g transform="translate({x},{y})">')
    for index, (color, text, dashed) in enumerate(entries):
        yy = index * 20 + 8
        dash = ' stroke-dasharray="5,4"' if dashed else ""
        lines.append(f'<line x1="0" y1="{yy}" x2="30" y2="{yy}" stroke="{COLORS[color]}" stroke-width="1.7" marker-end="url(#arrow-{color})"{dash}/>')
        lines.append(f'<text x="38" y="{yy + 4}" class="small">{esc(text)}</text>')
    lines.append("</g>")


def class_box(lines, x, y, w, title, attrs, methods, fill, stroke):
    line_h = 16
    header_h = 34
    attr_h = max(28, 10 + len(attrs) * line_h)
    method_h = max(28, 10 + len(methods) * line_h)
    height = header_h + attr_h + method_h
    lines.append(f'<rect x="{x}" y="{y}" width="{w}" height="{height}" rx="8" fill="{fill}" stroke="{stroke}" stroke-width="1.5" filter="url(#softShadow)"/>')
    lines.append(f'<line x1="{x}" y1="{y + header_h}" x2="{x + w}" y2="{y + header_h}" stroke="{stroke}"/>')
    lines.append(f'<line x1="{x}" y1="{y + header_h + attr_h}" x2="{x + w}" y2="{y + header_h + attr_h}" stroke="{stroke}"/>')
    lines.append(f'<text x="{x + w / 2}" y="{y + 22}" text-anchor="middle" class="label">{esc(title)}</text>')
    for index, attr in enumerate(attrs[:5]):
        lines.append(f'<text x="{x + 10}" y="{y + header_h + 18 + index * line_h}" class="small">{esc(attr)}</text>')
    for index, method in enumerate(methods[:5]):
        lines.append(f'<text x="{x + 10}" y="{y + header_h + attr_h + 18 + index * line_h}" class="small">{esc(method)}</text>')
    return height


def entity(lines, x, y, w, title, fields):
    row_h = 18
    height = 44 + row_h * len(fields)
    lines.append(f'<rect x="{x}" y="{y}" width="{w}" height="{height}" rx="8" fill="#ffffff" stroke="{COLORS["stroke"]}" stroke-width="1.5" filter="url(#softShadow)"/>')
    lines.append(f'<rect x="{x}" y="{y}" width="{w}" height="34" rx="8" fill="#f3f4f6" stroke="none"/>')
    lines.append(f'<rect x="{x}" y="{y + 24}" width="{w}" height="10" fill="#f3f4f6" stroke="none"/>')
    lines.append(f'<text x="{x + w / 2}" y="{y + 22}" text-anchor="middle" class="entity-header">{esc(title)}</text>')
    for index, field in enumerate(fields):
        lines.append(f'<text x="{x + 12}" y="{y + 54 + index * row_h}" class="field">{esc(field)}</text>')
    return height


def sequence_start(lines, width, height, title, participants):
    svg_start(lines, width, height, title)
    top = 82
    bottom = height - 74
    for participant in participants:
        x = participant["x"]
        label = participant["label"]
        fill = participant.get("fill", COLORS["blue_fill"])
        stroke = participant.get("stroke", "#bfdbfe")
        lines.append(f'<rect x="{x - 72}" y="{top}" width="144" height="46" rx="8" fill="{fill}" stroke="{stroke}" stroke-width="1.5" filter="url(#softShadow)"/>')
        lines.append(f'<text x="{x}" y="{top + 28}" text-anchor="middle" class="label">{esc(label)}</text>')
        lines.append(f'<line x1="{x}" y1="{top + 46}" x2="{x}" y2="{bottom}" stroke="#9ca3af" stroke-width="1.2" stroke-dasharray="6,5"/>')


def seq_msg(lines, participants_by_id, source, target, y, label, color="blue", dashed=False, response=False):
    x1 = participants_by_id[source]["x"]
    x2 = participants_by_id[target]["x"]
    marker_color = "gray" if response else color
    dash = ' stroke-dasharray="5,4"' if dashed or response else ""
    lines.append(f'<path d="M {x1} {y} L {x2} {y}" fill="none" stroke="{COLORS[marker_color]}" stroke-width="1.7" marker-end="url(#arrow-{marker_color})"{dash}/>')
    text_width = min(210, max(88, len(label) * 7 + 26))
    label_x = (x1 + x2) / 2
    lines.append(f'<rect x="{label_x - text_width / 2}" y="{y - 22}" width="{text_width}" height="18" rx="9" fill="#ffffff" opacity="0.95"/>')
    lines.append(f'<text x="{label_x}" y="{y - 9}" text-anchor="middle" class="tiny">{esc(label)}</text>')


def seq_activation(lines, participants_by_id, participant_id, y, height=28, color="#bfdbfe"):
    x = participants_by_id[participant_id]["x"]
    lines.append(f'<rect x="{x - 5}" y="{y - 10}" width="10" height="{height}" rx="3" fill="{color}" stroke="none" opacity="0.9"/>')


def seq_frame(lines, x, y, w, h, label, color):
    lines.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{color}" fill-opacity="0.035" stroke="{color}" stroke-width="1.2" stroke-dasharray="7,5"/>')
    lines.append(f'<rect x="{x + 10}" y="{y - 11}" width="{max(80, len(label) * 7 + 18)}" height="22" rx="11" fill="#ffffff" stroke="{color}" stroke-width="1"/>')
    lines.append(f'<text x="{x + 20}" y="{y + 4}" class="tiny" fill="{color}">{esc(label)}</text>')


def render_login_sequence():
    lines = []
    participants = [
        {"id": "browser", "label": "Browser", "x": 90, "fill": COLORS["blue_fill"], "stroke": "#bfdbfe"},
        {"id": "login", "label": "Internal Login", "x": 250, "fill": COLORS["orange_fill"], "stroke": "#fed7aa"},
        {"id": "app", "label": "Vue App", "x": 410, "fill": COLORS["blue_fill"], "stroke": "#bfdbfe"},
        {"id": "api", "label": "Axios", "x": 570, "fill": COLORS["orange_fill"], "stroke": "#fed7aa"},
        {"id": "controller", "label": "UserController", "x": 745, "fill": COLORS["green_fill"], "stroke": "#bbf7d0"},
        {"id": "session", "label": "SessionService", "x": 935, "fill": COLORS["red_fill"], "stroke": "#fecaca"},
        {"id": "db", "label": "MySQL", "x": 1100, "fill": COLORS["purple_fill"], "stroke": "#e9d5ff"},
    ]
    by_id = {item["id"]: item for item in participants}
    sequence_start(lines, 1200, 860, "Sequence: Login, Emergency Login & Session Cookie", participants)
    seq_frame(lines, 48, 150, 1105, 150, "Optional third-party bootstrap when VITE_ENABLE_LOGIN_GUARD=true", COLORS["blue"])
    seq_msg(lines, by_id, "browser", "login", 182, "redirect when no work id", "blue")
    seq_msg(lines, by_id, "login", "browser", 222, "write third_party_user_id", "gray", response=True)
    seq_msg(lines, by_id, "browser", "app", 262, "reload contest app", "blue")
    seq_frame(lines, 48, 330, 1105, 280, "Normal backend session issuing", COLORS["green"])
    seq_msg(lines, by_id, "app", "api", 365, "GET /api/users/me", "blue")
    seq_msg(lines, by_id, "api", "controller", 405, "probe signed cookie", "blue")
    seq_msg(lines, by_id, "controller", "session", 445, "requireSessionUser()", "red")
    seq_msg(lines, by_id, "session", "controller", 485, "401 if cookie missing", "red", response=True)
    seq_msg(lines, by_id, "app", "api", 530, "POST /api/users", "blue")
    seq_msg(lines, by_id, "api", "controller", 570, "payload + user id header", "blue")
    seq_msg(lines, by_id, "controller", "session", 610, "verifyCurrentUserId()", "red")
    seq_msg(lines, by_id, "controller", "db", 650, "find or create user", "green")
    seq_msg(lines, by_id, "controller", "session", 690, "writeSessionCookie()", "red")
    seq_msg(lines, by_id, "controller", "browser", 730, "UserResponse + Set-Cookie", "gray", response=True)
    seq_frame(lines, 48, 770, 1105, 56, "Emergency path: /emergency-login -> POST /api/users/emergency-login -> check emergency_login_accounts -> Set-Cookie", COLORS["orange"])
    for pid, y, h, color in [("app", 355, 60, "#bfdbfe"), ("controller", 400, 340, "#bbf7d0"), ("session", 440, 280, "#fecaca")]:
        seq_activation(lines, by_id, pid, y, h, color)
    finish(lines, "08-login-session-sequence.svg")


def render_upload_sequence():
    lines = []
    participants = [
        {"id": "modal", "label": "UploadModal", "x": 85, "fill": COLORS["blue_fill"], "stroke": "#bfdbfe"},
        {"id": "api", "label": "Axios", "x": 225, "fill": COLORS["orange_fill"], "stroke": "#fed7aa"},
        {"id": "filter", "label": "WriteKeyFilter", "x": 380, "fill": COLORS["red_fill"], "stroke": "#fecaca"},
        {"id": "controller", "label": "UploadController", "x": 540, "fill": COLORS["green_fill"], "stroke": "#bbf7d0"},
        {"id": "session", "label": "SessionService", "x": 715, "fill": COLORS["red_fill"], "stroke": "#fecaca"},
        {"id": "upload", "label": "UploadService", "x": 900, "fill": COLORS["green_fill"], "stroke": "#bbf7d0"},
        {"id": "package", "label": "PackageService", "x": 1095, "fill": COLORS["purple_fill"], "stroke": "#e9d5ff"},
        {"id": "db", "label": "MySQL", "x": 1270, "fill": COLORS["gray_fill"], "stroke": COLORS["stroke"]},
        {"id": "mount", "label": "Mounted Dirs", "x": 1435, "fill": COLORS["purple_fill"], "stroke": "#e9d5ff"},
    ]
    by_id = {item["id"]: item for item in participants}
    sequence_start(lines, 1520, 880, "Sequence: Upload Validation, Cooldown & Mounted Distribution", participants)
    y = 170
    seq_msg(lines, by_id, "modal", "api", y, "POST /api/upload/me", "blue")
    seq_msg(lines, by_id, "api", "filter", y + 42, "X-Agent-Contest-Write-Key", "red")
    seq_msg(lines, by_id, "filter", "controller", y + 84, "multipart zip", "blue")
    seq_msg(lines, by_id, "controller", "session", y + 126, "requireSessionUser()", "red")
    seq_msg(lines, by_id, "session", "db", y + 168, "load user by cookie", "green")
    seq_msg(lines, by_id, "controller", "upload", y + 210, "uploadCode(user,file,ip)", "green")
    seq_frame(lines, 815, 405, 660, 230, "Per-user locked upload transaction", COLORS["green"])
    seq_msg(lines, by_id, "upload", "db", y + 260, "contest + app_settings interval", "green")
    seq_msg(lines, by_id, "upload", "db", y + 302, "insert UPLOADING + submit_ip", "green")
    seq_msg(lines, by_id, "upload", "package", y + 344, "saveAndValidate()", "purple")
    seq_msg(lines, by_id, "package", "package", y + 386, "zip limits + start.sh LF", "purple")
    seq_msg(lines, by_id, "package", "mount", y + 428, "copy every target dir", "purple")
    seq_msg(lines, by_id, "upload", "db", y + 470, "paths + UPLOADED", "green")
    seq_msg(lines, by_id, "upload", "controller", y + 512, "SubmissionResponse(id,queueAhead)", "gray", response=True)
    seq_msg(lines, by_id, "controller", "modal", y + 554, "success animation", "gray", response=True)
    seq_frame(lines, 820, 775, 650, 54, "alt: invalid zip -> delete row; distribution failure -> FAILED + message", COLORS["red"])
    for pid, start, height, color in [("filter", 202, 72, "#fecaca"), ("controller", 250, 520, "#bbf7d0"), ("session", 288, 94, "#fecaca"), ("upload", 377, 390, "#bbf7d0"), ("package", 512, 170, "#e9d5ff")]:
        seq_activation(lines, by_id, pid, start, height, color)
    finish(lines, "09-upload-distribution-sequence.svg")


def render_history_cancel_sequence():
    lines = []
    participants = [
        {"id": "history", "label": "HistoryPage", "x": 90, "fill": COLORS["blue_fill"], "stroke": "#bfdbfe"},
        {"id": "api", "label": "Axios", "x": 250, "fill": COLORS["orange_fill"], "stroke": "#fed7aa"},
        {"id": "controller", "label": "UserController", "x": 425, "fill": COLORS["green_fill"], "stroke": "#bbf7d0"},
        {"id": "session", "label": "SessionService", "x": 610, "fill": COLORS["red_fill"], "stroke": "#fecaca"},
        {"id": "service", "label": "UserService", "x": 785, "fill": COLORS["green_fill"], "stroke": "#bbf7d0"},
        {"id": "repo", "label": "SubmissionRepo", "x": 970, "fill": COLORS["purple_fill"], "stroke": "#e9d5ff"},
        {"id": "db", "label": "MySQL", "x": 1130, "fill": COLORS["gray_fill"], "stroke": COLORS["stroke"]},
        {"id": "ranking", "label": "RankingBoard", "x": 1290, "fill": COLORS["blue_fill"], "stroke": "#bfdbfe"},
    ]
    by_id = {item["id"]: item for item in participants}
    sequence_start(lines, 1370, 850, "Sequence: History Refresh & Cancel Queued Submission", participants)
    seq_frame(lines, 45, 150, 1280, 245, "History auto refresh", COLORS["blue"])
    seq_msg(lines, by_id, "history", "api", 185, "GET /api/users/me/submissions", "blue")
    seq_msg(lines, by_id, "api", "controller", 225, "history request", "blue")
    seq_msg(lines, by_id, "controller", "session", 265, "requireSessionUser()", "red")
    seq_msg(lines, by_id, "controller", "service", 305, "listSubmissions(user)", "green")
    seq_msg(lines, by_id, "service", "repo", 345, "findByUser order desc", "green")
    seq_msg(lines, by_id, "service", "repo", 385, "countAhead for UPLOADED", "green")
    seq_msg(lines, by_id, "controller", "history", 425, "items + queueAhead", "gray", response=True)
    seq_frame(lines, 45, 465, 1280, 275, "Cancel only UPLOADED", COLORS["red"])
    seq_msg(lines, by_id, "history", "api", 500, "POST /me/submissions/{id}/cancel", "blue")
    seq_msg(lines, by_id, "api", "controller", 540, "cancel request", "blue")
    seq_msg(lines, by_id, "controller", "session", 580, "requireSessionUser()", "red")
    seq_msg(lines, by_id, "controller", "service", 620, "cancelSubmission(user,id)", "green")
    seq_msg(lines, by_id, "service", "repo", 660, "find id + ownership", "green")
    seq_msg(lines, by_id, "repo", "db", 700, "status = CANCELED", "green")
    seq_msg(lines, by_id, "controller", "history", 740, "canceled response", "gray", response=True)
    seq_msg(lines, by_id, "history", "ranking", 780, "emit canceled -> refresh()", "purple")
    finish(lines, "10-history-cancel-sequence.svg")


def render_ranking_sequence():
    lines = []
    participants = [
        {"id": "board", "label": "RankingBoard", "x": 90, "fill": COLORS["blue_fill"], "stroke": "#bfdbfe"},
        {"id": "api", "label": "Axios", "x": 250, "fill": COLORS["orange_fill"], "stroke": "#fed7aa"},
        {"id": "controller", "label": "RankController", "x": 430, "fill": COLORS["green_fill"], "stroke": "#bbf7d0"},
        {"id": "session", "label": "SessionService", "x": 610, "fill": COLORS["red_fill"], "stroke": "#fecaca"},
        {"id": "service", "label": "RankService", "x": 790, "fill": COLORS["green_fill"], "stroke": "#bbf7d0"},
        {"id": "repo", "label": "SubmissionRepo", "x": 980, "fill": COLORS["purple_fill"], "stroke": "#e9d5ff"},
        {"id": "db", "label": "MySQL", "x": 1145, "fill": COLORS["gray_fill"], "stroke": COLORS["stroke"]},
    ]
    by_id = {item["id"]: item for item in participants}
    sequence_start(lines, 1220, 780, "Sequence: Ranking Page Query & Personal Rank", participants)
    seq_frame(lines, 48, 150, 1120, 260, "Rank page load / sort / search", COLORS["blue"])
    seq_msg(lines, by_id, "board", "api", 185, "GET /api/rank/page", "blue")
    seq_msg(lines, by_id, "api", "controller", 225, "pageSize=20 sort=score", "blue")
    seq_msg(lines, by_id, "controller", "service", 265, "listRankPage()", "green")
    seq_msg(lines, by_id, "service", "repo", 305, "findRankRows()", "green")
    seq_msg(lines, by_id, "repo", "db", 345, "latest completed + counts", "green")
    seq_msg(lines, by_id, "service", "service", 385, "sort score/token/count/time", "purple")
    seq_msg(lines, by_id, "controller", "board", 425, "RankPageResponse", "gray", response=True)
    seq_frame(lines, 48, 470, 1120, 180, "Personal rank", COLORS["red"])
    seq_msg(lines, by_id, "board", "api", 505, "GET /api/rank/me", "blue")
    seq_msg(lines, by_id, "api", "controller", 545, "my rank request", "blue")
    seq_msg(lines, by_id, "controller", "session", 585, "requireSessionUser()", "red")
    seq_msg(lines, by_id, "controller", "service", 625, "getUserRank(userId)", "green")
    seq_msg(lines, by_id, "controller", "board", 665, "personal RankResponse", "gray", response=True)
    seq_frame(lines, 60, 700, 1040, 36, "Frontend renders 20 rows as two 10-row columns and marks test accounts as Official Demo", COLORS["purple"])
    finish(lines, "11-ranking-query-sequence.svg")


def render_evaluation_sequence():
    lines = []
    participants = [
        {"id": "judge", "label": "Judge", "x": 90, "fill": COLORS["orange_fill"], "stroke": "#fed7aa"},
        {"id": "program", "label": "Program", "x": 255, "fill": COLORS["purple_fill"], "stroke": "#e9d5ff"},
        {"id": "gateway", "label": "Model Gateway", "x": 430, "fill": COLORS["gray_fill"], "stroke": COLORS["stroke"]},
        {"id": "db", "label": "MySQL", "x": 610, "fill": COLORS["green_fill"], "stroke": "#bbf7d0"},
        {"id": "userapi", "label": "User API", "x": 790, "fill": COLORS["green_fill"], "stroke": "#bbf7d0"},
        {"id": "history", "label": "HistoryPage", "x": 970, "fill": COLORS["blue_fill"], "stroke": "#bfdbfe"},
        {"id": "modal", "label": "Detail Modal", "x": 1140, "fill": COLORS["purple_fill"], "stroke": "#e9d5ff"},
    ]
    by_id = {item["id"]: item for item in participants}
    sequence_start(lines, 1220, 800, "Sequence: Evaluation Writeback & Score Detail Display", participants)
    seq_frame(lines, 48, 150, 1125, 310, "Judge runtime", COLORS["orange"])
    seq_msg(lines, by_id, "judge", "db", 185, "claim UPLOADED -> EVALUATING", "green")
    seq_msg(lines, by_id, "judge", "program", 230, "run start.sh with tasks", "orange")
    seq_msg(lines, by_id, "program", "gateway", 275, "LLM requests", "orange")
    seq_msg(lines, by_id, "gateway", "program", 320, "model answers + tokens", "gray", response=True)
    seq_msg(lines, by_id, "program", "judge", 365, "task outputs", "gray", response=True)
    seq_msg(lines, by_id, "judge", "db", 410, "score, score_detail, token_usage", "green")
    seq_frame(lines, 48, 505, 1125, 190, "Frontend detail view", COLORS["purple"])
    seq_msg(lines, by_id, "history", "userapi", 540, "GET /me/submissions", "blue")
    seq_msg(lines, by_id, "userapi", "db", 585, "submissions + question_details", "green")
    seq_msg(lines, by_id, "userapi", "history", 630, "score_detail JSON", "gray", response=True)
    seq_msg(lines, by_id, "history", "modal", 675, "merge by question id", "purple")
    seq_frame(lines, 80, 725, 1040, 36, "Missing or malformed score_detail: frontend keeps the record visible and shows available status/message", COLORS["red"])
    finish(lines, "12-evaluation-writeback-sequence.svg")


def render_log_download_sequence():
    lines = []
    participants = [
        {"id": "script", "label": "Python Script", "x": 95, "fill": COLORS["blue_fill"], "stroke": "#bfdbfe"},
        {"id": "controller", "label": "LogController", "x": 285, "fill": COLORS["green_fill"], "stroke": "#bbf7d0"},
        {"id": "service", "label": "LogService", "x": 480, "fill": COLORS["green_fill"], "stroke": "#bbf7d0"},
        {"id": "repo", "label": "SubmissionRepo", "x": 675, "fill": COLORS["purple_fill"], "stroke": "#e9d5ff"},
        {"id": "db", "label": "MySQL", "x": 845, "fill": COLORS["gray_fill"], "stroke": COLORS["stroke"]},
        {"id": "mounts", "label": "Log Mounts", "x": 1035, "fill": COLORS["orange_fill"], "stroke": "#fed7aa"},
    ]
    by_id = {item["id"]: item for item in participants}
    sequence_start(lines, 1120, 720, "Sequence: Submission Log Download", participants)
    seq_msg(lines, by_id, "script", "controller", 170, "GET /download?submission_id&key", "blue")
    seq_msg(lines, by_id, "controller", "controller", 220, "constant-time key check", "red")
    seq_frame(lines, 48, 250, 1020, 250, "Find mounted submission log", COLORS["green"])
    seq_msg(lines, by_id, "controller", "service", 285, "loadLogFile(id)", "green")
    seq_msg(lines, by_id, "service", "repo", 330, "existsById(id)", "green")
    seq_msg(lines, by_id, "repo", "db", 375, "submission exists?", "green")
    seq_msg(lines, by_id, "service", "mounts", 420, "scan templates in order", "orange")
    seq_msg(lines, by_id, "mounts", "service", 465, "first readable *.log", "gray", response=True)
    seq_msg(lines, by_id, "service", "controller", 510, "FileSystemResource", "gray", response=True)
    seq_msg(lines, by_id, "controller", "script", 555, "attachment stream", "gray", response=True)
    seq_frame(lines, 60, 610, 980, 36, "Not found path: missing submission, unreadable mount, or no *.log in configured {submissionId} directory", COLORS["red"])
    finish(lines, "13-log-download-sequence.svg")


def render_system_architecture():
    lines = []
    svg_start(lines, 1200, 820, "AgentContest System Architecture")
    lane(lines, 40, 76, 1120, 120, "Client & Edge", COLORS["blue"])
    lane(lines, 40, 226, 1120, 210, "Spring Boot Backend", COLORS["green"])
    lane(lines, 40, 466, 1120, 170, "Data, Files & Runtime Integration", COLORS["purple"])
    box(lines, 76, 112, 160, 64, "Browser", ["Vue SPA", "HTTPS redirect"], COLORS["blue_fill"], "#bfdbfe")
    box(lines, 286, 112, 160, 64, "Nginx / serve", ["static assets", "optional /api proxy"], COLORS["gray_fill"], COLORS["stroke"])
    box(lines, 496, 112, 160, 64, "Internal Login", ["optional guard", "writes work id"], COLORS["orange_fill"], "#fed7aa")
    box(lines, 706, 112, 160, 64, "Axios API", ["cookies", "write key"], COLORS["blue_fill"], "#bfdbfe")
    box(lines, 104, 266, 150, 70, "Write Filter", ["write API key", "POST/PUT/DELETE"], COLORS["red_fill"], "#fecaca")
    box(lines, 304, 266, 150, 70, "Controllers", ["me endpoints", "Upload / Rank"], COLORS["green_fill"], "#bbf7d0")
    box(lines, 504, 254, 178, 92, "Session Service", ["signed cookie", "uuid check", "audit warn"], COLORS["red_fill"], "#fecaca")
    box(lines, 732, 254, 178, 92, "Business Services", ["User / Rank", "Contest config", "Upload rules"], COLORS["green_fill"], "#bbf7d0")
    box(lines, 972, 254, 170, 92, "Package + Logs", ["mounted copy", "log templates", "hidden paths"], COLORS["purple_fill"], "#e9d5ff")
    db(lines, 145, 510, 130, 72, "MySQL", "#eff6ff", COLORS["blue"])
    box(lines, 310, 510, 160, 72, "Upload Store", ["uploads/{userId}", "{submissionId}.zip"], COLORS["orange_fill"], "#fed7aa")
    box(lines, 520, 510, 180, 72, "Mounted Targets", ["AgentContest/programs", "all copies required"], COLORS["purple_fill"], "#e9d5ff")
    box(lines, 750, 510, 160, 72, "Judge Service", ["reads package", "writes score"], COLORS["green_fill"], "#bbf7d0")
    box(lines, 960, 510, 150, 72, "Log Mounts", ["{submissionId}/*.log", "download by key"], COLORS["gray_fill"], COLORS["stroke"])
    box(lines, 500, 640, 190, 54, "app_settings", ["upload_interval_minutes"], COLORS["orange_fill"], "#fed7aa")
    arrow(lines, [(236, 144), (286, 144)], "blue", "assets")
    arrow(lines, [(656, 144), (706, 144)], "blue", "API calls")
    arrow(lines, [(786, 176), (786, 224), (178, 224), (178, 266)], "blue", "REST")
    arrow(lines, [(254, 300), (304, 300)], "red", "allowed")
    arrow(lines, [(454, 300), (504, 300)], "red", "auth")
    arrow(lines, [(682, 300), (732, 300)], "green", "rules")
    arrow(lines, [(910, 300), (972, 300)], "purple", "files")
    arrow(lines, [(821, 346), (821, 466), (145, 466), (145, 510)], "green", "JPA")
    arrow(lines, [(1057, 346), (1057, 420), (390, 420), (390, 510)], "purple", "save zip")
    arrow(lines, [(470, 546), (520, 546)], "purple", "copy")
    arrow(lines, [(700, 546), (750, 546)], "orange", "evaluate", True)
    arrow(lines, [(830, 510), (830, 470), (210, 470), (210, 510)], "green", "score_detail", True)
    arrow(lines, [(1035, 510), (1035, 440), (1057, 440), (1057, 346)], "gray", "log query", True)
    arrow(lines, [(595, 640), (595, 600), (780, 600), (780, 346)], "orange", "cooldown", True)
    legend(lines, 55, 705, [("blue", "HTTP / REST", False), ("red", "identity check", False), ("green", "database data", False), ("purple", "file distribution", False), ("orange", "judge async work", True)])
    finish(lines, "01-system-architecture.svg")


def render_backend_class_diagram():
    lines = []
    svg_start(lines, 1280, 940, "Backend Class Diagram")
    lane(lines, 40, 78, 1200, 170, "API Entry Layer", COLORS["blue"])
    lane(lines, 40, 278, 1200, 300, "Service Layer", COLORS["green"])
    lane(lines, 40, 608, 1200, 220, "Repository & Entity Layer", COLORS["purple"])
    controllers = [
        ("WriteApiKeyFilter", "+ doFilterInternal()", "- requiresWriteKey()"),
        ("UserController", "+ createUser()", "+ listMySubmissions()"),
        ("UploadController", "+ uploadCode()", "+ resolveClientIp()"),
        ("RankController", "+ listRankPage()", "+ getMyRank()"),
        ("LogDownloadController", "+ downloadLog()", "+ keyVerifier.matches()"),
    ]
    for index, (title, method1, method2) in enumerate(controllers):
        class_box(lines, 70 + index * 236, 116, 190, title, ["- service refs"], [method1, method2], COLORS["blue_fill"], "#bfdbfe")
    services = [
        ("UserService", ["- userRepository", "- submissionRepository"], ["+ listSubmissions()", "+ cancelSubmission()", "+ createUserEntity()"]),
        ("UserSessionService", ["- secret", "- sessionTtl"], ["+ requireSessionUser()", "+ writeSessionCookie()", "+ verifyCurrentUserId()"]),
        ("UploadService", ["- clock", "- cooldown policy"], ["+ uploadCode()", "- validateUserCanUpload()", "- markUploaded()"]),
        ("PackageService", ["- uploadDir", "- targetDirs"], ["+ validateUploadFile()", "+ saveAndValidate()", "+ distribute()"]),
        ("RankService", ["- submissionRepository"], ["+ listRankPage()", "+ getUserRank()", "- buildRankRows()"]),
        ("ContestConfigService", ["- title / challenge", "- startsAt / endsAt"], ["+ currentContest()", "+ validateWindow()"]),
        ("AppSettingService", ["- repository"], ["+ uploadInterval()"]),
        ("LogDownloadService", ["- directoryTemplates"], ["+ loadLogFile()"]),
    ]
    positions = [(65, 315), (310, 315), (555, 315), (800, 315), (1045, 315), (190, 455), (495, 455), (800, 455)]
    for item, (x, y) in zip(services, positions):
        class_box(lines, x, y, 210, item[0], item[1], item[2], COLORS["green_fill"], "#bbf7d0")
    repos = [
        ("UserRepository", "UserEntity"),
        ("SubmissionRepository", "SubmissionEntity"),
        ("QuestionRepo", "QuestionDetailEntity"),
        ("TestAccountRepo", "TestAccountEntity"),
        ("EmergencyLoginRepo", "EmergencyLoginEntity"),
        ("AppSettingRepo", "AppSettingEntity"),
    ]
    for index, (repo, entity_name) in enumerate(repos):
        x = 55 + index * 200
        class_box(lines, x, 650, 175, repo, ["<<JpaRepository>>"], ["+ query methods"], COLORS["purple_fill"], "#e9d5ff")
        class_box(lines, x, 765, 175, entity_name, ["@Entity"], ["getters/setters"], COLORS["gray_fill"], COLORS["stroke"])
        arrow(lines, [(x + 88, 737), (x + 88, 765)], "gray", "maps", True)
    for points in [[(165, 248), (165, 270), (170, 270), (170, 315)], [(405, 248), (405, 270), (415, 270), (415, 315)], [(640, 248), (640, 270), (1150, 270), (1150, 315)], [(875, 248), (875, 270), (295, 270), (295, 455)], [(1110, 248), (1110, 270), (905, 270), (905, 455)]]:
        arrow(lines, points, "blue", None, True)
    for points in [[(170, 430), (170, 600), (165, 600), (165, 650)], [(660, 430), (660, 600), (400, 600), (400, 650)], [(1150, 430), (1150, 600), (400, 600), (400, 650)], [(600, 548), (600, 600), (870, 600), (870, 650)], [(170, 430), (170, 600), (635, 600), (635, 650)], [(905, 548), (905, 600), (400, 600), (400, 650)]]:
        arrow(lines, points, "green", None, True)
    legend(lines, 60, 848, [("blue", "controller uses service", True), ("green", "service/repository data", True), ("purple", "package/file collaboration", False)])
    finish(lines, "02-backend-class-diagram.svg")


def render_frontend_module_diagram():
    lines = []
    svg_start(lines, 1280, 860, "Frontend Module Diagram")
    lane(lines, 40, 76, 1200, 120, "Entrypoint, API & Browser State", COLORS["blue"])
    lane(lines, 40, 226, 1200, 170, "App-level Composables", COLORS["green"])
    lane(lines, 40, 426, 1200, 160, "Feature Components", COLORS["purple"])
    lane(lines, 40, 616, 1200, 120, "Feature Composables & Display Utilities", COLORS["orange"])

    box(lines, 70, 112, 160, 64, "main.js", ["HTTPS redirect", "optional login guard"], COLORS["blue_fill"], "#bfdbfe")
    box(lines, 275, 112, 160, 64, "App.vue", ["page shell", "modal routing"], COLORS["blue_fill"], "#bfdbfe")
    box(lines, 480, 112, 180, 64, "api/index.js", ["Axios instance", "me endpoints"], COLORS["orange_fill"], "#fed7aa")
    box(lines, 710, 112, 170, 64, "userStorage", ["third_party id", "cached profile"], COLORS["gray_fill"], COLORS["stroke"])
    box(lines, 930, 112, 190, 64, "contestDefaults", ["fallback only", "backend wins"], COLORS["gray_fill"], COLORS["stroke"])

    box(lines, 70, 270, 180, 78, "useUserSession", ["GET me / POST users", "emergency login"], COLORS["green_fill"], "#bbf7d0")
    box(lines, 300, 270, 180, 78, "useContestConfig", ["GET contest config", "normalize fallback"], COLORS["green_fill"], "#bbf7d0")
    box(lines, 530, 270, 180, 78, "useContestClock", ["phase", "countdown"], COLORS["green_fill"], "#bbf7d0")
    box(lines, 760, 270, 180, 78, "useErrorDialog", ["friendly messages", "global modal"], COLORS["green_fill"], "#bbf7d0")
    box(lines, 990, 270, 180, 78, "useIntervalTimer", ["refresh lifecycle", "auto stop"], COLORS["green_fill"], "#bbf7d0")

    box(lines, 70, 470, 160, 70, "RegisterPanel", ["normal/emergency", "nickname once"], COLORS["purple_fill"], "#e9d5ff")
    box(lines, 275, 470, 160, 70, "SchedulePanel", ["date + countdown", "phase copy"], COLORS["purple_fill"], "#e9d5ff")
    box(lines, 480, 470, 160, 70, "UploadModal", ["zip select", "progress state"], COLORS["purple_fill"], "#e9d5ff")
    box(lines, 685, 470, 160, 70, "HistoryPage", ["auto refresh", "cancel queue"], COLORS["purple_fill"], "#e9d5ff")
    box(lines, 890, 470, 160, 70, "RankingBoard", ["20 rows", "sort/search"], COLORS["purple_fill"], "#e9d5ff")
    box(lines, 1095, 470, 110, 70, "ErrorModal", ["errors"], COLORS["red_fill"], "#fecaca")

    box(lines, 430, 650, 170, 60, "usePackageUpload", ["file rules", "upload API"], COLORS["orange_fill"], "#fed7aa")
    box(lines, 645, 650, 180, 60, "useSubmissionHistory", ["score details", "queue summary"], COLORS["orange_fill"], "#fed7aa")
    box(lines, 870, 650, 170, 60, "useRankingBoard", ["request seq", "2 columns"], COLORS["orange_fill"], "#fed7aa")
    box(lines, 1065, 650, 145, 60, "utils", ["display parsers", "score format"], COLORS["gray_fill"], COLORS["stroke"])

    arrow(lines, [(230, 144), (275, 144)], "blue", "mount")
    arrow(lines, [(435, 144), (480, 144)], "blue", "API")
    arrow(lines, [(795, 176), (795, 215), (160, 215), (160, 270)], "gray", "read/write", True)
    arrow(lines, [(1025, 176), (1025, 215), (390, 215), (390, 270)], "gray", "fallback", True)
    arrow(lines, [(355, 176), (160, 270)], "green", "session")
    arrow(lines, [(355, 176), (390, 270)], "green", "config")
    arrow(lines, [(390, 348), (620, 348)], "green", "dates")
    arrow(lines, [(355, 176), (850, 270)], "red", "errors")
    arrow(lines, [(1080, 348), (1080, 616), (735, 616), (735, 650)], "green", "timer")
    arrow(lines, [(160, 348), (150, 470)], "green", "login")
    arrow(lines, [(620, 348), (355, 470)], "green", "schedule")
    arrow(lines, [(570, 540), (515, 650)], "blue", "upload")
    arrow(lines, [(765, 540), (735, 650)], "blue", "history")
    arrow(lines, [(970, 540), (955, 650)], "blue", "ranking")
    arrow(lines, [(850, 348), (1150, 470)], "red", "error state")
    arrow(lines, [(825, 680), (1065, 680)], "purple", "normalize")
    arrow(lines, [(1040, 680), (1065, 680)], "purple", "format")
    legend(lines, 60, 780, [("blue", "component/API collaboration", False), ("green", "session/contest state", False), ("red", "error state", False), ("gray", "browser or fallback data", True), ("orange", "feature composables", False)])
    finish(lines, "03-frontend-module-diagram.svg")


def render_upload_flow():
    lines = []
    svg_start(lines, 1160, 860, "Upload Submission Flow")
    for x, y, title, subtitle, kind in [
        (120, 110, "User clicks Upload", "Frontend opens modal", "box"),
        (120, 220, "Select .zip", "client extension check", "io"),
        (120, 330, "POST /api/upload/me", "cookie + write key", "box"),
        (420, 110, "Write key + session", "filter + signed cookie", "box"),
        (420, 220, "Validate rules", "contest / db interval / night", "diamond"),
        (420, 330, "Create submission", "UPLOADING + submit_ip", "box"),
        (720, 110, "Save zip", "uploads/user/id.zip", "box"),
        (720, 220, "Extract validate", "zip-slip / size / start.sh LF", "box"),
        (720, 330, "Copy package", "programs + mounted targets", "box"),
        (420, 460, "Mark UPLOADED", "hide paths, return id + queueAhead", "box"),
        (720, 460, "Return success", "frontend check animation", "box"),
        (120, 590, "Failure branch", "delete or mark FAILED", "box"),
    ]:
        if kind == "diamond":
            lines.append(f'<polygon points="{x+90},{y} {x+180},{y+45} {x+90},{y+90} {x},{y+45}" fill="{COLORS["orange_fill"]}" stroke="#fed7aa" stroke-width="1.5" filter="url(#softShadow)"/>')
            lines.append(f'<text x="{x+90}" y="{y+38}" text-anchor="middle" class="label">{esc(title)}</text>')
            lines.append(f'<text x="{x+90}" y="{y+56}" text-anchor="middle" class="tiny">{esc(subtitle)}</text>')
        elif kind == "io":
            lines.append(f'<path d="M {x+18} {y} L {x+200} {y} L {x+182} {y+72} L {x} {y+72} Z" fill="{COLORS["blue_fill"]}" stroke="#bfdbfe" stroke-width="1.5" filter="url(#softShadow)"/>')
            lines.append(f'<text x="{x+100}" y="{y+28}" text-anchor="middle" class="label">{esc(title)}</text>')
            lines.append(f'<text x="{x+100}" y="{y+48}" text-anchor="middle" class="small">{esc(subtitle)}</text>')
        else:
            fill = COLORS["green_fill"] if x >= 420 else COLORS["blue_fill"]
            stroke = "#bbf7d0" if x >= 420 else "#bfdbfe"
            box(lines, x, y, 200, 72, title, subtitle, fill, stroke)
    arrow(lines, [(220, 182), (220, 220)], "blue")
    arrow(lines, [(220, 292), (220, 330)], "blue")
    arrow(lines, [(320, 366), (420, 146)], "blue", "request")
    arrow(lines, [(510, 182), (510, 220)], "red", "auth ok")
    arrow(lines, [(510, 310), (510, 330)], "green", "allowed")
    arrow(lines, [(620, 366), (720, 146)], "purple", "package")
    arrow(lines, [(810, 182), (810, 220)], "purple")
    arrow(lines, [(810, 292), (810, 330)], "purple")
    arrow(lines, [(720, 366), (620, 496)], "green", "paths")
    arrow(lines, [(620, 496), (720, 496)], "blue", "response")
    arrow(lines, [(420, 265), (290, 265), (290, 626), (320, 626)], "red", "blocked", True)
    arrow(lines, [(920, 366), (1000, 366), (1000, 670), (320, 670), (320, 626)], "red", "copy/zip error", True)
    legend(lines, 55, 760, [("blue", "HTTP / UI progression", False), ("red", "rejection or failure", True), ("green", "database status update", False), ("purple", "file validation/distribution", False)])
    finish(lines, "04-upload-flow.svg")


def render_login_session_flow():
    lines = []
    svg_start(lines, 1160, 780, "Login & Session Flow")
    lane(lines, 54, 80, 1050, 140, "Third-party Bootstrap", COLORS["blue"])
    lane(lines, 54, 250, 1050, 190, "Backend Session Issuing", COLORS["green"])
    lane(lines, 54, 470, 1050, 150, "Protected Requests", COLORS["red"])
    box(lines, 90, 120, 170, 62, "main.js", ["HTTPS redirect", "optional login guard"], COLORS["blue_fill"], "#bfdbfe")
    box(lines, 320, 120, 170, 62, "Internal Login", ["status endpoint", "store work id"], COLORS["orange_fill"], "#fed7aa")
    box(lines, 550, 120, 170, 62, "Vue App", ["GET me first", "then POST users"], COLORS["blue_fill"], "#bfdbfe")
    box(lines, 90, 300, 190, 72, "POST /api/users", ["X-Agent-Contest-User-Id", "nickname only for new"], COLORS["green_fill"], "#bbf7d0")
    box(lines, 340, 300, 190, 72, "UserService", ["create or find user", "nickname immutable"], COLORS["green_fill"], "#bbf7d0")
    box(lines, 590, 300, 190, 72, "UserSessionService", ["HMAC token", "userId + uuid + exp"], COLORS["red_fill"], "#fecaca")
    box(lines, 840, 300, 170, 72, "Cookie", ["agent_contest_session", "SameSite=Lax"], COLORS["gray_fill"], COLORS["stroke"])
    box(lines, 120, 515, 190, 72, "me endpoints", ["/api/users/me", "/api/upload/me"], COLORS["blue_fill"], "#bfdbfe")
    box(lines, 395, 515, 190, 72, "requireSessionUser", ["verify signature", "uuid equals DB"], COLORS["red_fill"], "#fecaca")
    db(lines, 760, 515, 140, 72, "users table", "#eff6ff", COLORS["blue"])
    box(lines, 940, 515, 120, 72, "401/403 logs", ["mismatch audit"], COLORS["red_fill"], "#fecaca")
    arrow(lines, [(260, 151), (320, 151)], "blue", "redirect")
    arrow(lines, [(490, 151), (550, 151)], "blue", "work id")
    arrow(lines, [(635, 182), (185, 300)], "blue", "bootstrap")
    arrow(lines, [(280, 336), (340, 336)], "green")
    arrow(lines, [(530, 336), (590, 336)], "red", "sign")
    arrow(lines, [(780, 336), (840, 336)], "red", "Set-Cookie")
    arrow(lines, [(925, 372), (925, 470), (215, 470), (215, 515)], "blue", "later calls")
    arrow(lines, [(310, 551), (395, 551)], "red", "cookie")
    arrow(lines, [(585, 551), (760, 551)], "green", "uuid lookup")
    arrow(lines, [(585, 570), (640, 570), (640, 630), (940, 630), (940, 587)], "red", "reject", True)
    box(lines, 760, 120, 190, 62, "Emergency Login", ["POST emergency-login", "DB whitelist"], COLORS["orange_fill"], "#fed7aa")
    arrow(lines, [(720, 151), (760, 151)], "orange", "fallback")
    arrow(lines, [(855, 182), (855, 250), (675, 250), (675, 300)], "orange", "Set-Cookie")
    legend(lines, 60, 690, [("blue", "frontend navigation / API", False), ("green", "user lookup", False), ("red", "session security", False)])
    finish(lines, "05-login-session-flow.svg")


def render_evaluation_flow():
    lines = []
    svg_start(lines, 1160, 760, "Evaluation & Score Detail Flow")
    lane(lines, 50, 82, 1060, 155, "Submission Queue", COLORS["blue"])
    lane(lines, 50, 270, 1060, 190, "Judge / Scoring", COLORS["orange"])
    lane(lines, 50, 500, 1060, 130, "Frontend History Detail", COLORS["purple"])
    box(lines, 90, 125, 180, 70, "UPLOADED", ["queued package", "queueAhead count"], COLORS["blue_fill"], "#bfdbfe")
    box(lines, 340, 125, 180, 70, "EVALUATING", ["judge picked task", "runtime active"], COLORS["orange_fill"], "#fed7aa")
    box(lines, 590, 125, 180, 70, "COMPLETED / FAILED", ["final status", "score or message"], COLORS["green_fill"], "#bbf7d0")
    box(lines, 110, 315, 200, 78, "Judge Service", ["runs start.sh", "calls model gateway"], COLORS["orange_fill"], "#fed7aa")
    box(lines, 390, 315, 210, 78, "Model Gateway", ["allowed external target", "token usage"], COLORS["gray_fill"], COLORS["stroke"])
    db(lines, 745, 314, 150, 82, "submissions", "#eff6ff", COLORS["blue"])
    box(lines, 920, 315, 150, 78, "question_details", ["title + detail", "1..10"], COLORS["purple_fill"], "#e9d5ff")
    box(lines, 110, 535, 200, 64, "HistoryPage", ["GET me/submissions", "queue summary"], COLORS["blue_fill"], "#bfdbfe")
    box(lines, 390, 535, 210, 64, "mergeQuestionScoreDetails", ["DB score_detail + questions", "decimal score"], COLORS["purple_fill"], "#e9d5ff")
    box(lines, 720, 535, 200, 64, "Detail Modal", ["left question list", "right long detail"], COLORS["purple_fill"], "#e9d5ff")
    arrow(lines, [(270, 160), (340, 160)], "blue", "picked")
    arrow(lines, [(520, 160), (590, 160)], "green", "finished")
    arrow(lines, [(430, 195), (210, 315)], "orange", "package")
    arrow(lines, [(310, 354), (390, 354)], "orange", "LLM calls")
    arrow(lines, [(600, 354), (745, 354)], "green", "score_detail JSON")
    arrow(lines, [(820, 396), (820, 500), (210, 500), (210, 535)], "blue", "history API")
    arrow(lines, [(995, 393), (995, 500), (495, 500), (495, 535)], "purple", "question text")
    arrow(lines, [(600, 567), (720, 567)], "purple", "render")
    legend(lines, 60, 680, [("blue", "queue/history reads", False), ("orange", "evaluation runtime", False), ("green", "score writeback", False), ("purple", "question detail merge", False)])
    finish(lines, "06-evaluation-score-flow.svg")


def render_database_er():
    lines = []
    svg_start(lines, 1280, 760, "Database ER Diagram")
    entity(lines, 70, 110, 230, "users", ["PK user_id varchar(64)", "username varchar(64)", "UK client_uuid char(36)"])
    entity(lines, 500, 94, 290, "submissions", ["PK id bigint auto", "FK user_id varchar(64)", "status varchar(32)", "package_id char(36) unique", "score decimal(12,4)", "score_detail text", "token_usage bigint", "error_message varchar(500)", "stored/original paths hidden", "submit_ip, created_at"])
    entity(lines, 935, 120, 250, "question_details", ["PK id int", "title varchar(128)", "detail text"])
    entity(lines, 70, 390, 230, "test_accounts", ["PK/FK user_id varchar(64)"])
    entity(lines, 390, 390, 260, "emergency_login_accounts", ["PK/FK user_id varchar(64)", "enabled tinyint(1)"])
    entity(lines, 780, 405, 270, "app_settings", ["PK setting_key varchar(64)", "setting_value varchar(255)", "description varchar(255)", "updated_at timestamp"])

    def diamond(cx, cy, text):
        lines.append(f'<polygon points="{cx},{cy-24} {cx+56},{cy} {cx},{cy+24} {cx-56},{cy}" fill="#ffffff" stroke="{COLORS["muted"]}" stroke-width="1.2"/>')
        lines.append(f'<text x="{cx}" y="{cy+4}" text-anchor="middle" class="tiny">{esc(text)}</text>')

    diamond(395, 210, "has")
    arrow(lines, [(300, 210), (339, 210)], "gray", "1", False, 1.4)
    arrow(lines, [(451, 210), (500, 210)], "gray", "N", False, 1.4)
    diamond(185, 345, "is demo")
    arrow(lines, [(185, 298), (185, 321)], "gray", "1", False, 1.4)
    arrow(lines, [(185, 369), (185, 390)], "gray", "0..1", False, 1.4)
    diamond(455, 330, "emergency")
    arrow(lines, [(185, 208), (185, 270), (455, 270), (455, 306)], "gray", "1", False, 1.4)
    arrow(lines, [(455, 354), (455, 390)], "gray", "0..1", False, 1.4)
    lines.append(f'<path d="M 790 180 C 860 180 865 200 935 200" fill="none" stroke="{COLORS["purple"]}" stroke-width="1.6" stroke-dasharray="5,4" marker-end="url(#arrow-purple)"/>')
    lines.append('<rect x="805" y="155" width="132" height="18" rx="9" fill="#ffffff" opacity="0.95"/>')
    lines.append('<text x="871" y="168" text-anchor="middle" class="tiny">score_detail.question</text>')
    box(lines, 760, 610, 300, 54, "upload_interval_minutes", ["dynamic cooldown setting"], COLORS["orange_fill"], "#fed7aa")
    arrow(lines, [(915, 565), (915, 610)], "orange", "config")
    legend(lines, 60, 690, [("gray", "foreign key / cardinality", False), ("purple", "JSON reference by question id", True), ("orange", "dynamic runtime setting", False)])
    finish(lines, "07-database-er.svg")


def main():
    for old_file in OUT_DIR.glob("*.svg"):
        old_file.unlink()
    render_system_architecture()
    render_backend_class_diagram()
    render_frontend_module_diagram()
    render_upload_flow()
    render_login_session_flow()
    render_evaluation_flow()
    render_database_er()
    render_login_sequence()
    render_upload_sequence()
    render_history_cancel_sequence()
    render_ranking_sequence()
    render_evaluation_sequence()
    render_log_download_sequence()
    print(f"Generated {len(list(OUT_DIR.glob('*.svg')))} SVG diagrams in {OUT_DIR}")


if __name__ == "__main__":
    main()
