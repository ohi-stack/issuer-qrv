<?php
/**
 * Uninstall cleanup.
 *
 * @package OneCompanionPlugin
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

require_once __DIR__ . '/includes/class-capabilities.php';
require_once __DIR__ . '/includes/class-roles.php';

One_Companion_Roles::remove_roles();
delete_option( 'one_companion_db_version' );
