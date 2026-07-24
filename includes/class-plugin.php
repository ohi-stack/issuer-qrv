<?php
/**
 * Core plugin orchestration.
 *
 * @package OneCompanionPlugin
 */

defined( 'ABSPATH' ) || exit;

class One_Companion_Plugin {
	private One_Companion_Loader $loader;
	private One_Companion_Admin $admin;
	private One_Companion_Public $public;
	private One_Companion_Rest_Api $rest_api;

	public function __construct() {
		$this->loader   = new One_Companion_Loader();
		$this->admin    = new One_Companion_Admin();
		$this->public   = new One_Companion_Public();
		$this->rest_api = new One_Companion_Rest_Api();
		$this->define_hooks();
	}

	public function run(): void {
		load_plugin_textdomain( 'one-companion-plugin', false, dirname( plugin_basename( ONE_COMPANION_PLUGIN_FILE ) ) . '/languages' );
		$this->loader->run();
	}

	private function define_hooks(): void {
		$this->loader->add_action( 'admin_menu', $this->admin, 'register_menu' );
		$this->loader->add_action( 'admin_init', $this->admin, 'register_settings' );
		$this->loader->add_action( 'init', $this->public, 'register_shortcodes' );
		$this->loader->add_action( 'wp_enqueue_scripts', $this->public, 'enqueue_styles' );
		$this->loader->add_action( 'rest_api_init', $this->rest_api, 'register_routes' );
	}
}
