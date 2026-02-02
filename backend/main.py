from flask import Flask, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Import routes
from routes.auth import auth_bp
from routes.water_quality import water_quality_bp
from routes.phc_operations import phc_bp
from routes.lab_operations import lab_bp
from routes.reporting import reporting_bp

load_dotenv()

app = Flask(__name__)

# CORS configuration - allow Vercel frontend
CORS(app, resources={
    r"/*": {
        "origins": [
            "https://luit-clean-water.vercel.app",
            "http://localhost:3000",
            "http://localhost:5173"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Configuration
app.config['ENV'] = os.getenv('FLASK_ENV', 'development')
app.config['DEBUG'] = app.config['ENV'] == 'development'

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(water_quality_bp, url_prefix='/api/water-quality')
app.register_blueprint(phc_bp, url_prefix='/api/phc')
app.register_blueprint(lab_bp, url_prefix='/api/lab')
app.register_blueprint(reporting_bp, url_prefix='/api/reporting')

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'LUIT Clean Water Backend is running'}), 200

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found', 'message': 'The requested resource was not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error', 'message': 'An unexpected error occurred'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=app.config['DEBUG'])
