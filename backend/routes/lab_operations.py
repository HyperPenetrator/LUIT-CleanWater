from flask import Blueprint, request, jsonify
from services.firebase_service import firebase_service
from firebase_admin import firestore
from datetime import datetime
from werkzeug.utils import secure_filename
import os
import logging

lab_bp = Blueprint('lab', __name__)
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@lab_bp.route('/assignments', methods=['GET'])
def get_assignments():
    """Get assignments for lab - Uses Firestore"""
    try:
        district = request.args.get('district')
        
        logger.info(f"Fetching lab assignments for district: {district}")
        
        # Query Firestore collection
        if district:
            assignments_ref = firebase_service.db.collection('lab_assignments').where(
                filter=firestore.FieldFilter('district', '==', district)
            ).stream()
        else:
            assignments_ref = firebase_service.db.collection('lab_assignments').stream()
        
        # Convert to dictionary
        assignments = {}
        for doc in assignments_ref:
            data = doc.to_dict()
            assignments[doc.id] = data
        
        logger.info(f"Found {len(assignments)} lab assignments")
        
        return jsonify({
            'success': True,
            'data': assignments
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching lab assignments: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to fetch lab assignments'
        }), 400

@lab_bp.route('/assignment/<assignment_id>', methods=['GET'])
def get_assignment_details(assignment_id):
    """Get assignment details - Uses Firestore"""
    try:
        doc_ref = firebase_service.db.collection('lab_assignments').document(assignment_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return jsonify({'error': 'Assignment not found'}), 404
        
        return jsonify({
            'success': True,
            'data': doc.to_dict()
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching assignment details: {str(e)}")
        return jsonify({'error': str(e)}), 400

@lab_bp.route('/upload-test-result/<assignment_id>', methods=['POST'])
def upload_test_result(assignment_id):
    """Upload test result PDF - Uses Firestore"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        test_notes = request.form.get('testNotes')
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        filename = secure_filename(f"test_result_{assignment_id}_{datetime.now().timestamp()}.pdf")
        
        # Save locally (in production, use cloud storage)
        upload_folder = 'uploads/test_results'
        os.makedirs(upload_folder, exist_ok=True)
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)
        
        # Update assignment in Firestore
        doc_ref = firebase_service.db.collection('lab_assignments').document(assignment_id)
        doc_ref.update({
            'testResultFile': filename,
            'testNotes': test_notes,
            'testResultUploadedAt': datetime.now().isoformat(),
            'status': 'test_result_uploaded'
        })
        
        return jsonify({
            'success': True,
            'message': 'Test result uploaded',
            'filename': filename
        }), 201
    
    except Exception as e:
        logger.error(f"Error uploading test result: {str(e)}")
        return jsonify({'error': str(e)}), 400

@lab_bp.route('/upload-solution/<assignment_id>', methods=['POST'])
def upload_solution(assignment_id):
    """Upload solution PDF - Uses Firestore"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        solution_description = request.form.get('solutionDescription')
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        filename = secure_filename(f"solution_{assignment_id}_{datetime.now().timestamp()}.pdf")
        
        # Save locally (in production, use cloud storage)
        upload_folder = 'uploads/solutions'
        os.makedirs(upload_folder, exist_ok=True)
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)
        
        # Update assignment in Firestore
        doc_ref = firebase_service.db.collection('lab_assignments').document(assignment_id)
        doc_ref.update({
            'solutionFile': filename,
            'solutionDescription': solution_description,
            'solutionUploadedAt': datetime.now().isoformat(),
            'status': 'solution_uploaded'
        })
        
        return jsonify({
            'success': True,
            'message': 'Solution uploaded',
            'filename': filename
        }), 201
    
    except Exception as e:
        logger.error(f"Error uploading solution: {str(e)}")
        return jsonify({'error': str(e)}), 400

@lab_bp.route('/confirm-clean/<assignment_id>', methods=['POST'])
def confirm_clean(assignment_id):
    """Confirm area is clean after re-testing - Uses Firestore"""
    try:
        data = request.get_json()
        final_notes = data.get('finalNotes')
        
        # Update assignment in Firestore
        doc_ref = firebase_service.db.collection('lab_assignments').document(assignment_id)
        doc_ref.update({
            'status': 'cleaned',
            'finalNotes': final_notes,
            'labConfirmedCleanAt': datetime.now().isoformat()
        })
        
        # Mark all associated reports as clean
        assignment = doc_ref.get().to_dict()
        if assignment and 'reportIds' in assignment:
            for report_id in assignment['reportIds']:
                firebase_service.update_report_status(report_id, 'cleaned')
        
        return jsonify({
            'success': True,
            'message': 'Area confirmed clean'
        }), 200
    
    except Exception as e:
        logger.error(f"Error confirming clean: {str(e)}")
        return jsonify({'error': str(e)}), 400

@lab_bp.route('/previous-solutions', methods=['GET'])
def get_previous_solutions():
    """Get previous solutions for lab's district or all"""
    try:
        district = request.args.get('district')
        all_assam = request.args.get('allAssam', False, type=bool)
        
        if all_assam:
            solutions = firebase_service.get_lab_solutions()
        else:
            solutions = firebase_service.get_lab_solutions(district)
        
        return jsonify({
            'success': True,
            'data': solutions
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400
