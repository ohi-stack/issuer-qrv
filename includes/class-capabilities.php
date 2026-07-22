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

defined('ABSPATH') || exit;

class One_Companion_Capabilities {
    public const MANAGE_PLUGIN = 'one_manage_plugin';
    public const VIEW_AUDIT_LOG = 'one_view_audit_log';
    public const MANAGE_EMPLOYEES = 'one_manage_employees';
    public const VIEW_EMPLOYEE_DASHBOARD = 'one_view_employee_dashboard';
    public const MANAGE_CLIENTS = 'one_manage_clients';
    public const VIEW_CLIENT_PORTAL = 'one_view_client_portal';
    public const MANAGE_APPLICANTS = 'one_manage_applicants';
    public const SUBMIT_APPLICATION = 'one_submit_application';

    public static function all(): array {
        return [
            self::MANAGE_PLUGIN,
            self::VIEW_AUDIT_LOG,
            self::MANAGE_EMPLOYEES,
            self::VIEW_EMPLOYEE_DASHBOARD,
            self::MANAGE_CLIENTS,
            self::VIEW_CLIENT_PORTAL,
            self::MANAGE_APPLICANTS,
            self::SUBMIT_APPLICATION,
        ];
    }
}
