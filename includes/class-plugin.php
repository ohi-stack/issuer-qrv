<?php
/**
 * Core plugin orchestration.
 *
 * @package OneCompanionPlugin
 */

defined( 'ABSPATH' ) || exit;

class One_Companion_Plugin {
	private One_Companion_Loader $loader;

	public function __construct() {
		$this->loader = new One_Companion_Loader();
		$this->define_admin_hooks();
	}

	public function run(): void {
		$this->loader->run();
	}

	public static function migrate(): void {
		global $wpdb;

		$installed_version = get_option( 'one_companion_db_version', '0.0.0' );
		if ( version_compare( $installed_version, ONE_COMPANION_PLUGIN_VERSION, '>=' ) ) {
			return;
		}

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$charset_collate = $wpdb->get_charset_collate();
		$audit_table = $wpdb->prefix . 'one_companion_audit_log';
		$sql = "CREATE TABLE {$audit_table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			user_id bigint(20) unsigned NULL,
			action varchar(120) NOT NULL,
			object_type varchar(120) NULL,
			object_id varchar(120) NULL,
			context longtext NULL,
			created_at datetime NOT NULL,
			PRIMARY KEY  (id),
			KEY action (action),
			KEY created_at (created_at)
		) {$charset_collate};";

		dbDelta( $sql );
		update_option( 'one_companion_db_version', ONE_COMPANION_PLUGIN_VERSION );
	}

	public static function audit( string $action, string $object_type = '', string $object_id = '', array $context = array() ): void {
		global $wpdb;

		$wpdb->insert(
			$wpdb->prefix . 'one_companion_audit_log',
			array(
				'user_id' => get_current_user_id() ?: null,
				'action' => sanitize_key( $action ),
				'object_type' => sanitize_key( $object_type ),
				'object_id' => sanitize_text_field( $object_id ),
				'context' => wp_json_encode( $context ),
				'created_at' => current_time( 'mysql', true ),
			),
			array( '%d', '%s', '%s', '%s', '%s', '%s' )
		);
	}

	public function register_admin_menu(): void {
		add_menu_page(
			'One Companion',
			'One Companion',
			One_Companion_Capabilities::VIEW_DASHBOARD,
			'one-companion',
			array( $this, 'render_dashboard' ),
			'dashicons-groups',
			58
		);
	}

	public function render_dashboard(): void {
		if ( ! current_user_can( One_Companion_Capabilities::VIEW_DASHBOARD ) ) {
			wp_die( esc_html__( 'You do not have permission to view this page.', 'one-companion-plugin' ) );
		}

		echo '<div class="wrap"><h1>' . esc_html__( 'One Companion', 'one-companion-plugin' ) . '</h1>';
		echo '<p>' . esc_html__( 'Plugin foundation is installed. Employee dashboard, time clock, training, client, and applicant portal modules will be added incrementally.', 'one-companion-plugin' ) . '</p></div>';
	}

	private function define_admin_hooks(): void {
		$this->loader->add_action( 'admin_menu', $this, 'register_admin_menu' );
	}

defined('ABSPATH') || exit;

class One_Companion_Plugin {
    private One_Companion_Loader $loader;

    public function __construct() {
        $this->loader = new One_Companion_Loader();
    }

    public function run(): void {
        load_plugin_textdomain('one-companion-plugin', false, dirname(plugin_basename(ONE_COMPANION_PLUGIN_FILE)) . '/languages');
        $this->loader->run();
    }
}
