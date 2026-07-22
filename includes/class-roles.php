<?php
/**
 * Role management.
 *
 * @package OneCompanionPlugin
 */

defined( 'ABSPATH' ) || exit;

class One_Companion_Roles {
	public const ADMIN_ROLE = 'one_companion_admin';
	public const EMPLOYEE_ROLE = 'one_companion_employee';

	public static function add_roles(): void {
		add_role(
			self::ADMIN_ROLE,
			'One Companion Admin',
			array_fill_keys( One_Companion_Capabilities::all(), true )
		);

		add_role(
			self::EMPLOYEE_ROLE,
			'One Companion Employee',
			array(
				One_Companion_Capabilities::VIEW_DASHBOARD => true,
				One_Companion_Capabilities::MANAGE_TIME_CLOCK => true,
			)
		);

		$administrator = get_role( 'administrator' );
		if ( $administrator ) {
			foreach ( One_Companion_Capabilities::all() as $capability ) {
				$administrator->add_cap( $capability );
			}
		}
	}

	public static function remove_roles(): void {
		remove_role( self::ADMIN_ROLE );
		remove_role( self::EMPLOYEE_ROLE );
	}

defined('ABSPATH') || exit;

class One_Companion_Roles {
    public const ADMINISTRATOR = 'administrator';
    public const MANAGER = 'one_manager';
    public const EMPLOYEE = 'one_employee';
    public const CLIENT = 'one_client';
    public const APPLICANT = 'one_applicant';

    public static function install(): void {
        self::grant_administrator_capabilities();

        add_role(self::MANAGER, __('ONE Manager', 'one-companion-plugin'), self::caps([
            One_Companion_Capabilities::VIEW_AUDIT_LOG,
            One_Companion_Capabilities::MANAGE_EMPLOYEES,
            One_Companion_Capabilities::MANAGE_CLIENTS,
            One_Companion_Capabilities::MANAGE_APPLICANTS,
        ]));
        add_role(self::EMPLOYEE, __('ONE Employee', 'one-companion-plugin'), self::caps([
            One_Companion_Capabilities::VIEW_EMPLOYEE_DASHBOARD,
        ]));
        add_role(self::CLIENT, __('ONE Client', 'one-companion-plugin'), self::caps([
            One_Companion_Capabilities::VIEW_CLIENT_PORTAL,
        ]));
        add_role(self::APPLICANT, __('ONE Applicant', 'one-companion-plugin'), self::caps([
            One_Companion_Capabilities::SUBMIT_APPLICATION,
        ]));
    }

    public static function uninstall(): void {
        foreach ([self::MANAGER, self::EMPLOYEE, self::CLIENT, self::APPLICANT] as $role) {
            remove_role($role);
        }

        $administrator = get_role(self::ADMINISTRATOR);
        if ($administrator) {
            foreach (One_Companion_Capabilities::all() as $capability) {
                $administrator->remove_cap($capability);
            }
        }
    }

    private static function grant_administrator_capabilities(): void {
        $administrator = get_role(self::ADMINISTRATOR);
        if (!$administrator) {
            return;
        }

        foreach (One_Companion_Capabilities::all() as $capability) {
            $administrator->add_cap($capability);
        }
    }

    private static function caps(array $capabilities): array {
        return array_fill_keys(array_merge(['read'], $capabilities), true);
    }
}
