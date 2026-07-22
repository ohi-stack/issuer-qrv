<?php
/**
 * Capability definitions.
 *
 * @package OneCompanionPlugin
 */

defined( 'ABSPATH' ) || exit;

class One_Companion_Capabilities {
	public const MANAGE_PLUGIN = 'one_companion_manage_plugin';
	public const VIEW_DASHBOARD = 'one_companion_view_dashboard';
	public const MANAGE_TIME_CLOCK = 'one_companion_manage_time_clock';
	public const VIEW_AUDIT_LOG = 'one_companion_view_audit_log';

	public static function all(): array {
		return array(
			self::MANAGE_PLUGIN,
			self::VIEW_DASHBOARD,
			self::MANAGE_TIME_CLOCK,
			self::VIEW_AUDIT_LOG,
		);
	}
}
