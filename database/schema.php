<?php

defined('ABSPATH') || exit;

class One_Companion_Database_Schema {
    public const DB_VERSION = '0.1.0';
    public const DB_VERSION_OPTION = 'one_companion_db_version';

    public static function install(): void {
        global $wpdb;

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        $charset_collate = $wpdb->get_charset_collate();
        $audit_table = self::audit_log_table();

        $sql = "CREATE TABLE {$audit_table} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            actor_user_id bigint(20) unsigned DEFAULT NULL,
            event_type varchar(100) NOT NULL,
            object_type varchar(100) DEFAULT NULL,
            object_id bigint(20) unsigned DEFAULT NULL,
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

        dbDelta($sql);
        update_option(self::DB_VERSION_OPTION, self::DB_VERSION);
    }

    public static function audit_log_table(): string {
        global $wpdb;

        return $wpdb->prefix . 'one_audit_log';
    }
}
