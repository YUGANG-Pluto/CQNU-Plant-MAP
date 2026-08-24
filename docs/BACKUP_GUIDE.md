# Backup Guide

## What Is Backed Up

Manual backup creates a zip archive of the selected project folder, including:

- `information/settings.json`;
- `information/zones.json`;
- `information/points.json`;
- `information/images/`;
- other files under the project folder.

## Default Location

If the user does not choose a backup folder, the app derives a sibling folder named `<project>_backups`.

## Manual Backup Folder

Manual backup folders must be selected through the system picker. Backup folders inside the project are rejected.

## Expired Backups

The backup center can list expired `.zip` files in trusted backup folders. The user can keep them by updating their timestamp or delete them.

## Restore Practice

Current restore is manual: unzip a backup to a safe location and open that folder as a project. Before testing merge or repair flows, create a backup first.

## Safety Rules

- Keep backups outside the source repository.
- Do not commit backup archives.
- Do not store backups inside the project folder.
- Verify the restored folder before replacing an active project folder.

