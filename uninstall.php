<?php

if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

require_once plugin_dir_path(__FILE__) . 'includes/class-capabilities.php';
require_once plugin_dir_path(__FILE__) . 'includes/class-roles.php';
require_once plugin_dir_path(__FILE__) . 'database/schema.php';

One_Companion_Roles::uninstall();
delete_option(One_Companion_Database_Schema::DB_VERSION_OPTION);
