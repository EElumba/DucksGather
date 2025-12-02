from dotenv import load_dotenv
load_dotenv()  # Load env early so db_init sees DATABASE_URL

from flask import Flask, request
from flask_cors import CORS
import os
from backend.src.routes.events import bp as events_bp
from backend.src.routes.users import bp as users_bp
from backend.src.db.db_init import ensure_auth_fk, create_tables_if_needed

def create_app() -> Flask:
	'''Create and configure application instance'''

	app = Flask(__name__)
	# Enable CORS for frontend dev (CRA on localhost:3000)
	# This is safe for development; tighten origins for production
	CORS(
		app,
		resources={r"/api/*": {
			"origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
			"allow_headers": ["Authorization", "Content-Type"],
		}},
	)
	try:
		# Optional dev schema creation
		create_tables_if_needed()
		# Attempt to enforce FK integrity to Supabase auth.users if using Postgres
		ensure_auth_fk()
		app.register_blueprint(events_bp)
		app.register_blueprint(users_bp)
	except Exception as e:
		print(f"Error registering blueprints: {e}")

	# (Removed experimental DB_DEBUG and fallback env loading per user request)

	# Lightweight request tracing for events endpoints when EVENTS_DEBUG=1
	@app.before_request
	def _trace_events_requests():
		if os.getenv("EVENTS_DEBUG") == "1" and request.path.startswith("/api/events"):
			print(f"[trace] {request.method} {request.path} args={dict(request.args)} auth={'Authorization' in request.headers}")

	# Health endpoint for readiness checks and tests (no extra deps)
	@app.get("/health")
	def health():
		return {"status": "ok"}
	return app


app = create_app()

if __name__ == "__main__":
	#Set debug mode to False in production
	#Host0.0.0.0 to be accesible in LAN
	debug_mode = os.getenv("FLASK_DEBUG", "False").lower() in ("true", "1", "yes")
	app.run(host="0.0.0.0", port=5000, debug=debug_mode)

