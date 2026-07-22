<?php

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
