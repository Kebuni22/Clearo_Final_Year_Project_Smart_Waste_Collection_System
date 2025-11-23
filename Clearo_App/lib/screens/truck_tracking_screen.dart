import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:location/location.dart';
import 'dart:async';
import 'dart:ui' as ui;
import 'dart:typed_data';
import 'package:cloud_firestore/cloud_firestore.dart';

class TruckTrackingScreen extends StatefulWidget {
  const TruckTrackingScreen({Key? key}) : super(key: key);

  @override
  State<TruckTrackingScreen> createState() => _TruckTrackingScreenState();
}

class _TruckTrackingScreenState extends State<TruckTrackingScreen> {
  GoogleMapController? _mapController;
  final String _googleMapsApiKey = "AIzaSyDtfueebmq-XAr53g5JvZk13F7WCPZqC3M";

  // Modern color palette
  final Color _primaryColor = const Color(0xFF8FD3A9);
  final Color _accentColor = const Color(0xFF6AC47A);
  final Color _darkColor = const Color(0xFF4A7856);

  // Driver's device location will be the truck location
  LatLng? _truckLocation;
  LatLng? _userLocation; // Will be set from device location

  // Location services
  Location location = Location();
  LocationData? _currentLocation;
  StreamSubscription<LocationData>? _locationSubscription;
  bool _serviceEnabled = false;
  PermissionStatus? _permissionGranted;

  bool _showRoute = true;
  bool _isRefreshing = false;
  int _estimatedTime = 15; // in minutes
  double _routeProgress = 0.0;
  List<LatLng> _routeCoordinates = [];
  bool _isLocationLoading = true;
  String _errorMessage = '';

  // Custom truck icon
  BitmapDescriptor? _truckIcon;
  BitmapDescriptor? _userIcon;

  // Driver's real-time location from Firebase
  StreamSubscription<QuerySnapshot>? _driverLocationSubscription;
  bool _isDriverOnline = false;
  double _truckSpeed = 0.0;
  double _truckHeading = 0.0;
  String _driverName = 'Collection Truck';

  @override
  void initState() {
    super.initState();
    _loadCustomIcons();
    _requestLocationPermissionAndInitialize();
    _startListeningToDriverLocation(); // Start listening to driver location
  }

  // Replace default marker hues with custom-drawn icons
  Future<void> _loadCustomIcons() async {
    try {
      _truckIcon = await _bitmapDescriptorFromIcon(
        Icons.local_shipping,
        _accentColor,
        size: 56, // smaller truck icon
      );
      _userIcon = await _bitmapDescriptorFromIcon(
        Icons.person_pin_circle,
        Colors.blueAccent,
        size: 48, // smaller user icon
      );
      if (mounted) setState(() {});
    } catch (e) {
      // Fallback to default markers on error
      _truckIcon = BitmapDescriptor.defaultMarkerWithHue(
        BitmapDescriptor.hueGreen,
      );
      _userIcon = BitmapDescriptor.defaultMarkerWithHue(
        BitmapDescriptor.hueBlue,
      );
      if (mounted) setState(() {});
    }
  }

