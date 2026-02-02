import firebase_admin
from firebase_admin import credentials, firestore, storage, auth
import os
import json
import logging

logger = logging.getLogger(__name__)

class FirebaseService:
    """Firebase service for database operations"""
    
    def __init__(self):
        """Initialize Firebase app"""
        if not firebase_admin._apps:
            cred = None
            
            # Try method 1: Load from file
            cred_path = os.getenv('FIREBASE_KEY_PATH', 'serviceAccountKey.json')
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
            
            # Try method 2: Load from FIREBASE_CREDENTIALS environment variable
            elif os.getenv('FIREBASE_CREDENTIALS'):
                cred_dict = os.getenv('FIREBASE_CREDENTIALS')
                cred = credentials.Certificate(json.loads(cred_dict))
            
            # Try method 3: Construct from individual environment variables (Railway/Vercel)
            elif os.getenv('FIREBASE_PROJECT_ID'):
                cred_dict = {
                    "type": "service_account",
                    "project_id": os.getenv('FIREBASE_PROJECT_ID'),
                    "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
                    "private_key": os.getenv('FIREBASE_PRIVATE_KEY', '').replace('\\n', '\n'),
                    "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
                    "client_id": os.getenv('FIREBASE_CLIENT_ID'),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                    "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{os.getenv('FIREBASE_CLIENT_EMAIL')}"
                }
                cred = credentials.Certificate(cred_dict)
            else:
                raise ValueError("Firebase credentials not found. Please set FIREBASE_PROJECT_ID and related environment variables.")
            
            # Get storage bucket with fallback
            storage_bucket = os.getenv('FIREBASE_STORAGE_BUCKET')
            if not storage_bucket and os.getenv('FIREBASE_PROJECT_ID'):
                storage_bucket = f"{os.getenv('FIREBASE_PROJECT_ID')}.appspot.com"
            
            firebase_admin.initialize_app(cred, {
                'storageBucket': storage_bucket
            })
        
        # Initialize Firestore client
        self.db = firestore.client()
    
    def add_water_quality_report(self, report_data):
        """Add a water quality report"""
        import uuid
        report_id = str(uuid.uuid4())
        self.db.collection('water_quality_reports').document(report_id).set(report_data)
        return report_id
    
    def get_water_quality_reports(self, district=None):
        """Get water quality reports"""
        try:
            if district:
                docs = self.db.collection('water_quality_reports').where('district', '==', district).stream()
            else:
                docs = self.db.collection('water_quality_reports').stream()
            
            reports = {}
            for doc in docs:
                reports[doc.id] = doc.to_dict()
            return reports
        except Exception as e:
            logger.info(f"No reports found or error: {str(e)}")
            return {}
    
    def get_active_reports(self):
        """Get active contamination reports"""
        try:
            docs = self.db.collection('water_quality_reports')\
                .where('status', '==', 'contaminated')\
                .where('active', '==', True)\
                .stream()
            
            reports = {}
            for doc in docs:
                reports[doc.id] = doc.to_dict()
            return reports
        except Exception as e:
            logger.info(f"No active reports found or error: {str(e)}")
            return {}
    
    def update_report_status(self, report_id, status):
        """Update report status"""
        self.db.collection('water_quality_reports').document(report_id).update({'status': status})
        return True
    
    def add_phc_user(self, user_data):
        """Add PHC user"""
        import uuid
        user_id = str(uuid.uuid4())
        self.db.collection('phc_users').document(user_id).set(user_data)
        return user_id
    
    def add_lab_user(self, user_data):
        """Add Lab user"""
        import uuid
        user_id = str(uuid.uuid4())
        self.db.collection('lab_users').document(user_id).set(user_data)
        return user_id
    
    def get_phc_by_email(self, email):
        """Get PHC by email"""
        try:
            docs = self.db.collection('phc_users').where('email', '==', email).stream()
            users = {}
            for doc in docs:
                users[doc.id] = doc.to_dict()
            return users if users else None
        except Exception as e:
            logger.error(f"Error getting PHC user: {str(e)}", exc_info=True)
            return None
    
    def get_lab_by_email(self, email):
        """Get Lab by email"""
        try:
            docs = self.db.collection('lab_users').where('email', '==', email).stream()
            users = {}
            for doc in docs:
                users[doc.id] = doc.to_dict()
            return users if users else None
        except Exception as e:
            logger.error(f"Error getting Lab user: {str(e)}", exc_info=True)
            return None
    
    def upload_file(self, file_path, destination_path):
        """Upload file to Firebase Storage"""
        bucket = storage.bucket()
        blob = bucket.blob(destination_path)
        blob.upload_from_filename(file_path)
        return blob.public_url
    
    def add_lab_solution(self, solution_data):
        """Add lab solution"""
        import uuid
        solution_id = str(uuid.uuid4())
        self.db.collection('lab_solutions').document(solution_id).set(solution_data)
        return solution_id
    
    def get_lab_solutions(self, district=None):
        """Get lab solutions"""
        try:
            if district:
                docs = self.db.collection('lab_solutions').where('district', '==', district).stream()
            else:
                docs = self.db.collection('lab_solutions').stream()
            
            solutions = {}
            for doc in docs:
                solutions[doc.id] = doc.to_dict()
            return solutions
        except Exception as e:
            logger.info(f"No lab solutions found: {str(e)}")
            return {}

firebase_service = FirebaseService()
