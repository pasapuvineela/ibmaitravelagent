"""Render the Jinja page shell into deployable static pages without dependencies."""

from datetime import datetime
from pathlib import Path
import re


TEMPLATES = Path("templates")
OUTPUT = Path("public")
PAGES = ["index", "login", "register", "dashboard", "planner", "result", "about", "contact"]


def block(source: str, name: str) -> str:
    match = re.search(rf"{{% block {name} %}}(.*?){{% endblock %}}", source, re.S)
    return match.group(1).strip() if match else ""


def build() -> None:
    base = (TEMPLATES / "base.html").read_text(encoding="utf-8")
    OUTPUT.mkdir(exist_ok=True)
    for page in PAGES:
        child = (TEMPLATES / f"{page}.html").read_text(encoding="utf-8")
        rendered = base
        for name in ("title", "body_class", "content", "scripts"):
            rendered = re.sub(
                rf"{{% block {name} %}}.*?{{% endblock %}}",
                block(child, name),
                rendered,
                flags=re.S,
            )
        rendered = re.sub(r"\{% if active_page == '([^']+)' %\}active\{% endif %\}", lambda match: "active" if match.group(1) == ("home" if page == "index" else ("planner" if page == "result" else page)) else "", rendered)
        rendered = rendered.replace("{{ current_year }}", str(datetime.now().year))
        rendered = rendered.replace("{{ url_for('static', filename='css/style.css') }}", "/static/css/style.css")
        rendered = rendered.replace("{{ url_for('static', filename='js/app.js') }}", "/static/js/app.js")
        (OUTPUT / f"{page}.html").write_text(rendered, encoding="utf-8")


if __name__ == "__main__":
    build()