  // Create a BitmapDescriptor from a Material Icon without needing assets
  Future<BitmapDescriptor> _bitmapDescriptorFromIcon(
    IconData iconData,
    Color color, {
    double size = 10,
  }) async {
    final double scale = ui.window.devicePixelRatio;
    final double imgSize = size * scale;

    final ui.PictureRecorder recorder = ui.PictureRecorder();
    final Canvas canvas = Canvas(recorder);

    // Background with border
    final Paint bgPaint = Paint()..color = Colors.white;
    final double stroke = (size * 0.08) * scale; // scale border with size
    final Paint borderPaint =
        Paint()
          ..color = color
          ..style = PaintingStyle.stroke
          ..strokeWidth = stroke;

    final RRect rrect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, imgSize, imgSize),
      Radius.circular((size * 0.22) * scale), // scale corner radius with size
    );
    canvas.drawRRect(rrect, bgPaint);
    canvas.drawRRect(rrect, borderPaint);

    // Draw icon centered
    final TextPainter tp = TextPainter(textDirection: TextDirection.ltr);
    tp.text = TextSpan(
      text: String.fromCharCode(iconData.codePoint),
      style: TextStyle(
        fontSize: imgSize * 0.58,
        fontFamily: iconData.fontFamily,
        package: iconData.fontPackage,
        color: color,
      ),
    );
    tp.layout();
    final double x = (imgSize - tp.width) / 2;
    final double y = (imgSize - tp.height) / 2;
    tp.paint(canvas, Offset(x, y));

    final ui.Image image = await recorder.endRecording().toImage(
      imgSize.toInt(),
      imgSize.toInt(),
    );
    final ByteData? bytes = await image.toByteData(
      format: ui.ImageByteFormat.png,
    );
    return BitmapDescriptor.fromBytes(bytes!.buffer.asUint8List());
  }

  Future<void> _requestLocationPermissionAndInitialize() async {
    // Request location permission first
    bool permissionGranted = await _requestLocationPermission();

    if (permissionGranted) {
      // Get user's device location
      await _getUserDeviceLocation();

      // Then initialize truck tracking
      await _initializeLocation();
    } else {
      // Show permission denied message
      setState(() {
        _isLocationLoading = false;
        _errorMessage =
            'Location permission is required to show your location and track trucks';
        // Use default Colombo location as fallback
        _userLocation = const LatLng(6.9271, 79.8612);
      });
      _getRouteFromAPI();
    }
  }

  Future<bool> _requestLocationPermission() async {
    try {
      // Check if location service is enabled
      _serviceEnabled = await location.serviceEnabled();
      if (!_serviceEnabled) {
        _serviceEnabled = await location.requestService();
        if (!_serviceEnabled) {
          setState(() {
            _errorMessage =
                'Location service is disabled. Please enable it in settings.';
          });
          return false;
        }
      }

      // Request location permission
      _permissionGranted = await location.hasPermission();
      if (_permissionGranted == PermissionStatus.denied) {
        _permissionGranted = await location.requestPermission();
        if (_permissionGranted != PermissionStatus.granted) {
          setState(() {
            _errorMessage =
                'Location permission denied. Please grant permission to see your location.';
          });
          return false;
        }
      }

      return true;
    } catch (e) {
      setState(() {
        _errorMessage = 'Error requesting location permission: $e';
      });
      return false;
    }
  }

  Future<void> _getUserDeviceLocation() async {
    try {
      LocationData currentLocation = await location.getLocation();

      if (currentLocation.latitude != null &&
          currentLocation.longitude != null) {
        setState(() {
          _userLocation = LatLng(
            currentLocation.latitude!,
            currentLocation.longitude!,
          );
          _currentLocation = currentLocation;
        });

        print(
          '✓ User location obtained: ${_userLocation!.latitude}, ${_userLocation!.longitude}',
        );
      }
    } catch (e) {
      print('Error getting user device location: $e');
      setState(() {
        _errorMessage = 'Could not get your location. Using default location.';
        _userLocation = const LatLng(6.9271, 79.8612); // Fallback to Colombo
      });
    }
  }

  Future<void> _initializeLocation() async {
    // User location tracking
    if (_serviceEnabled && _permissionGranted == PermissionStatus.granted) {
      _startLocationTracking();
    }

    setState(() {
      _isLocationLoading = false;
    });

    // Driver location is tracked via Firebase listener
    if (_truckLocation != null && _userLocation != null) {
      await _getRouteFromAPI();
    }
  }

  // Listen to driver's real-time location from Firebase
  void _startListeningToDriverLocation() {
    print('🚛 Starting to listen to driver locations...');

    _driverLocationSubscription = FirebaseFirestore.instance
        .collection('driver_locations')
        .where('isOnline', isEqualTo: true) // Only get online drivers
        .snapshots()
        .listen(
          (snapshot) {
            print(
              '📍 Driver locations update received: ${snapshot.docs.length} drivers online',
            );

            if (snapshot.docs.isNotEmpty) {
              // Get the first online driver (in production, you'd select based on assigned driver)
              final driverDoc = snapshot.docs.first;
              final data = driverDoc.data();

              // Extract location data with fallback to different field names
              final double? lat = data['latitude'] ?? data['lat'];
              final double? lng = data['longitude'] ?? data['lng'];

              if (lat != null && lng != null) {
                setState(() {
                  _truckLocation = LatLng(lat, lng);
                  _isDriverOnline = data['isOnline'] ?? false;
                  _truckSpeed = (data['speed'] ?? 0.0).toDouble();
                  _truckHeading = (data['heading'] ?? 0.0).toDouble();
                  _driverName = data['driverName'] ?? 'Collection Truck';
                });

                print(
                  '✓ Truck location updated: $lat, $lng - Speed: $_truckSpeed km/h - Online: $_isDriverOnline',
                );

                // Update route when truck location changes
                if (_userLocation != null) {
                  _getRouteFromAPI();
                }
              }
            } else {
              // No online drivers found
              print('⚠️ No online drivers found');
              setState(() {
                _truckLocation = const LatLng(
                  6.9344,
                  79.8428,
                ); // Fallback location
                _isDriverOnline = false;
                _errorMessage =
                    'No active collection trucks found. Showing demo location.';
              });
            }
          },
          onError: (error) {
            print('❌ Error listening to driver locations: $error');
            setState(() {
              _errorMessage = 'Error tracking truck: $error';
              _truckLocation = const LatLng(6.9344, 79.8428); // Fallback
            });
          },
        );
  }

  void _startLocationTracking() {
    // Track user's device location in real-time
    _locationSubscription = location.onLocationChanged.listen((
      LocationData currentLocation,
    ) {
      if (currentLocation.latitude != null &&
          currentLocation.longitude != null) {
        setState(() {
          _userLocation = LatLng(
            currentLocation.latitude!,
            currentLocation.longitude!,
          );
          _currentLocation = currentLocation;
        });

        // Update route when user location changes
        if (_truckLocation != null) {
          _getRouteFromAPI();
        }
      }
    });
  }

  Future<void> _getRouteFromAPI() async {
    if (_truckLocation == null || _userLocation == null) return;

    try {
      final String url =
          'https://maps.googleapis.com/maps/api/directions/json?'
          'origin=${_truckLocation!.latitude},${_truckLocation!.longitude}&'
          'destination=${_userLocation!.latitude},${_userLocation!.longitude}&'
          'key=$_googleMapsApiKey';

      final response = await http.get(Uri.parse(url));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        if (data['routes'] != null && data['routes'].isNotEmpty) {
          final route = data['routes'][0];
          final polylinePoints = route['overview_polyline']['points'];
          final coordinates = _decodePolyline(polylinePoints);

          // Get estimated duration and distance
          final duration = route['legs'][0]['duration']['value']; // in seconds
          final distance = route['legs'][0]['distance']['value']; // in meters
          final estimatedMinutes = (duration / 60).round();

          setState(() {
            _routeCoordinates = coordinates;
            _estimatedTime = estimatedMinutes;
            _routeProgress = _calculateProgress(distance);
          });
        }
      } else {
        print('Failed to load route: ${response.statusCode}');
        _setFallbackRoute();
      }
    } catch (e) {
      print('Error getting route: $e');
      _setFallbackRoute();
    }
  }

  void _setFallbackRoute() {
    if (_truckLocation != null) {
      setState(() {
        _routeCoordinates = [_truckLocation!, _userLocation!];
        _estimatedTime = _calculateEstimatedTime();
        _routeProgress = 0.7; // Demo progress
      });
    }
  }

  double _calculateProgress(int totalDistance) {
    // Calculate progress based on remaining distance vs total distance
    // This is a simplified calculation
    return 0.7; // Demo value - in real app, calculate based on actual progress
  }

  int _calculateEstimatedTime() {
    if (_truckLocation == null) return 15;

    // Simple distance-based calculation (not accurate for real use)
    double distance = _calculateDistance(_truckLocation!, _userLocation!);
    return ((distance * 60) / 30).round(); // Assuming 30 km/h average speed
  }

  double _calculateDistance(LatLng point1, LatLng point2) {
    // Simplified distance calculation
    double dx = point1.latitude - point2.latitude;
    double dy = point1.longitude - point2.longitude;
    return (dx * dx + dy * dy) * 111; // Rough conversion to km
  }

  List<LatLng> _decodePolyline(String polyline) {
    List<LatLng> coordinates = [];
    int index = 0;
    int len = polyline.length;
    int lat = 0;
    int lng = 0;

    while (index < len) {
      int b;
      int shift = 0;
      int result = 0;
      do {
        b = polyline.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = polyline.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      coordinates.add(LatLng(lat / 1E5, lng / 1E5));
    }
    return coordinates;
  }

  Future<void> _refreshLocation() async {
    setState(() => _isRefreshing = true);

    // Refresh user location
    await _getUserDeviceLocation();

    // Driver location is automatically updated via Firebase listener
    // Just refresh the route
    if (_truckLocation != null && _userLocation != null) {
      await _getRouteFromAPI();
    }

    setState(() => _isRefreshing = false);
  }

  Set<Polyline> _getRoutePolyline() {
    if (_routeCoordinates.isEmpty) return {};

    return {
      Polyline(
        polylineId: const PolylineId('route'),
        points: _routeCoordinates,
        color: _accentColor,
        width: 5,
        patterns: [PatternItem.dash(20), PatternItem.gap(10)],
      ),
    };
  }

  @override
  Widget build(BuildContext context) {
    if (_isLocationLoading) {
      return Scaffold(
        appBar: AppBar(
          title: const Text(
            'Live Truck Tracking',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          backgroundColor: _primaryColor,
          elevation: 0,
          centerTitle: true,
          iconTheme: const IconThemeData(color: Colors.white),
        ),
        body: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Colors.white, Colors.grey.shade50],
            ),
          ),
          child: const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text(
                  'Getting your location...',
                  style: TextStyle(fontSize: 16, color: Colors.grey),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Live Truck Tracking',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        backgroundColor: _primaryColor,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          // Online status indicator
          if (_truckLocation != null)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: _isDriverOnline ? Colors.green : Colors.red,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _isDriverOnline ? Icons.circle : Icons.circle_outlined,
                        color: Colors.white,
                        size: 8,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _isDriverOnline ? 'Live' : 'Offline',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          IconButton(
            icon:
                _isRefreshing
                    ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                    : const Icon(Icons.refresh),
            onPressed: _isRefreshing ? null : _refreshLocation,
          ),
        ],
      ),
      body:
          _userLocation == null
              ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.location_off,
                      size: 64,
                      color: Colors.grey.shade400,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Location permission required',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 32),
                      child: Text(
                        _errorMessage.isNotEmpty
                            ? _errorMessage
                            : 'Please grant location permission to see your location and track trucks',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade500,
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      onPressed: _requestLocationPermissionAndInitialize,
                      icon: const Icon(Icons.location_on),
                      label: const Text('Grant Location Permission'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _primaryColor,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 32,
                          vertical: 16,
                        ),
                      ),
                    ),
                  ],
                ),
              )
              : Stack(
                children: [
                  GoogleMap(
                    initialCameraPosition: CameraPosition(
                      target: _userLocation!,
                      zoom: 14,
                    ),
                    markers: {
                      if (_truckLocation != null)
                        Marker(
                          markerId: const MarkerId('truck'),
                          position: _truckLocation!,
                          icon:
                              _truckIcon ??
                              BitmapDescriptor.defaultMarkerWithHue(
                                BitmapDescriptor.hueGreen,
                              ),
                          infoWindow: InfoWindow(
                            title: _driverName,
                            snippet:
                                'Speed: ${_truckSpeed.round()} km/h • ETA: $_estimatedTime min ${_isDriverOnline ? "• Live" : "• Offline"}',
                          ),
                          rotation: _truckHeading,
                        ),
                      // User's actual device location marker
                      Marker(
                        markerId: const MarkerId('user'),
                        position: _userLocation!,
                        icon:
                            _userIcon ??
                            BitmapDescriptor.defaultMarkerWithHue(
                              BitmapDescriptor.hueBlue,
                            ),
                        infoWindow: const InfoWindow(
                          title: 'Your Location',
                          snippet: 'Current position',
                        ),
                      ),
                    },
                    polylines: _showRoute ? _getRoutePolyline() : {},
                    onMapCreated: (controller) {
                      _mapController = controller;
                      _fitMapToShowBothLocations();
                    },
                    myLocationEnabled: true,
                    myLocationButtonEnabled: true,
                    trafficEnabled: true,
                    mapType: MapType.normal,
                  ),
                  // Map controls
                  Positioned(
                    top: 16,
                    right: 16,
                    child: Column(
                      children: [
                        _buildMapControlButton(
                          Icons.local_shipping,
                          Colors.green,
                          'truck_location',
                          () => _mapController?.animateCamera(
                            CameraUpdate.newLatLng(_truckLocation!),
                          ),
                        ),
                        const SizedBox(height: 8),
                        _buildMapControlButton(
                          Icons.place,
                          Colors.blue,
                          'user_location',
                          () => _mapController?.animateCamera(
                            CameraUpdate.newLatLng(_userLocation!),
                          ),
                        ),
                        const SizedBox(height: 8),
                        _buildMapControlButton(
                          _showRoute ? Icons.route : Icons.route_outlined,
                          Colors.black87,
                          'route',
                          () => setState(() => _showRoute = !_showRoute),
                        ),
                        const SizedBox(height: 8),
                        _buildMapControlButton(
                          Icons.fit_screen,
                          _primaryColor,
                          'fit_screen',
                          _fitMapToShowBothLocations,
                        ),
                      ],
                    ),
                  ),
                  // Info card
                  Positioned(
                    bottom: 20,
                    left: 20,
                    right: 20,
                    child: _buildInfoCard(),
                  ),
                  // Error message banner
                  if (_errorMessage.isNotEmpty)
                    Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      child: Container(
                        color: Colors.orange.shade100,
                        padding: const EdgeInsets.all(8),
                        child: Row(
                          children: [
                            Icon(
                              Icons.warning,
                              color: Colors.orange.shade800,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _errorMessage,
                                style: TextStyle(
                                  color: Colors.orange.shade800,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                            IconButton(
                              icon: Icon(Icons.close, size: 20),
                              onPressed:
                                  () => setState(() => _errorMessage = ''),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
    );
  }

  Widget _buildMapControlButton(
    IconData icon,
    Color color,
    String heroTag,
    VoidCallback onPressed,
  ) {
    return FloatingActionButton.small(
      heroTag: heroTag,
      onPressed: onPressed,
      backgroundColor: Colors.white,
      elevation: 2,
      child: Icon(icon, color: color),
    );
  }

  void _fitMapToShowBothLocations() {
    if (_mapController == null || _userLocation == null) return;

    if (_truckLocation != null) {
      _mapController!.animateCamera(
        CameraUpdate.newLatLngBounds(
          LatLngBounds(
            southwest: LatLng(
              (_truckLocation!.latitude < _userLocation!.latitude
                      ? _truckLocation!.latitude
                      : _userLocation!.latitude) -
                  0.005,
              (_truckLocation!.longitude < _userLocation!.longitude
                      ? _truckLocation!.longitude
                      : _userLocation!.longitude) -
                  0.005,
            ),
            northeast: LatLng(
              (_truckLocation!.latitude > _userLocation!.latitude
                      ? _truckLocation!.latitude
                      : _userLocation!.latitude) +
                  0.005,
              (_truckLocation!.longitude > _userLocation!.longitude
                      ? _truckLocation!.longitude
                      : _userLocation!.longitude) +
                  0.005,
            ),
          ),
          100,
        ),
      );
    } else {
      _mapController!.animateCamera(CameraUpdate.newLatLng(_userLocation!));
    }
  }

  String _getCurrentSpeed() {
    if (_truckSpeed > 0) {
      return _truckSpeed.round().toString();
    }
    return '0';
  }

  Widget _buildInfoCard() {
    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Colors.white, Colors.grey.shade50],
          ),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Estimated Arrival',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: _darkColor,
                      ),
                    ),
                    Row(
                      children: [
                        Icon(
                          _isDriverOnline
                              ? Icons.gps_fixed
                              : Icons.gps_not_fixed,
                          color: _isDriverOnline ? _accentColor : Colors.grey,
                          size: 16,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _isDriverOnline ? 'Live tracking' : 'Offline',
                          style: TextStyle(
                            fontSize: 12,
                            color: _isDriverOnline ? _accentColor : Colors.grey,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors:
                          _isDriverOnline
                              ? [_primaryColor, _accentColor]
                              : [Colors.grey.shade400, Colors.grey.shade500],
                    ),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '$_estimatedTime min',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Icon(Icons.local_shipping, color: _accentColor, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _driverName,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Divider(color: Colors.grey.shade300),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.speed, color: Colors.blue.shade400, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'Speed: ${_getCurrentSpeed()} km/h',
                      style: const TextStyle(fontSize: 14),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Icon(
                      _isDriverOnline ? Icons.route : Icons.location_off,
                      color:
                          _isDriverOnline
                              ? Colors.orange.shade400
                              : Colors.grey,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _isDriverOnline ? 'En route' : 'Offline',
                      style: TextStyle(
                        fontSize: 14,
                        color: _isDriverOnline ? Colors.black87 : Colors.grey,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Route Progress',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
                Text(
                  '${(_routeProgress * 100).round()}%',
                  style: TextStyle(
                    fontSize: 12,
                    color: _accentColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: LinearProgressIndicator(
                value: _routeProgress,
                backgroundColor: Colors.grey.shade200,
                valueColor: AlwaysStoppedAnimation<Color>(_accentColor),
                minHeight: 8,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _locationSubscription?.cancel();
    _driverLocationSubscription?.cancel(); // Cancel driver location listener
    _mapController?.dispose();
    super.dispose();
  }
}
