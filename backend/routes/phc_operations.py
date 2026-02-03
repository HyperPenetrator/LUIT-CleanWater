from flask import Blueprint, request, jsonify
from services.firebase_service import firebase_service
from services.pincode_service import (
    get_coordinates_from_pincode,
    get_pincode_info,
    search_by_locality,
    search_by_district,
    add_pincode,
    batch_get_coordinates
)
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
        
        print(f"\n📍 SEND-TO-LAB REQUEST:")
        print(f"  PIN: {pin_code}")
        print(f"  Coordinates received: Lat={latitude}, Lon={longitude}")
        print(f"  Coordinate types: Lat type={type(latitude)}, Lon type={type(longitude)}")
        
        if not all([pin_code, locality_name, district, description]) or report_count < 5:
            return jsonify({'error': 'Missing required fields or insufficient reports (min 5)'}), 400
        
        # Validate and convert coordinates to float
        try:
            if latitude is not None and longitude is not None:
                latitude = float(latitude)
                longitude = float(longitude)
                print(f"  ✅ Coordinates converted to float: Lat={latitude}, Lon={longitude}")
            else:
                print(f"  ⚠️ WARNING: Missing coordinates - alerts won't show on map")
        except (TypeError, ValueError) as e:
            print(f"  ❌ Error converting coordinates: {e}")
            latitude = None
            longitude = None
        
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
        
        print(f"  Storing assignment with: latitude={lab_assignment.get('latitude')}, longitude={lab_assignment.get('longitude')}")
        
        assignment_id = firebase_service.add_lab_assignment(lab_assignment)
        
        print(f"  ✅ Lab assignment created with ID: {assignment_id}\n")
        
        return jsonify({
            'success': True,
            'message': f'Sent {report_count} reports from PIN {pin_code} to lab',
            'assignmentId': assignment_id
        }), 201
    
    except Exception as e:
        print(f"❌ Error in send_to_lab: {str(e)}")
        import traceback
        traceback.print_exc()
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
            
            # Extract latitude and longitude - REQUIRED for frontend distance calculation
            latitude = data.get('latitude')
            longitude = data.get('longitude')
            
            # Debug logging
            pin_code = data.get('pinCode')
            print(f"DEBUG: Area PIN {pin_code} - Lat: {latitude}, Lon: {longitude}")
            
            # Only include if we have coordinates
            if latitude is not None and longitude is not None:
                contaminated[doc.id] = {
                    'pinCode': pin_code,
                    'localityName': data.get('localityName'),
                    'district': data.get('district'),
                    'reportCount': data.get('reportCount'),
                    'severity': data.get('severity'),
                    'status': data.get('status'),
                    'latitude': float(latitude),  # Ensure proper numeric type
                    'longitude': float(longitude)  # Ensure proper numeric type
                }
            else:
                print(f"WARNING: Missing coordinates for PIN {pin_code} - skipping from alerts")
        
        print(f"Total contaminated areas with valid coordinates: {len(contaminated)}")
        
        return jsonify({
            'success': True,
            'data': contaminated
        }), 200
    
    except Exception as e:
        import logging
        logging.error(f"Error fetching contaminated areas: {str(e)}")
        print(f"Full error: {str(e)}")
        return jsonify({
            'success': True,
            'data': {}
        }), 200
@phc_bp.route('/debug/contaminated-areas', methods=['GET'])
def debug_contaminated_areas():
    """DEBUG: Get raw data from lab_assignments collection"""
    try:
        assignments = firebase_service.db.collection('lab_assignments').stream()
        
        debug_data = {}
        for doc in assignments:
            data = doc.to_dict()
            debug_data[doc.id] = {
                'pinCode': data.get('pinCode'),
                'localityName': data.get('localityName'),
                'district': data.get('district'),
                'status': data.get('status'),
                'latitude': data.get('latitude'),
                'longitude': data.get('longitude'),
                'latitude_type': str(type(data.get('latitude'))),
                'longitude_type': str(type(data.get('longitude'))),
                'all_fields': list(data.keys())
            }
        
        return jsonify({
            'success': True,
            'total_assignments': len(debug_data),
            'data': debug_data
        }), 200

