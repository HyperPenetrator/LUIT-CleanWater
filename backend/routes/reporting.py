from flask import Blueprint, request, jsonify
from services.firebase_service import firebase_service
from services.sms_service import (
    format_report_to_sms,
    parse_sms_report,
    validate_sms_data,
    get_sms_instructions
)
from datetime import datetime
import math
import logging
import traceback

logger = logging.getLogger(__name__)

reporting_bp = Blueprint('reporting', __name__)

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in km"""
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

@reporting_bp.route('/submit-report', methods=['POST'])
def submit_report():
    """Submit a water contamination report"""
    try:
        data = request.get_json()
        
        problem = data.get('problem')
        source_type = data.get('sourceType')
        pin_code = data.get('pinCode')
        locality_name = data.get('localityName')
        district = data.get('district')
        
        if not all([problem, source_type, pin_code, locality_name, district]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        report_data = {
            'problem': problem,
            'sourceType': source_type,
            'pinCode': pin_code,
            'localityName': locality_name,
            'district': district,
            'status': 'reported',
            'active': True,
            'reportedAt': datetime.now().isoformat(),
            'upvotes': 0,
            'verified': False
        }
        
        report_id = firebase_service.add_water_quality_report(report_data)
        
        return jsonify({
            'success': True,
            'message': 'Report submitted successfully',
            'reportId': report_id,
            'problem': problem,
            'pinCode': pin_code,
            'sourceType': source_type
        }), 201
    
    except Exception as e:
        logger.error(f"Error submitting report: {str(e)}", exc_info=True)
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 400

@reporting_bp.route('/nearby-reports', methods=['GET'])
def get_nearby_reports():
    """Get nearby reported issues"""
    try:
        latitude = request.args.get('latitude', type=float)
        longitude = request.args.get('longitude', type=float)
        radius = request.args.get('radius', default=5.0, type=float)  # in km
        
        if latitude is None or longitude is None:
            return jsonify({'error': 'Latitude and longitude required'}), 400
        
        reports = firebase_service.get_water_quality_reports()
        nearby = []
        
        if reports:
            for report_id, report in reports.items():
                try:
                    distance = haversine_distance(
                        latitude, longitude,
                        float(report['latitude']), float(report['longitude'])
                    )
                    
                    if distance <= radius:
                        report['id'] = report_id
                        report['distance'] = round(distance, 2)
                        nearby.append(report)
                except:
                    pass
        
        nearby.sort(key=lambda x: x['distance'])
        
        return jsonify({
            'success': True,
            'data': nearby
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@reporting_bp.route('/upvote/<report_id>', methods=['POST'])
def upvote_report(report_id):
    """Upvote a report to indicate it's still active"""
    try:
        ref = firebase_service.db.reference(f'water_quality_reports/{report_id}')
        report = ref.get()
        
        if not report:
            return jsonify({'error': 'Report not found'}), 404
        
        current_upvotes = report.get('upvotes', 0)
        ref.update({'upvotes': current_upvotes + 1})
        
        return jsonify({
            'success': True,
            'message': 'Report upvoted',
            'newUpvotes': current_upvotes + 1
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@reporting_bp.route('/reported-issues', methods=['GET'])
def get_reported_issues():
    """Get all reported issues"""
    try:
        district = request.args.get('district')
        
        reports = firebase_service.get_water_quality_reports(district)
        issues = [{'id': k, **v} for k, v in (reports or {}).items()]
        
        return jsonify({
            'success': True,
            'issues': issues
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching reported issues: {str(e)}", exc_info=True)
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 400

@reporting_bp.route('/format-sms', methods=['GET'])
def format_sms():
    """Get formatted SMS text for reporting"""
    try:
        problem = request.args.get('problem')
        source_type = request.args.get('sourceType')
        pin_code = request.args.get('pinCode')
        locality_name = request.args.get('localityName')
        district = request.args.get('district')
        
        if not all([problem, source_type, pin_code, locality_name, district]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        sms_text = f"Water Issue Report - Problem: {problem}, Source: {source_type}, Locality: {locality_name}, PIN: {pin_code}, District: {district}"
        
        return jsonify({
            'success': True,
            'smsText': sms_text
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ==================== SMS REPORTING ENDPOINTS ====================

@reporting_bp.route('/sms/format', methods=['POST'])
def get_sms_format():
    """Format a report into SMS-copyable format"""
    try:
        data = request.get_json()
        
        print(f"📱 Formatting report to SMS: {data.get('pinCode')}")
        
        result = format_report_to_sms(data)
        
        if result['success']:
            print(f"✅ Report formatted successfully for PIN {result.get('pincode')}")
            return jsonify(result), 200
        else:
            print(f"❌ Failed to format report: {result.get('error')}")
            return jsonify(result), 400
    
    except Exception as e:
        print(f"❌ Error formatting SMS: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@reporting_bp.route('/sms/parse', methods=['POST'])
def parse_incoming_sms():
    """Parse incoming SMS and submit as report"""
    try:
        data = request.get_json()
        sms_text = data.get('sms_text') or data.get('message', '')
        
        if not sms_text:
            return jsonify({
                'success': False,
                'error': 'No SMS text provided',
                'instructions': get_sms_instructions()
            }), 400
        
        print(f"📱 Parsing incoming SMS: {sms_text[:50]}...")
        
        # Parse SMS
        parse_result = parse_sms_report(sms_text)
        
        if not parse_result['success']:
            print(f"❌ Failed to parse SMS: {parse_result.get('error')}")
            return jsonify({
                'success': False,
                'error': parse_result.get('error'),
                'format_detected': parse_result.get('format_detected'),
                'instructions': get_sms_instructions()
            }), 400
        
        # Validate parsed data
        validation = validate_sms_data(parse_result['data'])
        
        if not validation['valid']:
            print(f"❌ Validation failed: {validation.get('errors')}")
            return jsonify({
                'success': False,
                'errors': validation.get('errors'),
                'instructions': get_sms_instructions()
            }), 400
        
        report_data = validation['data']
        
        # Save to database
        try:
            doc_ref = firebase_service.db.collection('water_quality_reports').document()
            doc_ref.set({
                'problem': report_data.get('problem'),
                'sourceType': report_data.get('sourceType'),
                'pinCode': report_data.get('pinCode'),
                'localityName': report_data.get('localityName', 'Unknown'),
                'district': report_data.get('district', 'Unknown'),
                'status': 'reported',
                'reportedAt': datetime.now().isoformat(),
                'reportedBy': report_data.get('reportedBy', 'SMS'),
                'description': report_data.get('description', ''),
                'active': True,
                'upvotes': 0,
                'verified': False
            })
            
            print(f"✅ SMS report saved successfully: {doc_ref.id}")
            
            return jsonify({
                'success': True,
                'message': f'Report received and saved successfully!',
                'reportId': doc_ref.id,
                'data': {
                    'pinCode': report_data.get('pinCode'),
                    'problem': report_data.get('problem'),
                    'sourceType': report_data.get('sourceType'),
                    'localityName': report_data.get('localityName'),
                    'reportedAt': report_data.get('reportedAt')
                }
            }), 201
        
        except Exception as db_error:
            print(f"❌ Database error: {str(db_error)}")
            return jsonify({
                'success': False,
                'error': f'Failed to save report: {str(db_error)}',
                'data': report_data
            }), 500
    
    except Exception as e:
        print(f"❌ Error parsing SMS: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'instructions': get_sms_instructions()
        }), 500


@reporting_bp.route('/sms/instructions', methods=['GET'])
def get_sms_help():
    """Get SMS format instructions"""
    try:
        print("📱 Returning SMS instructions")
        return jsonify({
            'success': True,
            'instructions': get_sms_instructions(),
            'formats': {
                'compact': 'WQ|PINCODE|ISSUE|SOURCE|DESCRIPTION',
                'structured': 'PIN CODE: XXX, ISSUE: YYY, SOURCE: ZZZ',
                'example_compact': 'WQ|781014|Health symptoms|Tube well|Bad taste',
                'example_structured': 'PIN CODE: 781014\nISSUE: Health symptoms\nSOURCE: Tube well'
            }
        }), 200
    
    except Exception as e:
        print(f"❌ Error getting SMS instructions: {str(e)}")
        return jsonify({'error': str(e)}), 500
