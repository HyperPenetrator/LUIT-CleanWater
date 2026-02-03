"""
PIN Code to Latitude/Longitude conversion service
Maps Indian PIN codes to their geographical coordinates
"""

import logging

logger = logging.getLogger(__name__)

# PIN code to coordinates mapping for Assam and surrounding regions
# Format: 'PINCODE': {'latitude': float, 'longitude': float, 'locality': 'Name', 'district': 'District'}
PIN_CODE_DATABASE = {
    # Kamrup Metropolitan District
    '781001': {'latitude': 26.1445, 'longitude': 91.7362, 'locality': 'Guwahati', 'district': 'Kamrup Metropolitan'},
    '781002': {'latitude': 26.1507, 'longitude': 91.7297, 'locality': 'Guwahati', 'district': 'Kamrup Metropolitan'},
    '781003': {'latitude': 26.1591, 'longitude': 91.7411, 'locality': 'Guwahati', 'district': 'Kamrup Metropolitan'},
    '781004': {'latitude': 26.1442, 'longitude': 91.7588, 'locality': 'Guwahati', 'district': 'Kamrup Metropolitan'},
    '781005': {'latitude': 26.1389, 'longitude': 91.7244, 'locality': 'Guwahati', 'district': 'Kamrup Metropolitan'},
    '781006': {'latitude': 26.1502, 'longitude': 91.7149, 'locality': 'Guwahati', 'district': 'Kamrup Metropolitan'},
    '781007': {'latitude': 26.1555, 'longitude': 91.7492, 'locality': 'Guwahati', 'district': 'Kamrup Metropolitan'},
    '781008': {'latitude': 26.1356, 'longitude': 91.7168, 'locality': 'Guwahati', 'district': 'Kamrup Metropolitan'},
    '781009': {'latitude': 26.1623, 'longitude': 91.7531, 'locality': 'Guwahati', 'district': 'Kamrup Metropolitan'},
    '781010': {'latitude': 26.1314, 'longitude': 91.7089, 'locality': 'Guwahati', 'district': 'Kamrup Metropolitan'},
    '781011': {'latitude': 26.1467, 'longitude': 91.7438, 'locality': 'Guwahati', 'district': 'Kamrup Metropolitan'},
    '781012': {'latitude': 26.1534, 'longitude': 91.7268, 'locality': 'Guwahati', 'district': 'Kamrup Metropolitan'},
    '781013': {'latitude': 26.1398, 'longitude': 91.7521, 'locality': 'Guwahati', 'district': 'Kamrup Metropolitan'},
    '781014': {'latitude': 26.1290, 'longitude': 91.7045, 'locality': 'Guwahati', 'district': 'Kamrup Metropolitan'},
    '781015': {'latitude': 26.1687, 'longitude': 91.7604, 'locality': 'Guwahati', 'district': 'Kamrup Metropolitan'},
    '781016': {'latitude': 26.1243, 'longitude': 91.6978, 'locality': 'Guwahati', 'district': 'Kamrup Metropolitan'},
    '781017': {'latitude': 26.1756, 'longitude': 91.7689, 'locality': 'Guwahati', 'district': 'Kamrup Metropolitan'},
    '781018': {'latitude': 26.1186, 'longitude': 91.6912, 'locality': 'Guwahati', 'district': 'Kamrup Metropolitan'},
    '781019': {'latitude': 26.1823, 'longitude': 91.7762, 'locality': 'Guwahati', 'district': 'Kamrup Metropolitan'},
    '781020': {'latitude': 26.1129, 'longitude': 91.6847, 'locality': 'Guwahati', 'district': 'Kamrup Metropolitan'},
    
    # Kamrup District
    '781101': {'latitude': 26.1234, 'longitude': 90.2567, 'locality': 'Rangia', 'district': 'Kamrup'},
    '781102': {'latitude': 26.2145, 'longitude': 90.1923, 'locality': 'Rangia', 'district': 'Kamrup'},
    '781103': {'latitude': 26.1567, 'longitude': 90.3401, 'locality': 'Rani', 'district': 'Kamrup'},
    
    # Nagaon District
    '782001': {'latitude': 25.8850, 'longitude': 92.6897, 'locality': 'Nagaon', 'district': 'Nagaon'},
    '782002': {'latitude': 25.8923, 'longitude': 92.7012, 'locality': 'Nagaon', 'district': 'Nagaon'},
    
    # Sonitpur District
    '784101': {'latitude': 26.5897, 'longitude': 92.5123, 'locality': 'Tezpur', 'district': 'Sonitpur'},
    '784102': {'latitude': 26.6012, 'longitude': 92.5234, 'locality': 'Tezpur', 'district': 'Sonitpur'},
    
    # Barpeta District
    '781301': {'latitude': 26.3156, 'longitude': 90.0123, 'locality': 'Barpeta', 'district': 'Barpeta'},
    '781302': {'latitude': 26.3267, 'longitude': 90.0234, 'locality': 'Barpeta', 'district': 'Barpeta'},
    
    # Kokrajhar District
    '783370': {'latitude': 26.2734, 'longitude': 89.6234, 'locality': 'Kokrajhar', 'district': 'Kokrajhar'},
    '783371': {'latitude': 26.2845, 'longitude': 89.6345, 'locality': 'Kokrajhar', 'district': 'Kokrajhar'},
}


