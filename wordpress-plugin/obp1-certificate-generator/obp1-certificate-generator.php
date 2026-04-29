<?php
/**
 * Plugin Name: OBP-1 Certificate Generator
 * Description: Issues and verifies WooCommerce certificates with PDF/QR generation and audit logs.
 * Version: 1.0.0
 * Author: OBP-1
 * Text Domain: obp1-certificate-generator
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'OBP1_CERT_PLUGIN_FILE', __FILE__ );
define( 'OBP1_CERT_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'OBP1_CERT_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once OBP1_CERT_PLUGIN_DIR . 'includes/class-obp1-cert-plugin.php';

register_activation_hook( OBP1_CERT_PLUGIN_FILE, array( 'OBP1_Cert_Plugin', 'activate' ) );
register_deactivation_hook( OBP1_CERT_PLUGIN_FILE, array( 'OBP1_Cert_Plugin', 'deactivate' ) );

OBP1_Cert_Plugin::instance();
