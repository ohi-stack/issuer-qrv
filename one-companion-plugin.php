<?php
/**
 * Plugin Name: One Companion Platform
 * Plugin URI: https://onecompanion.example
 * Description: Sprint 1 foundation for the One Companion care operations platform.
 * Version: 0.1.0
 * Author: OHI Stack
 * Text Domain: one-companion-plugin
 * Domain Path: /languages
 * Requires at least: 6.5
 * Requires PHP: 8.1
 * License: Proprietary
 *
 * @package OneCompanionPlugin
 */

defined( 'ABSPATH' ) || exit;

define( 'ONE_COMPANION_PLUGIN_VERSION', '0.1.0' );
define( 'ONE_COMPANION_PLUGIN_FILE', __FILE__ );
define( 'ONE_COMPANION_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'ONE_COMPANION_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once ONE_COMPANION_PLUGIN_DIR . 'includes/class-loader.php';
require_once ONE_COMPANION_PLUGIN_DIR . 'includes/class-capabilities.php';
require_once ONE_COMPANION_PLUGIN_DIR . 'includes/class-roles.php';
require_once ONE_COMPANION_PLUGIN_DIR . 'database/schema.php';
require_once ONE_COMPANION_PLUGIN_DIR . 'includes/class-activator.php';
require_once ONE_COMPANION_PLUGIN_DIR . 'includes/class-deactivator.php';
require_once ONE_COMPANION_PLUGIN_DIR . 'api/class-rest-api.php';
require_once ONE_COMPANION_PLUGIN_DIR . 'admin/class-admin.php';
require_once ONE_COMPANION_PLUGIN_DIR . 'public/class-public.php';
require_once ONE_COMPANION_PLUGIN_DIR . 'includes/class-plugin.php';

register_activation_hook( __FILE__, array( 'One_Companion_Activator', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'One_Companion_Deactivator', 'deactivate' ) );

function one_companion_plugin(): One_Companion_Plugin {
	static $plugin = null;

	if ( null === $plugin ) {
		$plugin = new One_Companion_Plugin();
	}

	return $plugin;
}

add_action(
	'plugins_loaded',
	static function (): void {
		one_companion_plugin()->run();
	}
);
