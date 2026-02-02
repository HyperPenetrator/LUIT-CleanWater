from flask import Blueprint, request, jsonify
from services.firebase_service import firebase_service
from datetime import datetime
from werkzeug.utils import secure_filename

phc_bp = Blueprint('phc', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@phc_bp.route('/active-reports/<district>', methods=['GET'])
def get_active_reports_by_district(district):
    """Get active reports for PHC's district"""
    try:
        reports = firebase_service.get_water_quality_reports(district)
        # Show reports with status 'reported' or 'contaminated' that are still active
        active_reports = {k: v for k, v in reports.items() if v.get('status') in ['reported', 'contaminated'] and v.get('active') is True}
        
        return jsonify({
            'success': True,
            'data': active_reports
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@phc_bp.route('/send-to-lab', methods=['POST'])
def send_to_lab():
    """Send a report to water lab and mark area as contaminated"""
    try:
        data = request.get_json()
        
        report_id = data.get('reportId')
        description = data.get('description')
        phc_notes = data.get('phcNotes')
        area_name = data.get('areaName')
        district = data.get('district')
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        severity = data.get('severity')
        
        if not all([report_id, description, area_name, district]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Update report status to contaminated
        firebase_service.update_report_status(report_id, 'contaminated')
        
        # Create lab assignment
        lab_assignment = {
            'reportId': report_id,
            'areaName': area_name,
            'district': district,
            'description': description,
            'phcNotes': phc_notes,
            'latitude': latitude,
            'longitude': longitude,
            'severity': severity,
            'status': 'pending',
            'createdAt': datetime.now().isoformat(),
            'phcSubmittedAt': datetime.now().isoformat()
        }
        
        ref = firebase_service.db.reference('lab_assignments')
        new_assignment = ref.push()
        new_assignment.set(lab_assignment)
        
        return jsonify({
            'success': True,
            'message': 'Report sent to lab',
            'assignmentId': new_assignment.key
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@phc_bp.route('/mark-clean/<report_id>', methods=['POST'])
def mark_area_clean(report_id):
    """Mark an area as clean after lab verification"""
    try:
        data = request.get_json()
        verified = data.get('verified', False)
        
        firebase_service.update_report_status(report_id, 'clean')
        
        # Update lab assignment status
        ref = firebase_service.db.reference('lab_assignments')
        assignments = ref.get()
        
        if assignments:
            for key, assignment in assignments.items():
                if assignment.get('reportId') == report_id:
                    firebase_service.db.reference(f'lab_assignments/{key}').update({
                        'status': 'resolved',
                        'phcVerifiedClean': True,
                        'verifiedAt': datetime.now().isoformat()
                    })
        
        return jsonify({
            'success': True,
            'message': 'Area marked as clean'
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@phc_bp.route('/previous-solutions', methods=['GET'])
def get_previous_solutions():
    """Get previous solutions for PHC's district or all"""
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

@phc_bp.route('/hotspot-map', methods=['GET'])
def get_hotspot_map():
    """Get hotspot map data"""
    try:
        district = request.args.get('district')
        
        reports = firebase_service.get_water_quality_reports(district)
        active = firebase_service.get_active_reports()
        
        hotspots = []
        if reports:
            for report_id, report in reports.items():
                if 'latitude' in report and 'longitude' in report:
                    hotspots.append({
                        'id': report_id,
                        'latitude': float(report['latitude']),
                        'longitude': float(report['longitude']),
                        'status': report.get('status', 'unknown'),
                        'areaName': report.get('areaName'),
                        'severity': report.get('severity'),
                        'isActive': report_id in active
                    })
        
        return jsonify({
            'success': True,
            'data': hotspots
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400
