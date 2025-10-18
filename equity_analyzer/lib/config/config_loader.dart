import 'dart:io';
import 'package:flutter/services.dart';
import 'package:yaml/yaml.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Configuration loader that reads from config.yaml and expands environment variables
class ConfigLoader {
  static Map<String, dynamic>? _config;

  /// Load configuration from YAML file and .env file
  static Future<void> load() async {
    try {
      // Load environment variables from .env file
      await dotenv.load(fileName: '.env');

      // Load YAML configuration
      final String yamlString = await rootBundle.loadString('config.yaml');
      final dynamic yamlData = loadYaml(yamlString);
      _config = _convertYamlToMap(yamlData);

      // Expand environment variables in the configuration
      _config = _expandEnvironmentVariables(_config!);
    } catch (e) {
      throw Exception('Failed to load config.yaml: $e');
    }
  }

  /// Expand environment variables in configuration recursively
  /// Converts ${ENV_VAR_NAME} to the actual environment variable value
  static dynamic _expandEnvironmentVariables(dynamic value) {
    if (value is Map<String, dynamic>) {
      final Map<String, dynamic> expandedMap = {};
      value.forEach((key, val) {
        expandedMap[key] = _expandEnvironmentVariables(val);
      });
      return expandedMap;
    } else if (value is List) {
      return value.map((item) => _expandEnvironmentVariables(item)).toList();
    } else if (value is String) {
      // Reason: Expand ${ENV_VAR_NAME} pattern to environment variable value
      return _expandEnvVariablesInString(value);
    } else {
      return value;
    }
  }

  /// Expand environment variables in a string
  /// Supports ${VAR_NAME} syntax
  static String _expandEnvVariablesInString(String value) {
    final RegExp envVarPattern = RegExp(r'\$\{([A-Z_][A-Z0-9_]*)\}');

    return value.replaceAllMapped(envVarPattern, (match) {
      final String varName = match.group(1)!;

      // Try dotenv first
      String? envValue = dotenv.env[varName];

      // Fall back to platform environment variables
      envValue ??= Platform.environment[varName];

      if (envValue != null) {
        return envValue;
      } else {
        // Reason: Log warning but return original if env var not found
        print('Warning: Environment variable \$$varName not found, using default or empty value');
        return '';
      }
    });
  }

  /// Convert YamlMap to Map<String, dynamic> recursively
  /// Reason: Return type is dynamic to handle both Maps and scalar values (strings, numbers, bools)
  static dynamic _convertYamlToMap(dynamic yaml) {
    if (yaml is YamlMap) {
      final Map<String, dynamic> map = {};
      yaml.forEach((key, value) {
        map[key.toString()] = _convertYamlToMap(value);
      });
      return map;
    } else if (yaml is YamlList) {
      return yaml.map((item) => _convertYamlToMap(item)).toList();
    } else {
      // Return scalar values directly (String, int, double, bool, etc.)
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

  /// Get string configuration with environment variable expansion
  static String getString(String path, {String defaultValue = ''}) {
    final dynamic value = get(path, defaultValue: defaultValue);
    return value?.toString() ?? defaultValue;
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
