<?php
/**
 * WordPress admin screens.
 *
 * @package OneCompanionPlugin
 */

defined( 'ABSPATH' ) || exit;

class One_Companion_Admin {
	public function register_menu(): void {
		add_menu_page( __( 'One Companion', 'one-companion-plugin' ), __( 'One Companion', 'one-companion-plugin' ), One_Companion_Capabilities::VIEW_ADMIN_DASHBOARD, 'one-companion', array( $this, 'render_dashboard' ), 'dashicons-groups', 58 );
		add_submenu_page( 'one-companion', __( 'Settings', 'one-companion-plugin' ), __( 'Settings', 'one-companion-plugin' ), One_Companion_Capabilities::MANAGE_SETTINGS, 'one-companion-settings', array( $this, 'render_settings' ) );
		add_submenu_page( 'one-companion', __( 'Forms', 'one-companion-plugin' ), __( 'Forms', 'one-companion-plugin' ), One_Companion_Capabilities::MANAGE_FORMS, 'one-companion-forms', array( $this, 'render_forms' ) );
	}

	public function register_settings(): void {
		register_setting( 'one_companion_settings', 'one_companion_settings', array( 'sanitize_callback' => array( $this, 'sanitize_settings' ), 'default' => array() ) );
	}

	public function sanitize_settings( array $settings ): array {
		return array(
			'organization_name' => sanitize_text_field( $settings['organization_name'] ?? '' ),
			'support_email'     => sanitize_email( $settings['support_email'] ?? '' ),
		);
	}

	public function render_dashboard(): void {
		$this->render_page( __( 'Platform Foundation', 'one-companion-plugin' ), array( 'Public website shell', 'Client Portal', 'Provider Dashboard', 'Employee Dashboard', 'Student Portal', 'Administrator Dashboard', 'REST API', 'Forms framework', 'Authentication-aware shortcodes' ) );
	}

	public function render_settings(): void {
		$settings = get_option( 'one_companion_settings', array() );
		echo '<div class="wrap"><h1>' . esc_html__( 'One Companion Settings', 'one-companion-plugin' ) . '</h1><form method="post" action="options.php">';
		settings_fields( 'one_companion_settings' );
		echo '<table class="form-table"><tr><th><label for="organization_name">' . esc_html__( 'Organization name', 'one-companion-plugin' ) . '</label></th><td><input class="regular-text" id="organization_name" name="one_companion_settings[organization_name]" value="' . esc_attr( $settings['organization_name'] ?? '' ) . '"></td></tr>';
		echo '<tr><th><label for="support_email">' . esc_html__( 'Support email', 'one-companion-plugin' ) . '</label></th><td><input class="regular-text" id="support_email" name="one_companion_settings[support_email]" value="' . esc_attr( $settings['support_email'] ?? '' ) . '"></td></tr></table>';
		submit_button();
		echo '</form></div>';
	}

	public function render_forms(): void {
		$this->render_page( __( 'Forms Framework', 'one-companion-plugin' ), array( 'Care request', 'Client intake', 'Provider application', 'Student enrollment' ) );
	}

	private function render_page( string $title, array $items ): void {
		echo '<div class="wrap"><h1>' . esc_html( $title ) . '</h1><ul>';
		foreach ( $items as $item ) {
			echo '<li>' . esc_html( $item ) . '</li>';
		}
		echo '</ul></div>';
	}
}
