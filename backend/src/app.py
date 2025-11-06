from flask import Flask
from dotenv import load_dotenv
import os
from backend.src.routes.events import bp as events_bp

def create_app() -> Flask:
	'''Create and configure application instance'''
	load_dotenv()  # Load environment variables from .env file

	app = Flask(__name__)
	try:
		app.register_blueprint(events_bp)

	except Exception as e:
		print(f"Error registering blueprint for events: {e}")

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
	app.run(host="127.0.0.1", port=5000, debug=debug_mode)
