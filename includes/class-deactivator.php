<?php
/**
 * Deactivation lifecycle.
 *
 * @package OneCompanionPlugin
 */

defined( 'ABSPATH' ) || exit;

class One_Companion_Deactivator {
	public static function deactivate(): void {
		flush_rewrite_rules();
	}

defined('ABSPATH') || exit;

class One_Companion_Deactivator {
    public static function deactivate(): void {
        flush_rewrite_rules();
    }
}
