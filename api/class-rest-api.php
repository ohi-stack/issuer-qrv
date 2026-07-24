<?php
/**
 * REST API endpoints.
 *
 * @package OneCompanionPlugin
 */

defined( 'ABSPATH' ) || exit;

class One_Companion_Rest_Api {
	public function register_routes(): void {
		register_rest_route(
			'one-companion/v1',
			'/health',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'health' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			'one-companion/v1',
			'/manifest',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'manifest' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	public function health(): WP_REST_Response {
		return new WP_REST_Response(
			array(
				'status'  => 'ok',
				'plugin'  => 'one-companion-platform',
				'version' => ONE_COMPANION_PLUGIN_VERSION,
			),
			200
		);
	}

	public function manifest(): WP_REST_Response {
		return new WP_REST_Response(
			array(
				'name'      => 'One Companion Platform',
				'version'   => ONE_COMPANION_PLUGIN_VERSION,
				'portals'   => array( 'public', 'client', 'provider', 'employee', 'student', 'admin' ),
				'endpoints' => array( '/api/health', '/api/manifest', '/wp-json/one-companion/v1/health', '/wp-json/one-companion/v1/manifest' ),
				'features'  => array( 'roles', 'database_schema', 'settings', 'forms_framework', 'responsive_ui', 'authentication' ),
			),
			200
		);
	}
}
