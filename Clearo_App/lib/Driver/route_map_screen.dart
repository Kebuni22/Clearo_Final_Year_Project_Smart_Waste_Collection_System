import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:location/location.dart';
import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' as ui;
import 'dart:typed_data';

class RouteMapScreen extends StatefulWidget {
  const RouteMapScreen({Key? key}) : super(key: key);

  @override
  State<RouteMapScreen> createState() => _RouteMapScreenState();
}

class _RouteMapScreenState extends State<RouteMapScreen> {
  GoogleMapController? _mapController;
  final String _googleMapsApiKey = "AIzaSyDtfueebmq-XAr53g5JvZk13F7WCPZqC3M";

  final LatLng _defaultLocation = const LatLng(6.9271, 79.8612);

  Set<Marker> _markers = {};
  Set<Polyline> _polylines = {};
  List<Map<String, dynamic>> _pickupLocations = [];
  bool _isLoading = true;
  int _completedPickups = 0;

  Location location = Location();
  LocationData? _currentLocation;
  StreamSubscription<LocationData>? _locationSubscription;
  bool _serviceEnabled = false;
  PermissionStatus? _permissionGranted;
  bool _isLocationLoading = true;
  String _locationStatus = 'Getting location...';

  BitmapDescriptor? _truckIcon;

  StreamSubscription<QuerySnapshot>? _smartBinsSubscription;
  Timer? _fillLevelRefreshTimer;
  Timer? _routeOptimizationTimer;
  List<Map<String, dynamic>> _smartBins = [];
  List<LatLng> _optimizedRoute = [];
  double _totalRouteDistance = 0.0;
  String _estimatedRouteTime = '0 min';

  // Throttle Firestore writes
  final Duration _minUploadInterval = const Duration(seconds: 5);
  final double _minUploadDistanceMeters = 15; // avoid noisy writes
  DateTime? _lastUploadAt;
  LatLng? _lastUploadedPos;

  @override
  void initState() {
    super.initState();
    _createTruckIcon();
    _initializeLocation();
    _loadPickupLocations();
    _startSmartBinListener();
    _startFillLevelRefresh();
    _startRouteOptimization();
  }

  @override
  void dispose() {
    _locationSubscription?.cancel();
    _smartBinsSubscription?.cancel();
    _fillLevelRefreshTimer?.cancel();
    _routeOptimizationTimer?.cancel();
    _markDriverOffline(); // set online=false
    super.dispose();
  }

  // Refresh fill levels every 5 seconds
  void _startFillLevelRefresh() {
    _fillLevelRefreshTimer?.cancel();
    _fillLevelRefreshTimer = Timer.periodic(const Duration(seconds: 5), (
      timer,
    ) {
      _refreshSmartBinData();
      print('Auto-refreshing bin fill levels...');
    });
  }

  // Optimize route every 30 seconds
  void _startRouteOptimization() {
    _routeOptimizationTimer?.cancel();
    _routeOptimizationTimer = Timer.periodic(const Duration(seconds: 30), (
      timer,
    ) {
      _optimizeCollectionRoute();
    });
  }

  Future<void> _createTruckIcon() async {
    _truckIcon = await _createIconInCircle(
      Icons.local_shipping,
      Colors.white,
      Colors.blue,
      80.0,
      null,
    );
  }

  Future<BitmapDescriptor> _createIconInCircle(
    IconData iconData,
    Color iconColor,
    Color circleColor,
    double size,
    String? text,
  ) async {
    final pictureRecorder = ui.PictureRecorder();
    final canvas = Canvas(pictureRecorder);
    final paint = Paint()..isAntiAlias = true;

    final center = Offset(size / 2, size / 2);
    final radius = size / 2;

    paint.color = circleColor;
    canvas.drawCircle(center, radius, paint);

    paint.color = Colors.white;
    paint.style = PaintingStyle.stroke;
    paint.strokeWidth = 3;
    canvas.drawCircle(center, radius - 2, paint);

    final textPainter = TextPainter(textDirection: TextDirection.ltr);
    textPainter.text = TextSpan(
      text: String.fromCharCode(iconData.codePoint),
      style: TextStyle(
        fontSize: size * 0.45,
        fontFamily: iconData.fontFamily,
        color: iconColor,
      ),
    );
    textPainter.layout();

    final iconX = (size - textPainter.width) / 2;
    final iconY = text != null
        ? (size * 0.35 - textPainter.height / 2)
        : (size - textPainter.height) / 2;
    textPainter.paint(canvas, Offset(iconX, iconY));

    if (text != null) {
      final textSpanPainter = TextPainter(textDirection: TextDirection.ltr);
      textSpanPainter.text = TextSpan(
        text: text,
        style: TextStyle(
          fontSize: size * 0.15,
          color: Colors.white,
          fontWeight: FontWeight.bold,
        ),
      );
      textSpanPainter.layout();

      final textX = (size - textSpanPainter.width) / 2;
      final textY = size * 0.7;
      textSpanPainter.paint(canvas, Offset(textX, textY));
    }

    final image = await pictureRecorder.endRecording().toImage(
          size.toInt(),
          size.toInt(),
        );
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);