def get_coordinates_from_pincode(pincode: str) -> dict:
    """
    Convert PIN code to latitude and longitude
    
    Args:
        pincode (str): Indian PIN code (6 digits)
    
    Returns:
        dict: {
            'success': bool,
            'latitude': float or None,
            'longitude': float or None,
            'locality': str or None,
            'district': str or None,
            'error': str or None
        }
    
    Example:
        >>> get_coordinates_from_pincode('781001')
        {
            'success': True,
            'latitude': 26.1445,
            'longitude': 91.7362,
            'locality': 'Guwahati',
            'district': 'Kamrup Metropolitan'
        }
    """
    try:
        if not pincode or not isinstance(pincode, str):
            return {
                'success': False,
                'latitude': None,
                'longitude': None,
                'locality': None,
                'district': None,
                'error': 'Invalid PIN code format'
            }
        
        # Clean PIN code
        pincode = pincode.strip()
        
        if pincode in PIN_CODE_DATABASE:
            data = PIN_CODE_DATABASE[pincode]
            logger.info(f"✅ PIN code {pincode} found in database: {data}")
            return {
                'success': True,
                'latitude': data['latitude'],
                'longitude': data['longitude'],
                'locality': data['locality'],
                'district': data['district'],
                'error': None
            }
        else:
            logger.warning(f"⚠️ PIN code {pincode} not found in database")
            return {
                'success': False,
                'latitude': None,
                'longitude': None,
                'locality': None,
                'district': None,
                'error': f'PIN code {pincode} not found in database'
            }
    
    except Exception as e:
        logger.error(f"❌ Error converting PIN code {pincode}: {str(e)}")
        return {
            'success': False,
            'latitude': None,
            'longitude': None,
            'locality': None,
            'district': None,
            'error': str(e)
        }


def get_pincode_info(pincode: str) -> dict:
    """
    Get all information for a PIN code
    
    Args:
        pincode (str): Indian PIN code
    
    Returns:
        dict: Complete PIN code information if found, else error
    """
    return get_coordinates_from_pincode(pincode)


def search_by_locality(locality: str) -> list:
    """
    Search all PIN codes for a specific locality
    
    Args:
        locality (str): Locality name
    
    Returns:
        list: List of PIN codes matching the locality
    
    Example:
        >>> search_by_locality('Guwahati')
        ['781001', '781002', '781003', ...]
    """
    try:
        results = [
            pincode for pincode, data in PIN_CODE_DATABASE.items()
            if data['locality'].lower() == locality.lower()
        ]
        logger.info(f"🔍 Found {len(results)} PIN codes for locality {locality}")
        return results
    except Exception as e:
        logger.error(f"❌ Error searching locality {locality}: {str(e)}")
        return []


def search_by_district(district: str) -> list:
    """
    Search all PIN codes for a specific district
    
    Args:
        district (str): District name
    
    Returns:
        list: List of PIN codes matching the district
    
    Example:
        >>> search_by_district('Kamrup Metropolitan')
        ['781001', '781002', '781003', ...]
    """
    try:
        results = [
            pincode for pincode, data in PIN_CODE_DATABASE.items()
            if data['district'].lower() == district.lower()
        ]
        logger.info(f"🔍 Found {len(results)} PIN codes for district {district}")
        return results
    except Exception as e:
        logger.error(f"❌ Error searching district {district}: {str(e)}")
        return []


def add_pincode(pincode: str, latitude: float, longitude: float, locality: str, district: str) -> dict:
    """
    Add a new PIN code to the database (runtime only, not persistent)
    
    Args:
        pincode (str): PIN code
        latitude (float): Latitude coordinate
        longitude (float): Longitude coordinate
        locality (str): Locality name
        district (str): District name
    
    Returns:
        dict: Success or error message
    """
    try:
        if pincode in PIN_CODE_DATABASE:
            logger.warning(f"⚠️ PIN code {pincode} already exists, updating...")
        
        if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
            return {
                'success': False,
                'error': 'Invalid coordinates: latitude must be -90 to 90, longitude -180 to 180'
            }
        
        PIN_CODE_DATABASE[pincode] = {
            'latitude': float(latitude),
            'longitude': float(longitude),
            'locality': locality,
            'district': district
        }
        logger.info(f"✅ Added PIN code {pincode}: {locality}, {district}")
        return {
            'success': True,
            'error': None,
            'message': f'PIN code {pincode} added successfully'
        }
    except Exception as e:
        logger.error(f"❌ Error adding PIN code {pincode}: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


def batch_get_coordinates(pincodes: list) -> dict:
    """
    Get coordinates for multiple PIN codes
    
    Args:
        pincodes (list): List of PIN codes
    
    Returns:
        dict: Dictionary with PIN codes as keys and coordinate data as values
    
    Example:
        >>> batch_get_coordinates(['781001', '781002'])
        {
            '781001': {'success': True, 'latitude': 26.1445, ...},
            '781002': {'success': True, 'latitude': 26.1507, ...}
        }
    """
    results = {}
    for pincode in pincodes:
        results[pincode] = get_coordinates_from_pincode(pincode)
    return results
