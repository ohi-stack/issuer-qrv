<?php
/**
 * Role management.
 *
 * @package OneCompanionPlugin
 */

defined( 'ABSPATH' ) || exit;

class One_Companion_Roles {
	public const ADMINISTRATOR = 'administrator';
	public const PLATFORM_ADMIN = 'one_companion_platform_admin';
	public const CLIENT = 'one_companion_client';
	public const PROVIDER = 'one_companion_provider';
	public const EMPLOYEE = 'one_companion_employee';
	public const STUDENT = 'one_companion_student';

	public static function install(): void {
		self::grant_administrator_capabilities();

		add_role( self::PLATFORM_ADMIN, __( 'One Companion Admin', 'one-companion-plugin' ), self::caps( One_Companion_Capabilities::all() ) );
		add_role( self::CLIENT, __( 'One Companion Client', 'one-companion-plugin' ), self::caps( array( One_Companion_Capabilities::VIEW_CLIENT_PORTAL ) ) );
		add_role( self::PROVIDER, __( 'One Companion Provider', 'one-companion-plugin' ), self::caps( array( One_Companion_Capabilities::VIEW_PROVIDER_DASH ) ) );
		add_role( self::EMPLOYEE, __( 'One Companion Employee', 'one-companion-plugin' ), self::caps( array( One_Companion_Capabilities::VIEW_EMPLOYEE_DASH ) ) );
		add_role( self::STUDENT, __( 'One Companion Student', 'one-companion-plugin' ), self::caps( array( One_Companion_Capabilities::VIEW_STUDENT_PORTAL ) ) );
	}

	public static function uninstall(): void {
		foreach ( array( self::PLATFORM_ADMIN, self::CLIENT, self::PROVIDER, self::EMPLOYEE, self::STUDENT ) as $role ) {
			remove_role( $role );
		}
	}

	private static function grant_administrator_capabilities(): void {
		$administrator = get_role( self::ADMINISTRATOR );
		if ( ! $administrator ) {
			return;
		}

		foreach ( One_Companion_Capabilities::all() as $capability ) {
			$administrator->add_cap( $capability );
		}
	}

	private static function caps( array $capabilities ): array {
		return array_fill_keys( array_merge( array( 'read' ), $capabilities ), true );
	}
}
