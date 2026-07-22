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

if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

require_once plugin_dir_path(__FILE__) . 'includes/class-capabilities.php';
require_once plugin_dir_path(__FILE__) . 'includes/class-roles.php';
require_once plugin_dir_path(__FILE__) . 'database/schema.php';

One_Companion_Roles::uninstall();
delete_option(One_Companion_Database_Schema::DB_VERSION_OPTION);
