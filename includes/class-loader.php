<?php
/**
 * Hook loader.
 *
 * @package OneCompanionPlugin
 */

defined( 'ABSPATH' ) || exit;

class One_Companion_Loader {
	private array $actions = array();

	public function add_action( string $hook, object $component, string $callback, int $priority = 10, int $accepted_args = 1 ): void {
		$this->actions[] = compact( 'hook', 'component', 'callback', 'priority', 'accepted_args' );
	}

	public function run(): void {
		foreach ( $this->actions as $action ) {
			add_action( $action['hook'], array( $action['component'], $action['callback'] ), $action['priority'], $action['accepted_args'] );
		}
	}

defined('ABSPATH') || exit;

class One_Companion_Loader {
    /** @var array<int,array{hook:string,component:object,callback:string,priority:int,args:int}> */
    private array $actions = [];

    public function add_action(string $hook, object $component, string $callback, int $priority = 10, int $args = 1): void {
        $this->actions[] = compact('hook', 'component', 'callback', 'priority', 'args');
    }

    public function run(): void {
        foreach ($this->actions as $action) {
            add_action($action['hook'], [$action['component'], $action['callback']], $action['priority'], $action['args']);
        }
    }
}
