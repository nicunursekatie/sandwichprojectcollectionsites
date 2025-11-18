// Utility functions for The Sandwich Project
// Single source of truth for time calculations and common operations

/**
 * Determines if a host is currently open based on their hours
 * ALL time logic goes here - fix it once, works everywhere
 *
 * @param {Object} host - Host object with openTime, closeTime, thursdayOpenTime, thursdayCloseTime
 * @returns {boolean} - True if host is currently open
 */
function isHostOpenNow(host) {
  if (!host) return false;

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 4 = Thursday
  const currentTime = now.toTimeString().slice(0, 5); // "HH:MM" format

  // Check if today is Thursday (special hours)
  const isThursday = currentDay === 4;

  // Get appropriate hours for today
  const openTime = isThursday && host.thursdayOpenTime ? host.thursdayOpenTime : host.openTime;
  const closeTime = isThursday && host.thursdayCloseTime ? host.thursdayCloseTime : host.closeTime;

  // If no hours defined, assume closed
  if (!openTime || !closeTime) return false;

  // Simple time comparison (works for same-day hours)
  // For overnight hours (e.g., 22:00 to 02:00), add logic here
  if (closeTime < openTime) {
    // Overnight hours
    return currentTime >= openTime || currentTime <= closeTime;
  }

  // Normal hours
  return currentTime >= openTime && currentTime <= closeTime;
}

/**
 * Formats host hours for display
 *
 * @param {Object} host - Host object with hours information
 * @param {boolean} showToday - If true, only show today's hours
 * @returns {string} - Formatted hours string
 */
function formatHostHours(host, showToday = false) {
  if (!host) return 'Hours not available';

  const now = new Date();
  const isThursday = now.getDay() === 4;

  if (showToday && isThursday && host.thursdayOpenTime && host.thursdayCloseTime) {
    return `Today: ${formatTime(host.thursdayOpenTime)} - ${formatTime(host.thursdayCloseTime)}`;
  }

  if (showToday) {
    return `Today: ${host.hours || 'Hours not available'}`;
  }

  // Full hours display
  let hoursText = host.hours || '8 am to 8 pm';

  if (host.thursdayOpenTime && host.thursdayCloseTime) {
    hoursText += ` (Thu: ${formatTime(host.thursdayOpenTime)} - ${formatTime(host.thursdayCloseTime)})`;
  }

  return hoursText;
}

/**
 * Converts 24-hour time to 12-hour format
 *
 * @param {string} time24 - Time in "HH:MM" format (e.g., "14:30")
 * @returns {string} - Time in 12-hour format (e.g., "2:30 PM")
 */
function formatTime(time24) {
  if (!time24) return '';

  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;

  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Calculates distance between two coordinates (Haversine formula)
 *
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} - Distance in miles (raw number for sorting/calculations)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Return as number (not string) so .toFixed() can be called on it later
  return parseFloat(distance.toFixed(1));
}

/**
 * Shows a toast notification (minimal error surface)
 *
 * @param {string} type - 'error', 'success', or 'info'
 * @param {string} title - Toast title
 * @param {string} message - Toast message
 */
function showToast(type, title, message) {
  // For now, using alert - can be upgraded to a toast library later
  // All error handling funnels through here
  console.log(`[${type.toUpperCase()}] ${title}: ${message}`);

  // Simple visual feedback
  if (type === 'error') {
    alert(`${title}\n\n${message}`);
  }
  // Success and info toasts could be less intrusive
}

// Make utilities available globally
window.HostUtils = {
  isHostOpenNow,
  formatHostHours,
  formatTime,
  calculateDistance,
  showToast,
};