    return BitmapDescriptor.fromBytes(byteData!.buffer.asUint8List());
  }

  Future<BitmapDescriptor> _createBinIconWithLevel(int fillLevel) async {
    Color circleColor;
    String levelText;

    if (fillLevel >= 70) {
      circleColor = Colors.red;
      levelText = 'HIGH';
    } else if (fillLevel >= 40) {
      circleColor = Colors.orange;
      levelText = 'MEDIUM';
    } else {
      circleColor = Colors.green;
      levelText = 'LOW';
    }

    return await _createIconInCircle(
      Icons.delete,
      Colors.white,
      circleColor,
      80.0,
      levelText,
    );
  }

  Future<void> _initializeLocation() async {
    setState(() {
      _isLocationLoading = true;
      _locationStatus = 'Requesting location permissions...';
    });

    try {
      await _checkLocationPermissions();
      if (_serviceEnabled && _permissionGranted == PermissionStatus.granted) {
        setState(() => _locationStatus = 'Getting current location...');
        await _getCurrentLocation();
        _startLocationTracking();
      } else {
        setState(() {
          _locationStatus = 'Location permission denied';
          _isLocationLoading = false;
        });
        _setDefaultLocation();
      }
    } catch (e) {
      setState(() {
        _locationStatus = 'Error getting location: $e';
        _isLocationLoading = false;
      });
      _setDefaultLocation();
    }
  }

  void _setDefaultLocation() {
    setState(() {
      _currentLocation = LocationData.fromMap({
        'latitude': _defaultLocation.latitude,
        'longitude': _defaultLocation.longitude,
        'accuracy': 0.0,
        'altitude': 0.0,
        'speed': 0.0,
        'speedAccuracy': 0.0,
        'heading': 0.0,
        'time': DateTime.now().millisecondsSinceEpoch.toDouble(),
      });
      _isLocationLoading = false;
    });
    _updateDriverLocationMarker();
  }

  Future<void> _checkLocationPermissions() async {
    try {
      _serviceEnabled = await location.serviceEnabled();
      if (!_serviceEnabled) {
        _serviceEnabled = await location.requestService();
        if (!_serviceEnabled) throw Exception('Location service not enabled');
      }

      _permissionGranted = await location.hasPermission();
      if (_permissionGranted == PermissionStatus.denied) {
        _permissionGranted = await location.requestPermission();
        if (_permissionGranted != PermissionStatus.granted) {
          throw Exception('Location permission not granted');
        }
      }
    } catch (e) {
      print('Error checking location permissions: $e');
      rethrow;
    }
  }

  Future<void> _getCurrentLocation() async {
    try {
      setState(() => _locationStatus = 'Getting GPS location...');

      _currentLocation = await location.getLocation().timeout(
            const Duration(seconds: 10),
            onTimeout: () =>
                throw TimeoutException('Location request timed out'),
          );

      if (_currentLocation != null) {
        setState(() {
          _isLocationLoading = false;
          _locationStatus = 'Live tracking';
        });
        _updateDriverLocationMarker();
        await _saveDriverLocationToDb(_currentLocation!); // save initial

        if (_mapController != null) {
          await _mapController!.animateCamera(
            CameraUpdate.newLatLngZoom(
              LatLng(_currentLocation!.latitude!, _currentLocation!.longitude!),
              15,
            ),
          );
        }
      }
    } catch (e) {
      print('Error getting current location: $e');
      setState(() {
        _locationStatus = 'Using default location';
        _isLocationLoading = false;
      });
      _setDefaultLocation();
    }
  }

  void _startLocationTracking() {
    try {
      _locationSubscription = location.onLocationChanged.listen(
        (LocationData currentLocation) async {
          if (currentLocation.latitude != null &&
              currentLocation.longitude != null) {
            setState(() {
              _currentLocation = currentLocation;
              _locationStatus = 'Live tracking';
            });
            _updateDriverLocationMarker();
            await _saveDriverLocationToDb(currentLocation); // save live updates
          }
        },
        onError: (error) {
          print('Location tracking error: $error');
          setState(() => _locationStatus = 'Location tracking error');
        },
      );
    } catch (e) {
      print('Error starting location tracking: $e');
    }
  }

  // Persist driver’s latest location (throttled)
  Future<void> _saveDriverLocationToDb(LocationData loc) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null || loc.latitude == null || loc.longitude == null) return;

      final now = DateTime.now();
      final pos = LatLng(loc.latitude!, loc.longitude!);

      // Throttle by time
      if (_lastUploadAt != null &&
          now.difference(_lastUploadAt!) < _minUploadInterval) {
        // Also throttle by distance if we have a last uploaded position
        if (_lastUploadedPos != null) {
          final movedMeters =
              _calculateDistance(_lastUploadedPos!, pos) * 1000.0; // km -> m
          if (movedMeters < _minUploadDistanceMeters) return;
        } else {
          return;
        }
      }

      final payload = {
        'uid': user.uid,
        'lat': loc.latitude,
        'lng': loc.longitude,
        'speed': loc.speed ?? 0.0,
        'heading': loc.heading ?? 0.0,
        'accuracy': loc.accuracy ?? 0.0,
        'altitude': loc.altitude ?? 0.0,
        'updatedAt': FieldValue.serverTimestamp(),
        'online': true,
      };

      await FirebaseFirestore.instance
          .collection('driver_locations')
          .doc(user.uid)
          .set(payload, SetOptions(merge: true));

      _lastUploadAt = now;
      _lastUploadedPos = pos;

      // Optional: to keep a history trail (uncomment to enable; 1 point/min recommended)
      // await FirebaseFirestore.instance
      //   .collection('driver_locations')
      //   .doc(user.uid)
      //   .collection('locations')
      //   .add({
      //     'lat': loc.latitude,
      //     'lng': loc.longitude,
      //     'speed': loc.speed ?? 0.0,
      //     'heading': loc.heading ?? 0.0,
      //     'createdAt': FieldValue.serverTimestamp(),
      //   });
    } catch (e) {
      print('Error saving driver location: $e');
    }
  }

  // Mark driver offline when leaving the screen/app
  Future<void> _markDriverOffline() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;
      await FirebaseFirestore.instance
          .collection('driver_locations')
          .doc(user.uid)
          .set({
        'online': false,
        'lastSeen': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
    } catch (e) {
      print('Error marking driver offline: $e');
    }
  }

  void _updateDriverLocationMarker() {
    if (_currentLocation == null) return;

    try {
      _markers.removeWhere(
        (marker) => marker.markerId.value == 'driver_location',
      );

      final driverMarker = Marker(
        markerId: const MarkerId('driver_location'),
        position: LatLng(
          _currentLocation!.latitude!,
          _currentLocation!.longitude!,
        ),
        icon: _truckIcon ??
            BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
        infoWindow: InfoWindow(
          title: 'Your Truck',
          snippet:
              'Speed: ${_getCurrentSpeed()} km/h • Route: ${_estimatedRouteTime}',
        ),
      );

      setState(() => _markers.add(driverMarker));
    } catch (e) {
      print('Error updating driver location marker: $e');
    }
  }

  Future<void> _loadPickupLocations() async {
    try {
      setState(() => _isLoading = true);

      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;

      final userDoc = await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .get();
      if (!userDoc.exists) return;

      final userData = userDoc.data() as Map<String, dynamic>;
      final driverName = userData['name'];

      final today = DateTime.now();
      final todayStr =
          "${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}";

      final pickupsQuery = await FirebaseFirestore.instance
          .collection('pickups')
          .where('driverName', isEqualTo: driverName)
          .where('date', isEqualTo: todayStr)
          .get();

      List<Map<String, dynamic>> pickups = [];
      int completed = 0;

      for (var doc in pickupsQuery.docs) {
        final data = doc.data();
        final coords = data['coordinates'] ??
            _getDefaultCoordinatesForLocation(data['location']);

        pickups.add({
          'id': doc.id,
          'binId': data['binId'],
          'location': data['location'],
          'status': data['status'],
          'coordinates': coords,
          'priority': data['priority'] ?? 'normal',
          'estimatedTime': data['estimatedTime'] ?? '15 min',
        });

        if (data['status'] == 'Completed') completed++;
      }

      setState(() {
        _pickupLocations = pickups;
        _completedPickups = completed;
      });

      _createMarkersAndRoute();
      _optimizeCollectionRoute();
    } catch (e) {
      print('Error loading pickup locations: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Map<String, double> _getDefaultCoordinatesForLocation(String? location) {
    final defaultLocations = {
      'Colombo 01': {'lat': 6.9344, 'lng': 79.8428},
      'Colombo 02': {'lat': 6.9388, 'lng': 79.8540},
      'Colombo 03': {'lat': 6.9147, 'lng': 79.8501},
      'Colombo 04': {'lat': 6.8905, 'lng': 79.8587},
      'Colombo 05': {'lat': 6.8851, 'lng': 79.8738},
      'Colombo 06': {'lat': 6.8977, 'lng': 79.8687},
      'Colombo 07': {'lat': 6.9167, 'lng': 79.8742},
      'Dehiwala': {'lat': 6.8520, 'lng': 79.8746},
      'Mount Lavinia': {'lat': 6.8389, 'lng': 79.8653},
      'Nugegoda': {'lat': 6.8649, 'lng': 79.8997},
    };

    for (var key in defaultLocations.keys) {
      if (location?.toLowerCase().contains(key.toLowerCase()) == true) {
        return defaultLocations[key]!;
      }
    }

    final random = math.Random();
    return {
      'lat': 6.9271 + (random.nextDouble() - 0.5) * 0.1,
      'lng': 79.8612 + (random.nextDouble() - 0.5) * 0.1,
    };
  }

  // Optimize collection route using nearest neighbor algorithm
  void _optimizeCollectionRoute() {
    if (_currentLocation == null || _smartBins.isEmpty) return;

    try {
      print('Optimizing collection route...');

      // Filter bins that need collection (HIGH and MEDIUM priority)
      List<Map<String, dynamic>> binsToCollect = _smartBins.where((bin) {
        final fillLevel = bin['fillLevel'] as int;
        return fillLevel >= 40; // MEDIUM and HIGH bins
      }).toList();

      if (binsToCollect.isEmpty) {
        setState(() {
          _optimizedRoute = [];
          _totalRouteDistance = 0.0;
          _estimatedRouteTime = '0 min';
        });
        return;
      }

      // Sort by fill level (highest first)
      binsToCollect.sort(
        (a, b) => (b['fillLevel'] as int).compareTo(a['fillLevel'] as int),
      );

      List<LatLng> route = [];
      LatLng currentPos = LatLng(
        _currentLocation!.latitude!,
        _currentLocation!.longitude!,
      );
      route.add(currentPos);

      List<Map<String, dynamic>> remainingBins = List.from(binsToCollect);
      double totalDistance = 0.0;

      // Nearest neighbor algorithm with priority weighting
      while (remainingBins.isNotEmpty) {
        Map<String, dynamic>? nearestBin;
        double minScore = double.infinity;

        for (var bin in remainingBins) {
          final lat = bin['lat'] as double;
          final lng = bin['lng'] as double;
          final fillLevel = bin['fillLevel'] as int;

          final binPos = LatLng(lat, lng);
          final distance = _calculateDistance(currentPos, binPos);

          // Score = distance / (fill_level_factor)
          // Higher fill level = lower score (higher priority)
          final fillLevelFactor = fillLevel >= 70 ? 2.0 : 1.0;
          final score = distance / fillLevelFactor;

          if (score < minScore) {
            minScore = score;
            nearestBin = bin;
          }
        }

        if (nearestBin != null) {
          final lat = nearestBin['lat'] as double;
          final lng = nearestBin['lng'] as double;
          final binPos = LatLng(lat, lng);

          route.add(binPos);
          totalDistance += _calculateDistance(currentPos, binPos);
          currentPos = binPos;
          remainingBins.remove(nearestBin);
        }
      }

      // Calculate estimated time (assuming 30 km/h average speed + 5 min per bin)
      final travelTimeMinutes = (totalDistance / 30.0) * 60;
      final collectionTimeMinutes = binsToCollect.length * 5;
      final totalMinutes = (travelTimeMinutes + collectionTimeMinutes).round();

      setState(() {
        _optimizedRoute = route;
        _totalRouteDistance = totalDistance;
        _estimatedRouteTime = totalMinutes < 60
            ? '$totalMinutes min'
            : '${(totalMinutes / 60).toStringAsFixed(1)} hrs';
      });

      _drawOptimizedRoute();

      print(
        'Route optimized: ${binsToCollect.length} bins, ${totalDistance.toStringAsFixed(2)} km, $totalMinutes min',
      );
    } catch (e) {
      print('Error optimizing route: $e');
    }
  }

  // Calculate distance between two points (Haversine formula)
  double _calculateDistance(LatLng point1, LatLng point2) {
    const double earthRadius = 6371; // km

    final lat1 = point1.latitude * math.pi / 180;
    final lat2 = point2.latitude * math.pi / 180;
    final dLat = (point2.latitude - point1.latitude) * math.pi / 180;
    final dLng = (point2.longitude - point1.longitude) * math.pi / 180;

    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1) *
            math.cos(lat2) *
            math.sin(dLng / 2) *
            math.sin(dLng / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));

    return earthRadius * c;
  }

  void _drawOptimizedRoute() {
    if (_optimizedRoute.isEmpty) {
      setState(() => _polylines.clear());
      return;
    }

    setState(() {
      _polylines = {
        Polyline(
          polylineId: const PolylineId('optimized_route'),
          points: _optimizedRoute,
          color: Colors.blue,
          width: 4,
          patterns: [PatternItem.dash(20), PatternItem.gap(10)],
          geodesic: true,
        ),
      };
    });
  }

  Future<void> _createMarkersAndRoute() async {
    try {
      Set<Marker> markers = {};

      if (_currentLocation != null) {
        markers.add(
          Marker(
            markerId: const MarkerId('driver_location'),
            position: LatLng(
              _currentLocation!.latitude!,
              _currentLocation!.longitude!,
            ),
            icon: _truckIcon ??
                BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
            infoWindow: InfoWindow(
              title: 'Your Truck',
              snippet:
                  'Speed: ${_getCurrentSpeed()} km/h • Route: ${_estimatedRouteTime}',
            ),
          ),
        );
      }

      // Add smart bin markers
      int routeNumber = 1;
      for (var bin in _smartBins) {
        final lat = bin['lat'];
        final lng = bin['lng'];
        final binId = bin['binId'];
        final fillLevel = bin['fillLevel'];
        final address = bin['address'];

        if (lat != null &&
            lng != null &&
            lat >= -90 &&
            lat <= 90 &&
            lng >= -180 &&
            lng <= 180 &&
            lat != 0 &&
            lng != 0) {
          String status;
          String levelText;

          if (fillLevel >= 70) {
            status = 'High - Priority Collection';
            levelText = 'HIGH';
          } else if (fillLevel >= 40) {
            status = 'Medium - Schedule Collection';
            levelText = 'MEDIUM';
          } else {
            status = 'Low - Monitor';
            levelText = 'LOW';
          }

          final binIcon = await _createBinIconWithLevel(fillLevel);

          // Check if bin is in optimized route
          bool isInRoute = _optimizedRoute.any(
            (point) =>
                (point.latitude - lat).abs() < 0.0001 &&
                (point.longitude - lng).abs() < 0.0001,
          );

          markers.add(
            Marker(
              markerId: MarkerId('smart_bin_$binId'),
              position: LatLng(lat, lng),
              icon: binIcon,
              infoWindow: InfoWindow(
                title: isInRoute ? 'Stop #$routeNumber: $binId' : 'Bin: $binId',
                snippet: 'Fill: $fillLevel% • $status\n$address',
              ),
              onTap: () => _showBinDetails(
                binId,
                fillLevel,
                status,
                address,
                lat,
                lng,
                isInRoute ? routeNumber : null,
              ),
            ),
          );

          if (isInRoute) routeNumber++;
        }
      }

      // Add pickup location markers
      for (int i = 0; i < _pickupLocations.length; i++) {
        final pickup = _pickupLocations[i];
        final coords = pickup['coordinates'];
        if (coords != null && coords['lat'] != null && coords['lng'] != null) {
          markers.add(
            Marker(
              markerId: MarkerId(pickup['id']),
              position: LatLng(coords['lat'], coords['lng']),
              infoWindow: InfoWindow(
                title: 'Pickup: ${pickup['binId']}',
                snippet: '${pickup['location']} - ${pickup['status']}',
              ),
              icon: BitmapDescriptor.defaultMarkerWithHue(
                pickup['status'] == 'Completed'
                    ? BitmapDescriptor.hueGreen
                    : pickup['priority'] == 'high'
                        ? BitmapDescriptor.hueRed
                        : BitmapDescriptor.hueOrange,
              ),
            ),
          );
        }
      }

      setState(() => _markers = markers);
      print('Total markers: ${markers.length}');
    } catch (e) {
      print('Error creating markers: $e');
    }
  }

  void _startSmartBinListener() {
    try {
      print('Starting real-time smart bin listener...');
      _smartBinsSubscription = FirebaseFirestore.instance
          .collection('smart_bins')
          .snapshots()
          .listen(
        (QuerySnapshot snapshot) {
          _handleSmartBinDataChange(snapshot);
        },
        onError: (error) {
          print('Error in smart bin listener: $error');
        },
      );
    } catch (e) {
      print('Error starting smart bin listener: $e');
    }
  }

  void _handleSmartBinDataChange(QuerySnapshot snapshot) {
    try {
      List<Map<String, dynamic>> updatedBins = [];

      print('=== Processing ${snapshot.docs.length} bins from database ===');

      for (var doc in snapshot.docs) {
        final data = doc.data() as Map<String, dynamic>;

        String binId = doc.id;
        if (data['binId'] != null && data['binId'].toString().isNotEmpty) {
          binId = data['binId'].toString();
        }

        print('\n--- Processing Bin: $binId ---');
        print('Document ID: ${doc.id}');
        print('Available fields: ${data.keys.toList()}');

        double? lat;
        double? lng;
        String address = '';

        // Extract location data
        if (data['location_data'] != null && data['location_data'] is Map) {
          final locationData = data['location_data'] as Map<String, dynamic>;
          lat = _parseDouble(locationData['latitude']) ??
              _parseDouble(locationData['lat']);
          lng = _parseDouble(locationData['longitude']) ??
              _parseDouble(locationData['lng']);
          address = locationData['address']?.toString() ?? '';
          print('Location from location_data: lat=$lat, lng=$lng');
        }

        if (lat == null || lng == null) {
          lat = _parseDouble(data['latitude']) ?? _parseDouble(data['lat']);
          lng = _parseDouble(data['longitude']) ?? _parseDouble(data['lng']);
          print('Location from direct fields: lat=$lat, lng=$lng');
        }

        if (address.isEmpty) {
          address = data['address']?.toString() ??
              data['location']?.toString() ??
              'Unknown location';
        }

        // Extract fill level (only from database, no random generation)
        int fillLevel = _extractFillLevel(data);

        // Only add bins with valid location data
        if (lat != null &&
            lng != null &&
            lat >= -90 &&
            lat <= 90 &&
            lng >= -180 &&
            lng <= 180) {
          updatedBins.add({
            'docId': doc.id,
            'binId': binId,
            'lat': lat,
            'lng': lng,
            'address': address,
            'fillLevel': fillLevel,
            'lastUpdated': DateTime.now(),
          });
          print('✓ Bin added: $binId, Fill: $fillLevel%, Location: $address');
        } else {
          print('✗ Bin skipped (invalid location): $binId, lat=$lat, lng=$lng');
        }
      }

      print('\n=== Total bins processed: ${updatedBins.length} ===\n');

      setState(() => _smartBins = updatedBins);
      _updateSmartBinMarkers();

      // Only optimize route if we have bins with fill level > 0
      final binsWithData =
          updatedBins.where((bin) => bin['fillLevel'] > 0).toList();
      if (binsWithData.isNotEmpty) {
        _optimizeCollectionRoute();
      }
    } catch (e) {
      print('Error handling smart bin data: $e');
    }
  }

  int _extractFillLevel(Map<String, dynamic> data) {
    int? fillLevel;

    // Method 1: Check fill_data nested object
    if (data['fill_data'] != null && data['fill_data'] is Map) {
      final fillData = data['fill_data'] as Map<String, dynamic>;
      fillLevel = _parseInt(fillData['fillLevel']) ??
          _parseInt(fillData['fill_level']) ??
          _parseInt(fillData['level']) ??
          _parseInt(fillData['percentage']) ??
          _parseInt(fillData['fill_percentage']);

      if (fillLevel != null) {
        print('Fill level from fill_data: $fillLevel');
      }
    }

    // Method 2: Check direct fields
    if (fillLevel == null) {
      fillLevel = _parseInt(data['fillLevel']) ??
          _parseInt(data['fill_level']) ??
          _parseInt(data['level']) ??
          _parseInt(data['percentage']) ??
          _parseInt(data['fill_percentage']) ??
          _parseInt(data['capacity_percentage']);

      if (fillLevel != null) {
        print('Fill level from direct fields: $fillLevel');
      }
    }

    // Method 3: Check sensor_data
    if (fillLevel == null &&
        data['sensor_data'] != null &&
        data['sensor_data'] is Map) {
      final sensorData = data['sensor_data'] as Map<String, dynamic>;
      fillLevel = _parseInt(sensorData['fillLevel']) ??
          _parseInt(sensorData['fill_level']) ??
          _parseInt(sensorData['level']);

      if (fillLevel != null) {
        print('Fill level from sensor_data: $fillLevel');
      }
    }

    // Method 4: Check readings array (latest reading)
    if (fillLevel == null &&
        data['readings'] != null &&
        data['readings'] is List) {
      final readings = data['readings'] as List;
      if (readings.isNotEmpty) {
        final latestReading = readings.last;
        if (latestReading is Map) {
          final readingMap = latestReading as Map<String, dynamic>;
          fillLevel = _parseInt(readingMap['fillLevel']) ??
              _parseInt(readingMap['fill_level']) ??
              _parseInt(readingMap['level']);

          if (fillLevel != null) {
            print('Fill level from readings: $fillLevel');
          }
        }
      }
    }

    // Method 5: Check status field for text-based levels
    if (fillLevel == null && data['status'] != null) {
      final statusStr = data['status'].toString().toLowerCase();
      if (statusStr.contains('100') || statusStr.contains('full')) {
        fillLevel = 95;
        print('Fill level from status (full): $fillLevel');
      } else if (statusStr.contains('empty') || statusStr.contains('0')) {
        fillLevel = 5;
        print('Fill level from status (empty): $fillLevel');
      } else if (statusStr.contains('half') || statusStr.contains('50')) {
        fillLevel = 50;
        print('Fill level from status (half): $fillLevel');
      }
    }

    // If no valid fill level found, return 0 (don't generate random data)
    if (fillLevel == null) {
      print(
        'WARNING: No fill level data found for bin ${data['binId'] ?? 'unknown'}',
      );
      print('Available fields: ${data.keys.toList()}');
      return 0;
    }

    // Ensure fill level is within valid range
    return math.max(0, math.min(100, fillLevel));
  }

  int? _parseInt(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is double) return value.toInt();
    if (value is String) {
      try {
        return int.parse(value.replaceAll('%', '').trim());
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  double? _parseDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) {
      try {
        return double.parse(value);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  void _showBinDetails(
    String binId,
    int fillLevel,
    String status,
    String address,
    double lat,
    double lng,
    int? routeNumber,
  ) {
    String levelText = fillLevel >= 70
        ? 'HIGH'
        : fillLevel >= 40
            ? 'MEDIUM'
            : 'LOW';
    Color levelColor = fillLevel >= 70
        ? Colors.red
        : fillLevel >= 40
            ? Colors.orange
            : Colors.green;

    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.delete_outline, color: levelColor, size: 24),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    routeNumber != null
                        ? 'Stop #$routeNumber: $binId'
                        : 'Smart Bin: $binId',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: levelColor.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    levelText,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: levelColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'Fill Level: $fillLevel%',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: fillLevel / 100,
              backgroundColor: Colors.grey.shade300,
              valueColor: AlwaysStoppedAnimation<Color>(levelColor),
              minHeight: 8,
            ),
            const SizedBox(height: 12),
            Text('Status: $status', style: const TextStyle(fontSize: 16)),
            Text(
              'Location: $address',
              style: const TextStyle(fontSize: 16),
            ),
            if (routeNumber != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.route,
                      color: Colors.blue.shade700,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'In optimized route (Stop #$routeNumber)',
                      style: TextStyle(
                        color: Colors.blue.shade700,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      if (_mapController != null) {
                        _mapController!.animateCamera(
                          CameraUpdate.newLatLngZoom(LatLng(lat, lng), 17),
                        );
                      }
                    },
                    icon: const Icon(Icons.center_focus_strong),
                    label: const Text('Center on Map'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                    ),
                  ),
                ),
                if (fillLevel >= 40) ...[
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      _addBinToRoute(binId, lat, lng);
                    },
                    icon: const Icon(Icons.add_road),
                    label: const Text('Add to Route'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _addBinToRoute(String binId, double lat, double lng) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Bin $binId added to collection route'),
        backgroundColor: Colors.green,
        action: SnackBarAction(
          label: 'View Route',
          textColor: Colors.white,
          onPressed: () => _fitMarkersInView(),
        ),
      ),
    );
    _optimizeCollectionRoute();
  }

  Future<void> _markPickupAsCompleted(String pickupId) async {
    try {
      await FirebaseFirestore.instance
          .collection('pickups')
          .doc(pickupId)
          .update({'status': 'Completed'});
      await _loadPickupLocations();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Pickup marked as completed!'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error updating pickup: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  String _getCurrentSpeed() {
    if (_currentLocation?.speed != null && _currentLocation!.speed! > 0) {
      return ((_currentLocation!.speed! * 3.6).round()).toString();
    }
    return '0';
  }

  void _refreshSmartBinData() async {
    try {
      final snapshot =
          await FirebaseFirestore.instance.collection('smart_bins').get();
      _handleSmartBinDataChange(snapshot);
    } catch (e) {
      print('Error refreshing smart bin data: $e');
    }
  }

  void _updateSmartBinMarkers() {
    _createMarkersAndRoute();
  }

  void _fitMarkersInView() {
    if (_markers.isEmpty || _mapController == null) return;

    try {
      List<LatLng> positions =
          _markers.map((marker) => marker.position).toList();

      if (positions.length == 1) {
        _mapController!.animateCamera(
          CameraUpdate.newLatLngZoom(positions.first, 15),
        );
        return;
      }

      double minLat = positions.first.latitude;
      double maxLat = positions.first.latitude;
      double minLng = positions.first.longitude;
      double maxLng = positions.first.longitude;

      for (var position in positions) {
        minLat = math.min(minLat, position.latitude);
        maxLat = math.max(maxLat, position.latitude);
        minLng = math.min(minLng, position.longitude);
        maxLng = math.max(maxLng, position.longitude);
      }

      const double padding = 0.01;
      _mapController!.animateCamera(
        CameraUpdate.newLatLngBounds(
          LatLngBounds(
            southwest: LatLng(minLat - padding, minLng - padding),
            northeast: LatLng(maxLat + padding, maxLng + padding),
          ),
          100.0,
        ),
      );
    } catch (e) {
      print('Error fitting markers in view: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final binsNeedingCollection =
        _smartBins.where((bin) => bin['fillLevel'] >= 40).length;
    final highPriorityBins =
        _smartBins.where((bin) => bin['fillLevel'] >= 70).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Route Map',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF42A5F5),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              _loadPickupLocations();
              _getCurrentLocation();
              _refreshSmartBinData();
              _optimizeCollectionRoute();
            },
            tooltip: 'Refresh All Data',
          ),
          IconButton(
            icon: const Icon(Icons.route),
            onPressed: () {
              _optimizeCollectionRoute();
              _fitMarkersInView();
            },
            tooltip: 'Optimize Route',
          ),
          IconButton(
            icon: const Icon(Icons.my_location),
            onPressed: () {
              if (_currentLocation != null && _mapController != null) {
                _mapController!.animateCamera(
                  CameraUpdate.newLatLngZoom(
                    LatLng(
                      _currentLocation!.latitude!,
                      _currentLocation!.longitude!,
                    ),
                    16,
                  ),
                );
              }
            },
            tooltip: 'My Location',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF42A5F5)),
            )
          : Column(
              children: [
                // Route optimization info panel
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.blue.shade50, Colors.white],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.grey.withOpacity(0.2),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.blue.shade100,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              Icons.local_shipping,
                              color: Colors.blue.shade600,
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Optimized Route',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.blue.shade700,
                                  ),
                                ),
                                Text(
                                  '$binsNeedingCollection bins • $_estimatedRouteTime • ${_totalRouteDistance.toStringAsFixed(1)} km',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (highPriorityBins > 0)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.red.shade100,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.priority_high,
                                    color: Colors.red.shade700,
                                    size: 14,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    '$highPriorityBins HIGH',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.red.shade700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(
                            _isLocationLoading
                                ? Icons.gps_not_fixed
                                : Icons.gps_fixed,
                            size: 14,
                            color: _isLocationLoading
                                ? Colors.orange
                                : Colors.green,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _locationStatus,
                            style: TextStyle(
                              fontSize: 12,
                              color: _isLocationLoading
                                  ? Colors.orange
                                  : Colors.green,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.green.shade100,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.update,
                                  color: Colors.green.shade700,
                                  size: 12,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'Auto-refresh 5s',
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: Colors.green.shade700,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Map
                Expanded(
                  child: Stack(
                    children: [
                      GoogleMap(
                        initialCameraPosition: CameraPosition(
                          target: _currentLocation != null
                              ? LatLng(
                                  _currentLocation!.latitude!,
                                  _currentLocation!.longitude!,
                                )
                              : _defaultLocation,
                          zoom: 13,
                        ),
                        markers: _markers,
                        polylines: _polylines,
                        onMapCreated: (controller) {
                          _mapController = controller;
                          Future.delayed(
                            const Duration(milliseconds: 500),
                            _fitMarkersInView,
                          );
                        },
                        myLocationEnabled: false,
                        myLocationButtonEnabled: false,
                        trafficEnabled: true,
                        mapType: MapType.normal,
                        compassEnabled: true,
                      ),

                      // Map controls
                      Positioned(
                        top: 16,
                        right: 16,
                        child: Column(
                          children: [
                            FloatingActionButton.small(
                              heroTag: 'optimize',
                              onPressed: () {
                                _optimizeCollectionRoute();
                                _fitMarkersInView();
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Route optimized!'),
                                    backgroundColor: Colors.blue,
                                    duration: Duration(seconds: 2),
                                  ),
                                );
                              },
                              backgroundColor: Colors.white,
                              child: const Icon(
                                Icons.route,
                                color: Colors.blue,
                              ),
                            ),
                            const SizedBox(height: 8),
                            FloatingActionButton.small(
                              heroTag: 'fit',
                              onPressed: _fitMarkersInView,
                              backgroundColor: Colors.white,
                              child: const Icon(
                                Icons.fit_screen,
                                color: Colors.blue,
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Route statistics overlay
                      if (_optimizedRoute.isNotEmpty)
                        Positioned(
                          bottom: 16,
                          left: 16,
                          right: 16,
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.1),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              children: [
                                _buildStatItem(
                                  Icons.delete,
                                  '$binsNeedingCollection',
                                  'Bins',
                                  Colors.blue,
                                ),
                                _buildStatItem(
                                  Icons.route,
                                  '${_totalRouteDistance.toStringAsFixed(1)} km',
                                  'Distance',
                                  Colors.orange,
                                ),
                                _buildStatItem(
                                  Icons.access_time,
                                  _estimatedRouteTime,
                                  'Time',
                                  Colors.green,
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildStatItem(
    IconData icon,
    String value,
    String label,
    Color color,
  ) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
      ],
    );
  }
}
