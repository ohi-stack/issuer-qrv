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

defined('ABSPATH') || exit;

class One_Companion_Activator {
    public static function activate(): void {
        One_Companion_Database_Schema::install();
        One_Companion_Roles::install();
        flush_rewrite_rules();
    }
}
