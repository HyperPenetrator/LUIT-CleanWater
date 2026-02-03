import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-key-change-in-production')
    DEBUG = False
    TESTING = False
    CORS_HEADERS = 'Content-Type'
    
    # SMS Configuration
    SMS_PHONE_NUMBER = os.getenv('SMS_PHONE_NUMBER', '+91-XXXX-XXXX-XX')  # To be configured
    SMS_WEBHOOK_TOKEN = os.getenv('SMS_WEBHOOK_TOKEN', 'change-this-token')  # Security token for webhook
    SMS_PROVIDER = os.getenv('SMS_PROVIDER', 'manual')  # 'twilio', 'aws', or 'manual'

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    DEVELOPMENT = True

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    PRODUCTION = True

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
