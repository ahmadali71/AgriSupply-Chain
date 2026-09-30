import 'package:flutter/material.dart';
import '../../core/api_client.dart';

class ProofOfDeliveryScreen extends StatefulWidget {
  final dynamic shipment;
  final bool isOffline;

  const ProofOfDeliveryScreen({super.key, required this.shipment, required this.isOffline});

  @override
  State<ProofOfDeliveryScreen> createState() => _ProofOfDeliveryScreenState();
}

class _ProofOfDeliveryScreenState extends State<ProofOfDeliveryScreen> {
  final _receiverController = TextEditingController(text: 'Marcus Brody (Receiving Manager)');
  final _deliveredQtyController = TextEditingController(text: '2600');
  final _damagedQtyController = TextEditingController(text: '0');
  final _notesController = TextEditingController(text: 'Produce firm and cool on arrival.');
  final List<Offset?> _points = [];
  bool _isSubmitting = false;

  @override
  void dispose() {
    _receiverController.dispose();
    _deliveredQtyController.dispose();
    _damagedQtyController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _isSubmitting = true);
    final res = await ApiClient.submitPOD(
      shipmentId: widget.shipment['id'],
      receiverName: _receiverController.text,
      signatureData: 'svg_signature_mock_data_points_${_points.length}',
      deliveredQtyKg: double.tryParse(_deliveredQtyController.text) ?? 2500,
      damagedQtyKg: double.tryParse(_damagedQtyController.text) ?? 0,
      deliveryNotes: _notesController.text,
      isOnline: !widget.isOffline,
    );
    setState(() => _isSubmitting = false);

    if (mounted) {
      if (res['success'] == true) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.green),
                SizedBox(width: 8),
                Text('Delivery Completed!'),
              ],
            ),
            content: Text(
              widget.isOffline
                ? 'Offline Receipt: ${res['receiptNumber']}\nSaved locally on device. Will auto-sync when online.'
                : 'Digital Delivery Receipt: ${res['receiptNumber'] ?? 'POD-SUCCESS'}\nOrder updated to DELIVERED and invoice issued.',
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pop(context, true);
                },
                child: const Text('OK', style: TextStyle(fontWeight: FontWeight.bold)),
              )
            ],
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(res['error'] ?? 'Submission failed')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Digital Proof of Delivery'),
        backgroundColor: const Color(0xFF15803D),
        foregroundColor: Colors.white,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(widget.shipment['shipment_number'] ?? 'SHP-XXXX',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, fontFamily: 'monospace')),
          Text('Deliver to: ${widget.shipment['destination_name']}', style: const TextStyle(fontSize: 13, color: Colors.black54)),
          const SizedBox(height: 16),
          TextField(
            controller: _receiverController,
            decoration: const InputDecoration(labelText: 'Receiver Name', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _deliveredQtyController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Delivered (KG)', border: OutlineInputBorder()),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _damagedQtyController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Damaged (KG)', border: OutlineInputBorder()),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Customer Dock Signature:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              TextButton(onPressed: () => setState(() => _points.clear()), child: const Text('Clear')),
            ],
          ),
          Container(
            height: 120,
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              border: Border.all(color: Colors.grey.shade400),
              borderRadius: BorderRadius.circular(12),
            ),
            child: GestureDetector(
              onPanUpdate: (details) {
                setState(() => _points.add(details.localPosition));
              },
              onPanEnd: (_) => setState(() => _points.add(null)),
              child: CustomPaint(
                painter: _SignaturePainter(points: _points),
                size: Size.infinite,
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _notesController,
            maxLines: 2,
            decoration: const InputDecoration(labelText: 'Receiving Notes', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF15803D),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: _isSubmitting ? null : _submit,
            child: _isSubmitting
                ? const CircularProgressIndicator(color: Colors.white)
                : const Text('Confirm Delivery & Issue Receipt', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          ),
        ],
      ),
    );
  }
}

class _SignaturePainter extends CustomPainter {
  final List<Offset?> points;
  _SignaturePainter({required this.points});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 3.0;

    for (int i = 0; i < points.length - 1; i++) {
      if (points[i] != null && points[i + 1] != null) {
        canvas.drawLine(points[i]!, points[i + 1]!, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
