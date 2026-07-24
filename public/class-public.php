<?php
/**
 * Public shortcodes and responsive shell.
 *
 * @package OneCompanionPlugin
 */

defined( 'ABSPATH' ) || exit;

class One_Companion_Public {
	private const PORTALS = array(
		'public'   => array( 'title' => 'One Companion', 'capability' => '' ),
		'client'   => array( 'title' => 'Client Portal', 'capability' => One_Companion_Capabilities::VIEW_CLIENT_PORTAL ),
		'provider' => array( 'title' => 'Provider Dashboard', 'capability' => One_Companion_Capabilities::VIEW_PROVIDER_DASH ),
		'employee' => array( 'title' => 'Employee Dashboard', 'capability' => One_Companion_Capabilities::VIEW_EMPLOYEE_DASH ),
		'student'  => array( 'title' => 'Student Portal', 'capability' => One_Companion_Capabilities::VIEW_STUDENT_PORTAL ),
		'admin'    => array( 'title' => 'Administrator Dashboard', 'capability' => One_Companion_Capabilities::VIEW_ADMIN_DASHBOARD ),
	);

	public function register_shortcodes(): void {
		add_shortcode( 'one_companion_portal', array( $this, 'render_portal_shortcode' ) );
	}

	public function render_portal_shortcode( array $attributes = array() ): string {
		$attributes = shortcode_atts( array( 'type' => 'public' ), $attributes, 'one_companion_portal' );
		$type       = sanitize_key( $attributes['type'] );
		$portal     = self::PORTALS[ $type ] ?? self::PORTALS['public'];

		if ( ! empty( $portal['capability'] ) && ! current_user_can( $portal['capability'] ) ) {
			return '<section class="one-companion-shell"><h2>' . esc_html( $portal['title'] ) . '</h2><p>' . esc_html__( 'Please sign in with an authorized account to continue.', 'one-companion-plugin' ) . '</p>' . wp_login_form( array( 'echo' => false ) ) . '</section>';
		}

		return '<section class="one-companion-shell"><div class="one-companion-card"><h2>' . esc_html( $portal['title'] ) . '</h2><p>' . esc_html__( 'Sprint 1 foundation is active. Production workflows will be enabled in upcoming sprints.', 'one-companion-plugin' ) . '</p></div></section>';
	}

	public function enqueue_styles(): void {
		$css = '.one-companion-shell{display:grid;gap:1rem;max-width:1100px;margin:2rem auto;padding:1rem}.one-companion-card{border:1px solid #d9e2ec;border-radius:16px;padding:1.5rem;background:#fff;box-shadow:0 10px 30px rgba(15,23,42,.08)}@media (max-width:700px){.one-companion-shell{margin:1rem auto;padding:.75rem}.one-companion-card{border-radius:12px;padding:1rem}}';
		wp_register_style( 'one-companion-platform', false, array(), ONE_COMPANION_PLUGIN_VERSION );
		wp_enqueue_style( 'one-companion-platform' );
		wp_add_inline_style( 'one-companion-platform', $css );
	}
}
