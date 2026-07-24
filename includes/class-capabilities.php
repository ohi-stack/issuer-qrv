<?php
/**
 * Capability definitions.
 *
 * @package OneCompanionPlugin
 */

defined( 'ABSPATH' ) || exit;

class One_Companion_Capabilities {
	public const MANAGE_PLATFORM       = 'one_companion_manage_platform';
	public const MANAGE_SETTINGS       = 'one_companion_manage_settings';
	public const VIEW_ADMIN_DASHBOARD  = 'one_companion_view_admin_dashboard';
	public const VIEW_CLIENT_PORTAL    = 'one_companion_view_client_portal';
	public const VIEW_PROVIDER_DASH    = 'one_companion_view_provider_dashboard';
	public const VIEW_EMPLOYEE_DASH    = 'one_companion_view_employee_dashboard';
	public const VIEW_STUDENT_PORTAL   = 'one_companion_view_student_portal';
	public const MANAGE_FORMS          = 'one_companion_manage_forms';
	public const VIEW_AUDIT_LOG        = 'one_companion_view_audit_log';

	public static function all(): array {
		return array(
			self::MANAGE_PLATFORM,
			self::MANAGE_SETTINGS,
			self::VIEW_ADMIN_DASHBOARD,
			self::VIEW_CLIENT_PORTAL,
			self::VIEW_PROVIDER_DASH,
			self::VIEW_EMPLOYEE_DASH,
			self::VIEW_STUDENT_PORTAL,
			self::MANAGE_FORMS,
			self::VIEW_AUDIT_LOG,
		);
	}
}
