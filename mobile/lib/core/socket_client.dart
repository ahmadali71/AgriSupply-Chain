import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';

class MobileSocketClient {
  static WebSocketChannel? _channel;
  static bool isConnected = false;
  static Function(Map<String, dynamic>)? onTelemetry;
  static Function(Map<String, dynamic>)? onAlert;

  static void connect(String tenantId) {
    try {
      final wsUrl = Uri.parse('ws://127.0.0.1:5000/ws?tenant_id=$tenantId');
      _channel = WebSocketChannel.connect(wsUrl);
      isConnected = true;

      _channel!.stream.listen(
        (message) {
          try {
            final data = jsonDecode(message);
            if (data['channel'] == 'telemetry' && onTelemetry != null) {
              onTelemetry!(data['payload']);
            } else if (data['channel'] == 'alerts' && onAlert != null) {
              onAlert!(data['payload']);
            }
          } catch (_) {}
        },
        onDone: () {
          isConnected = false;
        },
        onError: (err) {
          isConnected = false;
        },
      );
    } catch (_) {
      isConnected = false;
    }
  }

  static void disconnect() {
    _channel?.sink.close();
    isConnected = false;
  }
}
