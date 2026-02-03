"""
SMS Formatting and Parsing Service
Handles conversion of water quality reports to SMS format and parsing incoming SMS
"""

import logging
import re
from datetime import datetime

logger = logging.getLogger(__name__)


def format_report_to_sms(report_data: dict) -> dict:
    """
    Format a report into SMS-friendly text that can be copied and sent
    
    Args:
        report_data (dict): Report data with fields like pinCode, problem, sourceType, etc.
    
    Returns:
        dict: {
            'success': bool,
            'sms_format': str,  # User-friendly format for copying
            'sms_compact': str,  # Compact format for parsing
            'instructions': str
        }
    
    Example output:
        sms_format: "📍 WATER REPORT\nPIN: 781014\nISSUE: Health symptoms\nSOURCE: Tube well\n"
        sms_compact: "WQ|781014|Health symptoms|Tube well|Muddy water"
    """
    try:
        pincode = report_data.get('pinCode', 'UNKNOWN')
        problem = report_data.get('problem', 'Unknown issue')
        source = report_data.get('sourceType', 'Unknown source')
        locality = report_data.get('localityName', '')
        description = report_data.get('description', '')
        
        # User-friendly format (easy to read and copy)
        sms_format = f"""📍 WATER QUALITY REPORT
━━━━━━━━━━━━━━━━━━━━
PIN CODE: {pincode}
LOCATION: {locality or 'Not specified'}
ISSUE TYPE: {problem}
SOURCE TYPE: {source}
DESCRIPTION: {description if description else 'Reported water quality issue'}
━━━━━━━━━━━━━━━━━━━━
Timestamp: {datetime.now().isoformat()}"""
        
        # Compact format for easy parsing (shorter for SMS)
        sms_compact = f"WQ|{pincode}|{problem}|{source}|{description}"
        
        logger.info(f"✅ Formatted report for PIN {pincode} to SMS")
        
        return {
            'success': True,
            'sms_format': sms_format,
            'sms_compact': sms_compact,
            'instructions': 'Copy this text and send it via SMS to report offline. Our system will process it automatically.',
            'pincode': pincode
        }
    
    except Exception as e:
        logger.error(f"❌ Error formatting report to SMS: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'sms_format': None,
            'sms_compact': None
        }


def parse_sms_report(sms_text: str) -> dict:
    """
    Parse incoming SMS and extract report data
    
    Supports both formats:
    1. Compact: "WQ|781014|Health symptoms|Tube well|Muddy water"
    2. Structured: Lines with KEY: VALUE format
    
    Args:
        sms_text (str): SMS message text
    
    Returns:
        dict: {
            'success': bool,
            'data': {...parsed fields...},
            'error': str or None,
            'format_detected': str  # 'compact' or 'structured'
        }
    """
    try:
        if not sms_text or not isinstance(sms_text, str):
            return {
                'success': False,
                'error': 'Invalid SMS text',
                'data': None,
                'format_detected': None
            }
        
        sms_text = sms_text.strip()
        
        # Try to detect and parse compact format first
        if sms_text.startswith('WQ|'):
            return _parse_compact_format(sms_text)
        
        # Try to parse structured format
        elif 'PIN' in sms_text.upper() or 'CODE' in sms_text.upper():
            return _parse_structured_format(sms_text)
        
        else:
            return {
                'success': False,
                'error': 'Unrecognized SMS format. Expected format starting with "WQ|" or containing "PIN CODE"',
                'data': None,
                'format_detected': 'unknown'
            }
    
    except Exception as e:
        logger.error(f"❌ Error parsing SMS: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'data': None,
            'format_detected': None
        }


def _parse_compact_format(sms_text: str) -> dict:
    """Parse compact SMS format: WQ|781014|Health symptoms|Tube well|Description"""
    try:
        parts = sms_text.split('|')
        
        if len(parts) < 4:
            return {
                'success': False,
                'error': 'Invalid compact format. Expected: WQ|PINCODE|ISSUE|SOURCE|DESCRIPTION',
                'data': None,
                'format_detected': 'compact'
            }
        
        pincode = parts[1].strip()
        problem = parts[2].strip()
        source = parts[3].strip()
        description = parts[4].strip() if len(parts) > 4 else ''
        
        logger.info(f"✅ Parsed compact SMS format for PIN {pincode}")
        
        return {
            'success': True,
            'data': {
                'pinCode': pincode,
                'problem': problem,
                'sourceType': source,
                'description': description,
                'reportedAt': datetime.now().isoformat(),
                'reportedBy': 'SMS',
                'localityName': 'Unknown',
                'district': 'Unknown'
            },
            'error': None,
            'format_detected': 'compact'
        }
    
    except Exception as e:
        logger.error(f"❌ Error parsing compact format: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'data': None,
            'format_detected': 'compact'
        }


