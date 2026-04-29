<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class OBP1_Cert_Plugin {
	private static $instance;
	private $cert_table;
	private $template_table;
	private $event_table;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	public function __construct() {
		global $wpdb;
		$this->cert_table     = $wpdb->prefix . 'obp1_certificates';
		$this->template_table = $wpdb->prefix . 'obp1_certificate_templates';
		$this->event_table    = $wpdb->prefix . 'obp1_certificate_events';

		add_action( 'init', array( $this, 'register_rewrite' ) );
		add_action( 'admin_menu', array( $this, 'admin_menu' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_action( 'woocommerce_product_options_general_product_data', array( $this, 'product_meta_fields' ) );
		add_action( 'woocommerce_process_product_meta', array( $this, 'save_product_meta' ) );
		add_action( 'woocommerce_order_status_completed', array( $this, 'on_order_completed' ) );
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
		add_shortcode( 'obp1_verify_certificate', array( $this, 'verify_shortcode' ) );
		add_shortcode( 'obp1_certificate_dashboard', array( $this, 'dashboard_shortcode' ) );
		add_action( 'template_redirect', array( $this, 'handle_verify_route' ) );
	}

	public static function activate() {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		$charset = $wpdb->get_charset_collate();
		$certs   = "CREATE TABLE {$wpdb->prefix}obp1_certificates (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			certificate_id VARCHAR(64) NOT NULL,
			serial_number VARCHAR(64) NOT NULL,
			certificate_type VARCHAR(100) NOT NULL,
			recipient_name VARCHAR(191) NOT NULL,
			recipient_email VARCHAR(191) NOT NULL,
			user_id BIGINT UNSIGNED NULL,
			order_id BIGINT UNSIGNED NULL,
			product_id BIGINT UNSIGNED NULL,
			issuer_name VARCHAR(191) NOT NULL,
			issuer_entity_type VARCHAR(100) NOT NULL,
			title VARCHAR(191) NOT NULL,
			description TEXT NULL,
			status VARCHAR(30) NOT NULL DEFAULT 'issued',
			verification_slug VARCHAR(80) NOT NULL,
			verification_url TEXT NULL,
			qr_code_url TEXT NULL,
			pdf_url TEXT NULL,
			data_hash VARCHAR(128) NOT NULL,
			odin_id VARCHAR(191) NULL,
			issued_at DATETIME NOT NULL,
			expires_at DATETIME NULL,
			revoked_at DATETIME NULL,
			revocation_reason TEXT NULL,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			PRIMARY KEY (id),
			UNIQUE KEY certificate_id (certificate_id),
			UNIQUE KEY serial_number (serial_number),
			UNIQUE KEY verification_slug (verification_slug),
			KEY user_order_product (user_id,order_id,product_id),
			KEY status (status)
		) $charset";

		$templates = "CREATE TABLE {$wpdb->prefix}obp1_certificate_templates (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			template_key VARCHAR(100) NOT NULL,
			template_name VARCHAR(191) NOT NULL,
			certificate_type VARCHAR(100) NOT NULL,
			issuer_name VARCHAR(191) NOT NULL,
			issuer_entity_type VARCHAR(100) NOT NULL,
			html_template LONGTEXT NOT NULL,
			css_template LONGTEXT NULL,
			logo_url TEXT NULL,
			seal_url TEXT NULL,
			signature_name VARCHAR(191) NULL,
			signature_title VARCHAR(191) NULL,
			footer_text LONGTEXT NULL,
			is_active TINYINT(1) NOT NULL DEFAULT 1,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			PRIMARY KEY (id),
			UNIQUE KEY template_key (template_key),
			KEY certificate_type (certificate_type)
		) $charset";

		$events = "CREATE TABLE {$wpdb->prefix}obp1_certificate_events (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			certificate_id BIGINT UNSIGNED NOT NULL,
			event_type VARCHAR(40) NOT NULL,
			event_data LONGTEXT NULL,
			created_by BIGINT UNSIGNED NULL,
			created_at DATETIME NOT NULL,
			PRIMARY KEY (id),
			KEY certificate_id (certificate_id),
			KEY event_type (event_type)
		) $charset";
		dbDelta( $certs ); dbDelta( $templates ); dbDelta( $events );
		flush_rewrite_rules();
	}

	public static function deactivate() { flush_rewrite_rules(); }
	public function register_rewrite() {
		add_rewrite_tag( '%obp1_verification_slug%', '([^&]+)' );
		add_rewrite_rule( '^verify-certificate/([^/]*)/?', 'index.php?obp1_verification_slug=$matches[1]', 'top' );
	}

	public function handle_verify_route() {
		$slug = get_query_var( 'obp1_verification_slug' );
		if ( ! $slug ) { return; }
		echo wp_kses_post( $this->render_verification( sanitize_text_field( $slug ) ) );
		exit;
	}

	private function next_serial() {
		global $wpdb;
		$last = $wpdb->get_var( "SELECT serial_number FROM {$this->cert_table} ORDER BY id DESC LIMIT 1" );
		$num  = $last ? (int) preg_replace( '/\D/', '', $last ) + 1 : 1;
		return sprintf( 'OBP1-CERT-%06d', $num );
	}

	private function log_event( $id, $event, $data = array() ) {
		global $wpdb;
		$wpdb->insert( $this->event_table, array(
			'certificate_id' => absint( $id ), 'event_type' => sanitize_key( $event ),
			'event_data' => wp_json_encode( $data ), 'created_by' => get_current_user_id(),
			'created_at' => current_time( 'mysql', 1 ),
		), array( '%d', '%s', '%s', '%d', '%s' ) );
	}

	private function issue_certificate( $payload ) {
		global $wpdb;
		$serial = $this->next_serial(); $slug = wp_generate_uuid4();
		$hash = hash( 'sha256', wp_json_encode( $payload ) . '|' . $serial );
		$now = current_time( 'mysql', 1 );
		$data = array_merge( $payload, array(
			'certificate_id' => wp_generate_uuid4(), 'serial_number' => $serial, 'verification_slug' => $slug,
			'verification_url' => home_url( '/verify-certificate/' . $slug ), 'data_hash' => $hash,
			'issued_at' => $now, 'created_at' => $now, 'updated_at' => $now, 'status' => 'issued',
		) );
		$wpdb->insert( $this->cert_table, $data );
		$id = (int) $wpdb->insert_id;
		$this->generate_qr_and_pdf( $id );
		$this->log_event( $id, 'created', array( 'serial' => $serial ) );
		return $id;
	}

	private function generate_qr_and_pdf( $id ) {
		global $wpdb;
		$cert = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$this->cert_table} WHERE id=%d", $id ), ARRAY_A );
		if ( ! $cert ) { return; }
		$up = wp_upload_dir(); $dir = trailingslashit( $up['basedir'] ) . 'obp1-certificates'; wp_mkdir_p( $dir );
		$qr_file = $dir . '/qr-' . $cert['serial_number'] . '.png';
		$qr_url_api = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' . rawurlencode( $cert['verification_url'] );
		wp_remote_retrieve_body( wp_remote_get( $qr_url_api, array( 'timeout' => 20 ) ) );
		$img = wp_remote_retrieve_body( wp_remote_get( $qr_url_api, array( 'timeout' => 20 ) ) );
		if ( $img ) { file_put_contents( $qr_file, $img ); }
		$qr_url = trailingslashit( $up['baseurl'] ) . 'obp1-certificates/qr-' . rawurlencode( $cert['serial_number'] ) . '.png';
		$this->log_event( $id, 'qr_generated' );
		$html = '<html><body><h1>' . esc_html( $cert['title'] ) . '</h1><p>Serial: ' . esc_html( $cert['serial_number'] ) . '</p><p>Recipient: ' . esc_html( $cert['recipient_name'] ) . '</p><p>Issuer: ' . esc_html( $cert['issuer_name'] ) . '</p><p>Issued: ' . esc_html( gmdate( 'Y-m-d', strtotime( $cert['issued_at'] ) ) ) . '</p><p>Verify: ' . esc_url( $cert['verification_url'] ) . '</p><p>Hash: ' . esc_html( substr( $cert['data_hash'], 0, 16 ) ) . '</p><img src="' . esc_url( $qr_url ) . '" width="140"/></body></html>';
		$pdf_path = $dir . '/cert-' . $cert['serial_number'] . '.html';
		file_put_contents( $pdf_path, $html );
		$pdf_url = trailingslashit( $up['baseurl'] ) . 'obp1-certificates/cert-' . rawurlencode( $cert['serial_number'] ) . '.html';
		$wpdb->update( $this->cert_table, array( 'qr_code_url' => $qr_url, 'pdf_url' => $pdf_url ), array( 'id' => $id ) );
		$this->log_event( $id, 'pdf_generated' );
	}

	public function on_order_completed( $order_id ) {
		if ( ! function_exists( 'wc_get_order' ) ) { return; }
		$order = wc_get_order( $order_id ); if ( ! $order ) { return; }
		foreach ( $order->get_items() as $item ) {
			$product_id = $item->get_product_id();
			$type = get_post_meta( $product_id, '_obp1_certificate_type', true );
			if ( ! $type ) { continue; }
			$user_id = $order->get_user_id();
			global $wpdb;
			$existing = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$this->cert_table} WHERE order_id=%d AND product_id=%d AND user_id=%d", $order_id, $product_id, $user_id ) );
			if ( $existing ) { continue; }
			$this->issue_certificate( array(
				'certificate_type' => sanitize_text_field( $type ), 'recipient_name' => sanitize_text_field( $order->get_formatted_billing_full_name() ),
				'recipient_email' => sanitize_email( $order->get_billing_email() ), 'user_id' => $user_id, 'order_id' => $order_id,
				'product_id' => $product_id, 'issuer_name' => sanitize_text_field( get_option( 'obp1_issuer_name', get_bloginfo( 'name' ) ) ),
				'issuer_entity_type' => sanitize_text_field( get_option( 'obp1_issuer_entity_type', 'organization' ) ),
				'title' => sanitize_text_field( get_post_meta( $product_id, '_obp1_certificate_title', true ) ?: 'Certificate of Completion' ),
				'description' => '', 'odin_id' => '',
			) );
		}
		$order->add_order_note( 'OBP-1 certificates generated for eligible products.' );
	}

	public function verify_shortcode( $atts ) { $slug = isset( $_GET['slug'] ) ? sanitize_text_field( wp_unslash( $_GET['slug'] ) ) : ''; return $slug ? $this->render_verification( $slug ) : '<p>No certificate slug provided.</p>'; }
	private function render_verification( $slug ) {
		global $wpdb; $cert = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$this->cert_table} WHERE verification_slug=%s", $slug ), ARRAY_A );
		if ( ! $cert ) { return '<p>Certificate not found.</p>'; }
		$this->log_event( (int) $cert['id'], 'verified' );
		return '<h2>Certificate Verification</h2><ul><li>Status: ' . esc_html( $cert['status'] ) . '</li><li>Type: ' . esc_html( $cert['certificate_type'] ) . '</li><li>Recipient: ' . esc_html( $cert['recipient_name'] ) . '</li><li>Issuer: ' . esc_html( $cert['issuer_name'] ) . '</li><li>Serial: ' . esc_html( $cert['serial_number'] ) . '</li><li>Issued: ' . esc_html( gmdate( 'Y-m-d', strtotime( $cert['issued_at'] ) ) ) . '</li><li>Hash: ' . esc_html( substr( $cert['data_hash'], 0, 12 ) ) . '</li><li>ODIN ID: ' . esc_html( $cert['odin_id'] ?: 'N/A' ) . '</li></ul>';
	}
	public function dashboard_shortcode() { if ( ! is_user_logged_in() ) { return '<p>Please log in.</p>'; } global $wpdb; $rows = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$this->cert_table} WHERE user_id=%d ORDER BY issued_at DESC", get_current_user_id() ), ARRAY_A ); $o = '<table><tr><th>Serial</th><th>Type</th><th>Status</th><th>Download</th></tr>'; foreach ( $rows as $r ) { $o .= '<tr><td>' . esc_html( $r['serial_number'] ) . '</td><td>' . esc_html( $r['certificate_type'] ) . '</td><td>' . esc_html( $r['status'] ) . '</td><td><a href="' . esc_url( $r['pdf_url'] ) . '">Download</a></td></tr>'; } return $o . '</table>'; }

	public function product_meta_fields() { woocommerce_wp_text_input( array( 'id' => '_obp1_certificate_type', 'label' => 'Certificate Type' ) ); woocommerce_wp_text_input( array( 'id' => '_obp1_certificate_title', 'label' => 'Certificate Title' ) ); }
	public function save_product_meta( $id ) { if ( isset( $_POST['_obp1_certificate_type'] ) ) { update_post_meta( $id, '_obp1_certificate_type', sanitize_text_field( wp_unslash( $_POST['_obp1_certificate_type'] ) ) ); } if ( isset( $_POST['_obp1_certificate_title'] ) ) { update_post_meta( $id, '_obp1_certificate_title', sanitize_text_field( wp_unslash( $_POST['_obp1_certificate_title'] ) ) ); } }

	public function admin_menu() { add_menu_page( 'OBP1 Certificates', 'OBP1 Certificates', 'manage_woocommerce', 'obp1-certificates', array( $this, 'render_admin_list' ) ); add_submenu_page( 'obp1-certificates', 'Templates', 'Templates', 'manage_woocommerce', 'obp1-templates', array( $this, 'render_templates' ) ); add_submenu_page( 'obp1-certificates', 'Settings', 'Settings', 'manage_woocommerce', 'obp1-settings', array( $this, 'render_settings' ) ); }
	public function register_settings() { register_setting( 'obp1_settings', 'obp1_issuer_name', array( 'sanitize_callback' => 'sanitize_text_field' ) ); register_setting( 'obp1_settings', 'obp1_issuer_entity_type', array( 'sanitize_callback' => 'sanitize_text_field' ) ); }
	public function render_settings() { echo '<div class="wrap"><h1>OBP1 Settings</h1><form method="post" action="options.php">'; settings_fields( 'obp1_settings' ); echo '<label>Issuer Name <input name="obp1_issuer_name" value="' . esc_attr( get_option( 'obp1_issuer_name', '' ) ) . '"/></label><br/><label>Issuer Entity Type <input name="obp1_issuer_entity_type" value="' . esc_attr( get_option( 'obp1_issuer_entity_type', 'organization' ) ) . '"/></label>'; submit_button(); echo '</form></div>'; }
	public function render_admin_list() { echo '<div class="wrap"><h1>Certificates</h1></div>'; }
	public function render_templates() { echo '<div class="wrap"><h1>Templates</h1><p>Default footer: This certificate is a record of issuance, access, completion, ownership, contribution, or participation only. It does not represent equity, public securities, governmental status, citizenship, land title, or state-conferred authority unless expressly stated in a separate signed legal instrument.</p></div>'; }

	public function register_rest_routes() {
		register_rest_route( 'obp1/v1', '/verify/(?P<serial>[A-Za-z0-9\-]+)', array( 'methods' => 'GET', 'callback' => array( $this, 'rest_verify' ), 'permission_callback' => '__return_true' ) );
		register_rest_route( 'obp1/v1', '/certificates', array( array( 'methods' => 'GET', 'callback' => array( $this, 'rest_admin_certs' ), 'permission_callback' => array( $this, 'rest_admin' ) ), array( 'methods' => 'POST', 'callback' => array( $this, 'rest_create_cert' ), 'permission_callback' => array( $this, 'rest_admin' ) ) ) );
		register_rest_route( 'obp1/v1', '/certificates/(?P<id>\d+)', array( 'methods' => 'GET', 'callback' => array( $this, 'rest_get_cert' ), 'permission_callback' => array( $this, 'rest_admin' ) ) );
		register_rest_route( 'obp1/v1', '/certificates/(?P<id>\d+)/(revoke|reissue)', array( 'methods' => 'POST', 'callback' => array( $this, 'rest_cert_action' ), 'permission_callback' => array( $this, 'rest_admin' ) ) );
		register_rest_route( 'obp1/v1', '/templates', array( array( 'methods' => 'GET', 'callback' => array( $this, 'rest_templates' ), 'permission_callback' => array( $this, 'rest_admin' ) ), array( 'methods' => 'POST', 'callback' => array( $this, 'rest_create_template' ), 'permission_callback' => array( $this, 'rest_admin' ) ) ) );
	}
	public function rest_admin() { return current_user_can( 'manage_woocommerce' ); }
	public function rest_verify( $req ) { global $wpdb; $serial = sanitize_text_field( $req['serial'] ); $c = $wpdb->get_row( $wpdb->prepare( "SELECT status,certificate_type,recipient_name,issuer_name,serial_number,issued_at,data_hash,odin_id FROM {$this->cert_table} WHERE serial_number=%s", $serial ), ARRAY_A ); if ( ! $c ) { return new WP_REST_Response( array( 'error' => 'Not found' ), 404 ); } return $c; }
	public function rest_admin_certs() { global $wpdb; return $wpdb->get_results( "SELECT * FROM {$this->cert_table} ORDER BY id DESC LIMIT 200", ARRAY_A ); }
	public function rest_get_cert( $r ) { global $wpdb; return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$this->cert_table} WHERE id=%d", (int) $r['id'] ), ARRAY_A ); }
	public function rest_create_cert( $r ) { return array( 'id' => $this->issue_certificate( $r->get_json_params() ) ); }
	public function rest_cert_action( $r ) { global $wpdb; $id = (int) $r['id']; $route = $r->get_route(); if ( false !== strpos( $route, 'revoke' ) ) { $wpdb->update( $this->cert_table, array( 'status' => 'revoked', 'revoked_at' => current_time( 'mysql', 1 ) ), array( 'id' => $id ) ); $this->log_event( $id, 'revoked' ); return array( 'status' => 'revoked' ); } $this->log_event( $id, 'reissued' ); return array( 'status' => 'reissued' ); }
	public function rest_templates() { global $wpdb; return $wpdb->get_results( "SELECT * FROM {$this->template_table} ORDER BY id DESC", ARRAY_A ); }
	public function rest_create_template( $r ) { global $wpdb; $d = $r->get_json_params(); $d['created_at'] = current_time( 'mysql', 1 ); $d['updated_at'] = current_time( 'mysql', 1 ); $wpdb->insert( $this->template_table, $d ); return array( 'id' => (int) $wpdb->insert_id ); }
}
