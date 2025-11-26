import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'chat_screen.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:image/image.dart' as img;

class CommunitySharingScreen extends StatefulWidget {
  const CommunitySharingScreen({Key? key}) : super(key: key);

  @override
  State<CommunitySharingScreen> createState() => _CommunitySharingScreenState();
}

class _CommunitySharingScreenState extends State<CommunitySharingScreen> {
  // Pastel color palette
  final Color _primaryColor = const Color.fromARGB(
    255,
    164,
    188,
    93,
  ); // Soft blue
  final Color _secondaryColor = const Color.fromARGB(
    255,
    91,
    60,
    171,
  ); // Lavender
  final Color _accentColor = const Color.fromARGB(255, 112, 167, 134); // Pink
  final Color _darkColor = const Color.fromARGB(255, 28, 26, 58); // Dark purple
  final Color _lightColor = const Color(0xFFF5F5F5); // Off-white
  final Color _successColor = const Color.fromARGB(
    255,
    195,
    151,
    115,
  ); // Mint green
  final Color _warningColor = const Color(0xFFFFD3B6); // Peach

  final List<Map<String, dynamic>> _sharedItems = [];

  final List<Map<String, dynamic>> _cartItems = [];
  String _searchQuery = '';
  String _selectedFilter = 'All';
  String _selectedCategory = 'All';
  bool _isFilterExpanded = false;
  bool _isUploading = false; // Tracks the upload state

  // Add toggle section state
  String _selectedHub = 'ALL';
  List<Map<String, dynamic>> _communityPosts = []; // Add community posts list

  final List<String> _filters = [
    'All',
    'Free',
    'Rs. 0 - Rs. 2000',
    'Rs. 2000+',
  ];

  final List<String> _categories = [
    'All',
    'Waste Bins',
    'Furniture',
    'Electronics',
    'Home Goods',
    'Craft Works',
  ];

  @override
  void initState() {
    super.initState();
    _fetchSharedItems();
    _fetchCommunityPosts(); // Fetch community posts
  }

  Future<void> _fetchSharedItems() async {
    try {
      final querySnapshot = await FirebaseFirestore.instance
          .collection('sharedItems')
          .orderBy('createdAt', descending: true)
          .get();

      setState(() {
        _sharedItems.clear();
        for (var doc in querySnapshot.docs) {
          _sharedItems.add({'id': doc.id, ...doc.data()});
        }
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error fetching items: $e'),
          backgroundColor: Colors.red,
        ),
      );
      // <-- Add this closing parenthesis and semicolon to fix the error
    }
  }

