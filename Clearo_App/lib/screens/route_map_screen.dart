import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'dart:math' as math;

class RouteMapScreen extends StatefulWidget {
  const RouteMapScreen({Key? key}) : super(key: key);

  @override
  State<RouteMapScreen> createState() => _RouteMapScreenState();
}

class _RouteMapScreenState extends State<RouteMapScreen> {
  late GoogleMapController _mapController;
  final String _googleMapsApiKey = "AIzaSyDtfueebmq-XAr53g5JvZk13F7WCPZqC3M";

  // Default Colombo location
  final LatLng _defaultLocation = const LatLng(6.9271, 79.8612);

  Set<Marker> _markers = {};
  Set<Polyline> _polylines = {};
  List<Map<String, dynamic>> _pickupLocations = [];
  bool _isLoading = true;
  int _currentRouteIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadPickupLocations();
  }

  Future<void> _loadPickupLocations() async {
    try {
      setState(() => _isLoading = true);

      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;

      // Get current user's driver name
      final userDoc =
          await FirebaseFirestore.instance
              .collection('users')
              .doc(user.uid)
              .get();

      if (!userDoc.exists) return;

      final userData = userDoc.data() as Map<String, dynamic>;
      final driverName = userData['name'];

      // Get today's date
      final today = DateTime.now();
      final todayStr =
          "${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}";

      // Fetch today's pickups for this driver
      final pickupsQuery =
          await FirebaseFirestore.instance
              .collection('pickups')
              .where('driverName', isEqualTo: driverName)
              .where('date', isEqualTo: todayStr)
              .get();

      List<Map<String, dynamic>> pickups = [];

      for (var doc in pickupsQuery.docs) {
        final data = doc.data();
        pickups.add({
          'id': doc.id,
          'binId': data['binId'],
          'location': data['location'],
          'status': data['status'],
          'coordinates':
              data['coordinates'] ??
              _getDefaultCoordinatesForLocation(data['location']),
        });
      }

      setState(() {
        _pickupLocations = pickups;
      });

      _createMarkersAndRoute();
    } catch (e) {
      print('Error loading pickup locations: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Map<String, double> _getDefaultCoordinatesForLocation(String? location) {
    // Default coordinates for common areas in Colombo
    final defaultLocations = {
      'Colombo 01': {'lat': 6.9344, 'lng': 79.8428},
      'Colombo 02': {'lat': 6.9388, 'lng': 79.8540},
      'Colombo 03': {'lat': 6.9147, 'lng': 79.8501},
      'Colombo 04': {'lat': 6.8905, 'lng': 79.8587},
      'Colombo 05': {'lat': 6.8851, 'lng': 79.8738},
      'Colombo 06': {'lat': 6.8977, 'lng': 79.8687},
      'Colombo 07': {'lat': 6.9167, 'lng': 79.8742},
    };

    for (var key in defaultLocations.keys) {
      if (location?.contains(key) == true) {
        return defaultLocations[key]!;
      }
    }

    // Default to Colombo center if no match
    return {'lat': 6.9271, 'lng': 79.8612};
  }

  Future<void> _createMarkersAndRoute() async {
    Set<Marker> markers = {};

    // Add markers for each pickup location
    for (int i = 0; i < _pickupLocations.length; i++) {
      final pickup = _pickupLocations[i];
      final coords = pickup['coordinates'];

      markers.add(
        Marker(
          markerId: MarkerId(pickup['id']),
          position: LatLng(coords['lat'], coords['lng']),
          infoWindow: InfoWindow(
            title: 'Stop ${i + 1}: ${pickup['binId']}',
            snippet: '${pickup['location']} - ${pickup['status']}',
          ),
          icon: BitmapDescriptor.defaultMarkerWithHue(
            pickup['status'] == 'Completed'
                ? BitmapDescriptor.hueGreen
                : BitmapDescriptor.hueRed,
          ),
        ),
      );
    }

    setState(() {
      _markers = markers;
    });

    if (_pickupLocations.length > 1) {
      await _createOptimizedRoute();
    }
  }

  Future<void> _createOptimizedRoute() async {
    try {
      if (_pickupLocations.length < 2) return;

      // Create waypoints string for Google Directions API
      String waypoints = '';
      for (int i = 0; i < _pickupLocations.length; i++) {
        final coords = _pickupLocations[i]['coordinates'];
        waypoints += '${coords['lat']},${coords['lng']}';

        if (i < _pickupLocations.length - 1) {
          waypoints += '|';
        }
      }

      final firstCoords = _pickupLocations.first['coordinates'];
      final lastCoords = _pickupLocations.last['coordinates'];

      final String url =
          'https://maps.googleapis.com/maps/api/directions/json?'
          'origin=${firstCoords['lat']},${firstCoords['lng']}&'
          'destination=${lastCoords['lat']},${lastCoords['lng']}&'
          'waypoints=optimize:true|$waypoints&'
          'key=$_googleMapsApiKey';

      final response = await http.get(Uri.parse(url));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        if (data['routes'].isNotEmpty) {
          final route = data['routes'][0];
          final polylinePoints = route['overview_polyline']['points'];
          final coordinates = _decodePolyline(polylinePoints);

          setState(() {
            _polylines = {
              Polyline(
                polylineId: const PolylineId('route'),
                points: coordinates,
                color: Colors.blue,
                width: 4,
                patterns: [PatternItem.dash(20), PatternItem.gap(10)],
              ),
            };
          });
        }
      }
    } catch (e) {
      print('Error creating route: $e');
    }
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Route Map'),
        backgroundColor: const Color(0xFF42A5F5),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadPickupLocations,
          ),
        ],
      ),
      body:
          _isLoading
              ? const Center(child: CircularProgressIndicator())
              : Column(
                children: [
                  // Route info panel
                  Container(
                    padding: const EdgeInsets.all(16),
                    color: Colors.blue.shade50,
                    child: Row(
                      children: [
                        Icon(Icons.route, color: Colors.blue.shade600),
                        const SizedBox(width: 8),
                        Text(
                          'Today\'s Route: ${_pickupLocations.length} stops',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.blue.shade700,
                          ),
                        ),
                        const Spacer(),
                        Text(
                          'Completed: ${_pickupLocations.where((p) => p['status'] == 'Completed').length}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.green.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Map
                  Expanded(
                    child:
                        _pickupLocations.isEmpty
                            ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.map_outlined,
                                    size: 64,
                                    color: Colors.grey.shade400,
                                  ),
                                  const SizedBox(height: 16),
                                  const Text(
                                    'No pickup locations for today',
                                    style: TextStyle(
                                      fontSize: 18,
                                      color: Colors.grey,
                                    ),
                                  ),
                                ],
                              ),
                            )
                            : GoogleMap(
                              initialCameraPosition: CameraPosition(
                                target: _defaultLocation,
                                zoom: 12,
                              ),
                              markers: _markers,
                              polylines: _polylines,
                              onMapCreated: (controller) {
                                _mapController = controller;
                                if (_pickupLocations.isNotEmpty) {
                                  _fitMarkersInView();
                                }
                              },
                              myLocationEnabled: true,
                              trafficEnabled: true,
                            ),
                  ),

                  // Bottom pickup list
                  if (_pickupLocations.isNotEmpty)
                    Container(
                      height: 120,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.all(8),
                        itemCount: _pickupLocations.length,
                        itemBuilder: (context, index) {
                          final pickup = _pickupLocations[index];
                          return Card(
                            margin: const EdgeInsets.symmetric(horizontal: 4),
                            child: InkWell(
                              onTap: () {
                                final coords = pickup['coordinates'];
                                _mapController.animateCamera(
                                  CameraUpdate.newLatLng(
                                    LatLng(coords['lat'], coords['lng']),
                                  ),
                                );
                              },
                              child: Container(
                                width: 160,
                                padding: const EdgeInsets.all(12),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        CircleAvatar(
                                          radius: 12,
                                          backgroundColor:
                                              pickup['status'] == 'Completed'
                                                  ? Colors.green
                                                  : Colors.red,
                                          child: Text(
                                            (index + 1).toString(),
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            pickup['binId'],
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 12,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      pickup['location'] ?? 'Unknown location',
                                      style: const TextStyle(fontSize: 11),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 4),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color:
                                            pickup['status'] == 'Completed'
                                                ? Colors.green.shade100
                                                : Colors.orange.shade100,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        pickup['status'],
                                        style: TextStyle(
                                          fontSize: 10,
                                          color:
                                              pickup['status'] == 'Completed'
                                                  ? Colors.green.shade700
                                                  : Colors.orange.shade700,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                ],
              ),
    );
  }

  void _fitMarkersInView() {
    if (_pickupLocations.isEmpty) return;

    double minLat = _pickupLocations.first['coordinates']['lat'];
    double maxLat = _pickupLocations.first['coordinates']['lat'];
    double minLng = _pickupLocations.first['coordinates']['lng'];
    double maxLng = _pickupLocations.first['coordinates']['lng'];

    for (var pickup in _pickupLocations) {
      final coords = pickup['coordinates'];
      minLat = math.min(minLat, coords['lat']);
      maxLat = math.max(maxLat, coords['lat']);
      minLng = math.min(minLng, coords['lng']);
      maxLng = math.max(maxLng, coords['lng']);
    }

    _mapController.animateCamera(
      CameraUpdate.newLatLngBounds(
        LatLngBounds(
          southwest: LatLng(minLat - 0.01, minLng - 0.01),
          northeast: LatLng(maxLat + 0.01, maxLng + 0.01),
        ),
        100.0,
      ),
    );
  }
}
