<?php

defined('ABSPATH') || exit;

class One_Companion_Deactivator {
    public static function deactivate(): void {
        flush_rewrite_rules();
    }
}