# ==================== PIN CODE CONVERSION ENDPOINTS ====================

@phc_bp.route('/pincode/coordinates/<pincode>', methods=['GET'])
def get_pincode_coordinates(pincode):
    """Get latitude and longitude for a PIN code"""
    try:
        print(f"🔍 Converting PIN code: {pincode}")
        result = get_coordinates_from_pincode(pincode)
        
        if result['success']:
            print(f"✅ PIN code {pincode} converted successfully")
            return jsonify({
                'success': True,
                'data': {
                    'pincode': pincode,
                    'latitude': result['latitude'],
                    'longitude': result['longitude'],
                    'locality': result['locality'],
                    'district': result['district']
                }
            }), 200
        else:
            print(f"❌ PIN code {pincode} not found: {result['error']}")
            return jsonify({
                'success': False,
                'error': result['error']
            }), 404
    
    except Exception as e:
        print(f"❌ Error in pincode conversion: {str(e)}")
        return jsonify({'error': str(e)}), 500


@phc_bp.route('/pincode/batch-coordinates', methods=['POST'])
def get_batch_pincode_coordinates():
    """Get coordinates for multiple PIN codes"""
    try:
        data = request.json
        pincodes = data.get('pincodes', [])
        
        if not pincodes:
            return jsonify({'error': 'No PIN codes provided'}), 400
        
        print(f"🔍 Converting {len(pincodes)} PIN codes")
        results = batch_get_coordinates(pincodes)
        
        return jsonify({
            'success': True,
            'total_requested': len(pincodes),
            'data': results
        }), 200
    
    except Exception as e:
        print(f"❌ Error in batch pincode conversion: {str(e)}")
        return jsonify({'error': str(e)}), 500


@phc_bp.route('/pincode/search/locality/<locality>', methods=['GET'])
def search_pincodes_by_locality(locality):
    """Search PIN codes by locality name"""
    try:
        print(f"🔍 Searching PIN codes for locality: {locality}")
        pincodes = search_by_locality(locality)
        
        if pincodes:
            results = batch_get_coordinates(pincodes)
            return jsonify({
                'success': True,
                'locality': locality,
                'total_found': len(pincodes),
                'data': results
            }), 200
        else:
            return jsonify({
                'success': False,
                'locality': locality,
                'error': f'No PIN codes found for locality: {locality}'
            }), 404
    
    except Exception as e:
        print(f"❌ Error searching locality: {str(e)}")
        return jsonify({'error': str(e)}), 500


@phc_bp.route('/pincode/search/district/<district>', methods=['GET'])
def search_pincodes_by_district(district):
    """Search PIN codes by district name"""
    try:
        print(f"🔍 Searching PIN codes for district: {district}")
        pincodes = search_by_district(district)
        
        if pincodes:
            results = batch_get_coordinates(pincodes)
            return jsonify({
                'success': True,
                'district': district,
                'total_found': len(pincodes),
                'data': results
            }), 200
        else:
            return jsonify({
                'success': False,
                'district': district,
                'error': f'No PIN codes found for district: {district}'
            }), 404
    
    except Exception as e:
        print(f"❌ Error searching district: {str(e)}")
        return jsonify({'error': str(e)}), 500


@phc_bp.route('/pincode/add', methods=['POST'])
def add_new_pincode():
    """Add a new PIN code to the database"""
    try:
        data = request.json
        pincode = data.get('pincode')
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        locality = data.get('locality')
        district = data.get('district')
        
        if not all([pincode, latitude, longitude, locality, district]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        print(f"➕ Adding new PIN code: {pincode}")
        result = add_pincode(pincode, latitude, longitude, locality, district)
        
        if result['success']:
            print(f"✅ PIN code {pincode} added successfully")
            return jsonify({
                'success': True,
                'message': result['message']
            }), 201
        else:
            print(f"❌ Failed to add PIN code {pincode}: {result['error']}")
            return jsonify({
                'success': False,
                'error': result['error']
            }), 400
    
    except Exception as e:
        print(f"❌ Error adding PIN code: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
    except Exception as e:
        import logging
        logging.error(f"Debug error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400