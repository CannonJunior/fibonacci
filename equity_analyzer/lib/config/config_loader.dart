import 'package:flutter/services.dart';
import 'package:yaml/yaml.dart';

/// Configuration loader that reads from config.yaml
class ConfigLoader {
  static Map<String, dynamic>? _config;

  /// Load configuration from YAML file
  static Future<void> load() async {
    try {
      final String yamlString = await rootBundle.loadString('config.yaml');
      final dynamic yamlData = loadYaml(yamlString);
      _config = _convertYamlToMap(yamlData);
    } catch (e) {
      throw Exception('Failed to load config.yaml: $e');
    }
  }

  /// Convert YamlMap to Map<String, dynamic> recursively
  static Map<String, dynamic> _convertYamlToMap(dynamic yaml) {
    if (yaml is YamlMap) {
      final Map<String, dynamic> map = {};
      yaml.forEach((key, value) {
        map[key.toString()] = _convertYamlToMap(value);
      });
      return map;
    } else if (yaml is YamlList) {
      return {'list': yaml.map((item) => _convertYamlToMap(item)).toList()};
    } else {
      return yaml;
    }
  }

  /// Get configuration value by path (e.g., 'app.port')
  static dynamic get(String path, {dynamic defaultValue}) {
    if (_config == null) {
      throw Exception('Configuration not loaded. Call ConfigLoader.load() first.');
    }

    final List<String> keys = path.split('.');
    dynamic current = _config;

    for (final String key in keys) {
      if (current is Map && current.containsKey(key)) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }

    return current ?? defaultValue;
  }

  /// Get string configuration
  static String getString(String path, {String defaultValue = ''}) {
    return get(path, defaultValue: defaultValue).toString();
  }

  /// Get integer configuration
  static int getInt(String path, {int defaultValue = 0}) {
    final dynamic value = get(path, defaultValue: defaultValue);
    if (value is int) return value;
    if (value is String) return int.tryParse(value) ?? defaultValue;
    return defaultValue;
  }

  /// Get double configuration
  static double getDouble(String path, {double defaultValue = 0.0}) {
    final dynamic value = get(path, defaultValue: defaultValue);
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? defaultValue;
    return defaultValue;
  }

  /// Get boolean configuration
  static bool getBool(String path, {bool defaultValue = false}) {
    final dynamic value = get(path, defaultValue: defaultValue);
    if (value is bool) return value;
    if (value is String) return value.toLowerCase() == 'true';
    return defaultValue;
  }

  /// Get list configuration
  static List<dynamic> getList(String path, {List<dynamic> defaultValue = const []}) {
    final dynamic value = get(path, defaultValue: defaultValue);
    if (value is Map && value.containsKey('list')) {
      return value['list'] as List<dynamic>;
    }
    if (value is List) return value;
    return defaultValue;
  }

  /// Get map configuration
  static Map<String, dynamic> getMap(String path, {Map<String, dynamic> defaultValue = const {}}) {
    final dynamic value = get(path, defaultValue: defaultValue);
    if (value is Map<String, dynamic>) return value;
    return defaultValue;
  }

  /// Check if configuration is loaded
  static bool get isLoaded => _config != null;

  /// Get all configuration as map
  static Map<String, dynamic> get all {
    if (_config == null) {
      throw Exception('Configuration not loaded. Call ConfigLoader.load() first.');
    }
    return Map<String, dynamic>.from(_config!);
  }
}
