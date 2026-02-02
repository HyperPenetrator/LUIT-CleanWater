from flask import Blueprint, request, jsonify
from services.firebase_service import firebase_service
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
        latitude = data.get('latitude', type=float)
        longitude = data.get('longitude', type=float)
        severity = data.get('severity')  # low, medium, high
        source_type = data.get('sourceType')  # domestic, industrial, agricultural, etc.
        area_name = data.get('areaName')
        pin_code = data.get('pinCode')
        district = data.get('district')
        
        if not all([problem, latitude, longitude, severity, source_type]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        report_data = {
            'problem': problem,
            'latitude': latitude,
            'longitude': longitude,
            'severity': severity,
            'sourceType': source_type,
            'areaName': area_name,
            'pinCode': pin_code,
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
            'severity': severity,
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
            'data': issues
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching reported issues: {str(e)}", exc_info=True)
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 400

@reporting_bp.route('/format-sms', methods=['GET'])
def format_sms():
    """Get formatted SMS text for reporting"""
    try:
        problem = request.args.get('problem')
        pin_code = request.args.get('pinCode')
        severity = request.args.get('severity')
        source_type = request.args.get('sourceType')
        
        if not all([problem, pin_code, severity, source_type]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        sms_text = f"{problem} {pin_code} {severity} {source_type}"
        
        return jsonify({
            'success': True,
            'smsText': sms_text
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400
