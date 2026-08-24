# Diagnostics Guide

## Local Logs

The application writes local logs through the main-process logger. The maintenance center can list recent entries and clean old logs.

## Diagnostic Export

The maintenance center can export diagnostic JSON. Diagnostic output is intended for troubleshooting UI settings, logs, and maintenance reports.

## Sensitive Data

Do not share real survey data, private images, tokens, credentials, or local paths unless they are intentionally reviewed and removed where necessary.

## Useful Context

When reporting a problem, include:

- app version;
- operating system;
- action being performed;
- whether the project is synthetic or real;
- relevant error message;
- checks already run.

## Maintenance Health Check

The health check can identify missing codes, duplicate codes, orphan points, invalid coordinates, missing names, missing phenology records, and image reference issues.

