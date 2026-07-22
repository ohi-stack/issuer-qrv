<?php

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