  Future<void> _fetchCartItems() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        throw Exception('User not authenticated');
      }

      final querySnapshot = await FirebaseFirestore.instance
          .collection('carts')
          .doc(user.uid)
          .collection('items')
          .get();

      setState(() {
        _cartItems.clear();
        for (var doc in querySnapshot.docs) {
          _cartItems.add({'id': doc.id, ...doc.data()});
        }
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error fetching cart items: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _fetchCommunityPosts() async {
    try {
      final querySnapshot = await FirebaseFirestore.instance
          .collection('communityPosts')
          .orderBy('createdAt', descending: true)
          .get();

      setState(() {
        _communityPosts.clear();
        for (var doc in querySnapshot.docs) {
          _communityPosts.add({'id': doc.id, ...doc.data()});
        }
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error fetching community posts: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _fetchClaimedItems() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        throw Exception('User not authenticated');
      }

      final querySnapshot = await FirebaseFirestore.instance
          .collection('claimedItems')
          .doc(user.uid)
          .collection('items')
          .get();

      setState(() {
        _sharedItems.removeWhere((item) => item['status'] == 'Claimed');
        for (var doc in querySnapshot.docs) {
          _sharedItems.add({'id': doc.id, ...doc.data(), 'status': 'Claimed'});
        }
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error fetching claimed items: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  // Filter items based on selected hub
  List<Map<String, dynamic>> _getHubFilteredItems() {
    if (_selectedHub == 'COMMUNITY') {
      return []; // Return empty for items when community is selected
    }

    final allFiltered = _getFilteredItems();
    if (_selectedHub == 'ALL') {
      return allFiltered;
    } else if (_selectedHub == 'SHARE') {
      return allFiltered
          .where((item) => item['category'] != 'Craft Works')
          .toList();
    } else if (_selectedHub == 'CRAFT') {
      return allFiltered
          .where((item) => item['category'] == 'Craft Works')
          .toList();
    }
    return allFiltered;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _lightColor,
      appBar: AppBar(
        title: const Text(
          'Community Sharing',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        backgroundColor: _primaryColor,
        elevation: 0,
        centerTitle: true,
        actions: [_buildCartButton()],
      ),
      body: Column(
        children: [
          _buildSearchBar(),
          _buildFilterSection(),
          _buildHubToggleSection(),
          Expanded(
            child: _selectedHub == 'COMMUNITY'
                ? _buildCommunityFeed()
                : _getHubFilteredItems().isEmpty
                    ? _buildEmptyState()
                    : _buildItemGridWithItems(_getHubFilteredItems()),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _selectedHub == 'COMMUNITY'
            ? _showAddCommunityPostDialog
            : _showAddItemDialog,
        backgroundColor: _accentColor,
        child: const Icon(Icons.add, color: Colors.white),
      ),
      bottomNavigationBar: BottomAppBar(
        shape: const CircularNotchedRectangle(),
        notchMargin: 8.0,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            IconButton(
              icon: const Icon(Icons.history, color: Colors.grey),
              onPressed: _showCommunitySharingHistory,
            ),
            // Add "My Stuff" icon button between history and your items
            IconButton(
              icon: const Icon(Icons.folder, color: Colors.grey),
              tooltip: 'My Stuff',
              onPressed:
                  _showOwnerStuffSection, // Call a method to show owner's stuff
            ),
            IconButton(
              icon: const Icon(Icons.inventory, color: Colors.grey),
              onPressed: _showYourItems,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCartButton() {
    return Stack(
      children: [
        IconButton(
          icon: const Icon(Icons.shopping_cart, color: Colors.white),
          onPressed: _showCartDialog,
        ),
        if (_cartItems.isNotEmpty)
          Positioned(
            right: 8,
            top: 8,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: _accentColor,
                borderRadius: BorderRadius.circular(10),
              ),
              constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
              child: Text(
                '${_cartItems.length}',
                style: const TextStyle(color: Colors.white, fontSize: 10),
                textAlign: TextAlign.center,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: TextField(
        onChanged: (value) =>
            setState(() => _searchQuery = value.toLowerCase()),
        decoration: InputDecoration(
          hintText: 'Search items...',
          prefixIcon: Icon(Icons.search, color: _darkColor),
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          contentPadding: const EdgeInsets.symmetric(vertical: 0),
        ),
      ),
    );
  }

  Widget _buildFilterSection() {
    return Column(
      children: [
        InkWell(
          onTap: () => setState(() => _isFilterExpanded = !_isFilterExpanded),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 6,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Filters',
                  style: TextStyle(
                    color: _darkColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Icon(
                  _isFilterExpanded ? Icons.expand_less : Icons.expand_more,
                  color: _darkColor,
                ),
              ],
            ),
          ),
        ),
        if (_isFilterExpanded) ...[
          const SizedBox(height: 8),
          _buildCategoryFilter(),
          const SizedBox(height: 8),
          _buildPriceFilter(),
          const SizedBox(height: 8),
        ],
      ],
    );
  }

  Widget _buildCategoryFilter() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: _categories.map((category) {
          final isSelected = _selectedCategory == category;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(category),
              selected: isSelected,
              onSelected: (selected) =>
                  setState(() => _selectedCategory = category),
              backgroundColor: Colors.white,
              selectedColor: _primaryColor.withOpacity(0.3),
              labelStyle: TextStyle(
                color: isSelected ? _darkColor : Colors.black54,
              ),
              shape: StadiumBorder(
                side: BorderSide(
                  color: isSelected ? _primaryColor : Colors.grey.shade300,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildPriceFilter() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: _filters.map((filter) {
          final isSelected = _selectedFilter == filter;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(filter),
              selected: isSelected,
              onSelected: (selected) =>
                  setState(() => _selectedFilter = filter),
              backgroundColor: Colors.white,
              selectedColor: _secondaryColor.withOpacity(0.3),
              labelStyle: TextStyle(
                color: isSelected ? _darkColor : Colors.black54,
              ),
              shape: StadiumBorder(
                side: BorderSide(
                  color: isSelected ? _secondaryColor : Colors.grey.shade300,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // Toggle section widget
  Widget _buildHubToggleSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildHubToggleButton('ALL', 'All'),
            const SizedBox(width: 12),
            _buildHubToggleButton('SHARE', 'Share Hub'),
            const SizedBox(width: 12),
            _buildHubToggleButton('CRAFT', 'Craft Hub'),
            const SizedBox(width: 12),
            _buildHubToggleButton('COMMUNITY', 'Community'),
          ],
        ),
      ),
    );
  }

  Widget _buildHubToggleButton(String value, String label) {
    final bool selected = _selectedHub == value;
    return ElevatedButton(
      onPressed: () {
        setState(() {
          _selectedHub = value;
        });
      },
      style: ElevatedButton.styleFrom(
        backgroundColor: selected ? _primaryColor : Colors.white,
        foregroundColor: selected ? Colors.white : _darkColor,
        elevation: selected ? 2 : 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: selected ? _primaryColor : Colors.grey.shade300,
          ),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
      ),
      child: Text(label, style: TextStyle(fontWeight: FontWeight.bold)),
    );
  }

  // Use this instead of _buildItemGrid for hub filtering
  Widget _buildItemGridWithItems(List<Map<String, dynamic>> items) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        childAspectRatio: 0.8,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return _buildItemCard(item);
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.search_off,
            size: 60,
            color: _primaryColor.withOpacity(0.3),
          ),
          const SizedBox(height: 16),
          Text(
            'No items found',
            style: TextStyle(
              fontSize: 18,
              color: _darkColor,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Try adjusting your search or filters',
            style: TextStyle(color: Colors.grey.shade600),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _showAddItemDialog,
            style: ElevatedButton.styleFrom(
              backgroundColor: _primaryColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            child: const Text(
              'Add New Item',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildItemGrid() {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
        childAspectRatio: 0.8,
      ),
      itemCount: _getFilteredItems().length,
      itemBuilder: (context, index) {
        final item = _getFilteredItems()[index];
        return _buildItemCard(item);
      },
    );
  }

  Widget _buildItemCard(Map<String, dynamic> item) {
    final user = FirebaseAuth.instance.currentUser;
    final isOwner = user != null && item['ownerId'] == user.uid;

    return GestureDetector(
      onTap: () => _showItemDetails(item, isOwner),
      child: Card(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Stack(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(16),
                    ),
                    child: item['imageUrl'] != null
                        ? Image.network(
                            item['imageUrl'],
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => Icon(
                              Icons.broken_image,
                              color: Colors.grey,
                            ),
                          )
                        : Container(
                            color: _lightColor,
                            child: Icon(
                              Icons.image,
                              size: 48,
                              color: _primaryColor,
                            ),
                          ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item['title'] ?? 'No Title',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: _darkColor,
                          fontSize: 16,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        item['price'] ?? 'No Price',
                        style: TextStyle(
                          color: item['price'] == 'Free'
                              ? _successColor
                              : _secondaryColor,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(
                            Icons.person_outline,
                            size: 16,
                            color: Colors.grey,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              item['owner'] ?? 'Unknown Owner',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade600,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      // Removed the chat button for non-owners
                    ],
                  ),
                ),
              ],
            ),
            if (isOwner)
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: _primaryColor.withOpacity(0.8),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    'Your Stuff',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  // Duplicate _navigateToChatScreen removed

  void _showItemDetails(Map<String, dynamic> item, bool isOwner) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.85,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(24),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 10,
              spreadRadius: 5,
            ),
          ],
        ),
        child: Column(
          children: [
            GestureDetector(
              onTap: () => _showFullImage(item['imageUrl']),
              child: Container(
                height: 200,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: _lightColor,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(24),
                  ),
                ),
                child: item['imageUrl'] != null
                    ? Image.network(
                        item['imageUrl'],
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => Icon(
                          Icons.broken_image,
                          color: Colors.grey,
                        ),
                      )
                    : Icon(Icons.image, size: 80, color: _primaryColor),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        item['title'] ?? 'No Title',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: _darkColor,
                        ),
                      ),
                      Text(
                        item['price'] ?? 'No Price',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: item['price'] == 'Free'
                              ? _successColor
                              : _secondaryColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    item['category'] ?? 'No Category',
                    style: TextStyle(
                      color: _primaryColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    item['description'] ?? 'No Description',
                    style: const TextStyle(fontSize: 16),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: _primaryColor.withOpacity(0.2),
                        child: Icon(Icons.person, color: _primaryColor),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Shared by',
                            style: TextStyle(
                              color: Colors.grey.shade600,
                              fontSize: 12,
                            ),
                          ),
                          Text(
                            item['owner'] ?? 'Unknown Owner',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: _darkColor,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  if (isOwner)
                    Column(
                      children: [
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: () => _viewMessages(item),
                            icon: const Icon(
                              Icons.message,
                              color: Colors.white,
                            ),
                            label: const Text(
                              'View Messages',
                              style: TextStyle(color: Colors.white),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _secondaryColor,
                              padding: const EdgeInsets.symmetric(
                                vertical: 16,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                      ],
                    )
                  else
                    Column(
                      children: [
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: () => _addToCartAndNavigate(item),
                            icon: const Icon(
                              Icons.add_shopping_cart,
                              color: Colors.white,
                            ),
                            label: const Text(
                              'Add to Cart',
                              style: TextStyle(color: Colors.white),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _primaryColor,
                              padding: const EdgeInsets.symmetric(
                                vertical: 16,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: () => _navigateToChatScreen(item),
                            icon: const Icon(
                              Icons.chat,
                              color: Colors.white,
                            ),
                            label: const Text(
                              'Chat with Owner',
                              style: TextStyle(color: Colors.white),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _secondaryColor,
                              padding: const EdgeInsets.symmetric(
                                vertical: 16,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showFullImage(String? imageUrl) {
    if (imageUrl == null) return;

    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.black,
        child: GestureDetector(
          onTap: () => Navigator.pop(context),
          child: InteractiveViewer(
            child: Image.network(
              imageUrl,
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) =>
                  Icon(Icons.broken_image, color: Colors.grey),
            ),
          ),
        ),
      ),
    );
  }

  void _editItem(Map<String, dynamic> item) {
    Navigator.pop(context); // Close the details modal
    // Implement the edit functionality here
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Edit functionality not implemented yet.'),
        backgroundColor: Colors.orange,
      ),
    );
  }

  Future<void> _deleteItem(Map<String, dynamic> item) async {
    try {
      await FirebaseFirestore.instance
          .collection('sharedItems')
          .doc(item['id'])
          .delete();
      await _fetchSharedItems(); // Refresh the list
      Navigator.pop(context); // Close the details modal
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Item deleted successfully.'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error deleting item: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  // Removed duplicate _showItemDetails method

  Future<void> _addToCartAndNavigate(Map<String, dynamic> item) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        throw Exception('User not authenticated');
      }

      // Save item to Firestore cart collection
      await FirebaseFirestore.instance
          .collection('carts')
          .doc(user.uid)
          .collection('items')
          .doc(item['id'])
          .set(item);

      await _fetchCartItems(); // Fetch updated cart items
      Navigator.pop(context); // Close the item details modal
      Future.delayed(const Duration(milliseconds: 300), () {
        _showCartDialog(); // Navigate to the cart
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error adding to cart: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  List<Map<String, dynamic>> _getFilteredItems() {
    return _sharedItems.where((item) {
      final matchesSearch = item['title']
              .toString()
              .toLowerCase()
              .contains(_searchQuery) ||
          item['description'].toString().toLowerCase().contains(_searchQuery);

      final matchesFilter = _selectedFilter == 'All' ||
          (_selectedFilter == 'Free' && item['price'] == 'Free') ||
          (_selectedFilter == 'Rs. 0 - Rs. 2000' &&
              item['price'] != 'Free' &&
              item['priceValue'] <= 2000) ||
          (_selectedFilter == 'Rs. 2000+' &&
              item['price'] != 'Free' &&
              item['priceValue'] > 2000);

      final matchesCategory =
          _selectedCategory == 'All' || item['category'] == _selectedCategory;

      return matchesSearch && matchesFilter && matchesCategory;
    }).toList();
  }

  void _addToCart(Map<String, dynamic> item) {
    if (_cartItems.any((cartItem) => cartItem['id'] == item['id'])) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${item['title']} is already in your cart'),
          backgroundColor: _warningColor,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
      return;
    }

    setState(() {
      _cartItems.add(item);
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${item['title']} added to cart'),
        backgroundColor: _successColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        action: SnackBarAction(
          label: 'UNDO',
          textColor: Colors.white,
          onPressed: () {
            setState(() {
              _cartItems.remove(item);
            });
          },
        ),
      ),
    );
  }

  void _showCheckoutDialog() {
    String _selectedCollectionOption = 'Pickup from your house';
    String? _selectedPaymentMethod = 'Cash on Delivery';

    final totalPrice = _cartItems.fold<int>(
      0,
      (sum, item) => sum + ((item['priceValue'] ?? 0) as int),
    );

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Checkout'),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Total Price: Rs. $totalPrice',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _selectedCollectionOption,
                  decoration: const InputDecoration(
                    labelText: 'Collection Details',
                    border: OutlineInputBorder(),
                  ),
                  items: [
                    'Pickup from your house',
                    'Courier service',
                    'Meet at a designated location',
                  ].map((option) {
                    return DropdownMenuItem(
                      value: option,
                      child: Text(option),
                    );
                  }).toList(),
                  onChanged: (value) {
                    _selectedCollectionOption = value!;
                  },
                ),
                const SizedBox(height: 16),
                if (totalPrice > 0)
                  DropdownButtonFormField<String>(
                    value: _selectedPaymentMethod,
                    decoration: const InputDecoration(
                      labelText: 'Payment Method',
                      border: OutlineInputBorder(),
                    ),
                    items:
                        ['Cash on Delivery', 'Credit Card', 'Debit Card'].map((
                      method,
                    ) {
                      return DropdownMenuItem(
                        value: method,
                        child: Text(method),
                      );
                    }).toList(),
                    onChanged: (value) {
                      _selectedPaymentMethod = value!;
                    },
                  )
                else
                  Text(
                    'Payment method is not required for free items.',
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                  ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context); // Close the checkout dialog
                _confirmOrder(
                  totalPrice,
                  _selectedCollectionOption,
                  totalPrice > 0 ? _selectedPaymentMethod : null,
                );
              },
              child: const Text('Proceed'),
            ),
          ],
        );
      },
    );
  }

  void _showCardPaymentDialog(
    int totalPrice,
    String collectionDetails,
    String paymentMethod,
  ) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Card Payment'),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                TextField(
                  decoration: InputDecoration(
                    labelText: 'Card Number',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.number,
                ),
                SizedBox(height: 16),
                TextField(
                  decoration: InputDecoration(
                    labelText: 'Expiry Date',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.datetime,
                ),
                SizedBox(height: 16),
                TextField(
                  decoration: InputDecoration(
                    labelText: 'CVV',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.number,
                  obscureText: true,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context); // Close the card payment dialog
                _confirmOrder(totalPrice, collectionDetails, paymentMethod);
              },
              child: const Text('Confirm Payment'),
            ),
          ],
        );
      },
    );
  }

  void _confirmOrder(
    int totalPrice,
    String collectionDetails,
    String? paymentMethod,
  ) async {
    final orderDetails = {
      'items': List<Map<String, dynamic>>.from(_cartItems),
      'totalPrice': totalPrice,
      'collectionDetails': collectionDetails,
      'paymentMethod': paymentMethod,
      'status': totalPrice == 0 ? 'Claimed' : 'Pending Payment',
    };

    try {
      // Save order details to Firestore
      await _saveOrderDetails(orderDetails);

      setState(() {
        // Remove items from cart and update claimed items
        for (var item in orderDetails['items'] as List<Map<String, dynamic>>) {
          _cartItems.removeWhere((cartItem) => cartItem['id'] == item['id']);
          final index = _sharedItems.indexWhere(
            (sharedItem) => sharedItem['id'] == item['id'],
          );
          if (index != -1) {
            _sharedItems.removeAt(index); // Remove item from screen
          }
        }
      });

      // Remove items from cart in Firestore
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        for (var item in orderDetails['items'] as List<Map<String, dynamic>>) {
          await FirebaseFirestore.instance
              .collection('carts')
              .doc(user.uid)
              .collection('items')
              .doc(item['id'])
              .delete(); // Remove item from cart in Firestore
        }
      }

      // Save claimed items to Firestore
      if (user != null) {
        for (var item in orderDetails['items'] as List<Map<String, dynamic>>) {
          await FirebaseFirestore.instance
              .collection('claimedItems')
              .doc(user.uid)
              .collection('items')
              .doc(item['id'])
              .set(item);
        }
      }

      // Close the cart dialog
      Navigator.pop(context);

      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            totalPrice == 0
                ? 'Items claimed successfully!'
                : 'Order placed successfully!',
          ),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      // Show error message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error processing order: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _saveOrderDetails(Map<String, dynamic> orderDetails) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      throw Exception('User not authenticated');
    }

    final orderData = {
      'userId': user.uid,
      ...orderDetails,
      'orderDate': FieldValue.serverTimestamp(),
    };

    // Save order to Firestore
    await FirebaseFirestore.instance.collection('orders').add(orderData);

    // Update the status of claimed items in Firestore
    for (var item in orderDetails['items'] as List<Map<String, dynamic>>) {
      await FirebaseFirestore.instance
          .collection('sharedItems')
          .doc(item['id'])
          .update({'status': 'Claimed'});
    }
  }

  void _showClaimedItemsDialog() async {
    await _fetchClaimedItems(); // Fetch claimed items from Firestore
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(24),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 10,
              spreadRadius: 5,
            ),
          ],
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Claimed Items',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: _darkColor,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: Colors.grey.shade200),
            Expanded(
              child: _getClaimedItems().isEmpty
                  ? Center(
                      child: Text(
                        'No claimed items yet.',
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 16,
                        ),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _getClaimedItems().length,
                      itemBuilder: (context, index) {
                        final item = _getClaimedItems()[index];
                        return ListTile(
                          leading: item['imageUrl'] != null
                              ? Image.network(
                                  item['imageUrl'],
                                  width: 50,
                                  height: 50,
                                )
                              : Icon(
                                  Icons.image,
                                  color: _primaryColor,
                                ),
                          title: Text(item['title'] ?? 'No Title'),
                          subtitle: Text(item['price'] ?? 'No Price'),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  List<Map<String, dynamic>> _getClaimedItems() {
    return _sharedItems.where((item) => item['status'] == 'Claimed').toList();
  }

  Widget _buildClaimedSection() {
    final claimedItems = _getClaimedItems();
    return claimedItems.isEmpty
        ? Center(
            child: Text(
              'No claimed items yet.',
              style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
            ),
          )
        : ListView.builder(
            itemCount: claimedItems.length,
            itemBuilder: (context, index) {
              final item = claimedItems[index];
              return ListTile(
                leading: item['imageUrl'] != null
                    ? Image.network(item['imageUrl'], width: 50, height: 50)
                    : Icon(Icons.image, color: _primaryColor),
                title: Text(item['title'] ?? 'No Title'),
                subtitle: Text(item['price'] ?? 'No Price'),
              );
            },
          );
  }

  void _showCartDialog() async {
    await _fetchCartItems(); // Ensure cart is updated before showing
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(24),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 10,
              spreadRadius: 5,
            ),
          ],
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Your Cart',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: _darkColor,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: Colors.grey.shade200),
            Expanded(
              child: _cartItems.isEmpty
                  ? _buildEmptyCart()
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _cartItems.length,
                      itemBuilder: (context, index) {
                        final item = _cartItems[index];
                        return _buildCartItem(item);
                      },
                    ),
            ),
            if (_cartItems.isNotEmpty) ...[
              Divider(height: 1, color: Colors.grey.shade200),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Total Items:',
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 16,
                          ),
                        ),
                        Text(
                          '${_cartItems.length}',
                          style: TextStyle(
                            color: _darkColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _showCheckoutDialog,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _primaryColor,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text(
                          'CHECKOUT',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyCart() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.shopping_cart_outlined,
            size: 60,
            color: _primaryColor.withOpacity(0.3),
          ),
          const SizedBox(height: 16),
          Text(
            'Your cart is empty',
            style: TextStyle(
              fontSize: 18,
              color: _darkColor,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Browse items and add them to your cart',
            style: TextStyle(color: Colors.grey.shade600),
          ),
        ],
      ),
    );
  }

  Widget _buildCartItem(Map<String, dynamic> item) {
    return Dismissible(
      key: Key(item['id']),
      background: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: _accentColor.withOpacity(0.2),
          borderRadius: BorderRadius.circular(12),
        ),
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        child: Icon(Icons.delete, color: _accentColor),
      ),
      direction: DismissDirection.endToStart,
      onDismissed: (direction) async {
        await _removeFromCart(item);
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              spreadRadius: 2,
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: _lightColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: item['imageUrl'] != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        item['imageUrl'],
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) =>
                            Icon(Icons.broken_image, color: Colors.grey),
                      ),
                    )
                  : Icon(Icons.image, color: _primaryColor),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item['title'] ?? 'No Title',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: _darkColor,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item['price'] ?? 'No Price',
                    style: TextStyle(
                      color: item['price'] == 'Free'
                          ? _successColor
                          : _secondaryColor,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.delete, color: Colors.red),
              onPressed: () async {
                await _removeFromCartAndClose(item);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _removeFromCart(Map<String, dynamic> item) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        await FirebaseFirestore.instance
            .collection('carts')
            .doc(user.uid)
            .collection('items')
            .doc(item['id'])
            .delete();
      }
      setState(() {
        _cartItems.remove(item);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${item['title']} removed from cart'),
          backgroundColor: _accentColor,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error removing item: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _removeFromCartAndClose(Map<String, dynamic> item) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        await FirebaseFirestore.instance
            .collection('carts')
            .doc(user.uid)
            .collection('items')
            .doc(item['id'])
            .delete();
      }
      setState(() {
        _cartItems.remove(item);
      });
      Navigator.pop(context); // Close the cart dialog
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${item['title']} removed from cart'),
          backgroundColor: _accentColor,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error removing item: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showAddItemDialog() {
    final ImagePicker _picker = ImagePicker();
    XFile? _selectedImage;
    final TextEditingController _titleController = TextEditingController();
    final TextEditingController _descriptionController =
        TextEditingController();
    final TextEditingController _priceController = TextEditingController();
    final TextEditingController _expirationController = TextEditingController();
    String? _selectedCategory;
    bool _isUploading = false;

    Future<void> _pickImage(ImageSource source) async {
      try {
        final pickedImage = await _picker.pickImage(source: source);
        if (pickedImage != null) {
          setState(() {
            _selectedImage = pickedImage;
          });
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error picking image: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }

    showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => StatefulBuilder(
              builder: (context, setState) => Container(
                height: MediaQuery.of(context).size.height * 0.9,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(24),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 10,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: SingleChildScrollView(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Add New Item',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: _darkColor,
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.close),
                              onPressed: _isUploading
                                  ? null
                                  : () => Navigator.pop(context),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        GestureDetector(
                          onTap: _isUploading
                              ? null
                              : () async {
                                  showModalBottomSheet(
                                    context: context,
                                    builder: (ctx) => Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        ListTile(
                                          leading: const Icon(
                                            Icons.camera_alt,
                                          ),
                                          title: const Text(
                                            'Take a Photo',
                                          ),
                                          onTap: () {
                                            Navigator.pop(context);
                                            _pickImage(
                                              ImageSource.camera,
                                            );
                                          },
                                        ),
                                        ListTile(
                                          leading: const Icon(
                                            Icons.photo_library,
                                          ),
                                          title: const Text(
                                            'Choose from Gallery',
                                          ),
                                          onTap: () {
                                            Navigator.pop(context);
                                            _pickImage(
                                              ImageSource.gallery,
                                            );
                                          },
                                        ),
                                      ],
                                    ),
                                  );
                                },
                          child: Container(
                            height: 150,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              color: _lightColor,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: _primaryColor.withOpacity(0.5),
                                width: 2,
                              ),
                            ),
                            child: _selectedImage == null
                                ? Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.add_a_photo,
                                        size: 40,
                                        color: _primaryColor,
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        'Add Photo',
                                        style: TextStyle(
                                          color: _primaryColor,
                                        ),
                                      ),
                                    ],
                                  )
                                : ClipRRect(
                                    borderRadius: BorderRadius.circular(10),
                                    child: Image.file(
                                      File(_selectedImage!.path),
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                          ),
                        ),
                        const SizedBox(height: 24),
                        TextField(
                          controller: _titleController,
                          decoration: InputDecoration(
                            labelText: 'Title',
                            labelStyle: TextStyle(color: _darkColor),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: _primaryColor),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: _primaryColor),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _descriptionController,
                          decoration: InputDecoration(
                            labelText: 'Description',
                            labelStyle: TextStyle(color: _darkColor),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: _primaryColor),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: _primaryColor),
                            ),
                          ),
                          maxLines: 3,
                        ),
                        const SizedBox(height: 16),
                        DropdownButtonFormField<String>(
                          value: _selectedCategory,
                          decoration: InputDecoration(
                            labelText: 'Category',
                            labelStyle: TextStyle(color: _darkColor),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: _primaryColor),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: _primaryColor),
                            ),
                          ),
                          items: _categories
                              .where((category) => category != 'All')
                              .map(
                                (category) => DropdownMenuItem(
                                  value: category,
                                  child: Text(category),
                                ),
                              )
                              .toList(),
                          onChanged: (value) {
                            setState(() {
                              _selectedCategory = value;
                            });
                          },
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _priceController,
                          decoration: InputDecoration(
                            labelText: 'Price (Rs.)',
                            labelStyle: TextStyle(color: _darkColor),
                            hintText: 'Enter 0 for free items',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: _primaryColor),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: _primaryColor),
                            ),
                          ),
                          keyboardType: TextInputType.number,
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _expirationController,
                          decoration: InputDecoration(
                            labelText: 'Expiration Time',
                            labelStyle: TextStyle(color: _darkColor),
                            hintText: 'E.g., 2 days',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: _primaryColor),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: _primaryColor),
                            ),
                          ),
                        ),
                        const SizedBox(height: 32),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () async {
                              if (_selectedImage == null) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Please select an image'),
                                    backgroundColor: Colors.red,
                                  ),
                                );
                                return;
                              }

                              if (_titleController.text.isEmpty ||
                                  _descriptionController.text.isEmpty ||
                                  _selectedCategory == null ||
                                  _priceController.text.isEmpty ||
                                  _expirationController.text.isEmpty) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Please fill in all fields',
                                    ),
                                    backgroundColor: Colors.red,
                                  ),
                                );
                                return;
                              }

                              setState(() => _isUploading = true);

                              try {
                                final user = FirebaseAuth.instance.currentUser;
                                if (user == null) {
                                  throw Exception('User not authenticated');
                                }

                                // Upload image to Firebase Storage
                                final storageRef =
                                    FirebaseStorage.instance.ref().child(
                                          'shared_items/${DateTime.now().millisecondsSinceEpoch}.jpg',
                                        );
                                final uploadTask = storageRef.putFile(
                                  await _compressImage(
                                    File(_selectedImage!.path),
                                  ),
                                );

                                uploadTask.snapshotEvents.listen((
                                  taskSnapshot,
                                ) {
                                  final progress =
                                      (taskSnapshot.bytesTransferred /
                                              taskSnapshot.totalBytes) *
                                          100;
                                  print('Upload progress: $progress%');
                                  // You can update a progress indicator here
                                });

                                final snapshot = await uploadTask;
                                final imageUrl =
                                    await snapshot.ref.getDownloadURL();

                                // Parse price value
                                final priceValue =
                                    int.tryParse(_priceController.text) ?? 0;

                                // Save item to Firestore
                                await FirebaseFirestore.instance
                                    .collection('sharedItems')
                                    .add({
                                  'title': _titleController.text,
                                  'description': _descriptionController.text,
                                  'imageUrl': imageUrl,
                                  'status': 'Available',
                                  'expiration': _expirationController.text,
                                  'owner': user.displayName ?? 'Unknown User',
                                  'ownerId': user.uid,
                                  'price': priceValue == 0
                                      ? 'Free'
                                      : 'Rs. $priceValue',
                                  'priceValue': priceValue,
                                  'category': _selectedCategory!,
                                  'createdAt': FieldValue.serverTimestamp(),
                                });

                                // Fetch updated items
                                await _fetchSharedItems();

                                Navigator.of(context).pop();
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Item shared successfully!',
                                    ),
                                    backgroundColor: Colors.green,
                                  ),
                                );
                              } on FirebaseException catch (e) {
                                String errorMessage = 'Error sharing item';
                                if (e.code == 'unauthorized') {
                                  errorMessage =
                                      'Please sign in to share items';
                                } else {
                                  errorMessage = 'Error: ${e.message}';
                                }

                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(errorMessage),
                                    backgroundColor: Colors.red,
                                  ),
                                );
                              } catch (e) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Error: $e'),
                                    backgroundColor: Colors.red,
                                  ),
                                );
                              } finally {
                                setState(() => _isUploading = false);
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _primaryColor,
                              padding: const EdgeInsets.symmetric(
                                vertical: 16,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: const Text(
                              'PUBLISH ITEM',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ));
  }

  Future<void> _publishItem({
    required XFile selectedImage,
    required String title,
    required String description,
    required String category,
    required String price,
    required String expiration,
  }) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please sign in to share items'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    try {
      setState(() => _isUploading = true);

      // Upload image to Firebase Storage
      final storageRef = FirebaseStorage.instance.ref().child(
            'shared_items/${DateTime.now().millisecondsSinceEpoch}.jpg',
          );
      final uploadTask = storageRef.putFile(
        await _compressImage(File(selectedImage.path)),
      );

      uploadTask.snapshotEvents.listen((taskSnapshot) {
        final progress =
            (taskSnapshot.bytesTransferred / taskSnapshot.totalBytes) * 100;
        print('Upload progress: $progress%');
      });

      final snapshot = await uploadTask;
      final imageUrl = await snapshot.ref.getDownloadURL();

      // Prepare item data
      final priceValue = int.tryParse(price) ?? 0;
      final itemData = {
        'title': title,
        'description': description,
        'imageUrl': imageUrl,
        'status': 'Available',
        'expiration': expiration,
        'owner': user.displayName ?? 'Unknown User',
        'ownerId': user.uid,
        'price': priceValue == 0 ? 'Free' : 'Rs. $priceValue',
        'priceValue': priceValue,
        'category': category,
        'createdAt': FieldValue.serverTimestamp(),
      };

      // Save item to Firestore
      await FirebaseFirestore.instance.collection('sharedItems').add(itemData);

      // Fetch updated items
      await _fetchSharedItems();

      Navigator.of(context).pop(); // Close the "Add New Item" screen
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Item added successfully'),
          backgroundColor: _successColor,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error adding item: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() => _isUploading = false);
    }
  }

  Future<File> _compressImage(File file) async {
    final image = img.decodeImage(await file.readAsBytes());
    final compressedImage = img.copyResize(image!, width: 800);
    final compressedFile = File(file.path)
      ..writeAsBytesSync(img.encodeJpg(compressedImage, quality: 85));
    return compressedFile;
  }

  void _viewMessages(Map<String, dynamic> item) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ChatScreen(
          itemId: item['id'],
          itemTitle: item['title'],
          ownerId: item['ownerId'],
          currentUserId: FirebaseAuth.instance.currentUser!.uid,
          isOwner: true, // Pass a flag indicating the owner is viewing
        ),
      ),
    );
  }

  void _navigateToChatScreen(Map<String, dynamic> item) {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please sign in to chat'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ChatScreen(
          itemId: item['id'],
          itemTitle: item['title'],
          ownerId: item['ownerId'],
          currentUserId: user.uid,
          isOwner: false, // Pass a flag indicating a non-owner is chatting
        ),
      ),
    );
  }

  void _showCommunitySharingHistory() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please sign in to view history'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final claimedItems = await _fetchClaimedItemsFromDatabase(user.uid);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.85,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(24),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 10,
              spreadRadius: 5,
            ),
          ],
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'History & Reviews',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: _darkColor,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: Colors.grey.shade200),
            Expanded(
              child: claimedItems.isEmpty
                  ? Center(
                      child: Text(
                        'No claimed items yet.',
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 16,
                        ),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: claimedItems.length,
                      itemBuilder: (context, index) {
                        final item = claimedItems[index];
                        return ListTile(
                          leading: item['imageUrl'] != null
                              ? Image.network(
                                  item['imageUrl'],
                                  width: 50,
                                  height: 50,
                                )
                              : Icon(
                                  Icons.image,
                                  color: _primaryColor,
                                ),
                          title: Text(item['title'] ?? 'No Title'),
                          subtitle: Text(item['price'] ?? 'No Price'),
                          trailing: IconButton(
                            icon: const Icon(Icons.rate_review),
                            onPressed: () => _addReview(item),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Future<List<Map<String, dynamic>>> _fetchClaimedItemsFromDatabase(
    String userId,
  ) async {
    try {
      final querySnapshot = await FirebaseFirestore.instance
          .collection('claimedItems')
          .doc(userId)
          .collection('items')
          .get();

      return querySnapshot.docs
          .map((doc) => {'id': doc.id, ...doc.data()})
          .toList();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error fetching claimed items: $e'),
          backgroundColor: Colors.red,
        ),
      );
      return [];
    }
  }

  void _addReview(Map<String, dynamic> item) {
    final TextEditingController _reviewController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Review'),
        content: TextField(
          controller: _reviewController,
          decoration: const InputDecoration(
            hintText: 'Write your review here...',
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (_reviewController.text.trim().isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Review cannot be empty'),
                    backgroundColor: Colors.red,
                  ),
                );
                return;
              }

              try {
                await FirebaseFirestore.instance.collection('reviews').add({
                  'itemId': item['id'],
                  'review': _reviewController.text.trim(),
                  'timestamp': FieldValue.serverTimestamp(),
                });

                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Review added successfully'),
                    backgroundColor: Colors.green,
                  ),
                );
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Error adding review: $e'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }

  void _showYourItems() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please sign in to view your items'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final sharedItems = await _fetchSharedItemsFromDatabase(user.uid);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.85,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(24),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 10,
              spreadRadius: 5,
            ),
          ],
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Items Expired Soon',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: _darkColor,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: Colors.grey.shade200),
            Expanded(
              child: sharedItems.isEmpty
                  ? Center(
                      child: Text(
                        'No items shared yet.',
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 16,
                        ),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: sharedItems.length,
                      itemBuilder: (context, index) {
                        final item = sharedItems[index];
                        return ListTile(
                          leading: item['imageUrl'] != null
                              ? Image.network(
                                  item['imageUrl'],
                                  width: 50,
                                  height: 50,
                                )
                              : Icon(
                                  Icons.image,
                                  color: _primaryColor,
                                ),
                          title: Text(item['title'] ?? 'No Title'),
                          subtitle: Text(item['status'] ?? 'No Status'),
                          onTap: () => _showCollectedPersonsAndReviews(item),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Future<List<Map<String, dynamic>>> _fetchSharedItemsFromDatabase(
    String userId,
  ) async {
    try {
      final querySnapshot = await FirebaseFirestore.instance
          .collection('sharedItems')
          .where('ownerId', isEqualTo: userId)
          .get();

      return querySnapshot.docs
          .map((doc) => {'id': doc.id, ...doc.data()})
          .toList();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error fetching shared items: $e'),
          backgroundColor: Colors.red,
        ),
      );
      return [];
    }
  }

  void _showCollectedPersonsAndReviews(Map<String, dynamic> item) async {
    final reviews = await _fetchReviewsForItem(item['id']);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(24),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 10,
              spreadRadius: 5,
            ),
          ],
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Collected Persons & Reviews',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: _darkColor,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: Colors.grey.shade200),
            Expanded(
              child: reviews.isEmpty
                  ? Center(
                      child: Text(
                        'No reviews yet.',
                        style: TextStyle(
                          color: Colors.grey.shade600,
                          fontSize: 16,
                        ),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: reviews.length,
                      itemBuilder: (context, index) {
                        final review = reviews[index];
                        return ListTile(
                          leading: const Icon(
                            Icons.person,
                            color: Colors.grey,
                          ),
                          title: Text(review['review'] ?? 'No Review'),
                          subtitle: Text(
                            review['timestamp'] != null
                                ? (review['timestamp'] as Timestamp)
                                    .toDate()
                                    .toString()
                                : 'No Date',
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Future<List<Map<String, dynamic>>> _fetchReviewsForItem(String itemId) async {
    try {
      final querySnapshot = await FirebaseFirestore.instance
          .collection('reviews')
          .where('itemId', isEqualTo: itemId)
          .get();

      return querySnapshot.docs
          .map((doc) => {'id': doc.id, ...doc.data()})
          .toList();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error fetching reviews: $e'),
          backgroundColor: Colors.red,
        ),
      );
      return [];
    }
  }

  // Add this method to show owner's stuff section as a modal
  void _showOwnerStuffSection() {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please sign in to view your stuff'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    final ownerItems =
        _sharedItems.where((item) => item['ownerId'] == user.uid).toList();
    showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => Container(
              height: MediaQuery.of(context).size.height * 0.7,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(24),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.2),
                    blurRadius: 10,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'My Stuff',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: _darkColor,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                  ),
                  Divider(height: 1, color: Colors.grey.shade200),
                  Expanded(
                    child: ownerItems.isEmpty
                        ? Center(
                            child: Text(
                              'No items shared yet.',
                              style: TextStyle(
                                color: Colors.grey.shade600,
                                fontSize: 16,
                              ),
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: ownerItems.length,
                            itemBuilder: (context, index) {
                              final item = ownerItems[index];
                              return ListTile(
                                leading: item['imageUrl'] != null
                                    ? Image.network(
                                        item['imageUrl'],
                                        width: 50,
                                        height: 50,
                                      )
                                    : Icon(
                                        Icons.image,
                                        color: _primaryColor,
                                      ),
                                title: Text(item['title'] ?? 'No Title'),
                                subtitle: Text(item['category'] ?? ''),
                                onTap: () => _showItemDetails(item, true),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ));
  }

  // Build community feed view
  Widget _buildCommunityFeed() {
    return RefreshIndicator(
      onRefresh: _fetchCommunityPosts,
      child: _communityPosts.isEmpty
          ? _buildEmptyCommunityState()
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _communityPosts.length,
              itemBuilder: (context, index) {
                final post = _communityPosts[index];
                return _buildCommunityPostCard(post);
              },
            ),
    );
  }

  // Build community post card
  Widget _buildCommunityPostCard(Map<String, dynamic> post) {
    final user = FirebaseAuth.instance.currentUser;
    final isOwner = user != null && post['userId'] == user.uid;
    final likes = List<String>.from(post['likes'] ?? []);
    final isLiked = user != null && likes.contains(user.uid);
    final commentsCount = post['commentsCount'] ?? 0;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Post header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: _primaryColor.withOpacity(0.2),
                  child: Icon(Icons.person, color: _primaryColor),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        post['userName'] ?? 'Anonymous',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: _darkColor,
                        ),
                      ),
                      Text(
                        _formatPostTime(post['createdAt']),
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
                if (isOwner)
                  PopupMenuButton<String>(
                    onSelected: (value) {
                      if (value == 'delete') {
                        _deletePost(post);
                      }
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'delete',
                        child: Row(
                          children: [
                            Icon(Icons.delete, color: Colors.red),
                            SizedBox(width: 8),
                            Text('Delete Post'),
                          ],
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
          // Post content
          if (post['content'] != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                post['content'],
                style: const TextStyle(fontSize: 16),
              ),
            ),
          const SizedBox(height: 12),
          // Post image
          if (post['imageUrl'] != null)
            GestureDetector(
              onTap: () => _showFullImage(post['imageUrl']),
              child: Image.network(
                post['imageUrl'],
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  height: 200,
                  color: Colors.grey.shade200,
                  child: const Icon(Icons.broken_image, size: 50),
                ),
              ),
            ),
          // Post actions - UPDATED to include message button
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Like button
                InkWell(
                  onTap: () => _toggleLike(post),
                  child: Row(
                    children: [
                      Icon(
                        isLiked ? Icons.favorite : Icons.favorite_border,
                        color: isLiked ? Colors.red : Colors.grey,
                        size: 22,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '${likes.length}',
                        style: TextStyle(color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 24),

                // Comment button
                InkWell(
                  onTap: () => _showCommentsDialog(post),
                  child: Row(
                    children: [
                      Icon(
                        Icons.comment_outlined,
                        color: Colors.grey,
                        size: 22,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '$commentsCount',
                        style: TextStyle(color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ),

                // Message owner button (only if not owner)
                if (!isOwner) ...[
                  const SizedBox(width: 24),
                  InkWell(
                    onTap: () => _messagePostOwner(post),
                    child: Row(
                      children: [
                        Icon(
                          Icons.message_outlined,
                          color: Colors.grey,
                          size: 22,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Message',
                          style: TextStyle(color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Format post time
  String _formatPostTime(dynamic timestamp) {
    if (timestamp == null) return 'Just now';

    try {
      final DateTime postTime = (timestamp as Timestamp).toDate();
      final now = DateTime.now();
      final difference = now.difference(postTime);

      if (difference.inMinutes < 1) {
        return 'Just now';
      } else if (difference.inHours < 1) {
        return '${difference.inMinutes}m ago';
      } else if (difference.inDays < 1) {
        return '${difference.inHours}h ago';
      } else if (difference.inDays < 7) {
        return '${difference.inDays}d ago';
      } else {
        return '${postTime.day}/${postTime.month}/${postTime.year}';
      }
    } catch (e) {
      return 'Recently';
    }
  }

  // Empty community state
  Widget _buildEmptyCommunityState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.groups_outlined,
            size: 60,
            color: _primaryColor.withOpacity(0.3),
          ),
          const SizedBox(height: 16),
          Text(
            'No posts yet',
            style: TextStyle(
              fontSize: 18,
              color: _darkColor,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Be the first to share with the community!',
            style: TextStyle(color: Colors.grey.shade600),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _showAddCommunityPostDialog,
            style: ElevatedButton.styleFrom(
              backgroundColor: _primaryColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            child: const Text(
              'Create Post',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  // Show add community post dialog
  void _showAddCommunityPostDialog() {
    final ImagePicker _picker = ImagePicker();
    XFile? _selectedImage;
    final TextEditingController _contentController = TextEditingController();
    bool _isUploading = false;

    Future<void> _pickImage(
        ImageSource source, StateSetter setModalState) async {
      try {
        final pickedImage = await _picker.pickImage(source: source);
        if (pickedImage != null) {
          setModalState(() {
            _selectedImage = pickedImage;
          });
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error picking image: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }

    Future<void> _handlePostSubmit(
        BuildContext modalContext, StateSetter setModalState) async {
      // Validate input
      if (_contentController.text.trim().isEmpty && _selectedImage == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please add some content or an image'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      // Set loading state
      setModalState(() => _isUploading = true);

      try {
        final user = FirebaseAuth.instance.currentUser;
        if (user == null) {
          throw Exception('Please sign in to post');
        }

        String? imageUrl;

        // Upload image if selected
        if (_selectedImage != null) {
          try {
            print('Starting image upload...');
            final storageRef = FirebaseStorage.instance.ref().child(
                  'community_posts/${user.uid}/${DateTime.now().millisecondsSinceEpoch}.jpg',
                );

            final compressedImage =
                await _compressImage(File(_selectedImage!.path));
            print('Image compressed');

            final uploadTask = storageRef.putFile(compressedImage);
            final snapshot = await uploadTask;
            imageUrl = await snapshot.ref.getDownloadURL();
            print('Image URL obtained: $imageUrl');
          } on FirebaseException catch (e) {
            print('Firebase Storage Error: ${e.code} - ${e.message}');
            if (e.code == 'permission-denied') {
              throw Exception(
                  'Storage permission denied. Please check Firebase Storage rules.');
            }
            throw Exception('Upload failed: ${e.message}');
          }
        }

        print('Saving post to Firestore...');

        // Save post to Firestore with immediate timestamp
        final postData = {
          'userId': user.uid,
          'userName': user.displayName ?? 'Anonymous',
          'content': _contentController.text.trim(),
          'imageUrl': imageUrl,
          'likes': [],
          'commentsCount': 0,
          'createdAt': FieldValue.serverTimestamp(),
        };

        final docRef = await FirebaseFirestore.instance
            .collection('communityPosts')
            .add(postData);

        print('Post saved successfully with ID: ${docRef.id}');

        // Add post to local list immediately with current timestamp
        if (mounted) {
          setState(() {
            _communityPosts.insert(0, {
              'id': docRef.id,
              ...postData,
              'createdAt': Timestamp.now(),
            });
          });
        }

        // Close the modal
        if (Navigator.canPop(modalContext)) {
          Navigator.pop(modalContext);
        }

        // Show success message
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Post shared successfully!'),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
        }

        // Fetch updated posts in background to sync server timestamp
        _fetchCommunityPosts();
      } on FirebaseException catch (e) {
        print('Firebase Error: ${e.code} - ${e.message}');

        // Reset loading state
        if (Navigator.canPop(modalContext)) {
          setModalState(() => _isUploading = false);
        }

        String errorMessage = 'Error creating post';
        if (e.code == 'permission-denied') {
          errorMessage = 'Permission denied. Please check your account.';
        } else if (e.code == 'unauthenticated') {
          errorMessage = 'Please sign in to create posts.';
        } else {
          errorMessage = e.message ?? 'Unknown error occurred';
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(errorMessage),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      } catch (e) {
        print('Error creating post: $e');

        // Reset loading state
        if (Navigator.canPop(modalContext)) {
          setModalState(() => _isUploading = false);
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error: ${e.toString()}'),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      }
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      isDismissible: false,
      enableDrag: false,
      builder: (modalContext) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          height: MediaQuery.of(context).size.height * 0.7,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(24),
            ),
          ),
          child: SingleChildScrollView(
            child: Padding(
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: 24,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Create Community Post',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: _darkColor,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: _isUploading
                            ? null
                            : () => Navigator.pop(modalContext),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _contentController,
                    decoration: InputDecoration(
                      hintText: 'What\'s on your mind?',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    maxLines: 5,
                    enabled: !_isUploading,
                  ),
                  const SizedBox(height: 16),
                  if (_selectedImage != null)
                    Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.file(
                            File(_selectedImage!.path),
                            height: 200,
                            width: double.infinity,
                            fit: BoxFit.cover,
                          ),
                        ),
                        Positioned(
                          top: 8,
                          right: 8,
                          child: IconButton(
                            icon: const Icon(Icons.close, color: Colors.white),
                            style: IconButton.styleFrom(
                              backgroundColor: Colors.black54,
                            ),
                            onPressed: _isUploading
                                ? null
                                : () {
                                    setModalState(() {
                                      _selectedImage = null;
                                    });
                                  },
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _isUploading
                              ? null
                              : () async {
                                  showModalBottomSheet(
                                    context: context,
                                    builder: (ctx) => Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        ListTile(
                                          leading: const Icon(Icons.camera_alt),
                                          title: const Text('Take a Photo'),
                                          onTap: () {
                                            Navigator.pop(ctx);
                                            _pickImage(ImageSource.camera,
                                                setModalState);
                                          },
                                        ),
                                        ListTile(
                                          leading:
                                              const Icon(Icons.photo_library),
                                          title:
                                              const Text('Choose from Gallery'),
                                          onTap: () {
                                            Navigator.pop(ctx);
                                            _pickImage(ImageSource.gallery,
                                                setModalState);
                                          },
                                        ),
                                      ],
                                    ),
                                  );
                                },
                          icon: const Icon(Icons.image),
                          label: const Text('Add Photo'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isUploading
                          ? null
                          : () =>
                              _handlePostSubmit(modalContext, setModalState),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _primaryColor,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: _isUploading
                          ? Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: const [
                                SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    color: Colors.white,
                                    strokeWidth: 2,
                                  ),
                                ),
                                SizedBox(width: 12),
                                Text(
                                  'Posting...',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            )
                          : const Text(
                              'POST',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // Toggle like
  Future<void> _toggleLike(Map<String, dynamic> post) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;

      final postRef = FirebaseFirestore.instance
          .collection('communityPosts')
          .doc(post['id']);

      final likes = List<String>.from(post['likes'] ?? []);

      if (likes.contains(user.uid)) {
        likes.remove(user.uid);
      } else {
        likes.add(user.uid);
      }

      await postRef.update({'likes': likes});
      await _fetchCommunityPosts();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    }
  }

  // Show comments dialog
  Future<void> _showCommentsDialog(Map<String, dynamic> post) async {
    final comments = await _fetchComments(post['id']);
    final TextEditingController _commentController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Comments',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: _darkColor,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            Expanded(
              child: comments.isEmpty
                  ? Center(
                      child: Text(
                        'No comments yet',
                        style: TextStyle(color: Colors.grey.shade600),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: comments.length,
                      itemBuilder: (context, index) {
                        final comment = comments[index];
                        return ListTile(
                          leading: CircleAvatar(
                            backgroundColor: _primaryColor.withOpacity(0.2),
                            child: Icon(Icons.person, color: _primaryColor),
                          ),
                          title: Text(comment['userName'] ?? 'Anonymous'),
                          subtitle: Text(comment['text'] ?? ''),
                        );
                      },
                    ),
            ),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _commentController,
                      decoration: InputDecoration(
                        hintText: 'Add a comment...',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: Icon(Icons.send, color: _primaryColor),
                    onPressed: () async {
                      if (_commentController.text.trim().isEmpty) return;

                      await _addComment(post['id'], _commentController.text);
                      _commentController.clear();
                      Navigator.pop(context);
                      await _fetchCommunityPosts();
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Fetch comments
  Future<List<Map<String, dynamic>>> _fetchComments(String postId) async {
    try {
      final querySnapshot = await FirebaseFirestore.instance
          .collection('communityPosts')
          .doc(postId)
          .collection('comments')
          .orderBy('createdAt', descending: false)
          .get();

      return querySnapshot.docs
          .map((doc) => {'id': doc.id, ...doc.data()})
          .toList();
    } catch (e) {
      return [];
    }
  }

  // Add comment
  Future<void> _addComment(String postId, String text) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;

      await FirebaseFirestore.instance
          .collection('communityPosts')
          .doc(postId)
          .collection('comments')
          .add({
        'userId': user.uid,
        'userName': user.displayName ?? 'Anonymous',
        'text': text,
        'createdAt': FieldValue.serverTimestamp(),
      });

      // Update comments count
      await FirebaseFirestore.instance
          .collection('communityPosts')
          .doc(postId)
          .update({'commentsCount': FieldValue.increment(1)});
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    }
  }

  // Delete post
  Future<void> _deletePost(Map<String, dynamic> post) async {
    try {
      await FirebaseFirestore.instance
          .collection('communityPosts')
          .doc(post['id'])
          .delete();

      await _fetchCommunityPosts();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Post deleted successfully'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    }
  }

  // Add method to message post owner
  void _messagePostOwner(Map<String, dynamic> post) {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please sign in to send messages'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Create a temporary item structure for the chat screen
    final tempItem = {
      'id': post['id'],
      'title': 'Community Post',
      'ownerId': post['userId'],
    };

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ChatScreen(
          itemId: post['id'],
          itemTitle: 'Community Post by ${post['userName'] ?? 'Anonymous'}',
          ownerId: post['userId'],
          currentUserId: user.uid,
          isOwner: false,
        ),
      ),
    );
  }
}
