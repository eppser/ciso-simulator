# Bring your own incident universe

The game reads one normalized daily report. You can write an adapter for **Elastic/ELK, Splunk, Microsoft Sentinel, a SIEM export, honeypot telemetry or another authorized source**. No vendor-specific live connector is bundled or implied.

On the opening screen, expand **Use another day or dataset** and choose a JSON file:

```json
{
  "day": "2026-09-03",
  "source": "My authorized aggregate SIEM export",
  "vulnerabilities": [
    {
      "id": "CVE-2022-40684",
      "vendor": "Fortinet",
      "product": "FortiOS",
      "device_class": "router",
      "unique_ips": 12,
      "connections": 180,
      "cvss": 9.8
    }
  ]
}
```

Map the date to `day`, the vulnerability identifier to `id`, grouped attempts to `connections`, and distinct source counts within that group to `unique_ips`. Counts must be integers, at least one source, and attempts cannot be fewer than sources. Preserve unknown scores as missing rather than inventing a CVSS value.

Duplicate vulnerability/vendor/product/class tuples are rejected. Multiple products can share a CVE. Add suitable asset matching in `src/sim/orgs.js` if your products do not already exist in the estate. The adapter in `src/sim/scenarios.js` validates date, counts, fields and report size.

**Privacy first:** aggregate and redact before exporting. Do not include source IP addresses, usernames, secrets, customer identifiers or raw log messages. Imports are processed locally in your browser; they are not uploaded to the public leaderboard. Imported scenarios are practice-only because they cannot fairly compete against the bundled day's rules.

The bundled Shadowserver day informs threat mix and persistence. Hourly timing, organizations, pressure and business consequences are designed for play—not a literal replay of each observed connection.
