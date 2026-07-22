<?php
/**
 * Activation lifecycle.
 *
 * @package OneCompanionPlugin
 */

defined( 'ABSPATH' ) || exit;

class One_Companion_Activator {
	public static function activate(): void {
		One_Companion_Roles::add_roles();
		One_Companion_Plugin::migrate();
		flush_rewrite_rules();
	}
}
