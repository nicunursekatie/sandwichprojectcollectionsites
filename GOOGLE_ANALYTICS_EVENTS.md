# Google Analytics Event Tracking

This document lists all the Google Analytics events that are now being tracked on the Sandwich Project Collection Sites website.

## Analytics Tag
- **GA4 Measurement ID**: G-179EC3TGEC

## Events Being Tracked

### 🔍 Location & Search Events

#### `get_current_location`
- **Category**: Location
- **Label**: Use Current Location Button
- **Triggered**: When user clicks "Use my current location" button

#### `location_success`
- **Category**: Location
- **Label**: Current Location Retrieved
- **Triggered**: When geolocation successfully retrieves user's location

#### `location_error`
- **Category**: Location
- **Label**: Location Permission Denied
- **Triggered**: When user denies location permission

#### `location_unavailable`
- **Category**: Location
- **Label**: Geolocation Not Supported
- **Triggered**: When browser doesn't support geolocation

#### `search_by_name`
- **Category**: Search
- **Label**: Name/Area Filter
- **Parameters**: search_term
- **Triggered**: When user searches by host name or area

#### `search_by_address`
- **Category**: Search
- **Label**: Address Geocoded
- **Parameters**: search_term
- **Triggered**: When user successfully searches by address

#### `search_fallback`
- **Category**: Search
- **Label**: Geocode Failed - Used Name Search
- **Parameters**: search_term
- **Triggered**: When address geocoding fails and falls back to name search

### 🗺️ Map & View Events

#### `view_mode_change`
- **Category**: View
- **Label**: "List View Selected" OR "Map View Selected"
- **Triggered**: When user toggles between list and map view

#### `map_hosts_toggle`
- **Category**: Map
- **Label**: "Show All Hosts" OR "Show Closest 3"
- **Triggered**: When user toggles between showing all hosts or only closest 3 on map

#### `map_marker_click`
- **Category**: Map
- **Label**: Marker Clicked
- **Parameters**: host_name, host_area, rank
- **Triggered**: When user clicks a marker on the map

### 🧭 Directions Events

#### `show_directions`
- **Category**: Directions
- **Label**: Show Route on Map
- **Parameters**: host_name, host_area
- **Triggered**: When user clicks "Show Route on Map" button

#### `directions_calculated`
- **Category**: Directions
- **Label**: Route Displayed
- **Parameters**: host_name, distance, duration
- **Triggered**: When route is successfully calculated and displayed

#### `directions_error`
- **Category**: Directions
- **Label**: Route Calculation Failed
- **Parameters**: host_name
- **Triggered**: When route calculation fails

#### `get_directions_click`
- **Category**: Directions
- **Label**: Get Directions Button
- **Parameters**: host_name, host_area
- **Triggered**: When user clicks the main "Get Directions" button

#### `email_directions`
- **Category**: Directions
- **Label**: Email Directions
- **Parameters**: host_name, distance, duration
- **Triggered**: When user clicks "Email Directions" button

#### `copy_coordinates`
- **Category**: Directions
- **Label**: Copy Coordinates
- **Parameters**: host_name, host_area
- **Triggered**: When user copies host coordinates to clipboard

### 🚗 External Navigation Events

#### `open_apple_maps`
- **Category**: External Navigation
- **Label**: Apple Maps
- **Parameters**: host_name, host_area
- **Triggered**: When user opens directions in Apple Maps

#### `open_google_maps`
- **Category**: External Navigation
- **Label**: Google Maps
- **Parameters**: host_name, host_area
- **Triggered**: When user opens directions in Google Maps

### 📞 Contact Events

#### `call_host`
- **Category**: Contact
- **Label**: Phone Call
- **Parameters**: host_name, host_area
- **Triggered**: When user clicks a host's phone number to call

### 🔧 Admin Events

#### `admin_export_hosts`
- **Category**: Admin
- **Label**: Export Hosts JSON
- **Parameters**: host_count
- **Triggered**: When admin exports host data as JSON

#### `admin_copy_code`
- **Category**: Admin
- **Label**: Copy Hosts as Code
- **Parameters**: host_count
- **Triggered**: When admin copies host data as code

#### `admin_import_hosts`
- **Category**: Admin
- **Label**: Import Hosts JSON
- **Parameters**: host_count
- **Triggered**: When admin successfully imports host data

#### `admin_import_error`
- **Category**: Admin
- **Label**: Import Failed
- **Triggered**: When host data import fails

## How to View Events in Google Analytics

1. Go to [Google Analytics](https://analytics.google.com/)
2. Select your property (G-179EC3TGEC)
3. Navigate to **Reports** → **Engagement** → **Events**
4. You'll see all the events listed above with their counts and parameters

## Custom Reports You Can Create

### Popular Hosts
Filter events by `host_name` parameter to see which hosts are most popular

### User Journey
Track the sequence: `search_by_address` → `show_directions` → `open_google_maps` or `open_apple_maps`

### Navigation Preferences
Compare counts between `open_apple_maps` and `open_google_maps` to see user preferences

### Search Behavior
Compare `search_by_name` vs `search_by_address` vs `get_current_location`

### Contact Engagement
Track `call_host` events to see how many users are calling hosts

## Event Parameters

Common parameters tracked across events:
- **host_name**: Name of the host
- **host_area**: Area/neighborhood of the host
- **search_term**: What the user searched for
- **distance**: Distance to host
- **duration**: Estimated travel time
- **rank**: Host's proximity rank (for map markers)
- **host_count**: Number of hosts (for admin actions)

## Next Steps

You can now:
1. View real-time events in GA4 Real-Time reports
2. Create custom dashboards and reports
3. Set up conversion events (e.g., tracking when users get directions)
4. Create audience segments based on user behavior
5. Export data for further analysis

