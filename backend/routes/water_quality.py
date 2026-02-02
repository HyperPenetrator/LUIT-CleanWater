from flask import Blueprint, request, jsonify
from services.firebase_service import firebase_service
from datetime import datetime
import logging
import traceback

logger = logging.getLogger(__name__)

water_quality_bp = Blueprint('water_quality', __name__)

@water_quality_bp.route('/reports', methods=['GET'])
def get_reports():
    """Get water quality reports"""
    try:
        district = request.args.get('district')
        
        reports = firebase_service.get_water_quality_reports(district)
        
        return jsonify({
            'success': True,
            'data': reports
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@water_quality_bp.route('/active-reports', methods=['GET'])
def get_active_reports():
    """Get active contamination reports"""
    try:
        active_reports = firebase_service.get_active_reports()
        
        return jsonify({
            'success': True,
            'data': active_reports
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching active reports: {str(e)}", exc_info=True)
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 400

@water_quality_bp.route('/area-status', methods=['GET'])
def get_area_status():
    """Get water quality status for a specific area"""
    try:
        latitude = request.args.get('latitude', type=float)
        longitude = request.args.get('longitude', type=float)
        radius = request.args.get('radius', default=1.0, type=float)  # in km
        
        if latitude is None or longitude is None:
            return jsonify({'error': 'Latitude and longitude required'}), 400
        
        reports = firebase_service.get_active_reports()
        
        # Simple distance check (can be improved with actual geofencing)
        contaminated_areas = []
        for report_id, report in reports.items():
            if 'latitude' in report and 'longitude' in report:
                # Check if within radius (simplified)
                if abs(float(report['latitude']) - latitude) < radius and \
                   abs(float(report['longitude']) - longitude) < radius:
                    contaminated_areas.append(report)
        
        status = 'contaminated' if contaminated_areas else 'clean'
        
        return jsonify({
            'success': True,
            'status': status,
            'contaminated_areas': contaminated_areas,
            'count': len(contaminated_areas)
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching area status: {str(e)}", exc_info=True)
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 400

@water_quality_bp.route('/statistics', methods=['GET'])
def get_statistics():
    """Get water quality statistics"""
    try:
        district = request.args.get('district')
        
        reports = firebase_service.get_water_quality_reports(district)
        active = firebase_service.get_active_reports()
        
        total_reports = len(reports) if reports else 0
        total_active = len(active) if active else 0
        
        return jsonify({
            'success': True,
            'totalReports': total_reports,
            'activeReports': total_active,
            'cleanAreas': total_reports - total_active
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching statistics: {str(e)}", exc_info=True)
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 400

@water_quality_bp.route('/reported-issues', methods=['GET'])
def get_reported_issues_alias():
    """Get reported issues (alias to reporting endpoint)"""
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
