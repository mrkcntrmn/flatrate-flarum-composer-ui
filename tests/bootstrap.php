<?php

$root = dirname(__DIR__);

// Prefer local vendor (after composer install --dev). Fall back to sibling phpunit.
$candidates = [
    $root . '/vendor/autoload.php',
    '/home/ilove/dev/flatrate-flarum-forum-navigation/vendor/autoload.php',
];

$loaded = false;
foreach ($candidates as $autoload) {
    if (is_file($autoload)) {
        require $autoload;
        $loaded = true;
        break;
    }
}

if (!$loaded) {
    fwrite(STDERR, "Missing vendor/autoload.php for PHPUnit.\n");
    fwrite(STDERR, "Fallback: php tests/run-rollout.php\n");
    exit(1);
}

// Always register this package's PSR-4 (local composer may not include flarum).
spl_autoload_register(static function (string $class): void {
    $prefix = 'FlatRate\\ComposerUi\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $file = dirname(__DIR__) . '/src/' . str_replace('\\', '/', $relative) . '.php';
    if (is_file($file)) {
        require $file;
    }
});
