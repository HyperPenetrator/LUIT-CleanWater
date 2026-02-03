from flask import Blueprint, request, jsonify
from services.firebase_service import firebase_service
from firebase_admin import firestore
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
        print(f"Fetching reports for district: {district}")
        reports = firebase_service.get_water_quality_reports(district)
        print(f"Total reports found: {len(reports) if reports else 0}")
        if reports:
            print(f"Reports: {reports}")
        
        # Show reports with status 'reported' or 'contaminated' that are still active
        active_reports = {k: v for k, v in reports.items() if v.get('status') in ['reported', 'contaminated'] and v.get('active') is True}
        print(f"Active reports after filtering: {len(active_reports)}")
        print(f"Active reports data: {active_reports}")
        
        return jsonify({
            'success': True,
            'data': active_reports
        }), 200
    
    except Exception as e:
        print(f"Error in get_active_reports_by_district: {str(e)}")
        return jsonify({'error': str(e)}), 400

@phc_bp.route('/send-to-lab', methods=['POST'])
def send_to_lab():
    """Send grouped reports to water lab"""
    try:
        data = request.get_json()
        
        pin_code = data.get('pinCode')
        locality_name = data.get('localityName')
        district = data.get('district')
        report_count = data.get('reportCount')
        severity = data.get('severity')
        report_ids = data.get('reportIds', [])
        problems = data.get('problems', [])
        sources = data.get('sources', [])
        description = data.get('description')
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if not all([pin_code, locality_name, district, description]) or report_count < 5:
            return jsonify({'error': 'Missing required fields or insufficient reports (min 5)'}), 400
        
        # Get coordinates from reports (average of all report locations if available)
        latitude = data.get('latitude') or None
        longitude = data.get('longitude') or None
        
        # Update all reports to 'contaminated' status
        for report_id in report_ids:
            firebase_service.update_report_status(report_id, 'contaminated')
        
        # Create lab assignment for the PIN code area
        lab_assignment = {
            'pinCode': pin_code,
            'localityName': locality_name,
            'district': district,
            'reportCount': report_count,
            'severity': severity,
            'reportIds': report_ids,
            'problems': problems,
            'sources': sources,
            'description': description,
            'status': 'pending_lab_visit',
            'latitude': latitude,
            'longitude': longitude,
            'createdAt': datetime.now().isoformat(),
            'phcSubmittedAt': datetime.now().isoformat()
        }
        
        assignment_id = firebase_service.add_lab_assignment(lab_assignment)
        
        return jsonify({
            'success': True,
            'message': f'Sent {report_count} reports from PIN {pin_code} to lab',
            'assignmentId': assignment_id
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400
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
@phc_bp.route('/contaminated-areas', methods=['GET'])
def get_contaminated_areas():
    """Get all contaminated areas (sent to lab but not yet cleaned)"""
    try:
        # Get all lab assignments that are still pending or in progress
        assignments = firebase_service.db.collection('lab_assignments').where(
            filter=firestore.FieldFilter('status', 'in', ['pending_lab_visit', 'solution_uploaded', 'phc_cleaning'])
        ).stream()
        
        contaminated = {}
        for doc in assignments:
            data = doc.to_dict()
            contaminated[doc.id] = {
                'pinCode': data.get('pinCode'),
                'localityName': data.get('localityName'),
                'district': data.get('district'),
                'reportCount': data.get('reportCount'),
                'severity': data.get('severity'),
                'status': data.get('status')
            }
        
        return jsonify({
            'success': True,
            'data': contaminated
        }), 200
    
    except Exception as e:
        import logging
        logging.error(f"Error fetching contaminated areas: {str(e)}")
        return jsonify({
            'success': True,
            'data': {}
        }), 200