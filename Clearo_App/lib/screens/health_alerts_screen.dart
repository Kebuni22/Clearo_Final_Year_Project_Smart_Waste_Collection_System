import 'package:flutter/material.dart';
import 'disease_details_screen.dart'; // Import the new screen for details
import 'campaign_details_screen.dart'; // Import the campaign details screen

class HealthAlertsScreen extends StatelessWidget {
  const HealthAlertsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Health Alerts'),
        backgroundColor: const Color.fromARGB(255, 244, 174, 174),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Health Issues',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.redAccent,
                ),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 16,
                runSpacing: 16,
                children: [
                  ElevatedButton.icon(
                    onPressed: () {
                      try {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder:
                                (context) => const DiseaseDetailsScreen(
                                  title: 'Dengue',
                                  details:
                                      'Dengue is a mosquito-borne disease caused by the dengue virus. '
                                      'It spreads through the bite of infected Aedes mosquitoes.',
                                  tips: [
                                    'Eliminate standing water around your home.',
                                    'Use mosquito repellents and nets.',
                                    'Seek medical attention if you experience high fever or severe headaches.',
                                  ],
                                ),
                          ),
                        );
                      } catch (e) {
                        _showErrorDialog(
                          context,
                          'Failed to load Dengue details.',
                        );
                      }
                    },
                    icon: const Icon(Icons.bug_report),
                    label: const Text('Dengue'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orange,
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: () {
                      try {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder:
                                (context) => const DiseaseDetailsScreen(
                                  title: 'COVID-19',
                                  details:
                                      'COVID-19 is a respiratory illness caused by the SARS-CoV-2 virus. '
                                      'It spreads through respiratory droplets.',
                                  tips: [
                                    'Wear a mask in crowded places.',
                                    'Wash your hands frequently with soap and water.',
                                    'Get vaccinated and maintain social distancing.',
                                  ],
                                ),
                          ),
                        );
                      } catch (e) {
                        _showErrorDialog(
                          context,
                          'Failed to load COVID-19 details.',
                        );
                      }
                    },
                    icon: const Icon(Icons.coronavirus),
                    label: const Text('COVID-19'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder:
                              (context) => const DiseaseDetailsScreen(
                                title: 'Malaria',
                                details:
                                    'Malaria is a life-threatening disease caused by parasites transmitted through the bites of infected female Anopheles mosquitoes.',
                                tips: [
                                  'Use insecticide-treated mosquito nets.',
                                  'Avoid outdoor activities during peak mosquito hours.',
                                  'Take antimalarial medications if traveling to high-risk areas.',
                                ],
                              ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.bug_report),
                    label: const Text('Malaria'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder:
                              (context) => const DiseaseDetailsScreen(
                                title: 'Bacterial Diseases',
                                details:
                                    'Bacterial diseases are caused by harmful bacteria and can affect various parts of the body.',
                                tips: [
                                  'Practice good hygiene and wash hands regularly.',
                                  'Cook food thoroughly to kill harmful bacteria.',
                                  'Avoid close contact with infected individuals.',
                                ],
                              ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.health_and_safety),
                    label: const Text('Bacterial Diseases'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.redAccent,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              const Text(
                'Ongoing Health Campaigns',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.redAccent,
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.campaign, color: Colors.redAccent),
                title: const Text('Dengue Awareness Campaign'),
                subtitle: const Text('Location: City Park, 10 AM - 4 PM'),
                onTap: () {
                  try {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder:
                            (context) => const CampaignDetailsScreen(
                              title: 'Dengue Awareness Campaign',
                              details:
                                  'This campaign focuses on educating the public about '
                                  'preventing dengue by eliminating mosquito breeding grounds. '
                                  'Activities include workshops, distribution of mosquito nets, '
                                  'and free health checkups.',
                              location: 'City Park',
                              time: '10 AM - 4 PM',
                            ),
                      ),
                    );
                  } catch (e) {
                    _showErrorDialog(
                      context,
                      'Failed to load Dengue Awareness Campaign details.',
                    );
                  }
                },
              ),
              ListTile(
                leading: const Icon(Icons.campaign, color: Colors.redAccent),
                title: const Text('COVID-19 Vaccination Drive'),
                subtitle: const Text('Location: Community Hall, 9 AM - 5 PM'),
                onTap: () {
                  try {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder:
                            (context) => const CampaignDetailsScreen(
                              title: 'COVID-19 Vaccination Drive',
                              details:
                                  'This drive aims to vaccinate as many people as possible '
                                  'to prevent the spread of COVID-19. Free vaccinations are provided, '
                                  'along with information on booster doses and safety guidelines.',
                              location: 'Community Hall',
                              time: '9 AM - 5 PM',
                            ),
                      ),
                    );
                  } catch (e) {
                    _showErrorDialog(
                      context,
                      'Failed to load COVID-19 Vaccination Drive details.',
                    );
                  }
                },
              ),
              const SizedBox(height: 24),
              const Text(
                'Health Alerts',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.redAccent,
                ),
              ),
              const SizedBox(height: 16),
              Card(
                elevation: 4,
                child: ListTile(
                  leading: const Icon(Icons.warning, color: Colors.orange),
                  title: const Text('Dengue Outbreak'),
                  subtitle: const Text('City areas: Panadura town, Beach Road'),
                ),
              ),
              Card(
                elevation: 4,
                child: ListTile(
                  leading: const Icon(Icons.warning, color: Colors.orange),
                  title: const Text('Air Quality Alert'),
                  subtitle: const Text('Unhealthy levels in Industrial Zone'),
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Public Health Awareness',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.redAccent,
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.info, color: Colors.blue),
                title: const Text('Preventing Dengue'),
                subtitle: const Text('Tips to avoid mosquito breeding.'),
                onTap: () {
                  // Add navigation or details
                },
              ),
              ListTile(
                leading: const Icon(Icons.info, color: Colors.blue),
                title: const Text('COVID-19 Safety Measures'),
                subtitle: const Text('Guidelines to stay safe.'),
                onTap: () {
                  // Add navigation or details
                },
              ),
              const SizedBox(height: 24),
              const Text(
                'Children Zone',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.teal,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                decoration: BoxDecoration(
                  color: Colors.lightBlue[50],
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.grey.withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(2, 4),
                    ),
                  ],
                ),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Good Habits for Kids',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.teal,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.recycling,
                          color: Colors.green,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Always throw garbage in the bin to keep the environment clean.',
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.blueGrey[800],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.clean_hands,
                          color: Colors.green,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Wash hands with soap after playing and before eating.',
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.blueGrey[800],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.local_drink,
                          color: Colors.green,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Drink at least 8 glasses of water daily to stay hydrated.',
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.blueGrey[800],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.health_and_safety,
                          color: Colors.green,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Eat fresh fruits and vegetables to stay healthy.',
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.blueGrey[800],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.directions_walk,
                          color: Colors.green,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Play outdoors for at least 30 minutes every day.',
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.blueGrey[800],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.lightbulb,
                          color: Colors.green,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Turn off lights and fans when not in use to save energy.',
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.blueGrey[800],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Contact Information',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.redAccent,
                ),
              ),
              const SizedBox(height: 16),
              Card(
                elevation: 4,
                child: ListTile(
                  leading: const Icon(Icons.local_hospital, color: Colors.blue),
                  title: const Text('MOH Doctor'),
                  subtitle: const Text(
                    'Dr. Ashoka Perera\nPhone: +94 71 123 4567',
                  ),
                  trailing: const Icon(Icons.phone, color: Colors.green),
                  onTap: () {
                    // Add call functionality if needed
                  },
                ),
              ),
              Card(
                elevation: 4,
                child: ListTile(
                  leading: const Icon(
                    Icons.account_balance,
                    color: Colors.orange,
                  ),
                  title: const Text('Municipal Council'),
                  subtitle: const Text(
                    'Phone: +94 11 234 5678\nEmail: info@municipalcouncil.lk',
                  ),
                  trailing: const Icon(Icons.email, color: Colors.red),
                  onTap: () {
                    // Add email functionality if needed
                  },
                ),
              ),
              Card(
                elevation: 4,
                child: ListTile(
                  leading: const Icon(
                    Icons.health_and_safety,
                    color: Colors.green,
                  ),
                  title: const Text('PHI (Public Health Inspector)'),
                  subtitle: const Text(
                    'Mr. Navod Silva\nPhone: +94 77 987 6543',
                  ),
                  trailing: const Icon(Icons.phone, color: Colors.green),
                  onTap: () {
                    // Add call functionality if needed
                  },
                ),
              ),
              Card(
                elevation: 4,
                child: ListTile(
                  leading: const Icon(
                    Icons.supervisor_account,
                    color: Colors.purple,
                  ),
                  title: const Text('Health Supervisor'),
                  subtitle: const Text(
                    'Ms. Sampath Rathnayake\nPhone: +94 71 456 7890',
                  ),
                  trailing: const Icon(Icons.phone, color: Colors.green),
                  onTap: () {
                    // Add call functionality if needed
                  },
                ),
              ),
              Card(
                elevation: 4,
                child: ListTile(
                  leading: const Icon(
                    Icons.local_shipping,
                    color: Colors.brown,
                  ),
                  title: const Text('Truck Driver'),
                  subtitle: const Text(
                    'Mr. Ravindu Fernando\nPhone: +94 76 543 2109',
                  ),
                  trailing: const Icon(Icons.phone, color: Colors.green),
                  onTap: () {
                    // Add call functionality if needed
                  },
                ),
              ),
              Card(
                elevation: 4,
                child: ListTile(
                  leading: const Icon(Icons.business, color: Colors.teal),
                  title: const Text('MOH Office'),
                  subtitle: const Text(
                    'Address: 123 Main Street, Dehiwala\nPhone: +94 11 345 6789',
                  ),
                  trailing: const Icon(Icons.location_on, color: Colors.red),
                  onTap: () {
                    // Add navigation functionality if needed
                  },
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Social Media & Website',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.redAccent,
                ),
              ),
              const SizedBox(height: 16),
              Card(
                elevation: 4,
                child: ListTile(
                  leading: const Icon(Icons.facebook, color: Colors.blue),
                  title: const Text('Facebook'),
                  subtitle: const Text('facebook.com/municipalcouncil'),
                  trailing: const Icon(Icons.open_in_new, color: Colors.blue),
                  onTap: () {
                    // Add functionality to open Facebook link
                  },
                ),
              ),
              Card(
                elevation: 4,
                child: ListTile(
                  leading: const Icon(Icons.video_library, color: Colors.red),
                  title: const Text('YouTube'),
                  subtitle: const Text('youtube.com/municipalcouncil'),
                  trailing: const Icon(Icons.open_in_new, color: Colors.red),
                  onTap: () {
                    // Add functionality to open YouTube link
                  },
                ),
              ),
              Card(
                elevation: 4,
                child: ListTile(
                  leading: const Icon(Icons.web, color: Colors.green),
                  title: const Text('Municipal Website'),
                  subtitle: const Text('www.municipalcouncil.lk'),
                  trailing: const Icon(Icons.open_in_new, color: Colors.green),
                  onTap: () {
                    // Add functionality to open website link
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showErrorDialog(BuildContext context, String message) {
    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            title: const Text('Error'),
            content: Text(message),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('OK'),
              ),
            ],
          ),
    );
  }
}