def _parse_structured_format(sms_text: str) -> dict:
    """Parse structured SMS format with KEY: VALUE lines"""
    try:
        data = {
            'pinCode': None,
            'problem': None,
            'sourceType': None,
            'description': '',
            'localityName': 'Unknown',
            'district': 'Unknown',
            'reportedAt': datetime.now().isoformat(),
            'reportedBy': 'SMS'
        }
        
        # Extract PIN code (multiple possible formats)
        pin_match = re.search(r'PIN\s*(?:CODE)?:\s*(\d+)', sms_text, re.IGNORECASE)
        if pin_match:
            data['pinCode'] = pin_match.group(1).strip()
        
        # Extract issue/problem
        issue_match = re.search(r'ISSUE\s*(?:TYPE)?:\s*([^\n]+)', sms_text, re.IGNORECASE)
        problem_match = re.search(r'PROBLEM:\s*([^\n]+)', sms_text, re.IGNORECASE)
        if issue_match:
            data['problem'] = issue_match.group(1).strip()
        elif problem_match:
            data['problem'] = problem_match.group(1).strip()
        
        # Extract source type
        source_match = re.search(r'SOURCE\s*(?:TYPE)?:\s*([^\n]+)', sms_text, re.IGNORECASE)
        if source_match:
            data['sourceType'] = source_match.group(1).strip()
        
        # Extract location/locality
        location_match = re.search(r'LOCATION:\s*([^\n]+)', sms_text, re.IGNORECASE)
        if location_match:
            data['localityName'] = location_match.group(1).strip()
        
        # Extract description
        desc_match = re.search(r'DESCRIPTION:\s*([^\n]+)', sms_text, re.IGNORECASE)
        if desc_match:
            data['description'] = desc_match.group(1).strip()
        
        # Validate required fields
        if not data['pinCode']:
            return {
                'success': False,
                'error': 'PIN code not found in SMS. Please include "PIN CODE: XXXXX"',
                'data': None,
                'format_detected': 'structured'
            }
        
        if not data['problem']:
            return {
                'success': False,
                'error': 'Issue/Problem not found in SMS. Please include "ISSUE: problem description"',
                'data': None,
                'format_detected': 'structured'
            }
        
        if not data['sourceType']:
            return {
                'success': False,
                'error': 'Source type not found in SMS. Please include "SOURCE: source description"',
                'data': None,
                'format_detected': 'structured'
            }
        
        logger.info(f"✅ Parsed structured SMS format for PIN {data['pinCode']}")
        
        return {
            'success': True,
            'data': data,
            'error': None,
            'format_detected': 'structured'
        }
    
    except Exception as e:
        logger.error(f"❌ Error parsing structured format: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'data': None,
            'format_detected': 'structured'
        }


def validate_sms_data(data: dict) -> dict:
    """
    Validate parsed SMS data before saving to database
    
    Args:
        data (dict): Parsed SMS data
    
    Returns:
        dict: {
            'valid': bool,
            'errors': list of error messages,
            'data': cleaned data
        }
    """
    try:
        errors = []
        
        # Validate PIN code
        if not data.get('pinCode') or not str(data['pinCode']).isdigit():
            errors.append('Invalid PIN code format. Must be numeric.')
        
        # Validate problem
        if not data.get('problem'):
            errors.append('Problem/Issue type is required.')
        
        # Validate source type
        if not data.get('sourceType'):
            errors.append('Source type is required.')
        
        if errors:
            return {
                'valid': False,
                'errors': errors,
                'data': data
            }
        
        logger.info(f"✅ SMS data validated for PIN {data['pinCode']}")
        
        return {
            'valid': True,
            'errors': [],
            'data': data
        }
    
    except Exception as e:
        logger.error(f"❌ Error validating SMS data: {str(e)}")
        return {
            'valid': False,
            'errors': [str(e)],
            'data': data
        }


def get_sms_instructions() -> str:
    """Get instructions for users on how to format SMS reports"""
    return """
📱 OFFLINE WATER QUALITY REPORTING VIA SMS

Format 1 - COMPACT (Easiest):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WQ|PINCODE|ISSUE|SOURCE|DESCRIPTION

Example:
WQ|781014|Health symptoms|Tube well|Water taste bad

Format 2 - STRUCTURED (More detailed):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PIN CODE: 781014
LOCATION: Guwahati
ISSUE: Health symptoms
SOURCE: Tube well
DESCRIPTION: Water causing health issues

📋 VALID ISSUE TYPES:
- Health symptom
- Metallic taste
- Reddish brown water
- Pungent smell
- Muddy water

💧 VALID SOURCE TYPES:
- Tube well/Borewell
- Piped water supply
- Dug well/Open well
- Handpump
- Ponds/Reservoir

✅ Send your SMS to activate offline reporting!
"""
