<?php
/**
 * Database schema installer.
 *
 * @package OneCompanionPlugin
 */

defined( 'ABSPATH' ) || exit;

class One_Companion_Database_Schema {
	public const DB_VERSION = '0.1.0';
	public const DB_VERSION_OPTION = 'one_companion_db_version';

	public static function install(): void {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$charset_collate = $wpdb->get_charset_collate();
		$tables = array(
			self::audit_log_sql( $charset_collate ),
			self::form_submissions_sql( $charset_collate ),
			self::portal_records_sql( $charset_collate ),
		);

		foreach ( $tables as $sql ) {
			dbDelta( $sql );
		}

		update_option( self::DB_VERSION_OPTION, self::DB_VERSION );
	}

	public static function table( string $name ): string {
		global $wpdb;

		return $wpdb->prefix . 'one_companion_' . $name;
	}

	private static function audit_log_sql( string $charset_collate ): string {
		$table = self::table( 'audit_log' );
		return "CREATE TABLE {$table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			actor_user_id bigint(20) unsigned DEFAULT NULL,
			event_type varchar(100) NOT NULL,
			object_type varchar(100) DEFAULT NULL,
			object_id varchar(100) DEFAULT NULL,
			ip_address varchar(45) DEFAULT NULL,
			user_agent varchar(255) DEFAULT NULL,
			metadata longtext DEFAULT NULL,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY  (id),
			KEY event_type (event_type),
			KEY actor_user_id (actor_user_id),
			KEY object_lookup (object_type, object_id),
			KEY created_at (created_at)
		) {$charset_collate};";
	}

	private static function form_submissions_sql( string $charset_collate ): string {
		$table = self::table( 'form_submissions' );
		return "CREATE TABLE {$table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			form_key varchar(100) NOT NULL,
			status varchar(40) NOT NULL DEFAULT 'new',
			submitter_user_id bigint(20) unsigned DEFAULT NULL,
			payload longtext NOT NULL,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at datetime DEFAULT NULL,
			PRIMARY KEY  (id),
			KEY form_key (form_key),
			KEY status (status),
			KEY submitter_user_id (submitter_user_id)
		) {$charset_collate};";
	}

	private static function portal_records_sql( string $charset_collate ): string {
		$table = self::table( 'portal_records' );
		return "CREATE TABLE {$table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			portal varchar(60) NOT NULL,
			owner_user_id bigint(20) unsigned DEFAULT NULL,
			title varchar(190) NOT NULL,
			status varchar(40) NOT NULL DEFAULT 'draft',
			metadata longtext DEFAULT NULL,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at datetime DEFAULT NULL,
			PRIMARY KEY  (id),
			KEY portal (portal),
			KEY owner_user_id (owner_user_id),
			KEY status (status)
		) {$charset_collate};";
	}
}
