import os
from typing import List

from flask import Flask
from dotenv import load_dotenv

# Load environment variables from .env at startup
load_dotenv()


def _get_allowed_origins() -> List[str]:
	# CORS not enabled; keeping helper placeholder in case it's reintroduced later.
	return []


def create_app() -> Flask:
	app = Flask(__name__)

	# CORS intentionally disabled (frontend expected to share the same origin/proxy in dev/prod)

	# Blueprints
	try:
		from backend.src.routes.events import bp as events_bp
	except ModuleNotFoundError:
		from routes.events import bp as events_bp
	app.register_blueprint(events_bp)

	@app.get("/health")
	def health():
		return {"status": "ok"}

	return app


app = create_app()


if __name__ == "__main__":
	port = int(os.getenv("PORT", 5000))
	debug = os.getenv("FLASK_DEBUG", "0") == "1"
	app.run(host="0.0.0.0", port=port, debug=debug)


