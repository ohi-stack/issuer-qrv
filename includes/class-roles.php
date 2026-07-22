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
}
